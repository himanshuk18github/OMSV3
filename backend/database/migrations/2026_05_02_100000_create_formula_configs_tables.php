<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formula_configs', function (Blueprint $table) {
            $table->id();
            $table->string('formula_name', 100)->unique();
            $table->string('display_name', 150);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('formula_config_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('formula_config_id')->constrained('formula_configs')->cascadeOnDelete();
            $table->unsignedInteger('version_no');
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->text('formula_template');
            $table->text('change_note')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['formula_config_id', 'version_no']);
            $table->unique(['formula_config_id', 'effective_from']);
            $table->index(['formula_config_id', 'is_active', 'effective_from'], 'formula_versions_lookup_idx');
        });

        $now = now();
        $formulaId = DB::table('formula_configs')->insertGetId([
            'formula_name' => 'invoice_gen_sequence',
            'display_name' => 'Invoice Generator Sequence',
            'description' => 'Format with placeholders. Required placeholder: {{seqN}} (e.g., {{seq1}}). Supported placeholders: {{year4}}, {{year2}}, {{month2}}, {{day2}}, {{fy_start4}}, {{fy_start2}}, {{fy_end2}}.',
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('formula_config_versions')->insert([
            'formula_config_id' => $formulaId,
            'version_no' => 1,
            'effective_from' => now('Asia/Kolkata')->toDateString(),
            'effective_to' => null,
            'formula_template' => 'AS/{{fy_start4}}-{{fy_end2}}/{{month2}}/{{seq1}}',
            'change_note' => 'Initial default sequence template.',
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('formula_config_versions');
        Schema::dropIfExists('formula_configs');
    }
};
