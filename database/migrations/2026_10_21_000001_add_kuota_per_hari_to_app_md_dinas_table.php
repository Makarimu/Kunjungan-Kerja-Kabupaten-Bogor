<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('app_md_dinas')) {
            Schema::table('app_md_dinas', function (Blueprint $table) {
                if (!Schema::hasColumn('app_md_dinas', 'kuota_per_hari')) {
                    $table->unsignedInteger('kuota_per_hari')->default(2)->after('nomor_telepon');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('app_md_dinas')) {
            Schema::table('app_md_dinas', function (Blueprint $table) {
                if (Schema::hasColumn('app_md_dinas', 'kuota_per_hari')) {
                    $table->dropColumn('kuota_per_hari');
                }
            });
        }
    }
};
