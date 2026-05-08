<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RtoPackage extends Model
{
    use HasFactory;

    protected $fillable = [
        'return_ref_no',
        'customer_name',
        'sales_channel',
        'sku_ref',
        'sku_fixed',
        'additional_details',
        'status',
        'created_by',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
