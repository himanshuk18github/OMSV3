<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Settlement extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'order_ref_no',
        'amount',
        'transaction_no',
        'payment_mode',
        'payment_gateway',
        'settlement_date',
        'status',
        'notes',
        'created_by',
        'entered_by',
        'entered_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'settlement_date' => 'date',
        'entered_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
