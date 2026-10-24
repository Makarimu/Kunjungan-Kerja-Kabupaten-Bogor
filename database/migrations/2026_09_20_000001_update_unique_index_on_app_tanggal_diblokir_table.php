<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (\Illuminate\Support\Facades\DB::getDriverName() === 'mysql') {
            $indexes = collect(\Illuminate\Support\Facades\DB::select("SHOW INDEXES FROM app_tanggal_diblokir"))->pluck('Key_name')->unique()->toArray();
            if (in_array('app_tanggal_diblokir_tanggal_unique', $indexes)) {
                Schema::table('app_tanggal_diblokir', function (Blueprint $table) {
                    $table->dropUnique('app_tanggal_diblokir_tanggal_unique');
                });
            }
            if (!in_array('app_tanggal_diblokir_tanggal_dinas_unique', $indexes)) {
                Schema::table('app_tanggal_diblokir', function (Blueprint $table) {
                    $table->unique(['tanggal', 'dinas_id'], 'app_tanggal_diblokir_tanggal_dinas_unique');
                });
            }
        } else {
            try {
                Schema::table('app_tanggal_diblokir', function (Blueprint $table) {
                    $table->dropUnique('app_tanggal_diblokir_tanggal_unique');
                });
            } catch (\Throwable $e) {}

            try {
                Schema::table('app_tanggal_diblokir', function (Blueprint $table) {
                    $table->unique(['tanggal', 'dinas_id'], 'app_tanggal_diblokir_tanggal_dinas_unique');
                });
            } catch (\Throwable $e) {}
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            Schema::table('app_tanggal_diblokir', function (Blueprint $table) {
                $table->dropUnique('app_tanggal_diblokir_tanggal_dinas_unique');
                $table->unique('tanggal', 'app_tanggal_diblokir_tanggal_unique');
            });
        } catch (\Throwable $e) {}
    }
};
