<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            $table->text('admin_reply')->nullable()->after('description');
            $table->foreignId('admin_replied_by')->nullable()->after('assigned_to')->constrained('users')->nullOnDelete();
            $table->timestamp('admin_replied_at')->nullable()->after('admin_replied_by');
        });
    }

    public function down(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('admin_replied_by');
            $table->dropColumn(['admin_reply', 'admin_replied_at']);
        });
    }
};
