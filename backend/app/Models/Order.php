<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'ref_no',
        'order_date',
        'sales_channel',
        'sales_channel_order_no',
        'customer_name',
        'customer_phone',
        'customer_email',
        'state',
        'custom_gstin',
        'status',
        'invoice_no',
        'invoice_file_path',
        'invoice_date',
        'dispatch_date',
        'tracking_no',
        'courier_partner',
        'total_amount',
        'total_tax',
        'total_profit',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'order_date' => 'date',
        'invoice_date' => 'date',
        'dispatch_date' => 'date',
        'total_amount' => 'decimal:2',
        'total_tax' => 'decimal:2',
        'total_profit' => 'decimal:2',
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function settlements()
    {
        return $this->hasMany(Settlement::class);
    }

    public function tickets()
    {
        return $this->hasMany(SupportTicket::class);
    }

    public static function generateRefNo(): string
    {
        return now()->format('ymdHis');
    }
}
