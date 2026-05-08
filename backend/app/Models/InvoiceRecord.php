<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'series_label',
        'sequence_no',
        'invoice_date',
        'mode_of_payment',
        'buyer_name',
        'buyer_address',
        'buyer_state',
        'buyer_contact',
        'buyer_gstin',
        'additional_details',
        'sales_channel',
        'actual_total',
        'total_discount',
        'total_taxable',
        'total_gst',
        'net_amount',
        'amount_in_words',
        'pdf_file_path',
        'push_to_pending',
        'pushed_order_ref_no',
        'created_by',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'actual_total' => 'decimal:2',
        'total_discount' => 'decimal:2',
        'total_taxable' => 'decimal:2',
        'total_gst' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'push_to_pending' => 'boolean',
    ];

    public function items()
    {
        return $this->hasMany(InvoiceRecordItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
