<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'ref_no',
        'sku_scanned',
        'fixed_sku',
        'quantity',
        'source_type',
        'vendor_name',
        'cost_price',
        'selling_price',
        'gst_rate',
        'gst_amount',
        'discount',
        'shipping_cost',
        'marketplace_fee',
        'total_amount',
        'profit',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'cost_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'gst_rate' => 'decimal:2',
        'gst_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'marketplace_fee' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'profit' => 'decimal:2',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function product()
    {
        return $this->belongsTo(Inventory::class, 'fixed_sku', 'fixed_sku');
    }
}
