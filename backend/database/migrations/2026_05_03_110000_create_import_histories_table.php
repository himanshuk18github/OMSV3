<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('import_histories', function (Blueprint $table) {
            $table->id();
            $table->string('import_type', 50);
            $table->string('file_name', 255)->nullable();
            $table->unsignedInteger('row_count')->default(0);
            $table->string('status', 30)->default('success');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('imported_at')->useCurrent();
            $table->timestamps();

            $table->index(['import_type', 'imported_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_histories');
    }
};
