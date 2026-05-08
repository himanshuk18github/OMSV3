<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'sku', 'description', 'category', 'brand', 'unit',
        'mrp', 'cost_price', 'selling_price', 'gst_rate', 'type',
        'hsn_code', 'image_url', 'is_active',
    ];

    protected $casts = [
        'mrp' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'gst_rate' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function inventory()
    {
        return $this->hasOne(Inventory::class);
    }

    public function inventoryLogs()
    {
        return $this->hasMany(InventoryLog::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }
}
