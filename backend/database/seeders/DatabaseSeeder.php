<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Roles
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Administrator', 'description' => 'Full access']);
        $staffRole = Role::firstOrCreate(['name' => 'staff'], ['display_name' => 'Operations Managers', 'description' => 'Order management access']);
        $vendorRole = Role::firstOrCreate(['name' => 'vendor'], ['display_name' => 'Vendor', 'description' => 'Vendor portal access']);

        // Admin user
        User::firstOrCreate(
            ['email' => 'admin@apnistationery.com'],
            [
                'name' => 'Admin',
                'password' => Hash::make('Admin@123'),
                'phone' => '9999999999',
                'is_active' => true,
                'role_id' => $adminRole->id,
            ]
        );
    }
}
