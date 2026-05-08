<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('invoice_number_sequences');
    }

    public function down(): void
    {
        if (!Schema::hasTable('invoice_number_sequences')) {
            Schema::create('invoice_number_sequences', function (Blueprint $table) {
                $table->id();
                $table->string('series_label', 20)->unique();
                $table->unsignedInteger('last_sequence')->default(0);
                $table->timestamps();
            });
        }
    }
};
