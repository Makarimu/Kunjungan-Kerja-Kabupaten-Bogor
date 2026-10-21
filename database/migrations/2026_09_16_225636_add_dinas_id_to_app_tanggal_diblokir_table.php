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
        if (!Schema::hasColumn('app_tanggal_diblokir', 'dinas_id')) {
            Schema::table('app_tanggal_diblokir', function (Blueprint $table) {
                $table->foreignId('dinas_id')->nullable()->constrained('app_md_dinas')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('app_tanggal_diblokir', function (Blueprint $table) {
            $table->dropForeign(['dinas_id']);
            $table->dropColumn('dinas_id');
        });
    }
};
