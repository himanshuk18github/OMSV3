<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'phone', 'is_active', 'role_id',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
    ];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'created_by');
    }

    public function updatedOrders()
    {
        return $this->hasMany(Order::class, 'updated_by');
    }

    public function tickets()
    {
        return $this->hasMany(SupportTicket::class, 'created_by');
    }

    public function hasRole(string $role): bool
    {
        return $this->role?->name === $role;
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    public function isVendor(): bool
    {
        return $this->hasRole('vendor');
    }

    public function isStaff(): bool
    {
        return $this->hasRole('staff');
    }

    public function rolePermissions(): array
    {
        if ($this->isAdmin()) {
            $full = [];
            foreach (Role::permissionCatalog() as $key => $label) {
                $full[$key] = ['view' => true, 'edit' => true];
            }

            return $full;
        }

        return Role::normalizePermissions($this->role?->permissions);
    }

    public function canAccess(string $module, string $action = 'view'): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        $permissions = $this->rolePermissions();
        $modulePermissions = $permissions[$module] ?? ['view' => false, 'edit' => false];

        if ($action === 'edit') {
            return (bool) ($modulePermissions['edit'] ?? false);
        }

        return (bool) ($modulePermissions['view'] ?? false);
    }
}
