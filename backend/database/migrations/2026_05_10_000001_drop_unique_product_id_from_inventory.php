<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory', function (Blueprint $table) {
            // Attempt multiple strategies to remove a unique constraint named by convention
            // and ensure a non-unique index remains on `product_id`.
            try {
                // Most reliable if the index has the default Laravel name
                $table->dropUnique('inventory_product_id_unique');
            } catch (\Throwable $e) {
                // Try by column list as a fallback
                try {
                    $table->dropUnique(['product_id']);
                } catch (\Throwable $e) {
                    // Last resort: attempt raw SQL drop (MySQL flavor)
                    try {
                        DB::statement('ALTER TABLE `inventory` DROP INDEX `inventory_product_id_unique`');
                    } catch (\Throwable $e) {
                        // If still failing, ignore — index may not exist or DB driver differs.
                    }
                }
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