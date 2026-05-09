<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('settlements') || !Schema::hasColumn('settlements', 'transaction_no')) {
            return;
        }

        // Normalize blanks to NULL so uniqueness is enforced only on actual reference values.
        DB::table('settlements')
            ->whereRaw("TRIM(COALESCE(transaction_no, '')) = ''")
            ->update(['transaction_no' => null]);

        // Resolve existing duplicates before adding unique index.
        $duplicateGroups = DB::table('settlements')
            ->select('transaction_no', DB::raw('COUNT(*) as c'))
            ->whereNotNull('transaction_no')
            ->groupBy('transaction_no')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicateGroups as $group) {
            $rows = DB::table('settlements')
                ->where('transaction_no', $group->transaction_no)
                ->orderBy('id')
                ->get(['id', 'transaction_no']);

            $isFirst = true;
            foreach ($rows as $row) {
                if ($isFirst) {
                    $isFirst = false;
                    continue;
                }

                $newRef = substr($row->transaction_no . '-DUP-' . $row->id, 0, 100);
                DB::table('settlements')
                    ->where('id', $row->id)
                    ->update(['transaction_no' => $newRef]);
            }
        }

        Schema::table('settlements', function (Blueprint $table) {
            $table->unique('transaction_no', 'settlements_transaction_no_unique');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('settlements')) {
            return;
        }

        Schema::table('settlements', function (Blueprint $table) {
            $table->dropUnique('settlements_transaction_no_unique');
        });
    }
};
