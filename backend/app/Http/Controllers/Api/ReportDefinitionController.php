<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReportDefinition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ReportDefinitionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $definitions = ReportDefinition::query()
            ->orderBy('name')
            ->get()
            ->map(function (ReportDefinition $definition) use ($user) {
                return [
                    'id' => $definition->id,
                    'slug' => $definition->slug,
                    'name' => $definition->name,
                    'sql_query' => $user?->isAdmin() ? $definition->sql_query : null,
                    'filter_schema' => $definition->filter_schema ?? [],
                    'is_active' => (bool) $definition->is_active,
                    'created_at' => optional($definition->created_at)->toDateTimeString(),
                    'updated_at' => optional($definition->updated_at)->toDateTimeString(),
                ];
            });

        return response()->json(['status' => 'success', 'data' => $definitions]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only admin can manage reports.');

        $validated = $request->validate([
            'slug' => ['required', 'string', 'max:120', 'unique:report_definitions,slug'],
            'name' => ['required', 'string', 'max:255'],
            'sql_query' => ['required', 'string'],
            'filter_schema' => ['nullable', 'array'],
            'is_active' => ['required', 'boolean'],
        ]);

        $report = ReportDefinition::query()->create([
            'slug' => $validated['slug'],
            'name' => $validated['name'],
            'sql_query' => $this->normalizeSqlQuery($validated['sql_query']),
            'filter_schema' => $validated['filter_schema'] ?? [],
            'is_active' => (bool) $validated['is_active'],
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
        ]);

        return response()->json(['status' => 'success', 'data' => $report], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only admin can manage reports.');

        $report = ReportDefinition::query()->findOrFail($id);
        $validated = $request->validate([
            'slug' => ['required', 'string', 'max:120', 'unique:report_definitions,slug,' . $report->id],
            'name' => ['required', 'string', 'max:255'],
            'sql_query' => ['required', 'string'],
            'filter_schema' => ['nullable', 'array'],
            'is_active' => ['required', 'boolean'],
        ]);

        $report->update([
            'slug' => $validated['slug'],
            'name' => $validated['name'],
            'sql_query' => $this->normalizeSqlQuery($validated['sql_query']),
            'filter_schema' => $validated['filter_schema'] ?? [],
            'is_active' => (bool) $validated['is_active'],
            'updated_by' => Auth::id(),
        ]);

        return response()->json(['status' => 'success', 'data' => $report->fresh()]);
    }

    public function run(Request $request, int $id): JsonResponse
    {
        $report = ReportDefinition::query()->where('is_active', true)->findOrFail($id);
        $filters = $request->all();

        // Keep every declared filter key in bindings so optional predicates can resolve with NULL.
        $bindings = $this->buildBindings($report->filter_schema ?? [], $filters);

        $rows = $this->runSelectWithNamedBindings($report->sql_query, $bindings);

        // Special handling for GST R1 report: return both summary and detailed sheets
        if ($report->slug === 'gst-r1-report') {
            $detailedRows = $rows;

            $summaryQuery = <<<'SQL'
SELECT
  o.invoice_no,
  o.invoice_date,
  o.ref_no,
  o.customer_name,
  o.customer_phone,
  o.custom_gstin,
  o.state,
  o.sales_channel,
  ROUND(COALESCE(oi.gst_rate, 0), 2) AS gst_rate,
  SUM(oi.quantity) AS quantity,
  ROUND(SUM(GREATEST((COALESCE(oi.quantity, 0) * COALESCE(oi.selling_price, 0)) - COALESCE(oi.discount, 0), 0)), 2) AS taxable_value,
  ROUND(SUM(COALESCE(oi.gst_amount, 0)), 2) AS gst_amount,
  ROUND(SUM(GREATEST((COALESCE(oi.quantity, 0) * COALESCE(oi.selling_price, 0)) - COALESCE(oi.discount, 0), 0)) + SUM(COALESCE(oi.gst_amount, 0)), 2) AS invoice_value
FROM order_items oi
INNER JOIN orders o ON o.id = oi.order_id
WHERE
  o.invoice_no IS NOT NULL
  AND o.invoice_no <> ''
  AND o.invoice_date IS NOT NULL
  AND (:date_from IS NULL OR o.invoice_date >= :date_from)
  AND (:date_to IS NULL OR o.invoice_date <= :date_to)
  AND (:state IS NULL OR o.state = :state)
  AND (:custom_gstin IS NULL OR o.custom_gstin = :custom_gstin)
GROUP BY
  o.invoice_no,
  o.invoice_date,
  o.ref_no,
  o.customer_name,
  o.customer_phone,
  o.custom_gstin,
  o.state,
  o.sales_channel,
  oi.gst_rate
ORDER BY
  o.invoice_date ASC,
  o.invoice_no ASC,
  oi.gst_rate ASC
SQL;

            $summaryRows = $this->runSelectWithNamedBindings($summaryQuery, $bindings);

            return response()->json([
                'status' => 'success',
                'data' => [
                    'report' => [
                        'id' => $report->id,
                        'slug' => $report->slug,
                        'name' => $report->name,
                        'filter_schema' => $report->filter_schema ?? [],
                    ],
                    'rows' => $detailedRows,
                    'summary' => $summaryRows,
                    'is_gst_r1' => true,
                    'applied_filters' => $bindings,
                ],
            ]);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'report' => [
                    'id' => $report->id,
                    'slug' => $report->slug,
                    'name' => $report->name,
                    'filter_schema' => $report->filter_schema ?? [],
                ],
                'rows' => $rows,
                'applied_filters' => $bindings,
            ],
        ]);
    }

    private function normalizeSqlQuery(string $sql): string
    {
        $sql = trim($sql);
        // Support UI-friendly alias syntax like: AS {Transaction Type}
        $sql = preg_replace('/\bAS\s*\{([^}]+)\}/i', 'AS `$1`', $sql) ?? $sql;

        if (!str_starts_with(strtoupper($sql), 'SELECT')) {
            abort(422, 'Only SELECT queries are allowed.');
        }

        if (str_contains(strtoupper($sql), ';')) {
            abort(422, 'Semicolons are not allowed in report SQL.');
        }

        return $sql;
    }

    private function buildBindings(array $schema, array $filters): array
    {
        $bindings = [];
        foreach ($schema as $field) {
            $key = $field['key'] ?? null;
            if (!$key) {
                continue;
            }

            $value = $filters[$key] ?? null;
            $bindings[$key] = ($value === '' ? null : $value);
        }

        return $bindings;
    }

    private function runSelectWithNamedBindings(string $sql, array $bindings): array
    {
        [$resolvedSql, $resolvedBindings] = $this->resolveNamedBindings($sql, $bindings);

        return DB::select($resolvedSql, $resolvedBindings);
    }

    private function resolveNamedBindings(string $sql, array $bindings): array
    {
        $occurrenceCount = [];
        $resolvedBindings = [];

        $resolvedSql = preg_replace_callback('/:([a-zA-Z_][a-zA-Z0-9_]*)/', function (array $matches) use (&$occurrenceCount, &$resolvedBindings, $bindings) {
            $name = $matches[1];
            $occurrenceCount[$name] = ($occurrenceCount[$name] ?? 0) + 1;

            $uniqueName = $name . '__' . $occurrenceCount[$name];
            $resolvedBindings[$uniqueName] = $bindings[$name] ?? null;

            return ':' . $uniqueName;
        }, $sql) ?? $sql;

        return [$resolvedSql, $resolvedBindings];
    }
}
