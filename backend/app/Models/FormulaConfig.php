<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormulaConfig extends Model
{
    use HasFactory;

    protected $fillable = [
        'formula_name',
        'display_name',
        'description',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function versions()
    {
        return $this->hasMany(FormulaConfigVersion::class);
    }
}
