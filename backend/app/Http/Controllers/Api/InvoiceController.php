<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FormulaConfig;
use App\Models\FormulaConfigVersion;
use App\Models\Inventory;
use App\Models\InvoiceRecord;
use App\Models\Order;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InvoiceController extends Controller
{
    public function reserveInvoiceNumber(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;
        $cachedNumber = Cache::get($this->userInvoiceNumberCacheKey($userId));

        if (!$cachedNumber) {
            $cachedNumber = $this->reserveNextInvoiceNumber($userId);
            Cache::put($this->userInvoiceNumberCacheKey($userId), $cachedNumber, now()->addMinutes(30));
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'invoice_number' => $cachedNumber,
                'invoice_date' => now('Asia/Kolkata')->toDateString(),
            ],
        ]);
    }

    public function products(Request $request): JsonResponse
    {
        $search = mb_strtoupper(trim((string) $request->query('q', '')));

        $products = Inventory::query()
            ->select(['product_id', 'fixed_sku', 'product_name', 'mrp', 'gst_hsn_code', 'gst_rate', 'cost_per_unit', 'item_type'])
            ->whereNotNull('fixed_sku')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->whereRaw('UPPER(product_name) LIKE ?', ["%{$search}%"])
                        ->orWhereRaw('UPPER(fixed_sku) LIKE ?', ["%{$search}%"])
                        ->orWhereRaw('UPPER(product_id) LIKE ?', ["%{$search}%"]);
                });
            })
            ->orderBy('product_name')
            ->limit(200)
            ->get()
            ->map(fn ($row) => [
                'product_id' => mb_strtoupper((string) $row->product_id),
                'sku_fixed' => mb_strtoupper((string) $row->fixed_sku),
                'product_name' => mb_strtoupper((string) $row->product_name),
                'mrp' => (float) $row->mrp,
                'gst_hsn_code' => trim((string) ($row->gst_hsn_code ?? '')),
                'gst_rate' => (float) ($row->gst_rate ?? 0),
                'cost_per_unit' => (float) ($row->cost_per_unit ?? 0),
                'item_type' => mb_strtoupper((string) ($row->item_type ?? 'OWN')),
                'label' => mb_strtoupper((string) $row->product_name) . ' (' . mb_strtoupper((string) $row->fixed_sku) . ')',
            ])
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => $products,
        ]);
    }

    public function uploadTempPdf(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_pdf' => ['required', 'file', 'max:10240', 'mimetypes:application/pdf'],
            'invoice_number' => ['required', 'string', 'max:40'],
        ]);

        $userId = (int) $request->user()->id;
        $file = $validated['invoice_pdf'];
        $safeNumber = preg_replace('/[^A-Za-z0-9]+/', '_', (string) $validated['invoice_number']) ?: 'INV';
        $fileName = $safeNumber . '_tmp_' . Str::random(8) . '.pdf';
        $path = $file->storeAs('invoice_records/tmp/' . now()->format('Y/m/d'), $fileName, 'local');

        $tempId = (string) Str::uuid();
        Cache::put($this->tempPdfCacheKey($tempId), [
            'user_id' => $userId,
            'path' => $path,
        ], now()->addMinutes(30));

        return response()->json([
            'status' => 'success',
            'data' => [
                'temp_id' => $tempId,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_number' => ['required', 'string', 'max:40'],
            'invoice_date' => ['required', 'date'],
            'mode_of_payment' => ['required', 'string', 'max:50'],
            'buyer_name' => ['required', 'string', 'max:200'],
            'buyer_add' => ['nullable', 'string'],
            'buyer_state' => ['required', 'string', 'max:100'],
            'buyer_contact' => ['required', 'string', 'max:50'],
            'buyer_gst' => ['nullable', 'string', 'max:30'],
            'additional_details' => ['nullable', 'string'],
            'sales_channel' => ['required', 'string', 'max:50'],
            'actual_total' => ['required', 'numeric', 'min:0'],
            'total_discount' => ['required', 'numeric', 'min:0'],
            'total_taxable' => ['required', 'numeric', 'min:0'],
            'total_gst' => ['required', 'numeric', 'min:0'],
            'net_amount' => ['required', 'numeric', 'min:0'],
            'amount_in_words' => ['required', 'string'],
            'invoice_temp_id' => ['required', 'string', 'max:100'],
            'push_to_pending' => ['nullable', 'boolean'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.line_no' => ['required', 'integer', 'min:1'],
            'items.*.product_name' => ['required', 'string', 'max:255'],
            'items.*.sku_fixed' => ['required', 'string', 'max:100'],
            'items.*.sku_scanned' => ['required', 'string', 'max:150'],
            'items.*.hsn_sac' => ['nullable', 'string', 'max:50'],
            'items.*.gst_rate' => ['required', 'numeric', 'in:0,5,12,18,28'],
            'items.*.quantity' => ['required', 'integer', 'in:1'],
            'items.*.mrp' => ['required', 'numeric', 'min:0'],
            'items.*.rate' => ['required', 'numeric', 'min:0'],
            'items.*.discount_amount' => ['required', 'numeric', 'min:0'],
            'items.*.taxable_amount' => ['required', 'numeric', 'min:0'],
            'items.*.gst_amount' => ['required', 'numeric', 'min:0'],
            'items.*.net_amount' => ['required', 'numeric', 'min:0'],
            'items.*.additional_details' => ['nullable', 'string'],
        ]);

        $userId = (int) $request->user()->id;
        $invoiceNumber = trim((string) $validated['invoice_number']);

        $reservedForUser = Cache::get($this->reservedInvoiceNumberCacheKey($invoiceNumber));
        if ((int) $reservedForUser !== $userId) {
            throw ValidationException::withMessages([
                'invoice_number' => 'Invoice number expired or invalid. Please refresh and retry.',
            ]);
        }

        $cachedForUser = (string) Cache::get($this->userInvoiceNumberCacheKey($userId), '');
        if ($cachedForUser !== $invoiceNumber) {
            throw ValidationException::withMessages([
                'invoice_number' => 'Invoice number mismatch. Please refresh and retry.',
            ]);
        }

        $tempPdf = Cache::get($this->tempPdfCacheKey((string) $validated['invoice_temp_id']));
        if (!is_array($tempPdf) || (int) ($tempPdf['user_id'] ?? 0) !== $userId) {
            throw ValidationException::withMessages([
                'invoice_temp_id' => 'Invoice PDF upload expired. Please upload PDF again.',
            ]);
        }

        $tempPath = (string) ($tempPdf['path'] ?? '');
        if (!$tempPath || !Storage::disk('local')->exists($tempPath)) {
            throw ValidationException::withMessages([
                'invoice_temp_id' => 'Uploaded invoice PDF not found. Please upload again.',
            ]);
        }

        $invoiceDate = now('Asia/Kolkata')->toDateString();
        if ((string) $validated['invoice_date'] !== $invoiceDate) {
            throw ValidationException::withMessages([
                'invoice_date' => 'Invoice date must be today only.',
            ]);
        }

        [$seriesLabel, $sequenceNo] = $this->parseInvoiceNumber($invoiceNumber);

        try {
            $result = DB::transaction(function () use ($validated, $invoiceNumber, $seriesLabel, $sequenceNo, $tempPath, $userId) {
                $this->validateSequenceAtSubmit($seriesLabel, $sequenceNo);

                if (InvoiceRecord::query()->where('invoice_number', $invoiceNumber)->exists()) {
                    throw ValidationException::withMessages([
                        'invoice_number' => 'Invoice number already exists.',
                    ]);
                }

                $safeNumber = preg_replace('/[^A-Za-z0-9]+/', '_', $invoiceNumber) ?: 'INV';
                $pdfFileName = $safeNumber . '_' . now()->format('Hisv') . '.pdf';
                $pdfPath = 'invoice_records/' . now()->format('Y/m') . '/' . $pdfFileName;
                Storage::disk('local')->move($tempPath, $pdfPath);

                $record = InvoiceRecord::query()->create([
                    'invoice_number' => $invoiceNumber,
                    'series_label' => $seriesLabel,
                    'sequence_no' => $sequenceNo,
                    'invoice_date' => $validated['invoice_date'],
                    'mode_of_payment' => mb_strtoupper(trim((string) $validated['mode_of_payment'])),
                    'buyer_name' => mb_strtoupper(trim((string) $validated['buyer_name'])),
                    'buyer_address' => trim((string) ($validated['buyer_add'] ?? '')) ?: null,
                    'buyer_state' => mb_strtoupper(trim((string) $validated['buyer_state'])),
                    'buyer_contact' => trim((string) $validated['buyer_contact']),
                    'buyer_gstin' => mb_strtoupper(trim((string) ($validated['buyer_gst'] ?? ''))) ?: null,
                    'additional_details' => trim((string) ($validated['additional_details'] ?? '')) ?: null,
                    'sales_channel' => mb_strtoupper(trim((string) $validated['sales_channel'])),
                    'actual_total' => round((float) $validated['actual_total'], 2),
                    'total_discount' => round((float) $validated['total_discount'], 2),
                    'total_taxable' => round((float) $validated['total_taxable'], 2),
                    'total_gst' => round((float) $validated['total_gst'], 2),
                    'net_amount' => round((float) $validated['net_amount'], 2),
                    'amount_in_words' => trim((string) $validated['amount_in_words']),
                    'pdf_file_path' => $pdfPath,
                    'push_to_pending' => (bool) ($validated['push_to_pending'] ?? false),
                    'created_by' => $userId,
                ]);

                foreach ($validated['items'] as $row) {
                    $record->items()->create([
                        'line_no' => (int) $row['line_no'],
                        'sku_fixed' => mb_strtoupper(trim((string) $row['sku_fixed'])),
                        'sku_scanned' => mb_strtoupper(trim((string) $row['sku_scanned'])),
                        'product_name' => mb_strtoupper(trim((string) $row['product_name'])),
                        'hsn_sac' => trim((string) ($row['hsn_sac'] ?? '')) ?: '-',
                        'gst_rate' => round((float) $row['gst_rate'], 2),
                        'quantity' => 1,
                        'mrp' => round((float) $row['mrp'], 2),
                        'rate' => round((float) $row['rate'], 2),
                        'taxable_amount' => round((float) $row['taxable_amount'], 2),
                        'discount_amount' => round((float) $row['discount_amount'], 2),
                        'gst_amount' => round((float) $row['gst_amount'], 2),
                        'net_amount' => round((float) $row['net_amount'], 2),
                        'additional_details' => trim((string) ($row['additional_details'] ?? '')) ?: null,
                        'source_type' => 'OWN',
                    ]);
                }

                $pushedOrderRefNo = null;
                if ((bool) ($validated['push_to_pending'] ?? false)) {
                    $pushedOrderRefNo = $this->pushInvoiceToOrders($record, $validated, $userId);
                    $record->update(['pushed_order_ref_no' => $pushedOrderRefNo]);
                }

                return [
                    'record' => $record->fresh('items'),
                    'pushed_order_ref_no' => $pushedOrderRefNo,
                ];
            });
        } catch (QueryException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unable to save invoice. Please retry.',
            ], 422);
        }

        Cache::forget($this->userInvoiceNumberCacheKey($userId));
        Cache::forget($this->reservedInvoiceNumberCacheKey($invoiceNumber));
        Cache::forget($this->tempPdfCacheKey((string) $validated['invoice_temp_id']));

        return response()->json([
            'status' => 'success',
            'data' => [
                'invoice_number' => $result['record']->invoice_number,
                'invoice_id' => $result['record']->id,
                'pushed_order_ref_no' => $result['pushed_order_ref_no'],
            ],
        ], 201);
    }

    public function servePdf(Request $request, string $invoiceNumber)
    {
        $record = InvoiceRecord::query()->where('invoice_number', $invoiceNumber)->firstOrFail();

        if (!$record->pdf_file_path || !Storage::disk('local')->exists($record->pdf_file_path)) {
            abort(404, 'Invoice PDF not found.');
        }

        return Storage::disk('local')->response($record->pdf_file_path, null, [
            'Cache-Control' => 'private, max-age=120',
            'X-Robots-Tag' => 'noindex, nofollow',
        ]);
    }

    private function reserveNextInvoiceNumber(int $userId): string
    {
        return Cache::lock('invoice:reserve:number', 10)->block(5, function () use ($userId) {
            return DB::transaction(function () use ($userId) {
                [$seriesLabel, $nextSequence, $sequencePad] = $this->nextSequenceByFormula();

                $invoiceNumber = sprintf('%s/%s', $seriesLabel, str_pad((string) $nextSequence, $sequencePad, '0', STR_PAD_LEFT));
                if (mb_strlen($invoiceNumber) > 40) {
                    throw ValidationException::withMessages([
                        'invoice_number' => 'Generated invoice number exceeds allowed length. Update formula setup.',
                    ]);
                }

                while (
                    InvoiceRecord::query()->where('invoice_number', $invoiceNumber)->exists()
                    || Cache::has($this->reservedInvoiceNumberCacheKey($invoiceNumber))
                ) {
                    $nextSequence++;
                    $invoiceNumber = sprintf('%s/%s', $seriesLabel, str_pad((string) $nextSequence, $sequencePad, '0', STR_PAD_LEFT));
                }

                Cache::put($this->reservedInvoiceNumberCacheKey($invoiceNumber), $userId, now()->addMinutes(30));

                return $invoiceNumber;
            });
        });
    }

    private function validateSequenceAtSubmit(string $seriesLabel, int $sequenceNo): void
    {
        if ($sequenceNo <= 0) {
            throw ValidationException::withMessages([
                'invoice_number' => 'Invalid invoice number sequence. Please refresh and retry.',
            ]);
        }

        $maxSequence = (int) (InvoiceRecord::query()
            ->where('series_label', $seriesLabel)
            ->lockForUpdate()
            ->max('sequence_no') ?? 0);

        $expectedNext = $maxSequence + 1;
        if ($sequenceNo !== $expectedNext) {
            throw ValidationException::withMessages([
                'invoice_number' => 'Invoice number is stale due to another submission. Please refresh and retry.',
            ]);
        }
    }

    private function nextSequenceByFormula(): array
    {
        $today = now('Asia/Kolkata');
        $todayDate = $today->toDateString();

        $config = FormulaConfig::query()
            ->where('formula_name', 'invoice_gen_sequence')
            ->lockForUpdate()
            ->first();

        $template = $this->defaultInvoiceFormulaTemplate();
        if ($config) {
            $version = FormulaConfigVersion::query()
                ->where('formula_config_id', $config->id)
                ->where('is_active', true)
                ->whereDate('effective_from', '<=', $todayDate)
                ->where(function ($query) use ($todayDate) {
                    $query->whereNull('effective_to')->orWhereDate('effective_to', '>=', $todayDate);
                })
                ->orderByDesc('effective_from')
                ->orderByDesc('version_no')
                ->lockForUpdate()
                ->first();

            if ($version && trim((string) $version->formula_template) !== '') {
                $template = trim((string) $version->formula_template);
            }
        }

        $sequencePad = $this->extractSequencePad($template);
        $seriesLabel = $this->renderSeriesPrefix($template, $today);

        if ($seriesLabel === '') {
            $seriesLabel = $this->renderSeriesPrefix($this->defaultInvoiceFormulaTemplate(), $today);
            $sequencePad = 2;
        }

        $maxSequence = (int) (InvoiceRecord::query()
            ->where('series_label', $seriesLabel)
            ->lockForUpdate()
            ->max('sequence_no') ?? 0);

        return [$seriesLabel, $maxSequence + 1, $sequencePad];
    }

    private function extractSequencePad(string $template): int
    {
        if (preg_match('/\{\{seq(\d+)\}\}/', $template, $matches)) {
            return max(1, (int) ($matches[1] ?? 2));
        }

        return 2;
    }

    private function renderSeriesPrefix(string $template, \Illuminate\Support\Carbon $date): string
    {
        $year = (int) $date->format('Y');
        $year2 = $date->format('y');
        $month2 = $date->format('m');
        $day2 = $date->format('d');

        $fyStartYear = ((int) $date->format('n')) >= 4 ? $year : ($year - 1);
        $fyEndYear = $fyStartYear + 1;

        $replaced = strtr($template, [
            '{{year4}}' => (string) $year,
            '{{year2}}' => $year2,
            '{{month2}}' => $month2,
            '{{day2}}' => $day2,
            '{{fy_start4}}' => (string) $fyStartYear,
            '{{fy_start2}}' => sprintf('%02d', $fyStartYear % 100),
            '{{fy_end2}}' => sprintf('%02d', $fyEndYear % 100),
        ]);

        $replaced = preg_replace('/\{\{seq\d+\}\}/', '', $replaced) ?? '';
        $replaced = preg_replace('#/+#', '/', $replaced) ?? '';
        $replaced = trim($replaced);

        return rtrim($replaced, '/- ');
    }

    private function pushInvoiceToOrders(InvoiceRecord $record, array $validated, int $userId): string
    {
        $orderRefNo = $this->generateOrderRefNo();

        $orderPayload = [
            'ref_no' => $orderRefNo,
            'order_date' => $validated['invoice_date'],
            'sales_channel' => mb_strtoupper(trim((string) $validated['sales_channel'])),
            'sales_channel_order_no' => $record->invoice_number,
            'customer_name' => mb_strtoupper(trim((string) $validated['buyer_name'])),
            'customer_phone' => trim((string) $validated['buyer_contact']) ?: null,
            'state' => mb_strtoupper(trim((string) $validated['buyer_state'])),
            'custom_gstin' => mb_strtoupper(trim((string) ($validated['buyer_gst'] ?? ''))) ?: null,
            'status' => 'packed',
            'invoice_no' => $record->invoice_number,
            'invoice_date' => $validated['invoice_date'],
            'invoice_file_path' => $record->pdf_file_path,
            'total_amount' => round((float) $validated['net_amount'], 2),
            'total_tax' => round((float) $validated['total_gst'], 2),
            'created_by' => $userId,
        ];

        if (Schema::hasColumn('orders', 'updated_by')) {
            $orderPayload['updated_by'] = $userId;
        }

        $order = Order::query()->create($orderPayload);

        foreach ($validated['items'] as $item) {
            $fixedSku = mb_strtoupper(trim((string) $item['sku_fixed']));
            $inventory = Inventory::query()->where('fixed_sku', $fixedSku)
                ->first(['item_type', 'cost_per_unit', 'gst_rate']);

            $lineSelling = round(((float) $item['rate']) * ((int) $item['quantity']), 2);
            $discountAmount = round((float) ($item['discount_amount'] ?? 0), 2);
            $lineTax = round((float) $item['gst_amount'], 2);
            $lineTotal = round((float) $item['net_amount'], 2);
            $costPrice = round((float) ($inventory?->cost_per_unit ?? 0), 2);
            $profit = round($lineSelling - (($costPrice * (int) $item['quantity']) + $discountAmount), 2);

            $sourceType = mb_strtoupper((string) ($inventory?->item_type ?? 'OWN')) === 'VENDOR' ? 'VENDOR' : 'OWN';

            $order->items()->create([
                'order_id' => $order->id,
                'ref_no' => $order->ref_no,
                'sku_scanned' => mb_strtoupper(trim((string) $item['sku_scanned'])),
                'fixed_sku' => $fixedSku,
                'quantity' => 1,
                'source_type' => $sourceType,
                'vendor_name' => null,
                'cost_price' => $costPrice,
                'selling_price' => round((float) $item['rate'], 2),
                'gst_rate' => round((float) $item['gst_rate'], 2),
                'gst_amount' => $lineTax,
                'discount' => $discountAmount,
                'total_amount' => $lineTotal,
                'profit' => $profit,
                'notes' => trim((string) ($item['additional_details'] ?? '')) ?: null,
            ]);
        }

        return $orderRefNo;
    }

    private function generateOrderRefNo(): string
    {
        for ($i = 0; $i < 8; $i++) {
            $candidate = now()->format('ymdHis');
            if (!Order::query()->where('ref_no', $candidate)->exists()) {
                return $candidate;
            }
            usleep(150000);
        }

        return now()->addSecond()->format('ymdHis');
    }

    private function defaultInvoiceFormulaTemplate(): string
    {
        return 'AS/{{fy_start4}}-{{fy_end2}}/{{month2}}/{{seq1}}';
    }

    private function parseInvoiceNumber(string $invoiceNumber): array
    {
        $invoiceNumber = trim($invoiceNumber);
        $lastSlash = strrpos($invoiceNumber, '/');

        if ($lastSlash === false) {
            $fallbackSeries = $this->renderSeriesPrefix($this->defaultInvoiceFormulaTemplate(), now('Asia/Kolkata'));
            return [$fallbackSeries, 0];
        }

        $series = substr($invoiceNumber, 0, $lastSlash);
        $sequenceRaw = substr($invoiceNumber, $lastSlash + 1);
        $sequence = (int) preg_replace('/\D+/', '', $sequenceRaw);

        if ($series === '') {
            $series = $this->renderSeriesPrefix($this->defaultInvoiceFormulaTemplate(), now('Asia/Kolkata'));
        }

        return [$series, max(0, $sequence)];
    }

    private function userInvoiceNumberCacheKey(int $userId): string
    {
        $version = $this->invoiceConfigVersion();
        return "invoice:ref:user:v{$version}:{$userId}";
    }

    private function reservedInvoiceNumberCacheKey(string $invoiceNumber): string
    {
        $version = $this->invoiceConfigVersion();
        return "invoice:ref:reserved:v{$version}:{$invoiceNumber}";
    }

    private function invoiceConfigVersion(): int
    {
        return max(1, (int) Cache::get('invoice:ref:config:version', 1));
    }

    private function tempPdfCacheKey(string $tempId): string
    {
        return "invoice:pdf:temp:{$tempId}";
    }
}
