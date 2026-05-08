<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormulaConfigVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'formula_config_id',
        'version_no',
        'effective_from',
        'effective_to',
        'formula_template',
        'change_note',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'effective_to' => 'date',
        'is_active' => 'boolean',
    ];

    public function config()
    {
        return $this->belongsTo(FormulaConfig::class, 'formula_config_id');
    }
}
