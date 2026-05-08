<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('oms:truncate-test-data {--force : Skip the confirmation prompt}', function () {
    $preserveTables = [
        'users',
        'roles',
        'report_definitions',
        'formula_configs',
        'formula_config_versions',
        'invoice_number_sequences',
        'invoice_records',
        'invoice_record_items',
        'migrations',
    ];

    $rows = DB::select('SHOW TABLES');
    $tables = collect($rows)
        ->map(function ($row) {
            return array_values((array) $row)[0] ?? null;
        })
        ->filter()
        ->values();

    $truncateTables = $tables
        ->reject(fn (string $table) => in_array($table, $preserveTables, true))
        ->values();

    if ($truncateTables->isEmpty()) {
        $this->info('No tables found to truncate.');
        return;
    }

    $this->line('Tables that will be truncated:');
    foreach ($truncateTables as $table) {
        $this->line('- ' . $table);
    }

    if (!$this->option('force') && !$this->confirm('Proceed with truncating these tables?')) {
        $this->comment('Operation cancelled.');
        return;
    }

    DB::statement('SET FOREIGN_KEY_CHECKS=0');

    foreach ($truncateTables as $table) {
        DB::table($table)->truncate();
        $this->info("Truncated {$table}");
    }

    DB::statement('SET FOREIGN_KEY_CHECKS=1');

    $this->info('Truncation complete. Preserved tables: users, roles, reports, invoices, and formula setup.');
})->purpose('Truncate test data while preserving auth, report, invoice, and formula tables');
