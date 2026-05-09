<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'sales_channel_order_no')) {
                $table->string('sales_channel_order_no', 100)->nullable()->after('sales_channel');
            }

            if (!Schema::hasColumn('orders', 'state')) {
                $table->string('state', 100)->nullable()->after('customer_email');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'sales_channel_order_no')) {
                $table->dropColumn('sales_channel_order_no');
            }

            if (Schema::hasColumn('orders', 'state')) {
                $table->dropColumn('state');
            }
        });
    }
};
