<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE inventory MODIFY product_id VARCHAR(50) NOT NULL");
        DB::statement("ALTER TABLE inventory_logs MODIFY product_id VARCHAR(50) NOT NULL");
        DB::statement("ALTER TABLE order_items MODIFY product_id VARCHAR(50) NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE inventory MODIFY product_id BIGINT UNSIGNED NOT NULL");
        DB::statement("ALTER TABLE inventory_logs MODIFY product_id BIGINT UNSIGNED NOT NULL");
        DB::statement("ALTER TABLE order_items MODIFY product_id BIGINT UNSIGNED NOT NULL");
    }
};
