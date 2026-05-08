<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReportDefinition extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'name',
        'sql_query',
        'filter_schema',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'filter_schema' => 'array',
        'is_active' => 'boolean',
    ];
}
