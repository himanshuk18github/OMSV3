<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FormulaConfig;
use App\Models\FormulaConfigVersion;
use Illuminate\Support\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class FormulaConfigController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $today = now('Asia/Kolkata')->toDateString();

        $configs = FormulaConfig::query()
            ->where('is_active', true)
            ->with(['versions' => function ($query) {
                $query->orderByDesc('effective_from')->orderByDesc('version_no');
            }])
            ->orderBy('display_name')
            ->get()
            ->map(function (FormulaConfig $config) use ($today) {
                $activeVersion = $config->versions->first(function (FormulaConfigVersion $version) use ($today) {
                    return $version->is_active
                        && $version->effective_from->toDateString() <= $today
                        && (!$version->effective_to || $version->effective_to->toDateString() >= $today);
                });

                return [
                    'id' => $config->id,
                    'formula_name' => $config->formula_name,
                    'display_name' => $config->display_name,
                    'description' => $config->description,
                    'active_template' => $activeVersion?->formula_template,
                    'active_effective_from' => optional($activeVersion?->effective_from)->toDateString(),
                    'versions' => $config->versions->map(fn (FormulaConfigVersion $version) => [
                        'id' => $version->id,
                        'version_no' => $version->version_no,
                        'effective_from' => optional($version->effective_from)->toDateString(),
                        'effective_to' => optional($version->effective_to)->toDateString(),
                        'formula_template' => $version->formula_template,
                        'change_note' => $version->change_note,
                        'is_active' => (bool) $version->is_active,
                        'created_at' => optional($version->created_at)->toDateTimeString(),
                    ])->values(),
                ];
            })
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => $configs,
        ]);
    }

    public function upsertInvoiceGenSequence(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only admin can manage formula configurations.');

        $validated = $request->validate([
            'formula_template' => ['required', 'string', 'max:500'],
            'effective_from' => ['required', 'date'],
            'change_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $template = trim((string) $validated['formula_template']);
        if (!preg_match('/\{\{seq\d+\}\}/', $template)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Template must contain a sequence placeholder like {{seq2}}.',
            ], 422);
        }

        $userId = (int) $request->user()->id;

        $result = DB::transaction(function () use ($validated, $template, $userId) {
            $config = FormulaConfig::query()
                ->where('formula_name', 'invoice_gen_sequence')
                ->lockForUpdate()
                ->firstOrFail();

            $effectiveFrom = (string) $validated['effective_from'];

            $duplicate = FormulaConfigVersion::query()
                ->where('formula_config_id', $config->id)
                ->whereDate('effective_from', $effectiveFrom)
                ->exists();

            if ($duplicate) {
                return ['duplicate' => true];
            }

            $lastVersionNo = (int) FormulaConfigVersion::query()
                ->where('formula_config_id', $config->id)
                ->max('version_no');

            FormulaConfigVersion::query()->create([
                'formula_config_id' => $config->id,
                'version_no' => $lastVersionNo + 1,
                'effective_from' => $effectiveFrom,
                'effective_to' => null,
                'formula_template' => $template,
                'change_note' => trim((string) ($validated['change_note'] ?? '')) ?: null,
                'is_active' => true,
                'created_by' => $userId,
            ]);

            $this->rebalanceEffectiveWindows((int) $config->id);

            $config->update([
                'updated_by' => $userId,
            ]);

            return ['duplicate' => false];
        });

        if ($result['duplicate']) {
            return response()->json([
                'status' => 'error',
                'message' => 'A formula version already exists for this effective date.',
            ], 422);
        }

        Cache::increment('invoice:ref:config:version');

        return response()->json([
            'status' => 'success',
            'message' => 'Formula version saved successfully.',
        ], 201);
    }

    public function updateInvoiceGenSequence(Request $request, int $versionId): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only admin can manage formula configurations.');

        $validated = $request->validate([
            'formula_template' => ['required', 'string', 'max:500'],
            'effective_from' => ['required', 'date'],
            'change_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $template = trim((string) $validated['formula_template']);
        if (!preg_match('/\{\{seq\d+\}\}/', $template)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Template must contain a sequence placeholder like {{seq2}}.',
            ], 422);
        }

        $userId = (int) $request->user()->id;

        $result = DB::transaction(function () use ($validated, $template, $userId, $versionId) {
            $config = FormulaConfig::query()
                ->where('formula_name', 'invoice_gen_sequence')
                ->lockForUpdate()
                ->firstOrFail();

            $version = FormulaConfigVersion::query()
                ->where('formula_config_id', $config->id)
                ->where('id', $versionId)
                ->lockForUpdate()
                ->firstOrFail();

            $effectiveFrom = (string) $validated['effective_from'];

            $duplicate = FormulaConfigVersion::query()
                ->where('formula_config_id', $config->id)
                ->whereDate('effective_from', $effectiveFrom)
                ->where('id', '!=', $version->id)
                ->exists();

            if ($duplicate) {
                return ['duplicate' => true];
            }

            $version->update([
                'effective_from' => $effectiveFrom,
                'formula_template' => $template,
                'change_note' => trim((string) ($validated['change_note'] ?? '')) ?: null,
            ]);

            $this->rebalanceEffectiveWindows((int) $config->id);

            $config->update([
                'updated_by' => $userId,
            ]);

            return ['duplicate' => false];
        });

        if ($result['duplicate']) {
            return response()->json([
                'status' => 'error',
                'message' => 'A formula version already exists for this effective date.',
            ], 422);
        }

        Cache::increment('invoice:ref:config:version');

        return response()->json([
            'status' => 'success',
            'message' => 'Formula version updated successfully.',
        ]);
    }

    private function rebalanceEffectiveWindows(int $formulaConfigId): void
    {
        $versions = FormulaConfigVersion::query()
            ->where('formula_config_id', $formulaConfigId)
            ->orderBy('effective_from')
            ->orderBy('version_no')
            ->lockForUpdate()
            ->get();

        $count = $versions->count();
        for ($i = 0; $i < $count; $i++) {
            $current = $versions[$i];
            $next = $versions[$i + 1] ?? null;

            $effectiveTo = null;
            if ($next) {
                $effectiveTo = Carbon::parse($next->effective_from)->subDay()->toDateString();
            }

            $current->update([
                'effective_to' => $effectiveTo,
            ]);
        }
    }
}
