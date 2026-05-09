<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop foreign keys that point to products before dropping products table.
        Schema::table('inventory', function (Blueprint $table) {
            try {
                $table->dropForeign(['product_id']);
            } catch (\Throwable $e) {
                // Foreign key may already be removed.
            }

            if (!Schema::hasColumn('inventory', 'description')) {
                $table->text('description')->nullable()->after('product_name');
            }
            if (!Schema::hasColumn('inventory', 'category')) {
                $table->string('category', 100)->nullable()->after('description');
            }
            if (!Schema::hasColumn('inventory', 'brand')) {
                $table->string('brand', 100)->nullable()->after('category');
            }
            if (!Schema::hasColumn('inventory', 'unit')) {
                $table->string('unit', 20)->default('pcs')->after('brand');
            }
            if (!Schema::hasColumn('inventory', 'selling_price')) {
                $table->decimal('selling_price', 10, 2)->default(0)->after('mrp');
            }
            if (!Schema::hasColumn('inventory', 'item_type')) {
                $table->string('item_type', 20)->default('OWN')->after('selling_price');
            }
            if (!Schema::hasColumn('inventory', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('item_type');
            }

            try {
                $table->unique('fixed_sku');
            } catch (\Throwable $e) {
                // Unique index may already exist or data may need cleanup first.
            }
        });

        Schema::table('inventory_logs', function (Blueprint $table) {
            try {
                $table->dropForeign(['product_id']);
            } catch (\Throwable $e) {
                // Foreign key may already be removed.
            }
        });

        Schema::table('order_items', function (Blueprint $table) {
            try {
                $table->dropForeign(['product_id']);
            } catch (\Throwable $e) {
                // Foreign key may already be removed.
            }
        });

        // Backfill inventory extra fields from products when available.
        if (Schema::hasTable('products')) {
            DB::table('inventory')
                ->join('products', 'inventory.product_id', '=', 'products.id')
                ->update([
                    'inventory.description' => DB::raw('products.description'),
                    'inventory.category' => DB::raw('products.category'),
                    'inventory.brand' => DB::raw('products.brand'),
                    'inventory.unit' => DB::raw('products.unit'),
                    'inventory.selling_price' => DB::raw('products.selling_price'),
                    'inventory.item_type' => DB::raw('products.type'),
                    'inventory.is_active' => DB::raw('products.is_active'),
                ]);

            Schema::dropIfExists('products');
        }
    }

    public function down(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('sku')->unique();
            $table->text('description')->nullable();
            $table->string('category', 100)->nullable();
            $table->string('brand', 100)->nullable();
            $table->string('unit', 20)->default('pcs');
            $table->decimal('mrp', 10, 2)->default(0);
            $table->decimal('cost_price', 10, 2)->default(0);
            $table->decimal('selling_price', 10, 2)->default(0);
            $table->decimal('gst_rate', 5, 2)->default(0);
            $table->enum('type', ['OWN', 'VENDOR'])->default('OWN');
            $table->string('hsn_code', 20)->nullable();
            $table->string('image_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }
};
