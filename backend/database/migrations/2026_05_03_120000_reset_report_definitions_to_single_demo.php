<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('report_definitions')) {
            return;
        }

        DB::table('report_definitions')->delete();

        DB::table('report_definitions')->insert([
            'slug' => 'demo-universal-report',
            'name' => 'Demo Universal Report (Reference)',
            'sql_query' => <<<'SQL'
SELECT
  s.order_ref_no AS `Order Ref`,
  o.order_date AS `Order Date`,
  s.settlement_date AS `Settlement Date`,
  s.transaction_no AS `Transaction No`,
  s.payment_mode AS `Payment Mode`,
  s.payment_gateway AS `Payment Gateway`,
  o.sales_channel AS `Sales Channel`,
  o.customer_name AS `Customer Name`,
  o.customer_phone AS `Customer Phone`,
  o.customer_email AS `Customer Email`,
  o.custom_gstin AS `Customer GSTIN`,
  o.state AS `State`,
  oi.fixed_sku AS `Fixed SKU`,
  i.product_id AS `Product ID`,
  i.product_name AS `Product Name`,
  oi.quantity AS `Qty`,
  oi.selling_price AS `Selling Price`,
  oi.gst_rate AS `GST Rate`,
  o.total_amount AS `Order Total`,
  o.total_tax AS `Order Tax`,
  o.total_profit AS `Order Profit`,
  s.amount AS `Settlement Amount`,
  s.status AS `Settlement Status`,
  'neft' AS `Transaction Type Sample`
FROM settlements s
LEFT JOIN orders o ON o.id = s.order_id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN inventory i ON i.fixed_sku = oi.fixed_sku
WHERE
  (:date_from IS NULL OR o.order_date >= :date_from)
  AND (:date_to IS NULL OR o.order_date <= :date_to)
  AND (:settlement_from IS NULL OR s.settlement_date >= :settlement_from)
  AND (:settlement_to IS NULL OR s.settlement_date <= :settlement_to)
  AND (:custom_gstin IS NULL OR o.custom_gstin = :custom_gstin)
  AND (:product_id IS NULL OR i.product_id = :product_id)
  AND (:fixed_sku IS NULL OR oi.fixed_sku = :fixed_sku)
  AND (:customer_phone IS NULL OR o.customer_phone = :customer_phone)
  AND (:customer_email IS NULL OR o.customer_email = :customer_email)
  AND (:state IS NULL OR o.state = :state)
  AND (:sales_channel IS NULL OR o.sales_channel = :sales_channel)
  AND (:order_ref_no IS NULL OR s.order_ref_no = :order_ref_no)
  AND (:transaction_no IS NULL OR s.transaction_no = :transaction_no)
  AND (:payment_mode IS NULL OR s.payment_mode = :payment_mode)
  AND (:payment_gateway IS NULL OR s.payment_gateway = :payment_gateway)
  AND (:settlement_status IS NULL OR s.status = :settlement_status)
ORDER BY s.settlement_date DESC, o.order_date DESC
SQL,
            'filter_schema' => json_encode([
                ['key' => 'date_from', 'label' => 'From Order Date', 'type' => 'date'],
                ['key' => 'date_to', 'label' => 'To Order Date', 'type' => 'date'],
                ['key' => 'settlement_from', 'label' => 'From Settlement Date', 'type' => 'date'],
                ['key' => 'settlement_to', 'label' => 'To Settlement Date', 'type' => 'date'],
                ['key' => 'custom_gstin', 'label' => 'GSTIN', 'type' => 'text'],
                ['key' => 'product_id', 'label' => 'Product ID', 'type' => 'text'],
                ['key' => 'fixed_sku', 'label' => 'Fixed SKU', 'type' => 'text'],
                ['key' => 'customer_phone', 'label' => 'Customer Phone', 'type' => 'text'],
                ['key' => 'customer_email', 'label' => 'Customer Email', 'type' => 'text'],
                ['key' => 'state', 'label' => 'State', 'type' => 'text'],
                ['key' => 'sales_channel', 'label' => 'Sales Channel', 'type' => 'text'],
                ['key' => 'order_ref_no', 'label' => 'Order Ref No', 'type' => 'text'],
                ['key' => 'transaction_no', 'label' => 'Transaction No', 'type' => 'text'],
                ['key' => 'payment_mode', 'label' => 'Payment Mode', 'type' => 'text'],
                ['key' => 'payment_gateway', 'label' => 'Payment Gateway', 'type' => 'text'],
                ['key' => 'settlement_status', 'label' => 'Settlement Status', 'type' => 'text'],
            ]),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        if (!Schema::hasTable('report_definitions')) {
            return;
        }

        DB::table('report_definitions')->where('slug', 'demo-universal-report')->delete();
    }
};
