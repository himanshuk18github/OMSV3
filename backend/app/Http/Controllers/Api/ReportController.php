<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function sales(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'group_by' => 'nullable|in:day,month,sales_channel,state',
        ]);

        $groupBy = $request->get('group_by', 'day');
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');

        $query = Order::whereBetween('order_date', [$dateFrom, $dateTo])
            ->whereNotIn('status', ['cancelled', 'rto']);

        $data = match($groupBy) {
            'day' => $query->select(
                    DB::raw('DATE(order_date) as date'),
                    DB::raw('COUNT(*) as total_orders'),
                    DB::raw('SUM(total_amount) as revenue'),
                    DB::raw('SUM(total_profit) as profit')
                )->groupBy('date')->orderBy('date')->get(),

            'month' => $query->select(
                    DB::raw('DATE_FORMAT(order_date, "%Y-%m") as month'),
                    DB::raw('COUNT(*) as total_orders'),
                    DB::raw('SUM(total_amount) as revenue'),
                    DB::raw('SUM(total_profit) as profit')
                )->groupBy('month')->orderBy('month')->get(),

            'sales_channel' => $query->select(
                    'sales_channel',
                    DB::raw('COUNT(*) as total_orders'),
                    DB::raw('SUM(total_amount) as revenue'),
                    DB::raw('SUM(total_profit) as profit')
                )->groupBy('sales_channel')->orderByDesc('revenue')->get(),

            'state' => $query->select(
                    'state',
                    DB::raw('COUNT(*) as total_orders'),
                    DB::raw('SUM(total_amount) as revenue')
                )->groupBy('state')->orderByDesc('total_orders')->get(),
        };

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function topProducts(Request $request): JsonResponse
    {
        $dateFrom = $request->get('date_from', now()->startOfMonth()->toDateString());
        $dateTo = $request->get('date_to', now()->toDateString());

        $data = OrderItem::with('product:product_id,product_name,fixed_sku')
            ->whereHas('order', fn($q) => $q->whereBetween('order_date', [$dateFrom, $dateTo])
                ->whereNotIn('status', ['cancelled', 'rto']))
            ->select(
                'product_id',
                DB::raw('SUM(quantity) as total_qty'),
                DB::raw('SUM(total_amount) as revenue'),
                DB::raw('SUM(profit) as profit')
            )
            ->groupBy('product_id')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();

        return response()->json(['status' => 'success', 'data' => $data]);
    }
}
