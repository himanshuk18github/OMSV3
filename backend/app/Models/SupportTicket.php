<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupportTicket extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'ticket_no', 'order_id', 'reference_no', 'subject', 'description', 'priority',
        'status', 'category', 'created_by', 'assigned_to', 'admin_reply',
        'admin_replied_by', 'admin_replied_at', 'resolved_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
        'admin_replied_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function adminReplier()
    {
        return $this->belongsTo(User::class, 'admin_replied_by');
    }

    public function messages()
    {
        return $this->hasMany(SupportTicketMessage::class, 'support_ticket_id');
    }

    public function latestMessage()
    {
        return $this->hasOne(SupportTicketMessage::class, 'support_ticket_id')->latestOfMany();
    }

    public static function generateTicketNo(): string
    {
        return 'TKT-' . now()->format('Ymd') . '-' . str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
    }
}
