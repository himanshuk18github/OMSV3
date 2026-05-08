<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Normalize existing free-form/case-variant values before tightening enum.
        DB::statement("UPDATE orders SET status = LOWER(status)");
        DB::statement("UPDATE orders SET status = 'in_transit' WHERE status IN ('in transit', 'in-transit', 'in_transit')");
        DB::statement("UPDATE orders SET status = 'rto_delivered' WHERE status = 'rto'");
        DB::statement("UPDATE orders SET status = 'rto_delivered' WHERE status IN ('rto delivered', 'rto-delivered', 'rto_delivered')");

        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM('draft','pending','confirmed','packed','dispatched','in_transit','delivered','cancelled','rto_delivered') NOT NULL DEFAULT 'draft'");
    }

    public function down(): void
    {
        DB::statement("UPDATE orders SET status = 'rto' WHERE status = 'rto_delivered'");
        DB::statement("UPDATE orders SET status = 'dispatched' WHERE status = 'in_transit'");

        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM('draft','pending','confirmed','packed','dispatched','delivered','cancelled','rto') NOT NULL DEFAULT 'draft'");
    }
};
