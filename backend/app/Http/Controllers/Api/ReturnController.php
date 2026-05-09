<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\RtoPackage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ReturnController extends Controller
{
    private const STATUS_OPTIONS = [
        'RTO DELIVERED - DAMAGED CONDITION',
        'RTO DELIVERED - PERFECT CONDITION',
    ];

    public function reserveRefNo(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;
        $cacheKey = $this->userRefCacheKey($userId);

        $refNo = Cache::get($cacheKey);
        if ($refNo) {
            $reservedBy = Cache::get($this->reservedRefCacheKey($refNo));
            if ((int) $reservedBy !== $userId) {
                $refNo = null;
            }
        }

        if (!$refNo) {
            $refNo = $this->reserveUniqueRefNo($userId);
            Cache::put($cacheKey, $refNo, now()->addMinutes(10));
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'return_ref_no' => $refNo,
                'expires_in_seconds' => 600,
            ],
        ]);
    }

    public function skuOptions(Request $request): JsonResponse
    {
        $search = mb_strtoupper(trim((string) $request->query('q', '')));

        $items = Inventory::query()
            ->select(['fixed_sku', 'product_name'])
            ->whereNotNull('fixed_sku')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->whereRaw('UPPER(fixed_sku) LIKE ?', ["%{$search}%"])
                        ->orWhereRaw('UPPER(product_name) LIKE ?', ["%{$search}%"]);
                });
            })
            ->orderBy('fixed_sku')
            ->limit(50)
            ->get()
            ->map(fn ($row) => [
                'sku_fixed' => mb_strtoupper((string) $row->fixed_sku),
                'product_name' => mb_strtoupper((string) $row->product_name),
                'label' => mb_strtoupper((string) $row->fixed_sku) . ' - ' . mb_strtoupper((string) $row->product_name),
            ])
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => $items,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'return_ref_no' => ['required', 'string', 'max:40'],
            'customer_name' => ['required', 'string', 'max:200'],
            'sales_channel' => ['required', 'string', 'max:50'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.sku_ref' => ['required', 'string', 'max:150'],
            'items.*.sku_fixed' => ['required', 'string', 'max:100'],
            'items.*.additional_details' => ['nullable', 'string'],
            'items.*.status' => ['required', 'in:' . implode(',', self::STATUS_OPTIONS)],
        ]);

        $userId = (int) $request->user()->id;
        $refNo = mb_strtoupper(trim((string) $validated['return_ref_no']));

        $reservedBy = Cache::get($this->reservedRefCacheKey($refNo));
        if ((int) $reservedBy !== $userId) {
            return response()->json([
                'status' => 'error',
                'message' => 'Return reference number expired or invalid. Please refresh and try again.',
            ], 422);
        }

        $customerName = mb_strtoupper(trim((string) $validated['customer_name']));
        $salesChannel = mb_strtoupper(trim((string) $validated['sales_channel']));

        DB::transaction(function () use ($validated, $refNo, $customerName, $salesChannel, $userId) {
            foreach ($validated['items'] as $item) {
                RtoPackage::query()->create([
                    'return_ref_no' => $refNo,
                    'customer_name' => $customerName,
                    'sales_channel' => $salesChannel,
                    'sku_ref' => mb_strtoupper(trim((string) $item['sku_ref'])),
                    'sku_fixed' => mb_strtoupper(trim((string) $item['sku_fixed'])),
                    'additional_details' => trim((string) ($item['additional_details'] ?? '')) ?: null,
                    'status' => mb_strtoupper(trim((string) $item['status'])),
                    'created_by' => $userId,
                ]);
            }
        });

        Cache::forget($this->userRefCacheKey($userId));
        Cache::forget($this->reservedRefCacheKey($refNo));

        return response()->json([
            'status' => 'success',
            'data' => [
                'return_ref_no' => $refNo,
            ],
        ], 201);
    }

    public function dashboardStats(): JsonResponse
    {
        $totalReturns = (int) RtoPackage::query()
            ->distinct('return_ref_no')
            ->count('return_ref_no');

        $salesChannelWise = RtoPackage::query()
            ->selectRaw('sales_channel, COUNT(DISTINCT return_ref_no) as count')
            ->groupBy('sales_channel')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => [
                'sales_channel' => $row->sales_channel,
                'count' => (int) $row->count,
            ])
            ->values();

        $startDate = now()->subDays(6)->startOfDay();
        $dailyMap = RtoPackage::query()
            ->selectRaw('DATE(created_at) as d, COUNT(DISTINCT return_ref_no) as c')
            ->whereDate('created_at', '>=', $startDate->toDateString())
            ->groupBy('d')
            ->pluck('c', 'd');

        $weeklyStats = collect(range(0, 6))->map(function ($offset) use ($startDate, $dailyMap) {
            $day = $startDate->copy()->addDays($offset)->toDateString();
            return [
                'date' => $day,
                'count' => (int) ($dailyMap[$day] ?? 0),
            ];
        })->values();

        return response()->json([
            'status' => 'success',
            'data' => [
                'totalReturns' => $totalReturns,
                'salesChannelWise' => $salesChannelWise,
                'weeklyStats' => $weeklyStats,
            ],
        ]);
    }

    public function logs(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $from = trim((string) $request->query('from', ''));
        $to = trim((string) $request->query('to', ''));

        $query = RtoPackage::query();

        if ($search !== '') {
            $term = mb_strtoupper($search);
            $query->where(function ($inner) use ($term) {
                $inner->whereRaw('UPPER(return_ref_no) LIKE ?', ["%{$term}%"])
                    ->orWhereRaw('UPPER(customer_name) LIKE ?', ["%{$term}%"])
                    ->orWhereRaw('UPPER(sales_channel) LIKE ?', ["%{$term}%"])
                    ->orWhereRaw('UPPER(sku_ref) LIKE ?', ["%{$term}%"])
                    ->orWhereRaw('UPPER(sku_fixed) LIKE ?', ["%{$term}%"]);
            });
        }

        if ($from !== '') {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to !== '') {
            $query->whereDate('created_at', '<=', $to);
        }

        $logs = $query
            ->leftJoin('users', 'rto_packages.created_by', '=', 'users.id')
            ->selectRaw('rto_packages.return_ref_no, MAX(rto_packages.customer_name) as customer_name, MAX(rto_packages.sales_channel) as sales_channel, COUNT(*) as items_count, MAX(rto_packages.created_at) as created_at, MAX(users.name) as created_by_name')
            ->groupBy('rto_packages.return_ref_no')
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($row) {
                return [
                    'return_ref_no' => $row->return_ref_no,
                    'customer_name' => $row->customer_name,
                    'sales_channel' => $row->sales_channel,
                    'items_count' => (int) $row->items_count,
                    'created_at' => (string) $row->created_at,
                    'created_by' => $row->created_by_name ?: 'N/A',
                ];
            })
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => $logs,
        ]);
    }

    public function logDetails(string $returnRefNo): JsonResponse
    {
        $rows = RtoPackage::query()
            ->with('creator:id,name')
            ->where('return_ref_no', $returnRefNo)
            ->orderBy('id')
            ->get([
                'id',
                'return_ref_no',
                'customer_name',
                'sales_channel',
                'sku_ref',
                'sku_fixed',
                'additional_details',
                'status',
                'created_at',
                'created_by',
            ])
            ->map(fn ($row) => [
                'id' => $row->id,
                'return_ref_no' => $row->return_ref_no,
                'customer_name' => $row->customer_name,
                'sales_channel' => $row->sales_channel,
                'sku_ref' => $row->sku_ref,
                'sku_fixed' => $row->sku_fixed,
                'additional_details' => $row->additional_details,
                'status' => mb_strtoupper((string) $row->status),
                'created_at' => optional($row->created_at)?->toDateTimeString(),
                'created_by' => $row->creator?->name ?? 'N/A',
            ])
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => $rows,
        ]);
    }

    private function reserveUniqueRefNo(int $userId): string
    {
        $attempts = 0;
        do {
            $attempts++;
            $refNo = 'RTO' . now()->format('ymdHis') . str_pad((string) random_int(0, 99), 2, '0', STR_PAD_LEFT);
            $alreadyUsed = RtoPackage::query()->where('return_ref_no', $refNo)->exists();
            $alreadyReserved = Cache::has($this->reservedRefCacheKey($refNo));
        } while (($alreadyUsed || $alreadyReserved) && $attempts < 20);

        Cache::put($this->reservedRefCacheKey($refNo), $userId, now()->addMinutes(10));
        return $refNo;
    }

    private function userRefCacheKey(int $userId): string
    {
        return "return_ref_user_{$userId}";
    }

    private function reservedRefCacheKey(string $refNo): string
    {
        return 'return_ref_reserved_' . $refNo;
    }
}
