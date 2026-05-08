<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function __construct(private InventoryService $inventoryService) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search']);
        $inventory = $this->inventoryService->list($filters, (int) $request->get('per_page', 15));
        return response()->json(['status' => 'success', 'data' => $inventory]);
    }

    public function adjust(Request $request): JsonResponse
    {
        $sanitizedProductId = preg_replace('/\D+/', '', (string) $request->input('product_id', ''));
        $request->merge([
            'product_id' => $sanitizedProductId === '' ? null : $sanitizedProductId,
            'sku_fixed' => trim((string) $request->input('sku_fixed', '')),
        ]);

        $validated = $request->validate([
            'product_id' => ['nullable', 'string', 'max:50', 'regex:/^[0-9]+$/'],
            'sku_fixed' => ['required', 'string', 'max:100'],
            'quantity' => 'required|integer|min:1',
            'type' => 'required|in:IN,OUT,ADJUSTMENT',
            'unit_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $inventory = $this->inventoryService->adjust(
            $validated['sku_fixed'],
            $validated['product_id'] ?? null,
            $validated['quantity'],
            $validated['type'],
            $validated
        );

        return response()->json(['status' => 'success', 'data' => $inventory]);
    }

    public function addStock(Request $request): JsonResponse
    {
        $sanitizedProductId = preg_replace('/\D+/', '', (string) $request->input('product_id', ''));
        $request->merge([
            'product_id' => $sanitizedProductId === '' ? null : $sanitizedProductId,
            'sku_fixed' => trim((string) $request->input('sku_fixed', '')),
        ]);

        $validated = $request->validate([
            'product_id' => ['nullable', 'string', 'max:50', 'regex:/^[0-9]+$/'],
            'sku_fixed' => ['required', 'string', 'max:100'],
            'quantity' => 'required|integer|min:1',
            'cost_per_unit' => 'required|numeric|gt:0',
            'notes' => 'nullable|string',
        ]);

        $inventory = $this->inventoryService->addStock(
            $validated['sku_fixed'],
            $validated['product_id'] ?? null,
            $validated['quantity'],
            (float) $validated['cost_per_unit'],
            $validated['notes'] ?? null
        );

        return response()->json(['status' => 'success', 'data' => $inventory]);
    }

    public function availability(Request $request): JsonResponse
    {
        $sanitizedProductId = preg_replace('/\D+/', '', (string) $request->input('product_id', ''));
        $request->merge([
            'product_id' => $sanitizedProductId,
        ]);

        $validated = $request->validate([
            'product_id' => ['nullable', 'string', 'max:50', 'regex:/^[0-9]+$/'],
            'sku_fixed' => 'nullable|string|max:100',
        ]);

        $productIdAvailable = true;
        $skuFixedAvailable = true;

        if (!empty($validated['product_id'])) {
            $productIdAvailable = !Inventory::where('product_id', $validated['product_id'])->exists();
        }

        if (!empty($validated['sku_fixed'])) {
            $skuFixedAvailable = !Inventory::where('fixed_sku', $validated['sku_fixed'])->exists();
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'product_id_available' => $productIdAvailable,
                'sku_fixed_available' => $skuFixedAvailable,
            ],
        ]);
    }

    public function logs(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => 'nullable|string|max:255',
            'fixed_sku' => 'nullable|string|max:100',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $logs = $this->inventoryService->logs($filters, (int) $request->get('per_page', 15));

        $logs->getCollection()->transform(function ($log) {
            return [
                'id' => $log->id,
                'product_id' => $log->product_id,
                'fixed_sku' => $log->fixed_sku,
                'product_name' => $log->product?->product_name,
                'quantity' => $log->quantity,
                'cost_per_unit' => $log->cost_per_unit,
                'notes' => $log->notes,
                'updated_by' => $log->updated_by,
                'updated_by_name' => $log->updater?->name,
                'created_at' => $log->created_at,
                'updated_at' => $log->updated_at,
            ];
        });

        return response()->json(['status' => 'success', 'data' => $logs]);
    }

    public function closingStock(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $itemType = strtolower(trim((string) $request->query('item_type', 'all')));
        $allowedItemTypes = ['all', 'own', 'vendor'];
        if (!in_array($itemType, $allowedItemTypes, true)) {
            $itemType = 'all';
        }

        // Aggregate inventory_logs by product_id to avoid mismatches when fixed_sku changes
        $stockUpdateSub = DB::table('inventory_logs')
            ->select('product_id', DB::raw('SUM(quantity) as stock_update'))
            ->whereNotNull('product_id')
            ->groupBy('product_id');

        // Compute stock_out aggregated by product_id by joining order_items -> inventory
        $stockOutSub = DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->join('inventory as inv', 'inv.fixed_sku', '=', 'oi.fixed_sku')
            ->select('inv.product_id', DB::raw('SUM(oi.quantity) as stock_out'))
            ->whereRaw("LOWER(o.status) IN ('confirmed','packed','dispatched','delivered','in_transit','intransit')")
            ->where(function ($query) {
                $query->whereNull('oi.source_type')
                    ->orWhereRaw("UPPER(oi.source_type) <> 'VENDOR'");
            })
            ->groupBy('inv.product_id');

        $rows = DB::table('inventory as i')
            ->leftJoinSub($stockUpdateSub, 'su', function ($join) {
                $join->on('su.product_id', '=', 'i.product_id');
            })
            ->leftJoinSub($stockOutSub, 'so', function ($join) {
                $join->on('so.product_id', '=', 'i.product_id');
            })
            ->when($itemType !== 'all', function ($query) use ($itemType) {
                $query->whereRaw('LOWER(COALESCE(i.item_type, "")) = ?', [$itemType]);
            })
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('i.product_id', 'like', "%{$search}%")
                        ->orWhere('i.fixed_sku', 'like', "%{$search}%")
                        ->orWhere('i.product_name', 'like', "%{$search}%");
                });
            })
            ->orderBy('i.id')
            ->selectRaw('i.id')
            ->selectRaw('i.product_id')
            ->selectRaw('i.fixed_sku as sku_fixed')
            ->selectRaw('i.product_name')
            ->selectRaw('LOWER(COALESCE(i.item_type, "own")) as item_type')
            ->selectRaw('COALESCE(i.quantity, 0) as opening_stock')
            ->selectRaw('COALESCE(su.stock_update, 0) as stock_update')
            ->selectRaw('COALESCE(so.stock_out, 0) as stock_out')
            ->selectRaw('(COALESCE(i.quantity, 0) + COALESCE(su.stock_update, 0) - COALESCE(so.stock_out, 0)) as closing_stock')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $rows,
        ]);
    }

    public function storeItem(Request $request): JsonResponse
    {
        $sanitizedProductId = preg_replace('/\D+/', '', (string) $request->input('product_id', ''));
        $request->merge([
            'product_id' => $sanitizedProductId,
            'sku_fixed' => trim((string) $request->input('sku_fixed', '')),
        ]);

        $validated = $request->validate([
            'product_id' => ['required', 'string', 'max:50', 'regex:/^[0-9]+$/'],
            'sku_fixed' => 'required|string|max:100',
            'product_name' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'cost_per_unit' => 'required|numeric|gt:0',
            'mrp' => 'required|numeric|gt:0',
            'gst_hsn_code' => 'required|string|max:50',
            'gst_rate' => 'required|numeric|in:0,5,12,18,28',
        ]);

        $result = DB::transaction(function () use ($validated) {
            $inventoryById = Inventory::where('product_id', $validated['product_id'])->first();
            $inventoryBySku = Inventory::where('fixed_sku', $validated['sku_fixed'])->first();

            if ($inventoryById && $inventoryBySku && $inventoryById->id !== $inventoryBySku->id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Product ID and SKU Fixed belong to different existing inventory records.',
                ], 422);
            }

            if (!$inventoryById && $inventoryBySku && (int) $inventoryBySku->product_id !== (int) $validated['product_id']) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'This SKU Fixed is already linked to another Product ID.',
                ], 422);
            }

            $inventory = Inventory::updateOrCreate(
                ['product_id' => $validated['product_id']],
                [
                    'fixed_sku' => $validated['sku_fixed'],
                    'product_name' => $validated['product_name'],
                    'description' => '',
                    'category' => '',
                    'brand' => '',
                    'unit' => 'pcs',
                    'selling_price' => $validated['mrp'],
                    'item_type' => 'OWN',
                    'is_active' => true,
                    'quantity' => $validated['quantity'],
                    'cost_per_unit' => $validated['cost_per_unit'],
                    'mrp' => $validated['mrp'],
                    'gst_hsn_code' => $validated['gst_hsn_code'],
                    'gst_rate' => $validated['gst_rate'],
                ]
            );

            return $inventory->fresh();
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Item saved successfully.',
            'data' => $result,
        ]);
    }
}
