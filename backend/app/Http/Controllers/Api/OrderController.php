<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\Vendor;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class OrderController extends Controller
{
    public function __construct(private OrderService $orderService) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['status', 'sales_channel', 'search', 'date_from', 'date_to']);
        $perPage = (int) $request->get('per_page', 15);
        $orders = $this->orderService->list($filters, $perPage);
        return response()->json(['status' => 'success', 'data' => $orders]);
    }

    public function show(int $id): JsonResponse
    {
        $order = $this->orderService->show($id);
        return response()->json(['status' => 'success', 'data' => $order]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_date' => 'required|date',
            'sales_channel' => 'required|string|max:50',
            'sales_channel_order_no' => 'nullable|string|max:100',
            'customer_name' => 'required|string|max:200',
            'customer_phone' => 'nullable|string|max:20',
            'customer_email' => 'nullable|email|max:150',
            'shipping_address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:10',
            'order_status' => 'in:draft,pending,confirmed,packed,dispatched,in_transit,delivered,cancelled,rto_delivered',
            'invoice_no' => 'nullable|string|max:100',
            'invoice_date' => 'nullable|date',
            'dispatch_date' => 'nullable|date',
            'tracking_no' => 'nullable|string|max:100',
            'courier_partner' => 'nullable|string|max:100',
            'discount' => 'nullable|numeric|min:0',
            'shipping_charge' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:inventory,product_id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.source_type' => 'required|in:OWN,VENDOR',
            'items.*.vendor_id' => 'nullable|exists:vendors,id',
            'items.*.cost_price' => 'required|numeric|min:0',
            'items.*.selling_price' => 'required|numeric|min:0',
            'items.*.gst_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.discount' => 'nullable|numeric|min:0',
        ]);

        $order = $this->orderService->create($validated);
        return response()->json(['status' => 'success', 'data' => $order], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'order_date' => 'sometimes|date',
            'sales_channel' => 'sometimes|string|max:50',
            'sales_channel_order_no' => 'sometimes|nullable|string|max:100',
            'customer_name' => 'sometimes|string|max:200',
            'customer_phone' => 'nullable|string|max:20',
            'customer_email' => 'nullable|email',
            'shipping_address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:10',
            'order_status' => 'sometimes|in:draft,pending,confirmed,packed,dispatched,in_transit,delivered,cancelled,rto_delivered',
            'invoice_no' => 'nullable|string|max:100',
            'invoice_date' => 'nullable|date',
            'dispatch_date' => 'nullable|date',
            'tracking_no' => 'nullable|string|max:100',
            'courier_partner' => 'nullable|string|max:100',
            'discount' => 'nullable|numeric|min:0',
            'shipping_charge' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'items' => 'sometimes|array|min:1',
            'items.*.product_id' => 'required_with:items|exists:inventory,product_id',
            'items.*.quantity' => 'required_with:items|integer|min:1',
            'items.*.source_type' => 'required_with:items|in:OWN,VENDOR',
            'items.*.vendor_id' => 'nullable|exists:vendors,id',
            'items.*.cost_price' => 'required_with:items|numeric|min:0',
            'items.*.selling_price' => 'required_with:items|numeric|min:0',
            'items.*.gst_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.discount' => 'nullable|numeric|min:0',
        ]);

        $order = $this->orderService->update($id, $validated);
        return response()->json(['status' => 'success', 'data' => $order]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->orderService->delete($id);
        return response()->json(['status' => 'success', 'message' => 'Order deleted.']);
    }

    public function stats(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->orderService->getDashboardStats(),
        ]);
    }

    public function dashboardOverview(Request $request): JsonResponse
    {
        $normalizedStatusExpr = 'LOWER(COALESCE(NULLIF(TRIM(status), ""), "pending"))';
        $statusMap = DB::table('orders')
            ->selectRaw("{$normalizedStatusExpr} as normalized_status, COUNT(DISTINCT ref_no) as c")
            ->groupBy('normalized_status')
            ->pluck('c', 'normalized_status');

        $getStatusCount = function (array $statuses) use ($statusMap): int {
            return (int) collect($statuses)->sum(function ($status) use ($statusMap) {
                return (int) ($statusMap[$status] ?? 0);
            });
        };

        $knownStatuses = ['draft', 'pending', 'confirmed', 'packed', 'dispatched', 'in_transit', 'intransit', 'delivered', 'cancelled', 'rto', 'rto_delivered'];
        $unknownStatusCount = (int) collect($statusMap)->sum(function ($count, $status) use ($knownStatuses) {
            return in_array((string) $status, $knownStatuses, true) ? 0 : (int) $count;
        });

        $pendingOrders = $getStatusCount(['draft', 'pending']) + $unknownStatusCount;
        $confirmedOrders = $getStatusCount(['confirmed']);
        $packedOrders = $getStatusCount(['packed']);
        $dispatchedOrders = $getStatusCount(['dispatched']);
        $inTransitOrders = $getStatusCount(['in_transit', 'intransit']);
        $deliveredOrders = $getStatusCount(['delivered']);
        $cancelledOrders = $getStatusCount(['cancelled']);
        $rtoDeliveredOrders = $getStatusCount(['rto', 'rto_delivered']);

        $activePipeline = $pendingOrders + $confirmedOrders + $packedOrders + $dispatchedOrders + $inTransitOrders;
        $totalOrdersReceived = (int) DB::table('orders')->distinct('ref_no')->count('ref_no');

        $statusCards = [
            ['key' => 'total_orders', 'label' => 'Total Orders', 'count' => $totalOrdersReceived, 'color' => '#1d4ed8'],
            ['key' => 'pending', 'label' => 'Pending Orders', 'count' => $pendingOrders, 'color' => '#2563eb'],
            ['key' => 'confirmed', 'label' => 'Confirmed', 'count' => $confirmedOrders, 'color' => '#0ea5e9'],
            ['key' => 'packed', 'label' => 'Packed', 'count' => $packedOrders, 'color' => '#06b6d4'],
            ['key' => 'dispatched', 'label' => 'Dispatched', 'count' => $dispatchedOrders, 'color' => '#0284c7'],
            ['key' => 'in_transit', 'label' => 'In Transit', 'count' => $inTransitOrders, 'color' => '#f59e0b'],
            ['key' => 'delivered', 'label' => 'Delivered', 'count' => $deliveredOrders, 'color' => '#16a34a'],
            ['key' => 'cancelled', 'label' => 'Cancelled', 'count' => $cancelledOrders, 'color' => '#ef4444'],
            ['key' => 'rto_delivered', 'label' => 'RTO Delivered', 'count' => $rtoDeliveredOrders, 'color' => '#f97316'],
        ];

        $twelveMonthStart = now()->startOfMonth()->subMonths(11);
        $monthlyMap = DB::table('orders')
            ->selectRaw('DATE_FORMAT(COALESCE(order_date, created_at), "%Y-%m-01") as bucket_date, COUNT(DISTINCT ref_no) as c')
            ->whereRaw('DATE(COALESCE(order_date, created_at)) >= ?', [$twelveMonthStart->toDateString()])
            ->groupBy('bucket_date')
            ->orderBy('bucket_date')
            ->pluck('c', 'bucket_date');

        $salesAnalytics = collect(range(0, 11))->map(function (int $offset) use ($twelveMonthStart, $monthlyMap) {
            $date = $twelveMonthStart->copy()->addMonths($offset)->format('Y-m-01');
            return [
                'month' => $date,
                'orders' => (int) ($monthlyMap[$date] ?? 0),
            ];
        })->values()->all();

        $dailyStart = now()->subDays(6)->startOfDay();
        $dailyOrderMap = DB::table('orders')
            ->selectRaw('DATE(COALESCE(order_date, created_at)) as bucket_date, COUNT(DISTINCT ref_no) as c')
            ->whereRaw('DATE(COALESCE(order_date, created_at)) >= ?', [$dailyStart->toDateString()])
            ->groupBy('bucket_date')
            ->orderBy('bucket_date')
            ->pluck('c', 'bucket_date');

        $ordersPerDay = collect(range(0, 6))->map(function (int $offset) use ($dailyStart, $dailyOrderMap) {
            $date = $dailyStart->copy()->addDays($offset)->toDateString();
            return [
                'date' => $date,
                'orders' => (int) ($dailyOrderMap[$date] ?? 0),
            ];
        })->values()->all();

        $revenueThisMonth = (float) DB::table('orders')
            ->whereRaw("{$normalizedStatusExpr} = ?", ['delivered'])
            ->whereMonth(DB::raw('COALESCE(order_date, created_at)'), now()->month)
            ->whereYear(DB::raw('COALESCE(order_date, created_at)'), now()->year)
            ->sum('total_amount');

        $revenueTillDate = (float) DB::table('orders')
            ->whereRaw("{$normalizedStatusExpr} = ?", ['delivered'])
            ->sum('total_amount');

        $channelMap = DB::table('orders')
            ->selectRaw("CASE
                WHEN sales_channel IS NULL OR TRIM(sales_channel) = '' THEN 'Others'
                WHEN LOWER(TRIM(sales_channel)) = 'amazon' THEN 'Amazon'
                WHEN LOWER(TRIM(sales_channel)) = 'flipkart' THEN 'Flipkart'
                WHEN LOWER(TRIM(sales_channel)) = 'meesho' THEN 'Meesho'
                WHEN LOWER(TRIM(sales_channel)) = 'offline' THEN 'Offline'
                WHEN LOWER(TRIM(sales_channel)) = 'website' THEN 'Website'
                ELSE 'Others'
            END as channel_label")
            ->selectRaw('ROUND(SUM(total_amount), 2) as revenue')
            ->whereRaw("{$normalizedStatusExpr} = ?", ['delivered'])
            ->groupBy('channel_label')
            ->pluck('revenue', 'channel_label');

        $channelPalette = [
            'Amazon' => '#f59e0b',
            'Flipkart' => '#2563eb',
            'Meesho' => '#7e22ce',
            'Offline' => '#14b8a6',
            'Website' => '#ea580c',
            'Others' => '#6b7280',
        ];
        $channelLabels = ['Amazon', 'Flipkart', 'Meesho', 'Offline', 'Website', 'Others'];

        $salesChannelBreakdown = collect($channelLabels)->map(function (string $label) use ($channelMap, $channelPalette) {
            return [
                'label' => $label,
                'value' => (float) ($channelMap[$label] ?? 0),
                'color' => $channelPalette[$label],
            ];
        })->values()->all();

        $stockOutStatuses = ['pending', 'confirmed', 'packed', 'dispatched', 'in_transit', 'intransit', 'delivered'];
        $inventoryRows = DB::table('inventory as i')
            ->leftJoinSub(
                DB::table('inventory_logs')
                    ->selectRaw('fixed_sku, SUM(quantity) as stock_update')
                    ->whereNotNull('fixed_sku')
                    ->groupBy('fixed_sku'),
                'su',
                fn($join) => $join->on('su.fixed_sku', '=', 'i.fixed_sku')
            )
            ->leftJoinSub(
                DB::table('order_items as oi')
                    ->join('orders as o', 'o.id', '=', 'oi.order_id')
                    ->selectRaw('oi.fixed_sku, SUM(oi.quantity) as stock_out')
                    ->whereIn(DB::raw('LOWER(COALESCE(NULLIF(TRIM(o.status), ""), "pending"))'), $stockOutStatuses)
                    ->where(function ($query) {
                        $query->whereNull('oi.source_type')
                            ->orWhereRaw('UPPER(oi.source_type) <> ?', ['VENDOR']);
                    })
                    ->groupBy('oi.fixed_sku'),
                'so',
                fn($join) => $join->on('so.fixed_sku', '=', 'i.fixed_sku')
            )
            ->selectRaw('i.fixed_sku, (COALESCE(i.quantity, 0) + COALESCE(su.stock_update, 0) - COALESCE(so.stock_out, 0)) as closing_stock')
            ->get();

        $outOfStockCount = (int) $inventoryRows->filter(fn($row) => (int) $row->closing_stock <= 0)->count();
        $lowStockCount = (int) $inventoryRows->filter(fn($row) => (int) $row->closing_stock > 0 && (int) $row->closing_stock < 5)->count();
        $availableCount = (int) $inventoryRows->filter(fn($row) => (int) $row->closing_stock >= 5)->count();
        $totalProducts = (int) $inventoryRows->count();

        $returnsData = [
            'Delivered' => $deliveredOrders,
            'Cancelled' => $cancelledOrders,
            'RTO' => $rtoDeliveredOrders,
        ];

        $recentOrders = DB::table('orders as o')
            ->leftJoin('order_items as oi', 'oi.order_id', '=', 'o.id')
            ->selectRaw('o.ref_no, o.customer_name, o.sales_channel, o.status, COUNT(DISTINCT oi.fixed_sku) as sku_count')
            ->groupBy('o.id', 'o.ref_no', 'o.customer_name', 'o.sales_channel', 'o.status', 'o.order_date', 'o.created_at')
            ->orderByRaw('COALESCE(o.order_date, DATE(o.created_at)) DESC')
            ->orderByDesc('o.created_at')
            ->limit(5)
            ->get()
            ->map(function ($row) {
                $status = (string) ($row->status ?? '');
                $statusLabel = ucwords(str_replace('_', ' ', strtolower($status)));
                if (strtolower($status) === 'rto') {
                    $statusLabel = 'RTO Delivered';
                }

                return [
                    'ref_no' => (string) $row->ref_no,
                    'customer_name' => (string) ($row->customer_name ?? ''),
                    'sales_channel' => (string) ($row->sales_channel ?: 'Others'),
                    'sku_count' => (int) $row->sku_count,
                    'status' => $statusLabel,
                ];
            })
            ->values()
            ->all();

        $topSellingProducts = DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->leftJoin('inventory as i', 'i.fixed_sku', '=', 'oi.fixed_sku')
            ->whereIn(DB::raw('LOWER(COALESCE(NULLIF(TRIM(o.status), ""), "pending"))'), $stockOutStatuses)
            ->selectRaw('oi.fixed_sku as sku_fixed, COALESCE(MAX(i.product_name), oi.fixed_sku) as product_name, SUM(oi.quantity) as sold_count')
            ->groupBy('oi.fixed_sku')
            ->orderByDesc('sold_count')
            ->limit(5)
            ->get()
            ->map(fn($row) => [
                'sku_fixed' => (string) $row->sku_fixed,
                'product_name' => (string) ($row->product_name ?? $row->sku_fixed),
                'count' => (int) $row->sold_count,
            ])
            ->values()
            ->all();

        return response()->json([
            'status' => 'success',
            'data' => [
                'hero' => [
                    'revenue_this_month' => $revenueThisMonth,
                    'active_pipeline' => $activePipeline,
                    'returns' => $cancelledOrders + $rtoDeliveredOrders,
                ],
                'status_cards' => $statusCards,
                'sales_analytics' => $salesAnalytics,
                'orders_per_day' => $ordersPerDay,
                'settlements_total' => $revenueTillDate,
                'salesChannelBreakdown' => $salesChannelBreakdown,
                'inventory' => [
                    'available' => $availableCount,
                    'low_stock' => $lowStockCount,
                    'out_of_stock' => $outOfStockCount,
                    'total_products' => $totalProducts,
                ],
                'returns_cancellations' => $returnsData,
                'top_selling_products' => $topSellingProducts,
                'recent_orders' => $recentOrders,

                // Backward-compatible fields retained for older dashboard integrations.
                'totalOrdersReceived' => $totalOrdersReceived,
                'pendingUpdateCount' => $pendingOrders,
                'bifurcation' => [
                    ['status' => 'delivered', 'label' => 'Delivered', 'count' => $deliveredOrders, 'color' => '#16a34a'],
                    ['status' => 'cancelled', 'label' => 'Cancelled', 'count' => $cancelledOrders, 'color' => '#ef4444'],
                    ['status' => 'rto_delivered', 'label' => 'RTO', 'count' => $rtoDeliveredOrders, 'color' => '#f59e0b'],
                ],
                'returnTrendData' => [],
                'deliveredRevenueTotal' => $revenueTillDate,
                'chartData' => collect($ordersPerDay)->map(fn($entry) => [
                    'date' => $entry['date'],
                    'count' => $entry['orders'],
                ])->values()->all(),
            ],
        ]);
    }

    public function confirmationList(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => 'nullable|string|max:120',
            'page' => 'nullable|integer|min:1',
            'limit' => 'nullable|integer|min:1|max:200',
        ]);

        $statuses = ['draft', 'pending', 'confirmed', 'packed', 'dispatched'];
        $limit = (int) ($validated['limit'] ?? 10);

        $query = Order::query()
            ->withCount('items as sku_count')
            ->whereIn(DB::raw('LOWER(status)'), $statuses)
            ->when(!empty($validated['search']), function ($q) use ($validated) {
                $search = trim((string) $validated['search']);
                $q->where(function ($qq) use ($search) {
                    $qq->where('ref_no', 'like', "%{$search}%")
                        ->orWhere('customer_name', 'like', "%{$search}%")
                        ->orWhere('sales_channel', 'like', "%{$search}%")
                        ->orWhere('sales_channel_order_no', 'like', "%{$search}%");
                });
            })
            ->orderBy('created_at');

        $paginated = $query->paginate($limit);

        return response()->json([
            'status' => 'success',
            'data' => [
                'orders' => $paginated->items(),
                'total' => $paginated->total(),
                'page' => $paginated->currentPage(),
                'limit' => $paginated->perPage(),
            ],
        ]);
    }

    public function confirmationDetails(string $refNo): JsonResponse
    {
        $order = Order::with(['items', 'creator.role'])->where('ref_no', $refNo)->firstOrFail();

        $items = $order->items->map(function ($item) use ($order) {
            $inventory = Inventory::query()
                ->where('fixed_sku', $item->fixed_sku)
                ->first(['fixed_sku', 'product_name', 'mrp', 'cost_per_unit']);

            return [
                'item_id' => $item->id,
                'quantity' => (int) $item->quantity,
                'order_date' => optional($order->order_date)->format('Y-m-d') ?? now()->toDateString(),
                'sales_channel' => $order->sales_channel,
                'sales_channel_order_no' => $order->sales_channel_order_no,
                'customer_name' => mb_strtoupper((string) ($order->customer_name ?? '')),
                'customer_phone' => (string) ($order->customer_phone ?? ''),
                'customer_email' => (string) ($order->customer_email ?? ''),
                'invoice_no' => (string) ($order->invoice_no ?? ''),
                'invoice_date' => optional($order->invoice_date)->format('Y-m-d'),
                'state' => mb_strtoupper((string) ($order->state ?? '')),
                'fixed_sku' => mb_strtoupper((string) $item->fixed_sku),
                'sku_scanned' => mb_strtoupper((string) $item->sku_scanned),
                'source_type' => mb_strtoupper((string) ($item->source_type ?: 'OWN')),
                'vendor_name' => mb_strtoupper((string) ($item->vendor_name ?? '')),
                'product_name' => mb_strtoupper((string) ($inventory?->product_name ?? '')),
                'extra_details' => $item->notes,
                'mrp' => (float) ($inventory?->mrp ?? 0),
                'cost_price' => (float) $item->cost_price,
                'selling_price' => (float) $item->selling_price,
                'gst_rate' => (float) $item->gst_rate,
                'gst_amount' => (float) $item->gst_amount,
                'line_total' => (float) $item->total_amount,
                'discount' => (float) $item->discount,
                'shipping_cost' => (float) $item->shipping_cost,
                'marketplace_fee' => (float) $item->marketplace_fee,
                'profit' => (float) $item->profit,
            ];
        })->values();

        $skuOptions = Inventory::query()
            ->whereNotNull('fixed_sku')
            ->orderBy('fixed_sku')
            ->get(['fixed_sku', 'product_name', 'mrp', 'cost_per_unit'])
            ->map(fn($sku) => [
                'sku_fixed' => $sku->fixed_sku,
                'product_name' => $sku->product_name,
                'mrp' => (float) ($sku->mrp ?? 0),
                'cost_per_unit' => (float) ($sku->cost_per_unit ?? 0),
            ])
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => [
                'ref_no' => $order->ref_no,
                'status_value' => $order->status,
                'invoice_available' => !empty($order->invoice_file_path),
                'invoice_url' => !empty($order->invoice_file_path)
                    ? url("/api/orders/confirmation/{$order->ref_no}/invoice")
                    : null,
                'created_by_name' => $order->creator?->name,
                'created_by_role' => $order->creator?->role?->name,
                'created_at_ist' => $order->created_at?->copy()->timezone('Asia/Kolkata')->format('d-m-Y h:i:s A'),
                'items' => $items,
                'sku_options' => $skuOptions,
            ],
        ]);
    }

    public function confirmationInvoice(string $refNo)
    {
        $order = Order::where('ref_no', $refNo)->firstOrFail();

        if (empty($order->invoice_file_path)) {
            abort(404, 'Attachment not found.');
        }

        $rawPath = trim((string) $order->invoice_file_path);
        $candidates = array_values(array_filter(array_unique([
            ltrim($rawPath, '/'),
            ltrim((string) preg_replace('/^storage\//i', '', $rawPath), '/'),
            ltrim((string) preg_replace('/^public\//i', '', $rawPath), '/'),
        ])));

        foreach (['local', 'public'] as $disk) {
            foreach ($candidates as $candidate) {
                if (Storage::disk($disk)->exists($candidate)) {
                    return Storage::disk($disk)->response($candidate, null, [
                        'Cache-Control' => 'private, max-age=60',
                        'X-Robots-Tag' => 'noindex, nofollow',
                    ]);
                }
            }
        }

        if (filter_var($rawPath, FILTER_VALIDATE_URL)) {
            return redirect()->away($rawPath);
        }

        abort(404, 'Attachment file missing.');
    }

    public function submitConfirmation(Request $request, string $refNo): JsonResponse
    {
        $validated = $request->validate([
            'order_date' => 'required|date',
            'sales_channel' => 'required|string|max:50',
            'sales_channel_order_no' => 'required|string|max:100',
            'customer_name' => 'required|string|max:200',
            'customer_phone' => 'nullable|string|max:20',
            'customer_email' => 'nullable|email|max:150',
            'invoice_no' => 'required|string|max:100',
            'invoice_date' => 'required|date',
            'state' => 'required|string|max:100',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|integer',
            'items.*.fixed_sku' => 'required|string|max:100',
            'items.*.sku_scanned' => 'required|string|max:150',
            'items.*.source_type' => 'required|string|in:OWN,VENDOR',
            'items.*.vendor_name' => 'nullable|string|max:255',
            'items.*.quantity' => 'nullable|integer|min:1',
            'items.*.selling_price' => 'required|numeric|min:0.01',
            'items.*.gst_rate' => 'required|numeric|in:0,5,12,18,28',
            'items.*.line_total' => 'required|numeric|min:0.01',
            'items.*.cost_price' => 'nullable|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.shipping_cost' => 'nullable|numeric|min:0',
            'items.*.marketplace_fee' => 'nullable|numeric|min:0',
            'items.*.extra_details' => 'nullable|string',
        ]);

        $order = Order::with('items')->where('ref_no', $refNo)->firstOrFail();

        DB::transaction(function () use ($validated, $order) {
            $totalAmount = 0;
            $totalTax = 0;
            $totalProfit = 0;

            foreach ($validated['items'] as $payloadItem) {
                $item = $order->items->firstWhere('id', (int) $payloadItem['item_id']);
                if (!$item) {
                    abort(422, 'Invalid order item for this reference.');
                }

                $sourceType = mb_strtoupper((string) ($payloadItem['source_type'] ?? 'OWN'));
                $vendorName = $sourceType === 'VENDOR'
                    ? mb_strtoupper(trim((string) ($payloadItem['vendor_name'] ?? '')))
                    : null;

                if ($sourceType === 'VENDOR' && $vendorName === '') {
                    abort(422, 'Vendor name is required when source type is VENDOR.');
                }

                $quantity = max(1, (int) ($payloadItem['quantity'] ?? $item->quantity));
                $sellingPrice = (float) $payloadItem['selling_price'];
                $gstRate = (float) $payloadItem['gst_rate'];
                $costPrice = (float) ($payloadItem['cost_price'] ?? $item->cost_price ?? 0);
                $discount = (float) ($payloadItem['discount'] ?? $item->discount ?? 0);
                $shippingCost = (float) ($payloadItem['shipping_cost'] ?? $item->shipping_cost ?? 0);
                $marketplaceFee = (float) ($payloadItem['marketplace_fee'] ?? $item->marketplace_fee ?? 0);

                $lineSelling = $sellingPrice * $quantity;
                $lineTax = round($lineSelling * ($gstRate / 100), 2);
                $lineTotal = round($lineSelling + $lineTax, 2);
                $lineProfit = round(
                    $lineSelling - ($costPrice * $quantity) - $discount - $shippingCost - $marketplaceFee - $lineTax,
                    2
                );

                $inventory = Inventory::query()->where('fixed_sku', $payloadItem['fixed_sku'])
                    ->first(['fixed_sku', 'cost_per_unit']);

                $item->update([
                    'fixed_sku' => mb_strtoupper((string) $payloadItem['fixed_sku']),
                    'sku_scanned' => mb_strtoupper((string) $payloadItem['sku_scanned']),
                    'quantity' => $quantity,
                    'source_type' => $sourceType,
                    'vendor_name' => $vendorName,
                    'cost_price' => (float) ($payloadItem['cost_price'] ?? ($inventory?->cost_per_unit ?? $costPrice)),
                    'selling_price' => $sellingPrice,
                    'gst_rate' => $gstRate,
                    'gst_amount' => $lineTax,
                    'total_amount' => $lineTotal,
                    'discount' => $discount,
                    'shipping_cost' => $shippingCost,
                    'marketplace_fee' => $marketplaceFee,
                    'profit' => $lineProfit,
                    'notes' => $payloadItem['extra_details'] ?? $item->notes,
                ]);

                $totalAmount += $lineTotal;
                $totalTax += $lineTax;
                $totalProfit += $lineProfit;
            }

            $order->update([
                'order_date' => $validated['order_date'],
                'sales_channel' => mb_strtoupper(trim((string) $validated['sales_channel'])),
                'sales_channel_order_no' => mb_strtoupper(trim((string) $validated['sales_channel_order_no'])),
                'customer_name' => mb_strtoupper($validated['customer_name']),
                'customer_phone' => trim((string) ($validated['customer_phone'] ?? '')) ?: null,
                'customer_email' => trim((string) ($validated['customer_email'] ?? '')) ?: null,
                'invoice_no' => mb_strtoupper(trim((string) $validated['invoice_no'])),
                'invoice_date' => $validated['invoice_date'],
                'state' => mb_strtoupper($validated['state']),
                'status' => 'in_transit',
                'total_amount' => round($totalAmount, 2),
                'total_tax' => round($totalTax, 2),
                'total_profit' => round($totalProfit, 2),
                'updated_by' => Auth::id(),
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Order confirmed and moved to IN_TRANSIT.',
        ]);
    }

    public function updateOrdersList(Request $request): JsonResponse
    {
        $allowedEditableStatuses = ['in_transit', 'delivered', 'cancelled', 'rto_delivered'];

        $validated = $request->validate([
            'search' => 'nullable|string|max:120',
            'status' => 'nullable|in:all,in_transit,delivered,cancelled,rto_delivered',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'page' => 'nullable|integer|min:1',
            'limit' => 'nullable|integer|min:1|max:200',
        ]);

        $limit = (int) ($validated['limit'] ?? 15);
        $search = trim((string) ($validated['search'] ?? ''));
        $status = trim((string) ($validated['status'] ?? 'all'));

        $query = Order::query()
            ->withCount('items as item_count')
            ->with(['updater:id,name'])
            ->whereIn(DB::raw('LOWER(status)'), $allowedEditableStatuses)
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($qq) use ($search) {
                    $qq->where('ref_no', 'like', "%{$search}%")
                        ->orWhere('customer_name', 'like', "%{$search}%")
                        ->orWhere('sales_channel', 'like', "%{$search}%")
                        ->orWhere('sales_channel_order_no', 'like', "%{$search}%")
                        ->orWhere('tracking_no', 'like', "%{$search}%")
                        ->orWhere('courier_partner', 'like', "%{$search}%");
                });
            })
            ->when($status !== '' && strtolower($status) !== 'all', function ($q) use ($status) {
                $q->whereRaw('LOWER(status) = ?', [strtolower($status)]);
            })
            ->when(!empty($validated['date_from']), fn($q) => $q->whereDate('order_date', '>=', $validated['date_from']))
            ->when(!empty($validated['date_to']), fn($q) => $q->whereDate('order_date', '<=', $validated['date_to']))
            ->orderByDesc('created_at');

        $paginated = $query->paginate($limit);

        $orders = collect($paginated->items())->map(function (Order $order) {
            return [
                'id' => $order->id,
                'ref_no' => $order->ref_no,
                'order_date' => optional($order->order_date)->format('Y-m-d'),
                'customer_name' => $order->customer_name,
                'sales_channel' => $order->sales_channel,
                'status' => $order->status,
                'sales_channel_order_no' => $order->sales_channel_order_no,
                'state' => $order->state,
                'item_count' => (int) $order->item_count,
                'last_updated' => optional($order->updated_at)->toDateTimeString(),
                'updated_by' => $order->updater?->name,
            ];
        })->values();

        return response()->json([
            'status' => 'success',
            'data' => [
                'orders' => $orders,
                'pagination' => [
                    'current_page' => $paginated->currentPage(),
                    'last_page' => $paginated->lastPage(),
                    'per_page' => $paginated->perPage(),
                    'total' => $paginated->total(),
                ],
            ],
        ]);
    }

    public function importPreview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rows' => 'required|array|min:1|max:5000',
            'rows.*.order_date' => 'required',
            'rows.*.sales_channel' => 'required',
            'rows.*.sales_channel_order_no' => 'nullable',
            'rows.*.customer_name' => 'required',
            'rows.*.state' => 'required',
            'rows.*.fixed_sku' => 'required',
            'rows.*.sku_scanned' => 'required',
            'rows.*.selling_price' => 'required',
            'rows.*.gst_rate' => 'required',
            'rows.*.quantity' => 'nullable',
            'rows.*.source_type' => 'nullable',
            'rows.*.vendor_name' => 'nullable',
            'rows.*.notes' => 'nullable',
        ]);

        $allowedChannels = ['AMAZON', 'FLIPKART', 'MEESHO', 'OFFLINE', 'WEBSITE'];
        $allowedGst = [0, 5, 12, 18, 28];

        $rowErrors = [];
        $normalizedRows = [];
        foreach ($validated['rows'] as $index => $row) {
            $errors = [];

            $orderDate = $this->normalizeDate((string) $row['order_date']);
            if (!$orderDate) {
                $errors[] = 'Invalid order_date';
            }

            $salesChannel = mb_strtoupper(trim((string) $row['sales_channel']));
            if (!in_array($salesChannel, $allowedChannels, true)) {
                $errors[] = 'Invalid sales_channel';
            }

            $fixedSku = mb_strtoupper(trim((string) $row['fixed_sku']));
            $inventory = Inventory::query()->where('fixed_sku', $fixedSku)->first(['fixed_sku', 'cost_per_unit']);
            if (!$inventory) {
                $errors[] = 'fixed_sku not found in inventory';
            }

            $sellingPrice = (float) $row['selling_price'];
            if ($sellingPrice <= 0) {
                $errors[] = 'selling_price must be greater than 0';
            }

            $gstRate = (float) $row['gst_rate'];
            if (!in_array((int) $gstRate, $allowedGst, true)) {
                $errors[] = 'gst_rate must be one of 0,5,12,18,28';
            }

            $quantity = max(1, (int) ($row['quantity'] ?? 1));
            $sourceType = mb_strtoupper(trim((string) ($row['source_type'] ?? 'OWN')));
            if (!in_array($sourceType, ['OWN', 'VENDOR'], true)) {
                $errors[] = 'source_type must be OWN or VENDOR';
            }

            $vendorName = trim((string) ($row['vendor_name'] ?? ''));
            if ($sourceType === 'VENDOR' && $vendorName === '') {
                $errors[] = 'vendor_name is required when source_type is VENDOR';
            }

            $rowErrors[$index] = $errors;
            $normalizedRows[$index] = [
                'order_date' => $orderDate,
                'sales_channel' => $salesChannel,
                'sales_channel_order_no' => mb_strtoupper(trim((string) ($row['sales_channel_order_no'] ?? ''))),
                'customer_name' => mb_strtoupper(trim((string) $row['customer_name'])),
                'state' => mb_strtoupper(trim((string) $row['state'])),
                'fixed_sku' => $fixedSku,
                'sku_scanned' => mb_strtoupper(trim((string) $row['sku_scanned'])),
                'selling_price' => round($sellingPrice, 2),
                'gst_rate' => round($gstRate, 2),
                'quantity' => $quantity,
                'source_type' => $sourceType,
                'vendor_name' => $vendorName !== '' ? mb_strtoupper($vendorName) : null,
                'notes' => trim((string) ($row['notes'] ?? '')) ?: null,
                'cost_price' => round((float) ($inventory?->cost_per_unit ?? 0), 2),
            ];
        }

        $hasErrors = collect($rowErrors)->flatten()->isNotEmpty();

        return response()->json([
            'status' => 'success',
            'data' => [
                'rows' => $normalizedRows,
                'row_errors' => $rowErrors,
                'has_errors' => $hasErrors,
            ],
        ]);
    }

    public function importBulk(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rows' => 'required|array|min:1|max:5000',
        ]);

        $preview = $this->importPreview($request)->getData(true);
        if (($preview['data']['has_errors'] ?? true) === true) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation errors found. Fix and retry import.',
                'data' => $preview['data'],
            ], 422);
        }

        $rows = $preview['data']['rows'] ?? [];
        $createdBy = (int) Auth::id();

        $createdOrders = 0;
        DB::transaction(function () use ($rows, $createdBy, &$createdOrders) {
            foreach ($rows as $row) {
                $baseRef = trim((string) ($row['sales_channel_order_no'] ?: $row['fixed_sku'])) ?: now()->format('YmdHis');
                $candidate = preg_replace('/[^A-Za-z0-9]/', '', $baseRef) ?: now()->format('YmdHis');
                $refNo = strtoupper(substr($candidate, 0, 12));
                if (strlen($refNo) < 12) {
                    $refNo = str_pad($refNo, 12, '0');
                }

                while (Order::query()->where('ref_no', $refNo)->exists()) {
                    $refNo = now()->format('ymdHis');
                }

                $lineSelling = ((float) $row['selling_price']) * ((int) $row['quantity']);
                $lineTax = round($lineSelling * (((float) $row['gst_rate']) / 100), 2);
                $lineTotal = round($lineSelling + $lineTax, 2);
                $lineProfit = round($lineSelling - (((float) $row['cost_price']) * ((int) $row['quantity'])) - $lineTax, 2);

                $orderPayload = [
                    'ref_no' => $refNo,
                    'order_date' => $row['order_date'],
                    'sales_channel' => $row['sales_channel'],
                    'sales_channel_order_no' => $row['sales_channel_order_no'] ?: null,
                    'customer_name' => $row['customer_name'],
                    'state' => $row['state'],
                    'status' => 'pending',
                    'total_amount' => $lineTotal,
                    'total_tax' => $lineTax,
                    'total_profit' => $lineProfit,
                    'created_by' => $createdBy,
                ];

                if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'updated_by')) {
                    $orderPayload['updated_by'] = $createdBy;
                }

                $order = Order::query()->create($orderPayload);
                $order->items()->create([
                    'order_id' => $order->id,
                    'ref_no' => $order->ref_no,
                    'sku_scanned' => $row['sku_scanned'],
                    'fixed_sku' => $row['fixed_sku'],
                    'quantity' => (int) $row['quantity'],
                    'source_type' => $row['source_type'],
                    'vendor_name' => $row['vendor_name'],
                    'cost_price' => round((float) $row['cost_price'], 2),
                    'selling_price' => round((float) $row['selling_price'], 2),
                    'gst_rate' => round((float) $row['gst_rate'], 2),
                    'gst_amount' => $lineTax,
                    'discount' => 0,
                    'total_amount' => $lineTotal,
                    'profit' => $lineProfit,
                    'notes' => $row['notes'],
                ]);

                $createdOrders++;
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Sales orders imported successfully.',
            'data' => [
                'created_orders' => $createdOrders,
                'created_by' => $createdBy,
                'imported_at' => now()->toDateTimeString(),
            ],
        ]);
    }

    private function normalizeDate(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        try {
            return \Carbon\Carbon::parse($value)->toDateString();
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function updateOrderDetails(string $refNo): JsonResponse
    {
        $allowedEditableStatuses = ['in_transit', 'delivered', 'cancelled', 'rto_delivered'];

        $order = Order::with(['items', 'creator:id,name', 'updater:id,name'])
            ->where('ref_no', $refNo)
            ->whereIn(DB::raw('LOWER(status)'), $allowedEditableStatuses)
            ->firstOrFail();

        $items = $order->items->map(function ($item) {
            $inventory = Inventory::query()->where('fixed_sku', $item->fixed_sku)
                ->first(['fixed_sku', 'product_name', 'mrp', 'cost_per_unit']);

            return [
                'item_id' => $item->id,
                'quantity' => (int) ($item->quantity ?: 1),
                'sku_scanned' => mb_strtoupper((string) $item->sku_scanned),
                'fixed_sku' => mb_strtoupper((string) $item->fixed_sku),
                'source_type' => mb_strtoupper((string) ($item->source_type ?: 'OWN')),
                'vendor_name' => mb_strtoupper((string) ($item->vendor_name ?? '')),
                'product_name' => mb_strtoupper((string) ($inventory?->product_name ?? '')),
                'mrp' => (float) ($inventory?->mrp ?? 0),
                'cost_price' => (float) $item->cost_price,
                'selling_price' => (float) $item->selling_price,
                'gst_rate' => (float) $item->gst_rate,
                'gst_amount' => (float) $item->gst_amount,
                'discount' => (float) $item->discount,
                'shipping_cost' => (float) $item->shipping_cost,
                'marketplace_fee' => (float) $item->marketplace_fee,
                'line_total' => (float) $item->total_amount,
                'profit' => (float) $item->profit,
                'extra_details' => (string) ($item->notes ?? ''),
            ];
        })->values();

        $skuOptions = Inventory::query()
            ->whereNotNull('fixed_sku')
            ->orderBy('fixed_sku')
            ->get(['fixed_sku', 'product_name', 'mrp', 'cost_per_unit'])
            ->map(fn($sku) => [
                'sku_fixed' => mb_strtoupper((string) $sku->fixed_sku),
                'product_name' => mb_strtoupper((string) $sku->product_name),
                'mrp' => (float) ($sku->mrp ?? 0),
                'cost_per_unit' => (float) ($sku->cost_per_unit ?? 0),
            ])
            ->values();

        $vendors = Vendor::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn($vendor) => [
                'id' => (int) $vendor->id,
                'name' => mb_strtoupper((string) $vendor->name),
            ])
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => [
                'order' => [
                    'id' => $order->id,
                    'ref_no' => $order->ref_no,
                    'status' => $order->status,
                    'order_date' => optional($order->order_date)->format('Y-m-d'),
                    'customer_name' => $order->customer_name,
                    'customer_phone' => $order->customer_phone,
                    'customer_email' => $order->customer_email,
                    'sales_channel' => $order->sales_channel,
                    'sales_channel_order_no' => $order->sales_channel_order_no,
                    'state' => $order->state,
                    'custom_gstin' => $order->custom_gstin,
                    'courier_partner' => $order->courier_partner,
                    'tracking_no' => $order->tracking_no,
                    'invoice_no' => $order->invoice_no,
                    'invoice_date' => optional($order->invoice_date)->format('Y-m-d'),
                    'invoice_available' => !empty($order->invoice_file_path),
                    'total_amount' => (float) $order->total_amount,
                    'total_tax' => (float) $order->total_tax,
                    'total_profit' => (float) $order->total_profit,
                    'created_at' => optional($order->created_at)->toDateTimeString(),
                    'created_by' => $order->creator?->name,
                    'updated_by' => $order->updater?->name,
                    'updated_at' => optional($order->updated_at)->toDateTimeString(),
                ],
                'items' => $items,
                'sku_options' => $skuOptions,
                'vendors' => $vendors,
            ],
        ]);
    }

    public function submitUpdateOrder(Request $request, string $refNo): JsonResponse
    {
        $allowedEditableStatuses = ['in_transit', 'delivered', 'cancelled', 'rto_delivered'];

        $validated = $request->validate([
            'status' => 'required|in:in_transit,delivered,cancelled,rto_delivered',
            'courier_partner' => 'nullable|string|max:100',
            'tracking_no' => 'nullable|string|max:100',
            'custom_gstin' => 'nullable|string|max:20',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|integer',
            'items.*.fixed_sku' => 'required|string|max:100',
            'items.*.source_type' => 'required|in:OWN,VENDOR',
            'items.*.vendor_name' => 'nullable|string|max:255',
            'items.*.selling_price' => 'required|numeric|min:0.01',
            'items.*.gst_rate' => 'required|numeric|in:0,5,12,18,28',
            'items.*.line_total' => 'required|numeric|min:0.01',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.shipping_cost' => 'nullable|numeric|min:0',
            'items.*.marketplace_fee' => 'nullable|numeric|min:0',
            'items.*.calc_basis' => 'nullable|in:selling,total',
            'items.*.extra_details' => 'nullable|string',
        ]);

        $order = Order::with('items')
            ->where('ref_no', $refNo)
            ->whereIn(DB::raw('LOWER(status)'), $allowedEditableStatuses)
            ->firstOrFail();

        DB::transaction(function () use ($validated, $order) {
            $totalAmount = 0;
            $totalTax = 0;
            $totalProfit = 0;

            foreach ($validated['items'] as $payloadItem) {
                $item = $order->items->firstWhere('id', (int) $payloadItem['item_id']);
                if (!$item) {
                    abort(422, 'Invalid item for selected order reference.');
                }

                $sourceType = mb_strtoupper((string) ($payloadItem['source_type'] ?? 'OWN'));
                $vendorName = $sourceType === 'VENDOR'
                    ? mb_strtoupper(trim((string) ($payloadItem['vendor_name'] ?? '')))
                    : null;

                if ($sourceType === 'VENDOR' && $vendorName === '') {
                    abort(422, 'Vendor name is required for VENDOR source type.');
                }

                $quantity = max(1, (int) ($item->quantity ?: 1));
                $gstRate = (float) $payloadItem['gst_rate'];
                $discount = (float) ($payloadItem['discount'] ?? 0);
                $shippingCost = (float) ($payloadItem['shipping_cost'] ?? 0);
                $marketplaceFee = (float) ($payloadItem['marketplace_fee'] ?? 0);

                $calcBasis = (string) ($payloadItem['calc_basis'] ?? 'selling');
                $lineTotalInput = (float) ($payloadItem['line_total'] ?? 0);
                $sellingPriceInput = (float) ($payloadItem['selling_price'] ?? 0);

                if ($calcBasis === 'total') {
                    $divider = 1 + ($gstRate / 100);
                    $lineSelling = $divider > 0 ? ($lineTotalInput / $divider) : $lineTotalInput;
                    $sellingPrice = round($lineSelling / $quantity, 2);
                } else {
                    $sellingPrice = $sellingPriceInput;
                    $lineSelling = $sellingPrice * $quantity;
                }

                $lineTax = round($lineSelling * ($gstRate / 100), 2);
                $lineTotal = round($lineSelling + $lineTax - $discount, 2);
                $lineProfit = round(
                    $lineSelling - ((float) $item->cost_price * $quantity) - $marketplaceFee - $shippingCost - $discount,
                    2
                );

                $inventory = Inventory::query()->where('fixed_sku', $payloadItem['fixed_sku'])
                    ->first(['fixed_sku', 'cost_per_unit']);

                $item->update([
                    'fixed_sku' => mb_strtoupper((string) $payloadItem['fixed_sku']),
                    'source_type' => $sourceType,
                    'vendor_name' => $vendorName,
                    'cost_price' => (float) ($inventory?->cost_per_unit ?? $item->cost_price),
                    'selling_price' => $sellingPrice,
                    'gst_rate' => $gstRate,
                    'gst_amount' => $lineTax,
                    'discount' => $discount,
                    'shipping_cost' => $shippingCost,
                    'marketplace_fee' => $marketplaceFee,
                    'total_amount' => $lineTotal,
                    'profit' => $lineProfit,
                    'notes' => (string) ($payloadItem['extra_details'] ?? $item->notes),
                ]);

                $totalAmount += $lineTotal;
                $totalTax += $lineTax;
                $totalProfit += $lineProfit;
            }

            $order->update([
                'status' => strtolower((string) $validated['status']),
                'courier_partner' => trim((string) ($validated['courier_partner'] ?? '')) ?: null,
                'tracking_no' => trim((string) ($validated['tracking_no'] ?? '')) ?: null,
                'custom_gstin' => mb_strtoupper(trim((string) ($validated['custom_gstin'] ?? ''))) ?: null,
                'total_amount' => round($totalAmount, 2),
                'total_tax' => round($totalTax, 2),
                'total_profit' => round($totalProfit, 2),
                'updated_by' => Auth::id(),
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Order updated successfully.',
        ]);
    }
}
