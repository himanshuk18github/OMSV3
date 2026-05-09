<?php

namespace App\Services;

use App\Repositories\InventoryRepository;
use Illuminate\Support\Facades\Auth;

class InventoryService
{
    public function __construct(private InventoryRepository $inventoryRepository) {}

    public function list(array $filters, int $perPage = 15)
    {
        return $this->inventoryRepository->paginate($filters, $perPage);
    }

    public function logs(array $filters, int $perPage = 15)
    {
        abort_if(!Auth::user()->isAdmin() && !Auth::user()->isStaff(), 403, 'Insufficient permissions.');
        return $this->inventoryRepository->logs($filters, $perPage);
    }

    public function adjust(?string $skuFixed, ?string $productId, int $quantity, string $type, array $meta)
    {
        abort_if(!Auth::user()->isAdmin() && !Auth::user()->isStaff(), 403, 'Insufficient permissions.');
        return $this->inventoryRepository->adjust($skuFixed, $productId, $quantity, $type, $meta, Auth::id());
    }

    public function addStock(?string $skuFixed, ?string $productId, int $quantity, float $costPerUnit, ?string $notes)
    {
        abort_if(!Auth::user()->isAdmin() && !Auth::user()->isStaff(), 403, 'Insufficient permissions.');
        return $this->inventoryRepository->addStock($skuFixed, $productId, $quantity, $costPerUnit, $notes, Auth::id());
    }
}
