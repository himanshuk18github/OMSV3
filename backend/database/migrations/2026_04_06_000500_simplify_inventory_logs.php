<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('inventory_logs')) {
            DB::statement("ALTER TABLE inventory_logs CHANGE unit_cost cost_per_unit DECIMAL(10,2) NULL");

            if (!Schema::hasColumn('inventory_logs', 'fixed_sku')) {
                DB::statement("ALTER TABLE inventory_logs ADD COLUMN fixed_sku VARCHAR(100) NULL AFTER product_id");
            }

            if (!Schema::hasColumn('inventory_logs', 'updated_by')) {
                DB::statement("ALTER TABLE inventory_logs ADD COLUMN updated_by BIGINT UNSIGNED NULL AFTER created_by");
            }

            foreach (['change_type', 'stock_before', 'stock_after', 'reference', 'reference_type', 'reference_id'] as $column) {
                if (Schema::hasColumn('inventory_logs', $column)) {
                    DB::statement("ALTER TABLE inventory_logs DROP COLUMN {$column}");
                }
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('inventory_logs')) {
            DB::statement("ALTER TABLE inventory_logs CHANGE cost_per_unit unit_cost DECIMAL(10,2) NULL");
            if (Schema::hasColumn('inventory_logs', 'updated_by')) {
                DB::statement("ALTER TABLE inventory_logs DROP COLUMN updated_by");
            }
            if (Schema::hasColumn('inventory_logs', 'fixed_sku')) {
                DB::statement("ALTER TABLE inventory_logs DROP COLUMN fixed_sku");
            }
            DB::statement("ALTER TABLE inventory_logs ADD COLUMN change_type ENUM('IN','OUT','ADJUSTMENT','RETURN') NOT NULL AFTER product_id");
            DB::statement("ALTER TABLE inventory_logs ADD COLUMN stock_before INT NOT NULL AFTER quantity");
            DB::statement("ALTER TABLE inventory_logs ADD COLUMN stock_after INT NOT NULL AFTER stock_before");
            DB::statement("ALTER TABLE inventory_logs ADD COLUMN reference VARCHAR(100) NULL AFTER unit_cost");
            DB::statement("ALTER TABLE inventory_logs ADD COLUMN reference_type VARCHAR(50) NULL AFTER reference");
            DB::statement("ALTER TABLE inventory_logs ADD COLUMN reference_id BIGINT UNSIGNED NULL AFTER reference_type");
        }
    }
};
