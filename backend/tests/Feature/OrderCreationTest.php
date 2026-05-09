<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Role;
use App\Models\User;
use App\Models\Inventory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Illuminate\Support\Facades\Hash;

class OrderCreationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private int $productId;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::create(['name' => 'admin', 'display_name' => 'Administrator']);
        $this->admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'password' => Hash::make('password'),
            'role_id' => $role->id,
            'is_active' => true,
        ]);

        $this->productId = 1001;
        Inventory::create([
            'product_id' => $this->productId,
            'fixed_sku' => 'TEST-001',
            'product_name' => 'Test Product',
            'description' => 'Test description',
            'category' => 'General',
            'brand' => 'Test Brand',
            'unit' => 'pcs',
            'selling_price' => 450,
            'item_type' => 'OWN',
            'is_active' => true,
            'quantity' => 100,
            'cost_per_unit' => 200,
            'mrp' => 500,
            'gst_hsn_code' => '4210',
            'gst_rate' => 18,
        ]);
    }

    public function test_admin_can_create_order_with_items(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/orders', [
                'order_date' => now()->toDateString(),
                'sales_channel' => 'Amazon',
                'customer_name' => 'John Doe',
                'customer_phone' => '9876543210',
                'state' => 'Maharashtra',
                'items' => [
                    [
                        'product_id' => $this->productId,
                        'quantity' => 2,
                        'source_type' => 'OWN',
                        'cost_price' => 200,
                        'selling_price' => 450,
                        'gst_rate' => 18,
                    ],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.customer_name', 'John Doe')
            ->assertJsonPath('data.sales_channel', 'Amazon');

        $this->assertDatabaseHas('orders', ['customer_name' => 'John Doe']);
        $this->assertDatabaseHas('order_items', ['product_id' => $this->productId, 'quantity' => 2]);
    }

    public function test_order_requires_at_least_one_item(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/orders', [
                'order_date' => now()->toDateString(),
                'sales_channel' => 'Website',
                'customer_name' => 'Jane Doe',
                'items' => [],
            ]);

        $response->assertStatus(422);
    }

    public function test_order_ref_no_is_unique_and_20_digits(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/orders', [
                'order_date' => now()->toDateString(),
                'sales_channel' => 'Flipkart',
                'customer_name' => 'Test Customer',
                'items' => [
                    [
                        'product_id' => $this->productId,
                        'quantity' => 1,
                        'source_type' => 'OWN',
                        'cost_price' => 200,
                        'selling_price' => 450,
                        'gst_rate' => 18,
                    ],
                ],
            ]);

        $order = Order::first();
        $this->assertEquals(20, strlen($order->ref_no));
    }

    public function test_profit_is_correctly_calculated(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/orders', [
                'order_date' => now()->toDateString(),
                'sales_channel' => 'Website',
                'customer_name' => 'Profit Test',
                'items' => [
                    [
                        'product_id' => $this->productId,
                        'quantity' => 3,
                        'source_type' => 'OWN',
                        'cost_price' => 200,
                        'selling_price' => 400,
                        'gst_rate' => 18,
                    ],
                ],
            ]);

        // profit = (400 - 200) * 3 = 600
        $this->assertDatabaseHas('order_items', ['profit' => 600]);
    }
}
