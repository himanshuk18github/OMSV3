<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'ref_no',
        'doc_date',
        'original_file_name',
        'stored_file_name',
        'mime_type',
        'file_size',
        'storage_path',
        'remarks',
        'uploaded_by',
    ];

    protected $casts = [
        'doc_date' => 'date',
    ];

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
