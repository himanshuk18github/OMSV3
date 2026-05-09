<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory', function (Blueprint $table) {
            $table->id();
            $table->string('product_id', 50)->unique();
            $table->string('fixed_sku', 100);
            $table->string('product_name', 255);
            $table->text('description')->nullable();
            $table->string('category', 100)->nullable();
            $table->string('brand', 100)->nullable();
            $table->string('unit', 20)->nullable();
            $table->decimal('selling_price', 10, 2)->default(0);
            $table->string('item_type', 20)->default('OWN');
            $table->boolean('is_active')->default(true);
            $table->integer('quantity')->default(0);
            $table->decimal('cost_per_unit', 10, 2)->default(0);
            $table->decimal('mrp', 10, 2)->default(0);
            $table->string('gst_hsn_code', 50)->default('');
            $table->decimal('gst_rate', 5, 2)->default(0);
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory');
    }
};
