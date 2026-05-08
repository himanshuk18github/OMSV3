<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::enableForeignKeyConstraints();

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('ref_no', 30)->unique();
            $table->date('order_date');
            $table->string('sales_channel', 50)->nullable();
            $table->string('customer_name', 200)->nullable();
            $table->string('customer_phone', 20)->nullable();
            $table->string('customer_email', 150)->nullable();
            $table->enum('status', [
                'draft',
                'pending',
                'confirmed',
                'packed',
                'dispatched',
                'delivered',
                'cancelled',
                'rto',
            ])->default('draft');
            $table->string('invoice_no', 100)->nullable();
            $table->date('invoice_date')->nullable();
            $table->date('dispatch_date')->nullable();
            $table->string('courier_partner', 100)->nullable();
            $table->string('tracking_no', 100)->nullable();
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('total_tax', 12, 2)->default(0);
            $table->decimal('total_profit', 12, 2)->default(0);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->unique(['id', 'ref_no'], 'orders_id_ref_no_unique');
            $table->foreign('created_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->string('ref_no', 30);
            $table->string('sku_scanned', 150);
            $table->string('fixed_sku', 100);
            $table->integer('quantity')->unsigned();
            $table->enum('source_type', ['OWN', 'VENDOR'])->default('OWN');
            $table->string('vendor_name', 255)->nullable();
            $table->decimal('cost_price', 10, 2)->default(0);
            $table->decimal('selling_price', 10, 2)->default(0);
            $table->decimal('gst_rate', 5, 2)->default(0);
            $table->decimal('gst_amount', 10, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('shipping_cost', 10, 2)->default(0);
            $table->decimal('marketplace_fee', 10, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('profit', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->index('ref_no', 'order_items_ref_no_index');
            $table->index('order_id', 'order_items_order_id_index');
            $table->index(['order_id', 'ref_no'], 'order_items_order_id_ref_no_index');
            $table->index('fixed_sku', 'order_items_fixed_sku_index');

            $table->foreign(['order_id', 'ref_no'])
                ->references(['id', 'ref_no'])
                ->on('orders')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::enableForeignKeyConstraints();
    }
};