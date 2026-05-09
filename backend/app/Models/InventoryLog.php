<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id', 'fixed_sku', 'quantity', 'cost_per_unit', 'notes', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'cost_per_unit' => 'decimal:2',
    ];

    public function product()
    {
        return $this->belongsTo(Inventory::class, 'product_id', 'product_id');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
