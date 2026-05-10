<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory', function (Blueprint $table) {
            try {
                $table->dropUnique(['product_id']);
            } catch (\Throwable $e) {
                // Unique index may already be absent in some environments.
            }

            try {
                $table->index('product_id');
            } catch (\Throwable $e) {
                // Index may already exist.
            }
        });
    }

    public function down(): void
    {
        Schema::table('inventory', function (Blueprint $table) {
            try {
                $table->dropIndex(['product_id']);
            } catch (\Throwable $e) {
                // Index may already be absent.
            }

            try {
                $table->unique('product_id');
            } catch (\Throwable $e) {
                // Unique index may already exist or the data may need cleanup first.
            }
        });
    }
};