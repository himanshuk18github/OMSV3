<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('product_id', 50);
            $table->integer('quantity')->unsigned();
            $table->enum('source_type', ['OWN', 'VENDOR'])->default('OWN');
            $table->foreignId('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->decimal('cost_price', 10, 2); // price we paid
            $table->decimal('selling_price', 10, 2); // price we sold at
            $table->decimal('gst_rate', 5, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('total_amount', 12, 2); // selling_price * quantity - discount
            $table->decimal('profit', 12, 2); // (selling_price - cost_price) * quantity
            $table->timestamps();

            $table->index('order_id');
            $table->index('product_id');
            $table->index('vendor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
