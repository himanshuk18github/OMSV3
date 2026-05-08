<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 120)->unique();
            $table->string('name', 255);
            $table->longText('sql_query');
            $table->json('filter_schema')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['is_active', 'slug']);
        });

        DB::table('report_definitions')->insert([
            [
                'slug' => 'sales-summary',
                'name' => 'Sales Summary',
                'sql_query' => 'SELECT DATE(order_date) as date, COUNT(*) as total_orders, SUM(total_amount) as revenue, SUM(total_profit) as profit FROM orders WHERE order_date BETWEEN :date_from AND :date_to GROUP BY DATE(order_date) ORDER BY date',
                'filter_schema' => json_encode([
                    ['key' => 'date_from', 'label' => 'From Date', 'type' => 'date', 'required' => true],
                    ['key' => 'date_to', 'label' => 'To Date', 'type' => 'date', 'required' => true],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'top-products',
                'name' => 'Top Products',
                'sql_query' => 'SELECT oi.fixed_sku, oi.sku_scanned, SUM(oi.quantity) as total_qty, SUM(oi.total_amount) as revenue, SUM(oi.profit) as profit FROM order_items oi INNER JOIN orders o ON o.id = oi.order_id WHERE o.order_date BETWEEN :date_from AND :date_to GROUP BY oi.fixed_sku, oi.sku_scanned ORDER BY revenue DESC LIMIT 50',
                'filter_schema' => json_encode([
                    ['key' => 'date_from', 'label' => 'From Date', 'type' => 'date', 'required' => true],
                    ['key' => 'date_to', 'label' => 'To Date', 'type' => 'date', 'required' => true],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'inventory-snapshot',
                'name' => 'Inventory Snapshot',
                'sql_query' => 'SELECT product_id, fixed_sku, product_name, category, brand, unit, quantity, cost_per_unit, mrp, selling_price, gst_rate FROM inventory ORDER BY product_name',
                'filter_schema' => json_encode([]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'inventory-logs',
                'name' => 'Inventory Logs',
                'sql_query' => 'SELECT product_id, fixed_sku, quantity, cost_per_unit, notes, created_at FROM inventory_logs WHERE created_at BETWEEN :date_from AND :date_to ORDER BY created_at DESC',
                'filter_schema' => json_encode([
                    ['key' => 'date_from', 'label' => 'From Date', 'type' => 'date', 'required' => true],
                    ['key' => 'date_to', 'label' => 'To Date', 'type' => 'date', 'required' => true],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'settlements',
                'name' => 'Settlements',
                'sql_query' => 'SELECT order_ref_no, amount, transaction_no, payment_mode, payment_gateway, settlement_date, status, notes FROM settlements WHERE settlement_date BETWEEN :date_from AND :date_to ORDER BY settlement_date DESC',
                'filter_schema' => json_encode([
                    ['key' => 'date_from', 'label' => 'From Date', 'type' => 'date', 'required' => true],
                    ['key' => 'date_to', 'label' => 'To Date', 'type' => 'date', 'required' => true],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'rto-packages',
                'name' => 'RTO Packages',
                'sql_query' => 'SELECT return_ref_no, customer_name, sales_channel, sku_ref, sku_fixed, status, created_at FROM rto_packages ORDER BY created_at DESC',
                'filter_schema' => json_encode([]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('report_definitions');
    }
};
