<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DispatchController extends Controller
{
    public function uploadTempInvoice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ref_no' => ['nullable', 'digits:12'],
            'invoice' => [
                'required',
                'file',
                'max:5120',
                'mimetypes:application/pdf,application/x-pdf,image/jpeg,image/png,image/jpg,application/octet-stream',
            ],
        ]);

        $userId = (int) $request->user()->id;
    $refNo = preg_replace('/[^0-9]/', '', (string) ($validated['ref_no'] ?? ''));
        $file = $validated['invoice'];
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'pdf');

    $tmpPrefix = $refNo !== '' ? $refNo : (string) $userId;
    $tmpFileName = sprintf('%s_tmp_%s.%s', $tmpPrefix, Str::random(10), $extension);
        $tmpPath = $file->storeAs('dispatch_invoices/tmp/' . now()->format('Y/m/d'), $tmpFileName, 'local');

        $tempId = (string) Str::uuid();
        Cache::put($this->tempInvoiceCacheKey($tempId), [
            'user_id' => $userId,
            'path' => $tmpPath,
            'extension' => $extension,
            'original_name' => (string) $file->getClientOriginalName(),
        ], now()->addMinutes(30));

        return response()->json([
            'status' => 'success',
            'data' => [
                'temp_id' => $tempId,
                'original_name' => (string) $file->getClientOriginalName(),
            ],
        ]);
    }

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
                'ref_no' => $refNo,
                'expires_in_seconds' => 600,
            ],
        ]);
    }

    public function skuOptions(Request $request): JsonResponse
    {
        $search = mb_strtoupper(trim((string) $request->query('q', '')));

        $items = Inventory::query()
            ->select(['product_id', 'fixed_sku', 'product_name', 'mrp', 'quantity', 'item_type', 'gst_rate', 'cost_per_unit', 'selling_price'])
            ->whereNotNull('fixed_sku')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->whereRaw('UPPER(fixed_sku) LIKE ?', ["%{$search}%"])
                        ->orWhereRaw('UPPER(product_id) LIKE ?', ["%{$search}%"])
                        ->orWhereRaw('UPPER(product_name) LIKE ?', ["%{$search}%"]);
                });
            })
            ->orderBy('fixed_sku')
            ->limit(50)
            ->get()
            ->map(function ($row) {
                $productId = mb_strtoupper((string) $row->product_id);
                $fixedSku = mb_strtoupper((string) $row->fixed_sku);
                $name = mb_strtoupper((string) $row->product_name);
                $mrp = number_format((float) $row->mrp, 2, '.', '');

                return [
                    'product_id' => $productId,
                    'fixed_sku' => $fixedSku,
                    'product_name' => $name,
                    'mrp' => (float) $row->mrp,
                    'quantity' => (int) $row->quantity,
                    'item_type' => mb_strtoupper((string) $row->item_type),
                    'gst_rate' => (float) $row->gst_rate,
                    'cost_per_unit' => (float) $row->cost_per_unit,
                    'selling_price' => (float) $row->selling_price,
                    'label' => "{$productId} - {$fixedSku} - {$name} ({$mrp})",
                ];
            })
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => $items,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ref_no' => ['required', 'digits:12'],
            'customer_name' => ['required', 'string', 'max:200'],
            'sales_channel' => ['required', 'string', 'max:50'],
            'invoice_temp_id' => ['required', 'string', 'max:100'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.sku_scanned' => ['required', 'string', 'max:150'],
            'items.*.fixed_sku' => ['required', 'string', 'max:100'],
            'items.*.source_type' => ['required', 'in:OWN,VENDOR'],
            'items.*.vendor_name' => ['nullable', 'string', 'max:255'],
            'items.*.additional_details' => ['nullable', 'string'],
        ]);

        $userId = (int) $request->user()->id;
        $refNo = (string) $validated['ref_no'];
        $invoiceTempId = (string) $validated['invoice_temp_id'];

        $reservedBy = Cache::get($this->reservedRefCacheKey($refNo));
        if ((int) $reservedBy !== $userId) {
            throw ValidationException::withMessages([
                'ref_no' => 'Reference number expired or invalid. Please refresh and try again.',
            ]);
        }

        $tempInvoice = Cache::get($this->tempInvoiceCacheKey($invoiceTempId));
        if (!is_array($tempInvoice) || (int) ($tempInvoice['user_id'] ?? 0) !== $userId) {
            throw ValidationException::withMessages([
                'invoice_temp_id' => 'Invoice upload session expired. Please upload invoice again.',
            ]);
        }

        $tempPath = (string) ($tempInvoice['path'] ?? '');
        $tempExtension = strtolower((string) ($tempInvoice['extension'] ?? 'pdf'));
        if (!$tempPath || !Storage::disk('local')->exists($tempPath)) {
            throw ValidationException::withMessages([
                'invoice_temp_id' => 'Uploaded invoice file was not found. Please re-upload.',
            ]);
        }

        $customerName = mb_strtoupper(trim($validated['customer_name']));
        $salesChannel = mb_strtoupper(trim($validated['sales_channel']));
        $preparedItems = $this->prepareItems($validated['items']);

        $order = DB::transaction(function () use ($refNo, $customerName, $salesChannel, $userId, $preparedItems, $tempPath, $tempExtension) {
            if (Order::query()->where('ref_no', $refNo)->exists()) {
                throw ValidationException::withMessages([
                    'ref_no' => 'Reference number already used. Please refresh and submit again.',
                ]);
            }

            $safeRefNo = preg_replace('/[^0-9]/', '', $refNo) ?: $refNo;
            $fileName = sprintf('%s_invoice_%s.%s', $safeRefNo, now()->format('Hisv'), $tempExtension);
            $filePath = 'dispatch_invoices/' . now()->format('Y/m') . '/' . $fileName;
            Storage::disk('local')->move($tempPath, $filePath);

            $orderPayload = [
                'ref_no' => $refNo,
                'order_date' => now()->toDateString(),
                'sales_channel' => $salesChannel,
                'customer_name' => $customerName,
                'status' => 'dispatched',
                'dispatch_date' => now()->toDateString(),
                'invoice_file_path' => $filePath,
                'created_by' => $userId,
            ];

            if (Schema::hasColumn('orders', 'updated_by')) {
                $orderPayload['updated_by'] = $userId;
            }

            $order = Order::query()->create($orderPayload);

            foreach ($preparedItems as $item) {
                $order->items()->create([
                    'order_id' => $order->id,
                    'ref_no' => $order->ref_no,
                    'sku_scanned' => $item['sku_scanned'],
                    'fixed_sku' => $item['fixed_sku'],
                    'quantity' => $item['quantity'],
                    'source_type' => $item['source_type'],
                    'vendor_name' => $item['vendor_name'],
                    'notes' => $item['notes'],
                ]);
            }

            return $order->fresh('items');
        });

        Cache::forget($this->userRefCacheKey($userId));
        Cache::forget($this->reservedRefCacheKey($refNo));
        Cache::forget($this->tempInvoiceCacheKey($invoiceTempId));

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $order->id,
                'ref_no' => $order->ref_no,
                'total_amount' => $order->total_amount,
                'total_tax' => $order->total_tax,
                'total_profit' => $order->total_profit,
            ],
        ], 201);
    }

    public function invoice(Request $request, int $orderId)
    {
        $order = Order::query()->findOrFail($orderId);
        if (!$order->invoice_file_path || !Storage::disk('local')->exists($order->invoice_file_path)) {
            abort(404, 'Invoice file not found.');
        }

        $ext = pathinfo($order->invoice_file_path, PATHINFO_EXTENSION) ?: 'pdf';
        $downloadName = sprintf('%s_invoice.%s', $order->ref_no, $ext);

        return Storage::disk('local')->download($order->invoice_file_path, $downloadName);
    }

    public function dashboardStats(): JsonResponse
    {
        $pendingCount = (int) Order::query()
            ->whereIn(DB::raw('UPPER(status)'), ['PENDING', 'PACKED', 'DISPATCHED'])
            ->distinct('ref_no')
            ->count('ref_no');

        $lastRefNo = (string) (Order::query()
            ->whereIn(DB::raw('UPPER(status)'), ['PENDING', 'PACKED', 'DISPATCHED'])
            ->latest('created_at')
            ->value('ref_no') ?? '');

        $startDate = now()->subDays(6)->startOfDay();
        $dispatchMap = Order::query()
            ->selectRaw('DATE(dispatch_date) as d, COUNT(DISTINCT ref_no) as c')
            ->whereRaw('UPPER(status) = ?', ['DISPATCHED'])
            ->whereNotNull('dispatch_date')
            ->whereDate('dispatch_date', '>=', $startDate->toDateString())
            ->groupBy('d')
            ->pluck('c', 'd');

        $weeklyStats = collect(range(0, 6))->map(function ($offset) use ($startDate, $dispatchMap) {
            $day = $startDate->copy()->addDays($offset)->toDateString();
            return [
                'date' => $day,
                'count' => (int) ($dispatchMap[$day] ?? 0),
            ];
        })->values();

        $recentActivities = Order::query()
            ->withCount('items')
            ->with(['creator:id,name'])
            // Show the latest five orders regardless of status.
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->map(function (Order $order) {
                return [
                    'id' => $order->id,
                    'ref_no' => $order->ref_no,
                    'customer_name' => $order->customer_name,
                    'sales_channel' => $order->sales_channel,
                    'item_count' => (int) $order->items_count,
                    'status' => $order->status,
                    'order_date' => optional($order->order_date)->toDateString(),
                    'created_at' => optional($order->created_at)->toDateTimeString(),
                ];
            })
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => [
                'pendingCount' => $pendingCount,
                'lastRefNo' => $lastRefNo,
                'weeklyStats' => $weeklyStats,
                'recentActivities' => $recentActivities,
            ],
        ]);
    }

    public function logs(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $perPage = min(max((int) $request->query('per_page', 10), 1), 100);

        $query = Order::query()
            ->withCount('items')
            ->with(['creator:id,name', 'updater:id,name']);

        if ($search !== '') {
            $term = mb_strtoupper($search);
            $query->where(function ($inner) use ($term) {
                $inner->whereRaw('UPPER(ref_no) LIKE ?', ["%{$term}%"])
                    ->orWhereRaw('UPPER(customer_name) LIKE ?', ["%{$term}%"])
                    ->orWhereRaw('UPPER(sales_channel) LIKE ?', ["%{$term}%"]);
            });
        }

        $logs = $query->latest('created_at')->paginate($perPage);

        $logs->getCollection()->transform(function (Order $order) {
            return [
                'id' => $order->id,
                'ref_no' => $order->ref_no,
                'customer_name' => $order->customer_name,
                'sales_channel' => $order->sales_channel,
                'sku_count' => (int) $order->items_count,
                'status' => $order->status,
                'created_at' => optional($order->created_at)->toDateTimeString(),
                'created_by' => $order->creator?->name ?? 'N/A',
                'updated_by' => $order->updater?->name ?? 'N/A',
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $logs,
        ]);
    }

    public function logDetails(string $refNo): JsonResponse
    {
        $order = Order::query()
            ->with(['items', 'creator:id,name', 'updater:id,name'])
            ->where('ref_no', $refNo)
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $order->id,
                'ref_no' => $order->ref_no,
                'customer_name' => $order->customer_name,
                'sales_channel' => $order->sales_channel,
                'status' => $order->status,
                'order_date' => optional($order->order_date)->toDateString(),
                'dispatch_date' => optional($order->dispatch_date)->toDateString(),
                'created_at' => optional($order->created_at)->toDateTimeString(),
                'updated_at' => optional($order->updated_at)->toDateTimeString(),
                'created_by' => $order->creator?->name ?? 'N/A',
                'updated_by' => $order->updater?->name ?? 'N/A',
                'item_count' => $order->items->count(),
                'has_invoice' => (bool) $order->invoice_file_path,
                'items' => $order->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'sku_scanned' => $item->sku_scanned,
                        'fixed_sku' => $item->fixed_sku,
                        'quantity' => (int) $item->quantity,
                        'additional_details' => $item->notes,
                    ];
                })->values(),
            ],
        ]);
    }

    private function generateUniqueRefNo(): string
    {
        // 12-digit datetime token: yymmddHHMMSS.
        for ($i = 0; $i < 5; $i++) {
            $candidate = now()->format('ymdHis');
            if (!Order::query()->where('ref_no', $candidate)->exists()) {
                return $candidate;
            }
            usleep(300000);
        }

        return now()->addSecond()->format('ymdHis');
    }

    private function reserveUniqueRefNo(int $userId): string
    {
        for ($i = 0; $i < 8; $i++) {
            $candidate = $this->generateUniqueRefNo();
            $reserved = Cache::add($this->reservedRefCacheKey($candidate), $userId, now()->addMinutes(10));

            if ($reserved) {
                return $candidate;
            }

            usleep(120000);
        }

        throw ValidationException::withMessages([
            'ref_no' => 'Unable to reserve reference number. Please retry.',
        ]);
    }

    private function userRefCacheKey(int $userId): string
    {
        return "dispatch:ref:user:{$userId}";
    }

    private function reservedRefCacheKey(string $refNo): string
    {
        return "dispatch:ref:reserved:{$refNo}";
    }

    private function tempInvoiceCacheKey(string $tempId): string
    {
        return "dispatch:invoice:temp:{$tempId}";
    }

    private function prepareItems(array $rawItems): array
    {
        $fixedSkus = collect($rawItems)
            ->pluck('fixed_sku')
            ->map(fn ($value) => mb_strtoupper(trim((string) $value)))
            ->unique()
            ->values();

        $inventoryMap = Inventory::query()
            ->whereIn(DB::raw('UPPER(fixed_sku)'), $fixedSkus->all())
            ->get()
            ->keyBy(fn ($row) => mb_strtoupper((string) $row->fixed_sku));

        return collect($rawItems)->map(function ($item) use ($inventoryMap) {
            $fixedSku = mb_strtoupper(trim((string) $item['fixed_sku']));
            $skuScanned = mb_strtoupper(trim((string) $item['sku_scanned']));
            $quantity = 1;
            $notes = isset($item['additional_details']) ? trim((string) $item['additional_details']) : null;
            $sourceType = mb_strtoupper(trim((string) ($item['source_type'] ?? 'OWN')));
            $vendorName = trim((string) ($item['vendor_name'] ?? ''));

            $inventory = $inventoryMap->get($fixedSku);
            if (!$inventory) {
                throw ValidationException::withMessages([
                    'items' => "Fixed SKU {$fixedSku} was not found in inventory.",
                ]);
            }

            return [
                'sku_scanned' => $skuScanned,
                'fixed_sku' => $fixedSku,
                'quantity' => $quantity,
                'notes' => $notes,
                'source_type' => $sourceType === 'VENDOR' ? 'VENDOR' : 'OWN',
                'vendor_name' => $sourceType === 'VENDOR' ? mb_strtoupper($vendorName) : null,
            ];
        })->values()->all();
    }
}
