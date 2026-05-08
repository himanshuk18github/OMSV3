<?php

namespace App\Repositories;

use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ProductRepository
{
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return Product::with('inventory')
            ->when(isset($filters['search']), fn($q) => $q->where(function ($q) use ($filters) {
                $q->where('name', 'like', "%{$filters['search']}%")
                  ->orWhere('sku', 'like', "%{$filters['search']}%");
            }))
            ->when(isset($filters['type']), fn($q) => $q->where('type', $filters['type']))
            ->when(isset($filters['category']), fn($q) => $q->where('category', $filters['category']))
            ->when(isset($filters['is_active']), fn($q) => $q->where('is_active', $filters['is_active']))
            ->latest()
            ->paginate($perPage);
    }

    public function findById(int $id): Product
    {
        return Product::with('inventory')->findOrFail($id);
    }

    public function create(array $data): Product
    {
        $product = Product::create($data);
        // Create default inventory record
        $product->inventory()->create([
            'fixed_sku' => $product->sku,
            'product_name' => $product->name,
            'quantity' => (int) ($data['quantity'] ?? 0),
            'cost_per_unit' => $data['cost_price'] ?? 0,
            'mrp' => $data['mrp'] ?? 0,
            'gst_hsn_code' => $data['hsn_code'] ?? '',
            'gst_rate' => $data['gst_rate'] ?? 0,
        ]);
        return $product->fresh('inventory');
    }

    public function update(int $id, array $data): Product
    {
        $product = Product::findOrFail($id);
        $product->update($data);

        if ($product->inventory) {
            $product->inventory->update([
                'fixed_sku' => $product->sku,
                'product_name' => $product->name,
                'cost_per_unit' => $product->cost_price,
                'mrp' => $product->mrp,
                'gst_hsn_code' => $product->hsn_code ?? '',
                'gst_rate' => $product->gst_rate ?? 0,
            ]);
        }

        return $product->fresh('inventory');
    }

    public function delete(int $id): bool
    {
        return Product::findOrFail($id)->delete();
    }

    public function getAll(bool $activeOnly = true): \Illuminate\Database\Eloquent\Collection
    {
        return Product::with('inventory')
            ->when($activeOnly, fn($q) => $q->where('is_active', true))
            ->orderBy('name')
            ->get();
    }
}
