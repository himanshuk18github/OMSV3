<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('ref_no', 25)->unique(); // 20-digit timestamp-based
            $table->date('order_date');
            $table->string('sales_channel', 50); // Amazon, Flipkart, Website, etc.
            $table->string('customer_name', 200);
            $table->string('customer_phone', 20)->nullable();
            $table->string('customer_email', 150)->nullable();
            $table->text('shipping_address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('pincode', 10)->nullable();
            $table->enum('order_status', [
                'pending', 'confirmed', 'processing',
                'dispatched', 'delivered', 'cancelled', 'rto'
            ])->default('pending');
            $table->string('invoice_no', 100)->nullable();
            $table->date('invoice_date')->nullable();
            $table->date('dispatch_date')->nullable();
            $table->string('tracking_no', 100)->nullable();
            $table->string('courier_partner', 100)->nullable();
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('total_profit', 12, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('shipping_charge', 10, 2)->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['order_status', 'order_date']);
            $table->index('sales_channel');
            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
