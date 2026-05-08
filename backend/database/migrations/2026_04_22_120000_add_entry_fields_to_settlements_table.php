<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('settlements', function (Blueprint $table) {
            if (!Schema::hasColumn('settlements', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->after('status');
                $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            }

            if (!Schema::hasColumn('settlements', 'entered_by')) {
                $table->string('entered_by', 100)->nullable()->after('created_by');
            }

            if (!Schema::hasColumn('settlements', 'entered_at')) {
                $table->dateTime('entered_at')->nullable()->after('entered_by');
            }
        });
    }

    public function down(): void
    {
        Schema::table('settlements', function (Blueprint $table) {
            if (Schema::hasColumn('settlements', 'entered_at')) {
                $table->dropColumn('entered_at');
            }

            if (Schema::hasColumn('settlements', 'entered_by')) {
                $table->dropColumn('entered_by');
            }

            if (Schema::hasColumn('settlements', 'created_by')) {
                $table->dropForeign(['created_by']);
                $table->dropColumn('created_by');
            }
        });
    }
};
