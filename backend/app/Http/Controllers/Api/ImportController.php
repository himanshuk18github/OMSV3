<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\InventoryLog;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ImportHistory;
use App\Models\RtoPackage;
use App\Models\Settlement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ImportController extends Controller
{
    private array $salesChannels = ['AMAZON', 'FLIPKART', 'MEESHO', 'OFFLINE', 'WEBSITE', 'SHOPIFY', 'JIOMART'];

    private array $stateNames = [
        'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH', 'GOA', 'GUJARAT', 'HARYANA',
        'HIMACHAL PRADESH', 'JHARKHAND', 'KARNATAKA', 'KERALA', 'MADHYA PRADESH', 'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA',
        'MIZORAM', 'NAGALAND', 'ODISHA', 'PUNJAB', 'RAJASTHAN', 'SIKKIM', 'TAMIL NADU', 'TELANGANA', 'TRIPURA',
        'UTTAR PRADESH', 'UTTARAKHAND', 'WEST BENGAL', 'DELHI', 'JAMMU AND KASHMIR', 'LADAKH', 'ANDAMAN AND NICOBAR ISLANDS',
        'CHANDIGARH', 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU', 'LAKSHADWEEP', 'PUDUCHERRY', 'OTHER',
    ];

    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:inventory,inventory_logs,orders,order_items,rto_packages,settlements',
            'rows' => 'required|array|min:1',
        ]);

        $type = $validated['type'];
        $rows = $validated['rows'];
        $rowErrors = [];
        $normalizedRows = [];

        foreach ($rows as $index => $row) {
            [$normalized, $errors] = $this->normalizeAndValidateRow($type, $row, $rows, $index);
            $normalizedRows[$index] = $normalized;
            $rowErrors[$index] = $errors;
        }

        $hasErrors = collect($rowErrors)->flatten()->isNotEmpty();

        return response()->json([
            'status' => 'success',
            'data' => [
                'type' => $type,
                'rows' => $normalizedRows,
                'row_errors' => $rowErrors,
                'has_errors' => $hasErrors,
            ],
        ]);
    }

    public function import(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:inventory,inventory_logs,orders,order_items,rto_packages,settlements',
            'rows' => 'required|array|min:1',
        ]);

        $preview = $this->preview($request)->getData(true);
        if (($preview['data']['has_errors'] ?? true) === true) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation errors found. Fix and retry import.',
                'data' => $preview['data'],
            ], 422);
        }

        $rows = $preview['data']['rows'] ?? [];
        $type = $validated['type'];
        $userId = (int) Auth::id();
        $created = 0;

        try {
            DB::transaction(function () use ($type, $rows, $userId, &$created) {
                foreach ($rows as $row) {
                    $this->importRow($type, $row, $userId);
                    $created++;
                }
            });
        } catch (QueryException $exception) {
            if ((string) $exception->getCode() === '23000') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Import failed because one or more rows duplicate an existing product_id or fixed_sku.',
                ], 422);
            }

            throw $exception;
        }

        ImportHistory::query()->create([
            'import_type' => $type,
            'file_name' => $request->input('file_name'),
            'row_count' => $created,
            'status' => 'success',
            'created_by' => $userId,
            'imported_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Import completed successfully.',
            'data' => [
                'created_rows' => $created,
                'type' => $type,
                'imported_at' => now()->toDateTimeString(),
            ],
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $history = ImportHistory::query()
            ->with('creator:id,name')
            ->latest('imported_at')
            ->limit(50)
            ->get()
            ->map(fn (ImportHistory $item) => [
                'id' => $item->id,
                'import_type' => $item->import_type,
                'file_name' => $item->file_name,
                'row_count' => $item->row_count,
                'status' => $item->status,
                'imported_at' => optional($item->imported_at)->toDateTimeString(),
                'created_by' => $item->created_by,
                'creator_name' => $item->creator?->name,
            ]);

        return response()->json(['status' => 'success', 'data' => $history]);
    }

    private function normalizeAndValidateRow(string $type, array $row, array $allRows, int $index): array
    {
        return match ($type) {
            'inventory' => $this->validateInventoryRow($row, $allRows, $index),
            'inventory_logs' => $this->validateInventoryLogRow($row),
            'orders' => $this->validateOrderRow($row, $allRows, $index),
            'order_items' => $this->validateOrderItemRow($row),
            'rto_packages' => $this->validateRtoPackageRow($row),
            'settlements' => $this->validateSettlementRow($row),
            default => [[], ['Unsupported import type']],
        };
    }

    private function importRow(string $type, array $row, int $userId): void
    {
        match ($type) {
            'inventory' => Inventory::query()->create([
                'product_id' => $row['product_id'],
                'fixed_sku' => $row['fixed_sku'],
                'product_name' => $row['product_name'],
                'description' => $row['description'],
                'category' => $row['category'],
                'brand' => $row['brand'],
                'unit' => $row['unit'],
                'quantity' => $row['quantity'],
                'cost_per_unit' => $row['cost_per_unit'],
                'mrp' => $row['mrp'],
                'selling_price' => $row['selling_price'],
                'item_type' => $row['item_type'],
                'gst_hsn_code' => $row['gst_hsn_code'],
                'gst_rate' => $row['gst_rate'],
                'is_active' => true,
            ]),
            'inventory_logs' => InventoryLog::query()->create([
                'product_id' => $row['product_id'],
                'fixed_sku' => $row['fixed_sku'],
                'quantity' => $row['quantity'],
                'cost_per_unit' => $row['cost_per_unit'],
                'notes' => $row['notes'],
                'created_by' => $userId,
                'updated_by' => $userId,
            ]),
            'orders' => Order::query()->create([
                'ref_no' => $row['ref_no'],
                'order_date' => $row['order_date'],
                'sales_channel' => $row['sales_channel'],
                'sales_channel_order_no' => $row['sales_channel_order_no'],
                'customer_name' => $row['customer_name'],
                'customer_phone' => $row['customer_phone'],
                'customer_email' => $row['customer_email'],
                'state' => $row['state'],
                'custom_gstin' => $row['custom_gstin'],
                'status' => $row['status'],
                'invoice_no' => $row['invoice_no'],
                'invoice_file_path' => $row['invoice_file_path'],
                'invoice_date' => $row['invoice_date'],
                'dispatch_date' => $row['dispatch_date'],
                'courier_partner' => $row['courier_partner'],
                'tracking_no' => $row['tracking_no'],
                'total_amount' => $row['total_amount'],
                'total_tax' => $row['total_tax'],
                'total_profit' => $row['total_profit'],
                'created_by' => $userId,
            ]),
            'order_items' => OrderItem::query()->create([
                'order_id' => $row['order_id'],
                'ref_no' => $row['ref_no'],
                'sku_scanned' => $row['sku_scanned'],
                'fixed_sku' => $row['fixed_sku'],
                'quantity' => $row['quantity'],
                'source_type' => $row['source_type'],
                'vendor_name' => $row['vendor_name'],
                'cost_price' => $row['cost_price'],
                'selling_price' => $row['selling_price'],
                'gst_rate' => $row['gst_rate'],
                'gst_amount' => $row['gst_amount'],
                'discount' => $row['discount'],
                'shipping_cost' => $row['shipping_cost'],
                'marketplace_fee' => $row['marketplace_fee'],
                'total_amount' => $row['total_amount'],
                'profit' => $row['profit'],
                'notes' => $row['notes'],
            ]),
            'rto_packages' => RtoPackage::query()->create([
                'return_ref_no' => $row['return_ref_no'],
                'customer_name' => $row['customer_name'],
                'sales_channel' => $row['sales_channel'],
                'sku_ref' => $row['sku_ref'],
                'sku_fixed' => $row['sku_fixed'],
                'additional_details' => $row['additional_details'],
                'status' => $row['status'],
                'created_by' => $userId,
            ]),
            'settlements' => Settlement::query()->create([
                'order_id' => $row['order_id'],
                'order_ref_no' => $row['order_ref_no'],
                'amount' => $row['amount'],
                'transaction_no' => $row['transaction_no'],
                'payment_mode' => $row['payment_mode'],
                'payment_gateway' => $row['payment_gateway'],
                'settlement_date' => $row['settlement_date'],
                'status' => $row['status'],
                'notes' => $row['notes'],
                'created_by' => $userId,
                'entered_by' => Auth::user()?->name,
                'entered_at' => now(),
            ]),
            default => null,
        };
    }

    private function validateInventoryRow(array $row, array $allRows, int $index): array
    {
        $errors = [];
        $productId = trim((string) ($row['product_id'] ?? ''));
        $fixedSku = strtoupper(trim((string) ($row['fixed_sku'] ?? '')));
        $productName = trim((string) ($row['product_name'] ?? ''));
        $itemType = strtoupper(trim((string) ($row['item_type'] ?? 'OWN')));
        $quantity = (int) ($row['qty'] ?? $row['quantity'] ?? 0);
        $costPerUnit = (float) ($row['cost_per_unit'] ?? 0);
        $mrp = (float) ($row['mrp'] ?? 0);
        $sellingPrice = (float) ($row['selling_price'] ?? 0);
        $gstRate = (float) ($row['gst_rate'] ?? 0);

        if ($productId === '') $errors[] = 'product_id is required';
        if ($productId !== '' && Inventory::query()->where('product_id', $productId)->exists()) $errors[] = 'product_id already exists';
        if ($fixedSku === '') $errors[] = 'fixed_sku is required';
        if ($fixedSku !== '' && Inventory::query()->where('fixed_sku', $fixedSku)->exists()) $errors[] = 'fixed_sku already exists';
        if ($productName === '') $errors[] = 'product_name is required';
        if (!in_array($itemType, ['OWN', 'VENDOR'], true)) $errors[] = 'item_type must be OWN or VENDOR';
        if ($quantity < 0) $errors[] = 'qty must be 0 or greater';
        if ($costPerUnit < 0) $errors[] = 'cost_per_unit must be 0 or greater';
        if ($mrp < 0) $errors[] = 'mrp must be 0 or greater';
        if ($sellingPrice < 0) $errors[] = 'selling_price must be 0 or greater';
        if ($sellingPrice > $mrp && $mrp > 0) $errors[] = 'selling_price cannot be greater than mrp';
        if ($gstRate < 0 || $gstRate > 100) $errors[] = 'gst_rate must be between 0 and 100';

        $productIdCount = collect($allRows)->pluck('product_id')->map(fn ($value) => trim((string) $value))->filter()->countBy();
        if ($productId !== '' && ($productIdCount[$productId] ?? 0) > 1) {
            $errors[] = 'product_id is duplicated in the uploaded file';
        }

        $fixedSkuCount = collect($allRows)->pluck('fixed_sku')->map(fn ($value) => strtoupper(trim((string) $value)))->filter()->countBy();
        if ($fixedSku !== '' && ($fixedSkuCount[$fixedSku] ?? 0) > 1) {
            $errors[] = 'fixed_sku is duplicated in the uploaded file';
        }

        return [[
            'product_id' => $productId,
            'fixed_sku' => $fixedSku,
            'product_name' => $productName,
            'description' => trim((string) ($row['description'] ?? '')) ?: null,
            'category' => trim((string) ($row['category'] ?? '')) ?: null,
            'brand' => trim((string) ($row['brand'] ?? '')) ?: null,
            'unit' => trim((string) ($row['unit'] ?? '')) ?: 'pcs',
            'quantity' => $quantity,
            'cost_per_unit' => round($costPerUnit, 2),
            'mrp' => round($mrp, 2),
            'selling_price' => round($sellingPrice, 2),
            'item_type' => $itemType,
            'gst_hsn_code' => trim((string) ($row['gst_hsn_code'] ?? '')) ?: null,
            'gst_rate' => round($gstRate, 2),
        ], $errors];
    }

    private function validateInventoryLogRow(array $row): array
    {
        $errors = [];
        $productId = trim((string) ($row['product_id'] ?? ''));
        $fixedSku = strtoupper(trim((string) ($row['fixed_sku'] ?? '')));
        $quantity = (int) ($row['quantity'] ?? 0);
        $costPerUnit = (float) ($row['cost_per_unit'] ?? 0);
        if ($productId === '') $errors[] = 'product_id is required';
        if ($fixedSku === '') $errors[] = 'fixed_sku is required';
        if ($quantity === 0) $errors[] = 'quantity is required';
        if (!Inventory::query()->where('product_id', $productId)->exists()) $errors[] = 'product_id not found';

        return [[
            'product_id' => $productId,
            'fixed_sku' => $fixedSku,
            'quantity' => $quantity,
            'cost_per_unit' => round($costPerUnit, 2),
            'notes' => trim((string) ($row['notes'] ?? '')) ?: null,
        ], $errors];
    }

    private function validateOrderRow(array $row, array $allRows, int $index): array
    {
        $errors = [];
        $refNo = trim((string) ($row['ref_no'] ?? ''));
        $orderDate = $this->parseDate($row['order_date'] ?? null);
        $salesChannel = strtoupper(trim((string) ($row['sales_channel'] ?? '')));
        $state = strtoupper(trim((string) ($row['state'] ?? '')));
        $status = strtolower(trim((string) ($row['status'] ?? 'pending')));
        $customerPhone = trim((string) ($row['customer_phone'] ?? ''));
        $customerEmail = trim((string) ($row['customer_email'] ?? ''));

        if ($refNo === '') $errors[] = 'ref_no is required';
        if (Order::query()->where('ref_no', $refNo)->exists()) $errors[] = 'ref_no already exists';
        if (collect($allRows)->pluck('ref_no')->filter()->count() !== collect($allRows)->pluck('ref_no')->filter()->unique()->count()) {
            if (collect($allRows)->pluck('ref_no')->filter()->count() > 0) {
                $duplicates = collect($allRows)->pluck('ref_no')->filter()->countBy()->filter(fn ($count) => $count > 1)->keys()->all();
                if (in_array($refNo, $duplicates, true)) {
                    $errors[] = 'ref_no duplicated in uploaded file';
                }
            }
        }
        if (!$orderDate) $errors[] = 'order_date must be valid date';
        if (!in_array($salesChannel, $this->salesChannels, true)) $errors[] = 'sales_channel is invalid';
        if (!in_array($state, $this->stateNames, true)) $errors[] = 'state is invalid';
        if (!in_array($status, ['draft','pending','confirmed','packed','dispatched','in_transit','delivered','cancelled','rto'], true)) $errors[] = 'status is invalid';

        return [[
            'ref_no' => $refNo,
            'order_date' => $orderDate,
            'sales_channel' => $salesChannel,
            'sales_channel_order_no' => trim((string) ($row['sales_channel_order_no'] ?? '')) ?: null,
            'customer_name' => trim((string) ($row['customer_name'] ?? '')) ?: null,
            'customer_phone' => $customerPhone ?: null,
            'customer_email' => $customerEmail ?: null,
            'state' => $state ?: null,
            'custom_gstin' => trim((string) ($row['custom_gstin'] ?? '')) ?: null,
            'status' => $status,
            'invoice_no' => trim((string) ($row['invoice_no'] ?? '')) ?: null,
            'invoice_file_path' => trim((string) ($row['invoice_file_path'] ?? '')) ?: null,
            'invoice_date' => $this->parseDate($row['invoice_date'] ?? null),
            'dispatch_date' => $this->parseDate($row['dispatch_date'] ?? null),
            'courier_partner' => trim((string) ($row['courier_partner'] ?? '')) ?: null,
            'tracking_no' => trim((string) ($row['tracking_no'] ?? '')) ?: null,
            'total_amount' => round((float) ($row['total_amount'] ?? 0), 2),
            'total_tax' => round((float) ($row['total_tax'] ?? 0), 2),
            'total_profit' => round((float) ($row['total_profit'] ?? 0), 2),
        ], $errors];
    }

    private function validateOrderItemRow(array $row): array
    {
        $errors = [];
        $orderIdValue = trim((string) ($row['order_id'] ?? ''));
        $refNo = trim((string) ($row['ref_no'] ?? ''));
        $skuScanned = trim((string) ($row['sku_scanned'] ?? ''));
        $fixedSku = trim((string) ($row['fixed_sku'] ?? ''));
        $quantity = (int) ($row['quantity'] ?? 0);
        if ($refNo === '') $errors[] = 'ref_no is required';
        if ($skuScanned === '') $errors[] = 'sku_scanned is required';
        if ($fixedSku === '') $errors[] = 'fixed_sku is required';
        if ($quantity <= 0) $errors[] = 'quantity must be greater than 0';

        $order = null;
        if ($refNo !== '') {
            $order = Order::query()->where('ref_no', $refNo)->first();
        }

        if (!$order && $orderIdValue !== '' && ctype_digit($orderIdValue)) {
            $order = Order::query()->where('id', (int) $orderIdValue)->first();
        }

        if (!$order) {
            $errors[] = 'ref_no not found in orders table';
        }

        return [[
            'order_id' => $order?->id,
            'ref_no' => $refNo,
            'sku_scanned' => $skuScanned,
            'fixed_sku' => $fixedSku,
            'quantity' => $quantity,
            'source_type' => strtoupper(trim((string) ($row['source_type'] ?? 'OWN'))),
            'vendor_name' => trim((string) ($row['vendor_name'] ?? '')) ?: null,
            'cost_price' => round((float) ($row['cost_price'] ?? 0), 2),
            'selling_price' => round((float) ($row['selling_price'] ?? 0), 2),
            'gst_rate' => round((float) ($row['gst_rate'] ?? 0), 2),
            'gst_amount' => round((float) ($row['gst_amount'] ?? 0), 2),
            'discount' => round((float) ($row['discount'] ?? 0), 2),
            'shipping_cost' => round((float) ($row['shipping_cost'] ?? 0), 2),
            'marketplace_fee' => round((float) ($row['marketplace_fee'] ?? 0), 2),
            'total_amount' => round((float) ($row['total_amount'] ?? 0), 2),
            'profit' => round((float) ($row['profit'] ?? 0), 2),
            'notes' => trim((string) ($row['notes'] ?? '')) ?: null,
        ], $errors];
    }

    private function validateRtoPackageRow(array $row): array
    {
        $errors = [];
        $returnRefNo = trim((string) ($row['return_ref_no'] ?? ''));
        $customerName = trim((string) ($row['customer_name'] ?? ''));
        $salesChannel = strtoupper(trim((string) ($row['sales_channel'] ?? '')));
        $skuRef = trim((string) ($row['sku_ref'] ?? ''));
        $skuFixed = trim((string) ($row['sku_fixed'] ?? ''));
        $status = trim((string) ($row['status'] ?? ''));
        $allowedStatus = ['RTO DELIVERED - DAMAGED CONDITION', 'RTO DELIVERED - PERFECT CONDITION'];
        if ($returnRefNo === '') $errors[] = 'return_ref_no is required';
        if (RtoPackage::query()->where('return_ref_no', $returnRefNo)->exists()) $errors[] = 'return_ref_no already exists';
        if ($customerName === '') $errors[] = 'customer_name is required';
        if (!in_array($salesChannel, $this->salesChannels, true)) $errors[] = 'sales_channel is invalid';
        if ($skuRef === '') $errors[] = 'sku_ref is required';
        if ($skuFixed === '') $errors[] = 'sku_fixed is required';
        if (!in_array($status, $allowedStatus, true)) $errors[] = 'status is invalid';

        return [[
            'return_ref_no' => $returnRefNo,
            'customer_name' => $customerName,
            'sales_channel' => $salesChannel,
            'sku_ref' => $skuRef,
            'sku_fixed' => $skuFixed,
            'additional_details' => trim((string) ($row['additional_details'] ?? '')) ?: null,
            'status' => $status,
        ], $errors];
    }

    private function validateSettlementRow(array $row): array
    {
        $errors = [];
        $orderRefNo = trim((string) ($row['order_ref_no'] ?? ''));
        $amount = (float) ($row['amount'] ?? 0);
        $transactionNo = trim((string) ($row['transaction_no'] ?? ''));
        $settlementDate = $this->parseDate($row['settlement_date'] ?? null);
        $status = trim((string) ($row['status'] ?? 'pending'));
        if ($orderRefNo === '') $errors[] = 'order_ref_no is required';
        if ($transactionNo !== '' && Settlement::query()->where('transaction_no', $transactionNo)->exists()) $errors[] = 'transaction_no already exists';
        if ($amount <= 0) $errors[] = 'amount is required';
        if (!$settlementDate) $errors[] = 'settlement_date is required';
        if (!in_array($status, ['pending', 'settled', 'failed'], true)) $errors[] = 'status is invalid';
        $order = Order::query()->where('ref_no', $orderRefNo)->first();
        if (!$order && !empty($row['order_id'])) {
            $order = Order::query()->where('id', (int) $row['order_id'])->first();
        }
        if (!$order) $errors[] = 'order_ref_no/order_id not found';

        return [[
            'order_id' => $order?->id,
            'order_ref_no' => $orderRefNo,
            'amount' => round($amount, 2),
            'transaction_no' => $transactionNo ?: null,
            'payment_mode' => trim((string) ($row['payment_mode'] ?? '')) ?: null,
            'payment_gateway' => trim((string) ($row['payment_gateway'] ?? '')) ?: null,
            'settlement_date' => $settlementDate,
            'status' => $status,
            'notes' => trim((string) ($row['notes'] ?? '')) ?: null,
        ], $errors];
    }

    private function parseDate(mixed $value): ?string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }
}
