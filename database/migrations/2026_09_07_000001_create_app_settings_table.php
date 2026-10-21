<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('app_settings')) {
            Schema::create('app_settings', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->text('value')->nullable();
                $table->timestamps();
            });

            // Insert default initial settings
            $now = now();
            DB::table('app_settings')->insert([
                [
                    'key' => 'header_telepon',
                    'value' => 'Telp: (021) 875-8605',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'key' => 'header_jam_layanan',
                    'value' => 'Jam Layanan: Senin – Jumat (08.00 – 16.00 WIB)',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'key' => 'header_link_portal_bogor',
                    'value' => 'https://bogorkab.go.id',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'key' => 'header_link_portal_ekabo',
                    'value' => 'https://ekabo.bogorkab.go.id',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('app_settings');
    }
};
