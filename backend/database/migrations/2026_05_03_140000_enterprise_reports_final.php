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
            [
                'slug' => 'initial-inventory',
                'name' => 'Initial Inventory',
                'sql_query' => <<<'SQL'
SELECT
  i.id,
  i.product_id,
  i.fixed_sku,
  i.product_name,
  i.description,
  i.category,
  i.brand,
  i.unit,
  i.selling_price,
  i.item_type,
  i.is_active,
  i.quantity,
  i.cost_per_unit,
  i.mrp,
  i.gst_hsn_code,
  i.gst_rate,
  i.created_at,
  i.updated_at
FROM inventory i
WHERE
  (:product_id IS NULL OR i.product_id = :product_id)
  AND (:fixed_sku IS NULL OR i.fixed_sku = :fixed_sku)
  AND (:product_name IS NULL OR i.product_name LIKE CONCAT('%', :product_name, '%'))
ORDER BY i.id
SQL,
                'filter_schema' => json_encode([
                    ['key' => 'product_id', 'label' => 'Product ID', 'type' => 'text'],
                    ['key' => 'fixed_sku', 'label' => 'SKU', 'type' => 'text'],
                    ['key' => 'product_name', 'label' => 'Product Name', 'type' => 'text'],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'inventory-logs-enterprise',
                'name' => 'Inventory Logs',
                'sql_query' => <<<'SQL'
SELECT
  il.id,
  il.product_id,
  il.fixed_sku,
  i.product_name,
  il.quantity,
  il.cost_per_unit,
  il.notes,
  il.created_by,
  u.name AS created_by_name,
  il.updated_by,
  uu.name AS updated_by_name,
  il.created_at,
  il.updated_at
FROM inventory_logs il
LEFT JOIN inventory i ON i.product_id = il.product_id
LEFT JOIN users u ON u.id = il.created_by
LEFT JOIN users uu ON uu.id = il.updated_by
WHERE
  (:date_from IS NULL OR DATE(il.created_at) >= :date_from)
  AND (:date_to IS NULL OR DATE(il.created_at) <= :date_to)
  AND (:product_id IS NULL OR il.product_id = :product_id)
  AND (:fixed_sku IS NULL OR il.fixed_sku = :fixed_sku)
  AND (:product_name IS NULL OR i.product_name LIKE CONCAT('%', :product_name, '%'))
ORDER BY il.created_at DESC, il.id DESC
SQL,
                'filter_schema' => json_encode([
                    ['key' => 'date_from', 'label' => 'From Date', 'type' => 'date'],
                    ['key' => 'date_to', 'label' => 'To Date', 'type' => 'date'],
                    ['key' => 'product_id', 'label' => 'Product ID', 'type' => 'text'],
                    ['key' => 'fixed_sku', 'label' => 'SKU', 'type' => 'text'],
                    ['key' => 'product_name', 'label' => 'Product Name', 'type' => 'text'],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'closing-stock',
                'name' => 'Closing Stock',
                'sql_query' => <<<'SQL'
SELECT
  i.id,
  i.product_id,
  i.fixed_sku AS sku_fixed,
  i.product_name,
  COALESCE(i.quantity, 0) AS opening_stock,
  COALESCE(su.stock_update, 0) AS stock_update,
  COALESCE(so.stock_out, 0) AS stock_out,
  (COALESCE(i.quantity, 0) + COALESCE(su.stock_update, 0) - COALESCE(so.stock_out, 0)) AS closing_stock
FROM inventory i
LEFT JOIN (
  SELECT fixed_sku, SUM(quantity) AS stock_update
  FROM inventory_logs
  WHERE fixed_sku IS NOT NULL
  GROUP BY fixed_sku
) su ON su.fixed_sku = i.fixed_sku
LEFT JOIN (
  SELECT oi.fixed_sku, SUM(oi.quantity) AS stock_out
  FROM order_items oi
  INNER JOIN orders o ON o.id = oi.order_id
  WHERE LOWER(o.status) IN ('confirmed','packed','dispatched','delivered','in_transit','intransit')
    AND (oi.source_type IS NULL OR UPPER(oi.source_type) <> 'VENDOR')
  GROUP BY oi.fixed_sku
) so ON so.fixed_sku = i.fixed_sku
WHERE
  (i.item_type IS NULL OR UPPER(i.item_type) NOT IN ('VENDOR','VENDOR_ITEM','VENDOR ITEM'))
  AND (:product_id IS NULL OR i.product_id = :product_id)
  AND (:fixed_sku IS NULL OR i.fixed_sku = :fixed_sku)
  AND (:product_name IS NULL OR i.product_name LIKE CONCAT('%', :product_name, '%'))
ORDER BY i.id
SQL,
                'filter_schema' => json_encode([
                    ['key' => 'product_id', 'label' => 'Product ID', 'type' => 'text'],
                    ['key' => 'fixed_sku', 'label' => 'SKU', 'type' => 'text'],
                    ['key' => 'product_name', 'label' => 'Product Name', 'type' => 'text'],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'orders-combined',
                'name' => 'Orders (Combined)',
                'sql_query' => <<<'SQL'
SELECT
  o.id AS order_id,
  o.ref_no,
  o.order_date,
  o.invoice_no,
  o.invoice_date,
  o.dispatch_date,
  o.status,
  o.sales_channel,
  o.customer_name,
  o.customer_phone,
  o.state,
  o.custom_gstin,
  o.total_amount AS order_total_amount,
  o.total_tax AS order_total_tax,
  o.total_profit AS order_total_profit,
  oi.id AS order_item_id,
  oi.fixed_sku,
  oi.quantity,
  oi.source_type,
  oi.vendor_name,
  oi.cost_price,
  oi.selling_price,
  oi.gst_rate,
  oi.gst_amount,
  oi.discount,
  oi.shipping_cost,
  oi.marketplace_fee,
  oi.total_amount AS line_total_amount,
  oi.profit AS line_profit,
  i.product_id,
  i.product_name
FROM order_items oi
INNER JOIN orders o ON o.id = oi.order_id
LEFT JOIN inventory i ON i.fixed_sku = oi.fixed_sku
WHERE
  (:date_from IS NULL OR o.order_date >= :date_from)
  AND (:date_to IS NULL OR o.order_date <= :date_to)
  AND (:sales_channel IS NULL OR o.sales_channel = :sales_channel)
  AND (:state IS NULL OR o.state = :state)
  AND (:source_type IS NULL OR UPPER(oi.source_type) = UPPER(:source_type))
  AND (:custom_gstin IS NULL OR o.custom_gstin = :custom_gstin)
  AND (:customer_phone IS NULL OR o.customer_phone = :customer_phone)
  AND (:product_id IS NULL OR i.product_id = :product_id)
  AND (:fixed_sku IS NULL OR oi.fixed_sku = :fixed_sku)
ORDER BY o.order_date DESC, o.id DESC, oi.id ASC
SQL,
                'filter_schema' => json_encode([
                    ['key' => 'date_from', 'label' => 'From Order Date', 'type' => 'date'],
                    ['key' => 'date_to', 'label' => 'To Order Date', 'type' => 'date'],
                    ['key' => 'sales_channel', 'label' => 'Sales Channel', 'type' => 'text'],
                    ['key' => 'state', 'label' => 'State', 'type' => 'text'],
                    [
                        'key' => 'source_type',
                        'label' => 'Source Type',
                        'type' => 'select',
                        'options' => [
                            ['label' => 'OWN', 'value' => 'OWN'],
                            ['label' => 'VENDOR', 'value' => 'VENDOR'],
                        ],
                    ],
                    ['key' => 'custom_gstin', 'label' => 'Customer GSTIN', 'type' => 'text'],
                    ['key' => 'customer_phone', 'label' => 'Customer Phone', 'type' => 'text'],
                    ['key' => 'product_id', 'label' => 'Product ID', 'type' => 'text'],
                    ['key' => 'fixed_sku', 'label' => 'SKU', 'type' => 'text'],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'orders-combined-vendor',
                'name' => 'Orders (Combined - Vendor Source)',
                'sql_query' => <<<'SQL'
SELECT
  o.id AS order_id,
  o.ref_no,
  o.order_date,
  o.invoice_no,
  o.invoice_date,
  o.dispatch_date,
  o.status,
  o.sales_channel,
  o.customer_name,
  o.customer_phone,
  o.state,
  o.custom_gstin,
  o.total_amount AS order_total_amount,
  o.total_tax AS order_total_tax,
  o.total_profit AS order_total_profit,
  oi.id AS order_item_id,
  oi.fixed_sku,
  oi.quantity,
  oi.source_type,
  oi.vendor_name,
  oi.cost_price,
  oi.selling_price,
  oi.gst_rate,
  oi.gst_amount,
  oi.discount,
  oi.shipping_cost,
  oi.marketplace_fee,
  oi.total_amount AS line_total_amount,
  oi.profit AS line_profit,
  i.product_id,
  i.product_name
FROM order_items oi
INNER JOIN orders o ON o.id = oi.order_id
LEFT JOIN inventory i ON i.fixed_sku = oi.fixed_sku
WHERE
  UPPER(oi.source_type) = 'VENDOR'
  AND (:date_from IS NULL OR o.order_date >= :date_from)
  AND (:date_to IS NULL OR o.order_date <= :date_to)
  AND (:sales_channel IS NULL OR o.sales_channel = :sales_channel)
  AND (:state IS NULL OR o.state = :state)
  AND (:custom_gstin IS NULL OR o.custom_gstin = :custom_gstin)
  AND (:customer_phone IS NULL OR o.customer_phone = :customer_phone)
ORDER BY o.order_date DESC, o.id DESC, oi.id ASC
SQL,
                'filter_schema' => json_encode([
                    ['key' => 'date_from', 'label' => 'From Order Date', 'type' => 'date'],
                    ['key' => 'date_to', 'label' => 'To Order Date', 'type' => 'date'],
                    ['key' => 'sales_channel', 'label' => 'Sales Channel', 'type' => 'text'],
                    ['key' => 'state', 'label' => 'State', 'type' => 'text'],
                    ['key' => 'custom_gstin', 'label' => 'Customer GSTIN', 'type' => 'text'],
                    ['key' => 'customer_phone', 'label' => 'Customer Phone', 'type' => 'text'],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'settlements-enterprise',
                'name' => 'Settlements Report',
                'sql_query' => <<<'SQL'
SELECT
  s.id AS settlement_id,
  s.settlement_date,
  s.order_ref_no,
  s.order_id,
  s.transaction_no,
  s.payment_mode,
  s.payment_gateway,
  s.status AS settlement_status,
  s.amount AS settlement_amount,
  s.notes,
  s.entered_by,
  s.entered_at,
  o.ref_no,
  o.order_date,
  o.invoice_no,
  o.invoice_date,
  o.sales_channel,
  o.customer_name,
  o.customer_phone,
  o.state,
  o.custom_gstin
FROM settlements s
LEFT JOIN orders o ON o.id = s.order_id
WHERE
  (:date_from IS NULL OR s.settlement_date >= :date_from)
  AND (:date_to IS NULL OR s.settlement_date <= :date_to)
  AND (:sales_channel IS NULL OR o.sales_channel = :sales_channel)
  AND (:state IS NULL OR o.state = :state)
  AND (:payment_mode IS NULL OR s.payment_mode = :payment_mode)
  AND (:payment_gateway IS NULL OR s.payment_gateway = :payment_gateway)
  AND (:transaction_no IS NULL OR s.transaction_no = :transaction_no)
  AND (:custom_gstin IS NULL OR o.custom_gstin = :custom_gstin)
ORDER BY s.settlement_date DESC, s.id DESC
SQL,
                'filter_schema' => json_encode([
                    ['key' => 'date_from', 'label' => 'From Settlement Date', 'type' => 'date'],
                    ['key' => 'date_to', 'label' => 'To Settlement Date', 'type' => 'date'],
                    ['key' => 'sales_channel', 'label' => 'Sales Channel', 'type' => 'text'],
                    ['key' => 'state', 'label' => 'State', 'type' => 'text'],
                    ['key' => 'payment_mode', 'label' => 'Payment Mode', 'type' => 'text'],
                    ['key' => 'payment_gateway', 'label' => 'Payment Gateway', 'type' => 'text'],
                    ['key' => 'transaction_no', 'label' => 'Transaction No', 'type' => 'text'],
                    ['key' => 'custom_gstin', 'label' => 'Customer GSTIN', 'type' => 'text'],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'gst-r1-report',
                'name' => 'GST R1 Report',
                'sql_query' => <<<'SQL'
SELECT
  o.invoice_no,
  o.invoice_date,
  o.ref_no,
  o.customer_name,
  o.customer_phone,
  o.custom_gstin,
  o.state,
  o.sales_channel,
  oi.fixed_sku,
  i.product_name,
  oi.quantity,
  oi.selling_price,
  oi.discount,
  ROUND(GREATEST((COALESCE(oi.quantity, 0) * COALESCE(oi.selling_price, 0)) - COALESCE(oi.discount, 0), 0), 2) AS taxable_value,
  ROUND(COALESCE(oi.gst_rate, 0), 2) AS gst_rate,
  ROUND(COALESCE(oi.gst_amount, 0), 2) AS gst_amount,
  ROUND(GREATEST((COALESCE(oi.quantity, 0) * COALESCE(oi.selling_price, 0)) - COALESCE(oi.discount, 0), 0) + COALESCE(oi.gst_amount, 0), 2) AS line_total
FROM order_items oi
INNER JOIN orders o ON o.id = oi.order_id
LEFT JOIN inventory i ON i.fixed_sku = oi.fixed_sku
WHERE
  o.invoice_no IS NOT NULL
  AND o.invoice_no <> ''
  AND o.invoice_date IS NOT NULL
  AND (:date_from IS NULL OR o.invoice_date >= :date_from)
  AND (:date_to IS NULL OR o.invoice_date <= :date_to)
  AND (:state IS NULL OR o.state = :state)
  AND (:custom_gstin IS NULL OR o.custom_gstin = :custom_gstin)
ORDER BY o.invoice_date ASC, o.invoice_no ASC, oi.id ASC
SQL,
                'filter_schema' => json_encode([
                    ['key' => 'date_from', 'label' => 'From Invoice Date', 'type' => 'date'],
                    ['key' => 'date_to', 'label' => 'To Invoice Date', 'type' => 'date'],
                    ['key' => 'state', 'label' => 'State', 'type' => 'text'],
                    ['key' => 'custom_gstin', 'label' => 'Customer GSTIN', 'type' => 'text'],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        if (!Schema::hasTable('report_definitions')) {
            return;
        }

        DB::table('report_definitions')
            ->whereIn('slug', [
                'initial-inventory',
                'inventory-logs-enterprise',
                'closing-stock',
                'orders-combined',
                'orders-combined-vendor',
                'settlements-enterprise',
                'gst-r1-report',
            ])
            ->delete();
    }
};
