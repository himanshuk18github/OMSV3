<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inventory extends Model
{
    use HasFactory;

    protected $table = 'inventory';

    protected $fillable = [
        'product_id',
        'fixed_sku',
        'product_name',
        'description',
        'category',
        'brand',
        'unit',
        'selling_price',
        'item_type',
        'is_active',
        'quantity',
        'cost_per_unit',
        'mrp',
        'gst_hsn_code',
        'gst_rate',
    ];

    protected $casts = [
        'selling_price' => 'decimal:2',
        'cost_per_unit' => 'decimal:2',
        'mrp' => 'decimal:2',
        'gst_rate' => 'decimal:2',
        'is_active' => 'boolean',
    ];

}
