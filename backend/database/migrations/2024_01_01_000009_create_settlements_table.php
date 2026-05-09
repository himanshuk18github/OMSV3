<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders');
            $table->decimal('amount', 12, 2);
            $table->string('transaction_no', 100)->nullable();
            $table->string('payment_mode', 50)->nullable(); // UPI, NEFT, card, etc.
            $table->string('payment_gateway', 100)->nullable();
            $table->date('settlement_date')->nullable();
            $table->enum('status', ['pending', 'settled', 'failed'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('order_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settlements');
    }
};
