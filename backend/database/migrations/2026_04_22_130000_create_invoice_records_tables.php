<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('invoice_sequence');

        Schema::create('invoice_number_sequences', function (Blueprint $table) {
            $table->id();
            $table->string('series_label', 20)->unique();
            $table->unsignedInteger('last_sequence')->default(0);
            $table->timestamps();
        });

        Schema::create('invoice_records', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number', 40)->unique();
            $table->string('series_label', 20);
            $table->unsignedInteger('sequence_no');
            $table->date('invoice_date');
            $table->string('mode_of_payment', 50)->default('CASH');
            $table->string('buyer_name', 200);
            $table->text('buyer_address')->nullable();
            $table->string('buyer_state', 100);
            $table->string('buyer_contact', 50);
            $table->string('buyer_gstin', 30)->nullable();
            $table->text('additional_details')->nullable();
            $table->string('sales_channel', 50);
            $table->decimal('actual_total', 12, 2)->default(0);
            $table->decimal('total_discount', 12, 2)->default(0);
            $table->decimal('total_taxable', 12, 2)->default(0);
            $table->decimal('total_gst', 12, 2)->default(0);
            $table->decimal('net_amount', 12, 2)->default(0);
            $table->text('amount_in_words');
            $table->string('pdf_file_path', 255)->nullable();
            $table->boolean('push_to_pending')->default(false);
            $table->string('pushed_order_ref_no', 30)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['invoice_date', 'sales_channel']);
            $table->index('pushed_order_ref_no');
        });

        Schema::create('invoice_record_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_record_id')->constrained('invoice_records')->cascadeOnDelete();
            $table->unsignedInteger('line_no');
            $table->string('sku_fixed', 100);
            $table->string('sku_scanned', 150);
            $table->string('product_name', 255);
            $table->string('hsn_sac', 50)->nullable();
            $table->decimal('gst_rate', 5, 2)->default(0);
            $table->unsignedInteger('quantity');
            $table->decimal('mrp', 10, 2)->default(0);
            $table->decimal('rate', 10, 2)->default(0);
            $table->decimal('taxable_amount', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('gst_amount', 12, 2)->default(0);
            $table->decimal('net_amount', 12, 2)->default(0);
            $table->enum('source_type', ['OWN', 'VENDOR'])->default('OWN');
            $table->string('vendor_name', 255)->nullable();
            $table->text('additional_details')->nullable();
            $table->timestamps();

            $table->index('sku_fixed');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_record_items');
        Schema::dropIfExists('invoice_records');
        Schema::dropIfExists('invoice_number_sequences');
    }
};
