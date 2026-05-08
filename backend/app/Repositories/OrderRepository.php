<?php

namespace App\Repositories;

use App\Models\Order;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class OrderRepository
{
    public function paginate(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Order::with(['creator:id,name', 'items.product:product_id,product_name,fixed_sku,gst_rate'])
            ->when(isset($filters['status']), fn($q) => $q->where('status', $filters['status']))
            ->when(isset($filters['sales_channel']), fn($q) => $q->where('sales_channel', $filters['sales_channel']))
            ->when(isset($filters['search']), fn($q) => $q->where(function ($q) use ($filters) {
                $q->where('ref_no', 'like', "%{$filters['search']}%")
                  ->orWhere('customer_name', 'like', "%{$filters['search']}%")
                  ->orWhere('invoice_no', 'like', "%{$filters['search']}%");
            }))
            ->when(isset($filters['date_from']), fn($q) => $q->whereDate('order_date', '>=', $filters['date_from']))
            ->when(isset($filters['date_to']), fn($q) => $q->whereDate('order_date', '<=', $filters['date_to']))
            ->latest('order_date');

        return $query->paginate($perPage);
    }

    public function findWithItems(int $id): Order
    {
        return Order::with([
            'items.product:product_id,product_name,fixed_sku,gst_rate',
            'items.vendor:id,name',
            'creator:id,name,email',
            'settlements',
        ])->findOrFail($id);
    }

    public function create(array $data): Order
    {
        return DB::transaction(function () use ($data) {
            $order = Order::create($data['order']);
            foreach ($data['items'] as $item) {
                $order->items()->create($item);
            }
            return $order->fresh('items.product');
        });
    }

    public function update(int $id, array $data): Order
    {
        return DB::transaction(function () use ($id, $data) {
            $order = Order::findOrFail($id);
            $order->update($data['order']);

            if (!empty($data['items'])) {
                $order->items()->delete();
                foreach ($data['items'] as $item) {
                    $order->items()->create($item);
                }
            }

            return $order->fresh('items.product');
        });
    }

    public function delete(int $id): bool
    {
        return Order::findOrFail($id)->delete();
    }

    public function getDashboardStats(): array
    {
        return [
            'total_orders' => Order::count(),
            'pending' => Order::where('status', 'pending')->count(),
            'dispatched' => Order::where('status', 'dispatched')->count(),
            'delivered' => Order::where('status', 'delivered')->count(),
            'cancelled' => Order::where('status', 'cancelled')->count(),
            'rto' => Order::where('status', 'rto')->count(),
            'revenue_today' => Order::whereDate('order_date', today())->where('status', 'delivered')->sum('total_amount'),
            'revenue_month' => Order::whereMonth('order_date', now()->month)->where('status', 'delivered')->sum('total_amount'),
            'profit_month' => Order::whereMonth('order_date', now()->month)->where('status', 'delivered')->sum('total_profit'),
            'revenue_total' => Order::where('status', 'delivered')->sum('total_amount'),
        ];
    }
}
