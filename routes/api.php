<?php

use Illuminate\Support\Facades\Route;

// Controllers - Authentication
use App\Http\Controllers\Auth\AuthController;

// Controllers - Public
use App\Http\Controllers\Api\PermohonanController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\RiwayatKunjunganController;
use App\Http\Controllers\Api\HasilKunjunganController;

// Controllers - Admin
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\Admin\BlacklistController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\DinasController;
use App\Http\Controllers\Api\Admin\KontakTeleponController;
use App\Http\Controllers\Api\Admin\PermohonanAdminController;
use App\Http\Controllers\Api\Admin\ReviewAdminController;
use App\Http\Controllers\Api\Admin\RingkasanController;
use App\Http\Controllers\Api\Admin\TanggalDiblokirController;
use App\Http\Controllers\Api\Admin\SettingController;

/*
|--------------------------------------------------------------------------
| API Routes — Sistem Kunjungan Kerja Kabupaten Bogor
|--------------------------------------------------------------------------
*/

// =========================================================================
// 1. Authentication (Public Login)
// =========================================================================
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

// =========================================================================
// 2. Public Endpoints (Permohonan, Riwayat, & Review)
// =========================================================================
Route::middleware('throttle:public-api')->group(function () {
    // Master Data Dinas
    Route::get('/dinas', [DinasController::class, 'listPublic']);

    // Public Settings / Pengaturan Topbar
    Route::get('/settings/public', [SettingController::class, 'getPublicSettings']);

    // Permohonan Kunjungan Kerja
    Route::prefix('permohonan')->group(function () {
        Route::get('/tanggal-terpakai', [PermohonanController::class, 'getTanggalTerpakai']);
        Route::post('/lacak-kode', [PermohonanController::class, 'lacakKode']);
        Route::post('/', [PermohonanController::class, 'submit']);
        Route::get('/{kode}', [PermohonanController::class, 'status']);
        Route::post('/{kode}/revisi', [PermohonanController::class, 'revisi']);
        Route::post('/{kode}/bukti-penginapan', [PermohonanController::class, 'uploadBuktiPenginapan']);
        Route::post('/{kode}/review', [ReviewController::class, 'submit']);

        // Berkas / Dokumen Lampiran (Streaming Inline)
        Route::get('/{kode}/file/{type}', [PermohonanController::class, 'viewFile']);

        // Ringkasan PDF Kunjungan
        Route::get('/{kode}/pdf-status', [HasilKunjunganController::class, 'pdfStatus']);
        Route::get('/{kode}/download-pdf', [HasilKunjunganController::class, 'downloadPdf']);
    });

    // Ulasan & Riwayat Kunjungan
    Route::get('/reviews/approved', [ReviewController::class, 'getApproved']);
    Route::get('/riwayat-kunjungan', [RiwayatKunjunganController::class, 'index']);
});

// =========================================================================
// 3. Protected Admin Endpoints (Sanctum Authenticated)
// =========================================================================
Route::middleware(['auth:sanctum', 'throttle:admin-api'])->group(function () {
    // Current Admin Profile & Session
    Route::prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    // Admin Dashboard & Management Portal
    Route::prefix('admin')->group(function () {
        // Dashboard Analytics & Charts
        Route::prefix('dashboard')->group(function () {
            Route::get('/statistik', [DashboardController::class, 'statistik']);
            Route::get('/permohonan-hari-ini', [DashboardController::class, 'permohonanHariIni']);
            Route::get('/grafik-bulanan', [DashboardController::class, 'grafikBulanan']);
            Route::get('/aktivitas-terbaru', [DashboardController::class, 'aktivitasTerbaru']);
        });

        // Manajemen Permohonan
        Route::get('/permohonan', [PermohonanAdminController::class, 'index']);
        Route::post('/permohonan/export', [PermohonanAdminController::class, 'export']);
        Route::get('/permohonan/{kode}', [PermohonanAdminController::class, 'show']);
        Route::match(['post', 'put'], '/permohonan/{kode}/proses', [PermohonanAdminController::class, 'proses']);
        Route::post('/permohonan/{kode}/selesai', [PermohonanAdminController::class, 'selesaikan']);
        Route::put('/permohonan/{kode}', [PermohonanAdminController::class, 'update']);
        Route::delete('/permohonan/{kode}', [PermohonanAdminController::class, 'destroy']);

        // Ringkasan PDF & Dokumen Kunjungan
        Route::post('/permohonan/{id}/upload-pdf', [HasilKunjunganController::class, 'upload']);
        Route::delete('/permohonan/{id}/delete-pdf', [HasilKunjunganController::class, 'destroy']);
        Route::post('/permohonan/{kode}/ringkasan/upload', [RingkasanController::class, 'upload']);
        Route::post('/permohonan/{kode}/ringkasan/kirim', [RingkasanController::class, 'kirim']);
        Route::get('/ringkasan/expiring', [RingkasanController::class, 'expiring']);

        // Manajemen Tanggal Diblokir
        Route::get('/tanggal-diblokir', [TanggalDiblokirController::class, 'index']);
        Route::post('/tanggal-diblokir', [TanggalDiblokirController::class, 'store']);
        Route::delete('/tanggal-diblokir/{tanggal}', [TanggalDiblokirController::class, 'destroy']);

        // Manajemen Kontak Telepon
        Route::get('/kontak-telepon', [KontakTeleponController::class, 'index']);
        Route::post('/kontak-telepon', [KontakTeleponController::class, 'store']);
        Route::put('/kontak-telepon/{id}', [KontakTeleponController::class, 'update']);
        Route::patch('/kontak-telepon/{id}/toggle-status', [KontakTeleponController::class, 'toggleStatus']);
        Route::delete('/kontak-telepon/{id}', [KontakTeleponController::class, 'destroy']);

        // Moderasi Review / Ulasan
        Route::get('/reviews', [ReviewAdminController::class, 'index']);
        Route::post('/reviews/{id}/proses', [ReviewAdminController::class, 'proses']);

        // Master Data Dinas & Pengaturan Kuota
        Route::get('/dinas/kuota', [DinasController::class, 'getKuotaList']);
        Route::put('/dinas/kuota', [DinasController::class, 'updateKuotaBulk']);
        Route::put('/dinas/{id}/kuota', [DinasController::class, 'updateKuotaSingle']);
        Route::get('/dinas', [DinasController::class, 'index']);
        Route::post('/dinas', [DinasController::class, 'store']);
        Route::put('/dinas/{id}', [DinasController::class, 'update']);
        Route::delete('/dinas/{id}', [DinasController::class, 'destroy']);

        // Manajemen Pengguna Admin
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::put('/users/{id}', [AdminUserController::class, 'update']);
        Route::delete('/users/{id}', [AdminUserController::class, 'destroy']);

        // Manajemen Blacklist Instansi / Kontak
        Route::get('/blacklist', [BlacklistController::class, 'index']);
        Route::post('/blacklist', [BlacklistController::class, 'store']);
        Route::put('/blacklist/{id}', [BlacklistController::class, 'update']);
        Route::patch('/blacklist/{id}/toggle-status', [BlacklistController::class, 'toggleStatus']);
        Route::delete('/blacklist/{id}', [BlacklistController::class, 'destroy']);

        // Pengaturan Sistem / Header Publik
        Route::get('/settings', [SettingController::class, 'getAdminSettings']);
        Route::put('/settings', [SettingController::class, 'updateSettings']);
    });
});
