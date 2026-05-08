<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->json('permissions')->nullable()->after('description');
        });

        DB::table('roles')->where('name', 'admin')->update([
            'permissions' => json_encode([
                'dashboard' => ['view' => true, 'edit' => true],
                'inventory' => ['view' => true, 'edit' => true],
                'sales_orders' => ['view' => true, 'edit' => true],
                'packages' => ['view' => true, 'edit' => true],
                'returns' => ['view' => true, 'edit' => true],
                'invoices' => ['view' => true, 'edit' => true],
                'vendors' => ['view' => true, 'edit' => true],
                'settlements' => ['view' => true, 'edit' => true],
                'reports' => ['view' => true, 'edit' => true],
                'tickets' => ['view' => true, 'edit' => true],
                'users' => ['view' => true, 'edit' => true],
                'tools' => ['view' => true, 'edit' => true],
                'documents' => ['view' => true, 'edit' => true],
                'import' => ['view' => true, 'edit' => true],
                'formula_setup' => ['view' => true, 'edit' => true],
            ]),
            'updated_at' => now(),
        ]);

        DB::table('roles')->where('name', '!=', 'admin')->update([
            'permissions' => json_encode([
                'dashboard' => ['view' => true, 'edit' => false],
                'inventory' => ['view' => true, 'edit' => true],
                'sales_orders' => ['view' => true, 'edit' => true],
                'packages' => ['view' => true, 'edit' => true],
                'returns' => ['view' => true, 'edit' => true],
                'invoices' => ['view' => true, 'edit' => true],
                'vendors' => ['view' => true, 'edit' => false],
                'settlements' => ['view' => true, 'edit' => true],
                'reports' => ['view' => true, 'edit' => false],
                'tickets' => ['view' => true, 'edit' => true],
                'users' => ['view' => false, 'edit' => false],
                'tools' => ['view' => true, 'edit' => true],
                'documents' => ['view' => true, 'edit' => true],
                'import' => ['view' => true, 'edit' => true],
                'formula_setup' => ['view' => false, 'edit' => false],
            ]),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn('permissions');
        });
    }
};
