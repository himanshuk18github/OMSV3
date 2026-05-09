<?php

namespace Tests\Feature;

use App\Models\Inventory;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $staff;
    private User $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        $adminRole = Role::create(['name' => 'admin', 'display_name' => 'Administrator']);
        $staffRole = Role::create(['name' => 'staff', 'display_name' => 'Staff']);
        $vendorRole = Role::create(['name' => 'vendor', 'display_name' => 'Vendor']);

        $this->admin = User::create([
            'name' => 'Admin', 'email' => 'admin@test.com',
            'password' => Hash::make('password'), 'role_id' => $adminRole->id, 'is_active' => true,
        ]);
        $this->staff = User::create([
            'name' => 'Staff', 'email' => 'staff@test.com',
            'password' => Hash::make('password'), 'role_id' => $staffRole->id, 'is_active' => true,
        ]);
        $this->vendor = User::create([
            'name' => 'Vendor', 'email' => 'vendor@test.com',
            'password' => Hash::make('password'), 'role_id' => $vendorRole->id, 'is_active' => true,
        ]);
    }

    public function test_unauthenticated_cannot_access_orders(): void
    {
        $this->getJson('/api/orders')->assertStatus(401);
    }

    public function test_admin_can_access_orders(): void
    {
        $this->actingAs($this->admin)->getJson('/api/orders')->assertStatus(200);
    }

    public function test_staff_can_access_orders(): void
    {
        $this->actingAs($this->staff)->getJson('/api/orders')->assertStatus(200);
    }

    public function test_vendor_can_access_orders(): void
    {
        $this->actingAs($this->vendor)->getJson('/api/orders')->assertStatus(200);
    }

    public function test_admin_can_access_products(): void
    {
        $this->actingAs($this->admin)->getJson('/api/products')->assertStatus(200);
    }

    public function test_vendor_can_access_products(): void
    {
        // Vendors can browse products (but not see profits)
        $this->actingAs($this->vendor)->getJson('/api/products')->assertStatus(200);
    }

    public function test_vendor_cannot_delete_orders(): void
    {
        $productId = 2001;
        Inventory::create([
            'product_id' => $productId,
            'fixed_sku' => 'T-001',
            'product_name' => 'Test',
            'description' => 'Test item',
            'category' => 'General',
            'brand' => 'Test Brand',
            'unit' => 'pcs',
            'selling_price' => 90,
            'item_type' => 'OWN',
            'is_active' => true,
            'quantity' => 10,
            'cost_per_unit' => 50,
            'mrp' => 100,
            'gst_hsn_code' => '4210',
            'gst_rate' => 18,
        ]);

        // First create order as admin
        $this->actingAs($this->admin)->postJson('/api/orders', [
            'order_date' => now()->toDateString(),
            'sales_channel' => 'Amazon',
            'customer_name' => 'Test',
            'items' => [[
                'product_id' => $productId, 'quantity' => 1,
                'source_type' => 'OWN', 'cost_price' => 50, 'selling_price' => 90, 'gst_rate' => 18,
            ]],
        ]);

        $order = \App\Models\Order::first();
        $this->actingAs($this->vendor)->deleteJson("/api/orders/{$order->id}")->assertStatus(403);
    }

    public function test_deactivated_user_cannot_login(): void
    {
        $this->staff->update(['is_active' => false]);

        $this->postJson('/api/auth/login', [
            'email' => 'staff@test.com',
            'password' => 'password',
        ])->assertStatus(422);
    }
}
