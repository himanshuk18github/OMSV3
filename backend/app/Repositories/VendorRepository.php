<?php

namespace App\Repositories;

use App\Models\Vendor;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class VendorRepository
{
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return Vendor::when(isset($filters['search']), fn($q) => $q->where(function ($q) use ($filters) {
                $q->where('name', 'like', "%{$filters['search']}%")
                  ->orWhere('email', 'like', "%{$filters['search']}%")
                  ->orWhere('phone', 'like', "%{$filters['search']}%");
            }))
            ->when(isset($filters['is_active']), fn($q) => $q->where('is_active', $filters['is_active']))
            ->latest()
            ->paginate($perPage);
    }

    public function findById(int $id): Vendor
    {
        return Vendor::findOrFail($id);
    }

    public function create(array $data): Vendor
    {
        return Vendor::create($data);
    }

    public function update(int $id, array $data): Vendor
    {
        $vendor = Vendor::findOrFail($id);
        $vendor->update($data);
        return $vendor;
    }

    public function delete(int $id): bool
    {
        return Vendor::findOrFail($id)->delete();
    }

    public function getAll(): \Illuminate\Database\Eloquent\Collection
    {
        return Vendor::where('is_active', true)->orderBy('name')->get();
    }
}
