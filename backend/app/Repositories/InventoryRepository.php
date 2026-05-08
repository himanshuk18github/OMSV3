<?php

namespace App\Repositories;

use App\Models\Inventory;
use App\Models\InventoryLog;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class InventoryRepository
{
    private function resolveInventory(?string $skuFixed, ?string $productId): Inventory
    {
        $inventory = null;

        if (!empty($skuFixed)) {
            $inventory = Inventory::where('fixed_sku', $skuFixed)->lockForUpdate()->first();
        }

        if (!$inventory && !empty($productId)) {
            $inventory = Inventory::where('product_id', $productId)->lockForUpdate()->first();
        }

        if (!$inventory) {
            abort(404, 'Inventory item not found.');
        }

        return $inventory;
    }

    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return Inventory::query()
            ->when(isset($filters['search']), function ($q) use ($filters) {
                $search = $filters['search'];
                $q->where(function ($query) use ($search) {
                    $query->where('product_name', 'like', "%{$search}%")
                        ->orWhere('fixed_sku', 'like', "%{$search}%")
                        ->orWhere('product_id', 'like', "%{$search}%");
                });
            })
            ->paginate($perPage);
    }

    public function logs(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return InventoryLog::query()
            ->with(['product', 'updater:id,name'])
            ->when(!empty($filters['search']), function ($query) use ($filters) {
                $search = $filters['search'];
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery->where('product_id', 'like', "%{$search}%")
                        ->orWhere('fixed_sku', 'like', "%{$search}%")
                        ->orWhere('notes', 'like', "%{$search}%")
                        ->orWhereHas('product', function ($productQuery) use ($search) {
                            $productQuery->where('product_name', 'like', "%{$search}%");
                        })
                        ->orWhereHas('updater', function ($userQuery) use ($search) {
                            $userQuery->where('name', 'like', "%{$search}%");
                        });
                });
            })
            ->when(!empty($filters['fixed_sku']), function ($query) use ($filters) {
                $query->where('fixed_sku', 'like', '%' . $filters['fixed_sku'] . '%');
            })
            ->when(!empty($filters['from_date']), function ($query) use ($filters) {
                $query->whereDate('created_at', '>=', $filters['from_date']);
            })
            ->when(!empty($filters['to_date']), function ($query) use ($filters) {
                $query->whereDate('created_at', '<=', $filters['to_date']);
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function adjust(?string $skuFixed, ?string $productId, int $quantity, string $type, array $meta, int $userId): Inventory
    {
        return DB::transaction(function () use ($skuFixed, $productId, $quantity, $type, $meta, $userId) {
            $inventory = $this->resolveInventory($skuFixed, $productId);

            $stockBefore = $inventory->quantity;
            $newStock = $type === 'IN'
                ? $stockBefore + $quantity
                : $stockBefore - $quantity;

            if ($type === 'IN' && isset($meta['unit_cost'])) {
                $inventory->cost_per_unit = $meta['unit_cost'];
            }

            if (isset($meta['mrp'])) {
                $inventory->mrp = $meta['mrp'];
            }

            $inventory->quantity = $newStock;
            $inventory->save();

            InventoryLog::create([
                'product_id' => $inventory->product_id,
                'fixed_sku' => $inventory->fixed_sku,
                'quantity' => $type === 'OUT' ? -$quantity : $quantity,
                'cost_per_unit' => $meta['cost_per_unit'] ?? $meta['unit_cost'] ?? null,
                'notes' => $meta['notes'] ?? null,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            return $inventory->fresh();
        });
    }

    public function addStock(?string $skuFixed, ?string $productId, int $quantity, float $costPerUnit, ?string $notes, int $userId): Inventory
    {
        return DB::transaction(function () use ($skuFixed, $productId, $quantity, $costPerUnit, $notes, $userId) {
            $inventory = $this->resolveInventory($skuFixed, $productId);

            $inventory->quantity = $inventory->quantity + $quantity;
            $inventory->cost_per_unit = $costPerUnit;
            $inventory->save();

            InventoryLog::create([
                'product_id' => $inventory->product_id,
                'fixed_sku' => $inventory->fixed_sku,
                'quantity' => $quantity,
                'cost_per_unit' => $costPerUnit,
                'notes' => $notes,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            return $inventory->fresh();
        });
    }
}
