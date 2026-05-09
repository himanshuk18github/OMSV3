<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory', function (Blueprint $table) {
            if (Schema::hasColumn('inventory', 'current_stock')) {
                $table->dropColumn('current_stock');
            }
            if (Schema::hasColumn('inventory', 'reserved_stock')) {
                $table->dropColumn('reserved_stock');
            }
            if (Schema::hasColumn('inventory', 'min_stock_level')) {
                $table->dropColumn('min_stock_level');
            }
            if (Schema::hasColumn('inventory', 'avg_cost')) {
                $table->dropColumn('avg_cost');
            }

            if (!Schema::hasColumn('inventory', 'fixed_sku')) {
                $table->string('fixed_sku', 100)->nullable()->after('product_id');
            }
            if (!Schema::hasColumn('inventory', 'product_name')) {
                $table->string('product_name', 255)->nullable()->after('fixed_sku');
            }
            if (!Schema::hasColumn('inventory', 'quantity')) {
                $table->integer('quantity')->default(0)->after('product_name');
            }
            if (!Schema::hasColumn('inventory', 'cost_per_unit')) {
                $table->decimal('cost_per_unit', 10, 2)->default(0)->after('quantity');
            }
            if (!Schema::hasColumn('inventory', 'mrp')) {
                $table->decimal('mrp', 10, 2)->default(0)->after('cost_per_unit');
            }
            if (!Schema::hasColumn('inventory', 'gst_hsn_code')) {
                $table->string('gst_hsn_code', 50)->default('')->after('mrp');
            }
            if (!Schema::hasColumn('inventory', 'gst_rate')) {
                $table->decimal('gst_rate', 5, 2)->default(0)->after('gst_hsn_code');
            }
        });
    }

    public function down(): void
    {
        Schema::table('inventory', function (Blueprint $table) {
            if (Schema::hasColumn('inventory', 'fixed_sku')) {
                $table->dropColumn('fixed_sku');
            }
            if (Schema::hasColumn('inventory', 'product_name')) {
                $table->dropColumn('product_name');
            }
            if (Schema::hasColumn('inventory', 'quantity')) {
                $table->dropColumn('quantity');
            }
            if (Schema::hasColumn('inventory', 'cost_per_unit')) {
                $table->dropColumn('cost_per_unit');
            }
            if (Schema::hasColumn('inventory', 'mrp')) {
                $table->dropColumn('mrp');
            }
            if (Schema::hasColumn('inventory', 'gst_hsn_code')) {
                $table->dropColumn('gst_hsn_code');
            }
            if (Schema::hasColumn('inventory', 'gst_rate')) {
                $table->dropColumn('gst_rate');
            }

            if (!Schema::hasColumn('inventory', 'current_stock')) {
                $table->integer('current_stock')->default(0);
            }
            if (!Schema::hasColumn('inventory', 'reserved_stock')) {
                $table->integer('reserved_stock')->default(0);
            }
            if (!Schema::hasColumn('inventory', 'min_stock_level')) {
                $table->integer('min_stock_level')->default(0);
            }
            if (!Schema::hasColumn('inventory', 'avg_cost')) {
                $table->decimal('avg_cost', 10, 2)->default(0);
            }
        });
    }
};
