<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceRecordItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_record_id',
        'line_no',
        'sku_fixed',
        'sku_scanned',
        'product_name',
        'hsn_sac',
        'gst_rate',
        'quantity',
        'mrp',
        'rate',
        'taxable_amount',
        'discount_amount',
        'gst_amount',
        'net_amount',
        'source_type',
        'vendor_name',
        'additional_details',
    ];

    protected $casts = [
        'gst_rate' => 'decimal:2',
        'mrp' => 'decimal:2',
        'rate' => 'decimal:2',
        'taxable_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'gst_amount' => 'decimal:2',
        'net_amount' => 'decimal:2',
    ];

    public function invoiceRecord()
    {
        return $this->belongsTo(InvoiceRecord::class);
    }
}
