<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rto_packages', function (Blueprint $table) {
            $table->id();
            $table->string('return_ref_no', 40);
            $table->string('customer_name', 200);
            $table->string('sales_channel', 50);
            $table->string('sku_ref', 150);
            $table->string('sku_fixed', 100);
            $table->text('additional_details')->nullable();
            $table->enum('status', [
                'RTO DELIVERED - DAMAGED CONDITION',
                'RTO DELIVERED - PERFECT CONDITION',
            ]);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index('return_ref_no');
            $table->index('created_at');
            $table->index('sku_fixed');

            $table->foreign('created_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rto_packages');
    }
};
