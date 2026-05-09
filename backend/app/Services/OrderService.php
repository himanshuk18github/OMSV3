<?php

namespace App\Services;

use App\Models\Order;
use App\Repositories\InventoryRepository;
use App\Repositories\OrderRepository;
use Illuminate\Support\Facades\Auth;

class OrderService
{
    public function __construct(
        private OrderRepository $orderRepository,
        private InventoryRepository $inventoryRepository,
    ) {}

    public function list(array $filters, int $perPage = 15)
    {
        // Vendor role: restrict to their assigned orders
        $user = Auth::user();
        if ($user->isVendor()) {
            // Vendors see orders containing their products as vendor items
            $filters['vendor_user_id'] = $user->id;
        }
        return $this->orderRepository->paginate($filters, $perPage);
    }

    public function show(int $id): Order
    {
        $order = $this->orderRepository->findWithItems($id);
        $this->authorizeView($order);
        return $order;
    }

    public function create(array $validated): Order
    {
        $items = $this->buildOrderItems($validated['items']);
        [$totalAmount, $totalProfit] = $this->calculateTotals($items, $validated);

        $orderData = [
            'order' => array_merge($validated, [
                'ref_no' => Order::generateRefNo(),
                'total_amount' => $totalAmount,
                'total_profit' => $totalProfit,
                'created_by' => Auth::id(),
            ]),
            'items' => $items,
        ];

        $order = $this->orderRepository->create($orderData);

        // Deduct inventory for OWN items
        foreach ($items as $item) {
            if ($item['source_type'] === 'OWN') {
                $this->inventoryRepository->adjust(
                    $item['sku_fixed'] ?? null,
                    $item['product_id'] ?? null,
                    $item['quantity'],
                    'OUT',
                    [],
                    Auth::id()
                );
            }
        }

        return $order;
    }

    public function update(int $id, array $validated): Order
    {
        $order = Order::findOrFail($id);
        $this->authorizeEdit($order);

        $updateData = ['order' => $validated];

        if (!empty($validated['items'])) {
            $updateData['items'] = $this->buildOrderItems($validated['items']);
            [$totalAmount, $totalProfit] = $this->calculateTotals($updateData['items'], $validated);
            $updateData['order']['total_amount'] = $totalAmount;
            $updateData['order']['total_profit'] = $totalProfit;
        }

        return $this->orderRepository->update($id, $updateData);
    }

    public function delete(int $id): bool
    {
        $order = Order::findOrFail($id);
        abort_if(!Auth::user()->isAdmin(), 403, 'Only admin can delete orders.');
        return $this->orderRepository->delete($id);
    }

    public function getDashboardStats(): array
    {
        return $this->orderRepository->getDashboardStats();
    }

    private function buildOrderItems(array $rawItems): array
    {
        return array_map(function ($item) {
            $quantity = $item['quantity'];
            $sellingPrice = $item['selling_price'];
            $costPrice = $item['cost_price'];
            $discount = $item['discount'] ?? 0;
            $totalAmount = ($sellingPrice * $quantity) - $discount;
            $profit = ($sellingPrice - $costPrice) * $quantity - $discount;

            return array_merge($item, [
                'total_amount' => $totalAmount,
                'profit' => $profit,
            ]);
        }, $rawItems);
    }

    private function calculateTotals(array $items, array $orderData): array
    {
        $totalAmount = array_sum(array_column($items, 'total_amount'));
        $totalProfit = array_sum(array_column($items, 'profit'));
        $totalAmount += ($orderData['shipping_charge'] ?? 0);
        $totalAmount -= ($orderData['discount'] ?? 0);
        return [$totalAmount, $totalProfit];
    }

    private function authorizeView(Order $order): void
    {
        $user = Auth::user();
        if ($user->isVendor()) {
            $hasVendorItem = $order->items()
                ->whereNotNull('vendor_id')
                ->exists();
            abort_if(!$hasVendorItem, 403, 'Access denied.');
        }
    }

    private function authorizeEdit(Order $order): void
    {
        $user = Auth::user();
        abort_if($user->isVendor(), 403, 'Vendors cannot edit orders.');
    }
}
