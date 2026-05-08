<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('inventory_logs')) {
            return;
        }

        if (!Schema::hasColumn('inventory_logs', 'fixed_sku')) {
            DB::statement("ALTER TABLE inventory_logs ADD COLUMN fixed_sku VARCHAR(100) NULL AFTER product_id");
        }

        if (!Schema::hasColumn('inventory_logs', 'updated_by')) {
            DB::statement("ALTER TABLE inventory_logs ADD COLUMN updated_by BIGINT UNSIGNED NULL AFTER created_by");
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('inventory_logs')) {
            return;
        }

        if (Schema::hasColumn('inventory_logs', 'updated_by')) {
            DB::statement("ALTER TABLE inventory_logs DROP COLUMN updated_by");
        }

        if (Schema::hasColumn('inventory_logs', 'fixed_sku')) {
            DB::statement("ALTER TABLE inventory_logs DROP COLUMN fixed_sku");
        }
    }
};