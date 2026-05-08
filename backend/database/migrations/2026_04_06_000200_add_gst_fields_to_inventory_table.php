<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory', function (Blueprint $table) {
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
            if (Schema::hasColumn('inventory', 'gst_rate')) {
                $table->dropColumn('gst_rate');
            }

            if (Schema::hasColumn('inventory', 'gst_hsn_code')) {
                $table->dropColumn('gst_hsn_code');
            }
        });
    }
};
