<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('settlements')) {
            return;
        }

        Schema::table('settlements', function (Blueprint $table) {
            if (!Schema::hasColumn('settlements', 'order_ref_no')) {
                $table->string('order_ref_no', 100)->nullable()->after('order_id');
                $table->index('order_ref_no', 'settlements_order_ref_no_index');
            }
        });

        if (Schema::hasColumn('settlements', 'order_id')) {
            try {
                DB::statement('ALTER TABLE settlements DROP FOREIGN KEY settlements_order_id_foreign');
            } catch (\Throwable $exception) {
                // Ignore when FK is already absent.
            }

            try {
                DB::statement('ALTER TABLE settlements MODIFY order_id BIGINT UNSIGNED NULL');
            } catch (\Throwable $exception) {
                // Keep migration resilient on heterogeneous DB states.
            }

            try {
                DB::statement('ALTER TABLE settlements ADD CONSTRAINT settlements_order_id_foreign FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL');
            } catch (\Throwable $exception) {
                // Ignore if constraint already exists.
            }
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('settlements')) {
            return;
        }

        Schema::table('settlements', function (Blueprint $table) {
            if (Schema::hasColumn('settlements', 'order_ref_no')) {
                $table->dropIndex('settlements_order_ref_no_index');
                $table->dropColumn('order_ref_no');
            }
        });
    }
};
