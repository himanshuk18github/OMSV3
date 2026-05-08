<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'display_name', 'description', 'permissions'];

    protected $casts = [
        'permissions' => 'array',
    ];

    public static function permissionCatalog(): array
    {
        return [
            'dashboard' => 'Dashboard',
            'inventory' => 'Products Inventory',
            'sales_orders' => 'Sales Orders',
            'packages' => 'Packages',
            'returns' => 'Returns',
            'invoices' => 'Invoices',
            'vendors' => 'Manage Vendors',
            'settlements' => 'Payments Received',
            'reports' => 'Reports',
            'tickets' => 'Ticket Support',
            'users' => 'Users',
            'tools' => 'Tools',
            'documents' => 'Document Manager',
            'import' => 'Import',
            'formula_setup' => 'Formula Setup',
        ];
    }

    public static function normalizePermissions(?array $permissions): array
    {
        $permissions = $permissions ?? [];
        $normalized = [];

        foreach (self::permissionCatalog() as $key => $label) {
            $view = (bool) data_get($permissions, "{$key}.view", false);
            $edit = (bool) data_get($permissions, "{$key}.edit", false);
            $normalized[$key] = [
                'view' => $view,
                'edit' => $edit && $view,
            ];
        }

        return $normalized;
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
