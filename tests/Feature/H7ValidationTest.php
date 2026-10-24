<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Permohonan;
use App\Services\KalenderService;
use Carbon\Carbon;

class H7ValidationTest extends TestCase
{
    use RefreshDatabase;

    protected KalenderService $kalenderService;
    protected \App\Models\Dinas $dinas;

    protected function setUp(): void
    {
        parent::setUp();
        $this->kalenderService = app(KalenderService::class);
        $this->dinas = \App\Models\Dinas::firstOrCreate(
            ['singkatan' => 'BAPPENDA'],
            [
                'nama' => 'Badan Pendapatan Daerah',
                'aktif' => true,
                'warna' => '#0028B3',
                'kuota_per_hari' => 2,
            ]
        );
    }

    /**
     * Helper membuat dummy payload permohonan.
     */
    private function getPayload(string $email, string $tanggalKunjungan): array
    {
        return [
            'dinas_id' => $this->dinas->id,
            'tanggal_kunjungan' => $tanggalKunjungan,
            'nomor_surat' => '001/TEST/2026',
            'instansi' => 'Dinas Test',
            'nama_ketua_rombongan' => 'Ketua Test',
            'jabatan_ketua_rombongan' => 'Jabatan Test',
            'nama_pic' => 'PIC Test',
            'jabatan_pic' => 'Jabatan PIC',
            'no_telp' => '081234567890',
            'email' => $email,
            'tujuan' => 'Maksud dan Tujuan Test Kunjungan Kerja',
            'jumlah_peserta' => 5,
            'rencana_menginap' => 'Tidak',
            'surat_permohonan' => 'data:application/pdf;base64,' . base64_encode('%PDF-1.4 dummy content'),
            'surat_permohonan_nama' => 'surat.pdf',
            'surat_permohonan_mime' => 'application/pdf',
            'daftar_pertanyaan' => 'data:application/pdf;base64,' . base64_encode('%PDF-1.4 dummy content'),
            'daftar_pertanyaan_nama' => 'pertanyaan.pdf',
            'daftar_pertanyaan_mime' => 'application/pdf',
        ];
    }

    /**
     * Skenario 1 & 2: Email baru mengajukan — kunjungan < H+1 ditolak, >= H+1 diterima.
     */
    public function test_email_baru_harus_minimal_h1_dari_tanggal_pengajuan()
    {
        $today = Carbon::today();
        $h0Date = $today->toDateString();
        $h1Date = $today->copy()->addDays(1);
        // Pastikan tidak jatuh di akhir pekan untuk pengujian yang valid
        while ($h1Date->isWeekend()) {
            $h1Date->addDay();
        }
        $h1DateStr = $h1Date->toDateString();

        $email = 'baru@gmail.com';

        // Hari ini (H+0) -> GAGAL
        $resFail = $this->postJson('/api/permohonan', $this->getPayload($email, $h0Date));
        $resFail->assertStatus(422)
                ->assertJsonValidationErrors(['tanggal_kunjungan']);

        // H+1 -> BERHASIL
        $resSuccess = $this->postJson('/api/permohonan', $this->getPayload($email, $h1DateStr));
        $resSuccess->assertStatus(201);
    }

    /**
     * Skenario 3 & 4: Email yang sama mengajukan lagi — harus minimal H+1 dari kunjungan terakhir.
     */
    public function test_email_yang_sama_mengajukan_lagi_minimal_h1_dari_kunjungan_terakhir()
    {
        $email = 'pemohon.tetap@gmail.com';
        $visit1 = Carbon::today()->addDays(3);
        while ($visit1->isWeekend()) {
            $visit1->addDay();
        }

        // Kunjungan pertama (Status Disetujui)
        Permohonan::factory()->create([
            'email' => $email,
            'tanggal_kunjungan' => $visit1->toDateString(),
            'status' => 'Disetujui',
        ]);

        // Kunjungan 2: hari yang sama sebelum H+1 -> GAGAL
        $failVisit = $visit1->toDateString();
        $resFail = $this->postJson('/api/permohonan', $this->getPayload($email, $failVisit));
        $resFail->assertStatus(422)
                ->assertJsonValidationErrors(['tanggal_kunjungan']);

        // Kunjungan 2: H+1 dari visit1 -> BERHASIL
        $successVisit = $visit1->copy()->addDays(1);
        while ($successVisit->isWeekend()) {
            $successVisit->addDay();
        }
        $resSuccess = $this->postJson('/api/permohonan', $this->getPayload($email, $successVisit->toDateString()));
        $resSuccess->assertStatus(201);
    }

    /**
     * Skenario 7: Email berbeda tidak terpengaruh oleh riwayat email lain.
     */
    public function test_email_berbeda_tidak_terpengaruh_riwayat_email_lain()
    {
        $emailA = 'pemohonA@gmail.com';
        $emailB = 'pemohonB@gmail.com';

        $visitA = Carbon::today()->addDays(5);
        while ($visitA->isWeekend()) {
            $visitA->addDay();
        }

        // Email A punya kunjungan berstatus Disetujui
        Permohonan::factory()->create([
            'email' => $emailA,
            'tanggal_kunjungan' => $visitA->toDateString(),
            'status' => 'Disetujui',
        ]);

        // Email B mengajukan H+1 dari pengajuan
        $visitB = Carbon::today()->addDays(1);
        while ($visitB->isWeekend()) {
            $visitB->addDay();
        }

        $resB = $this->postJson('/api/permohonan', $this->getPayload($emailB, $visitB->toDateString()));
        $resB->assertStatus(201);
    }

    /**
     * Skenario 8: Normalisasi email (case-insensitive & whitespace).
     */
    public function test_normalisasi_email_case_insensitive_dan_trim()
    {
        $emailLower = 'user.test@domain.com';
        $emailUpper = ' USER.TEST@DOMAIN.COM ';

        $visit1 = Carbon::today()->addDays(5);
        while ($visit1->isWeekend()) {
            $visit1->addDay();
        }

        Permohonan::factory()->create([
            'email' => $emailLower,
            'tanggal_kunjungan' => $visit1->toDateString(),
            'status' => 'Disetujui',
        ]);

        // Email UPPER + spasi mencoba hari yang sama sebelum H+1 -> HARUS GAGAL
        $failVisit = $visit1->toDateString();
        $resFail = $this->postJson('/api/permohonan', $this->getPayload($emailUpper, $failVisit));
        $resFail->assertStatus(422)
                ->assertJsonValidationErrors(['tanggal_kunjungan']);
    }

    /**
     * Skenario 9: Status DITOLAK tidak menjadi dasar pembatasan riwayat.
     */
    public function test_status_ditolak_tidak_menjadi_dasar_riwayat()
    {
        $email = 'ditolak@gmail.com';
        $visitRejected = Carbon::today()->addDays(5)->toDateString();

        Permohonan::factory()->create([
            'email' => $email,
            'tanggal_kunjungan' => $visitRejected,
            'status' => 'Ditolak',
        ]);

        // Karena ditolak, minDate email ini tetap H+1 dari hari ini
        $visitNew = Carbon::today()->addDays(1);
        while ($visitNew->isWeekend()) {
            $visitNew->addDay();
        }

        $res = $this->postJson('/api/permohonan', $this->getPayload($email, $visitNew->toDateString()));
        $res->assertStatus(201);
    }

    /**
     * Skenario 10: Status REVISI tanpa kunjungan valid tidak menjadi dasar pembatasan riwayat.
     */
    public function test_status_revisi_tidak_menjadi_dasar_riwayat()
    {
        $email = 'revisi@gmail.com';
        $visitRevisi = Carbon::today()->addDays(5)->toDateString();

        Permohonan::factory()->create([
            'email' => $email,
            'tanggal_kunjungan' => $visitRevisi,
            'status' => 'Revisi',
        ]);

        $visitNew = Carbon::today()->addDays(1);
        while ($visitNew->isWeekend()) {
            $visitNew->addDay();
        }

        $res = $this->postJson('/api/permohonan', $this->getPayload($email, $visitNew->toDateString()));
        $res->assertStatus(201);
    }

    /**
     * Skenario 10b: Status Pending (Ditinjau) tanpa kunjungan valid disetujui tidak menjadi dasar riwayat.
     */
    public function test_status_pending_ditinjau_tidak_menjadi_dasar_riwayat()
    {
        $email = 'pending@gmail.com';
        $visitPending = Carbon::today()->addDays(5)->toDateString();

        Permohonan::factory()->create([
            'email' => $email,
            'tanggal_kunjungan' => $visitPending,
            'status' => 'Pending',
        ]);

        $visitNew = Carbon::today()->addDays(1);
        while ($visitNew->isWeekend()) {
            $visitNew->addDay();
        }

        $res = $this->postJson('/api/permohonan', $this->getPayload($email, $visitNew->toDateString()));
        $res->assertStatus(201);
    }

    /**
     * Skenario 11 & 12: Status Disetujui & Selesai menjadi dasar riwayat.
     */
    public function test_status_disetujui_dan_selesai_menjadi_dasar_riwayat()
    {
        $email = 'selesai@gmail.com';
        $visit1 = Carbon::today()->addDays(5);
        while ($visit1->isWeekend()) {
            $visit1->addDay();
        }

        Permohonan::factory()->create([
            'email' => $email,
            'tanggal_kunjungan' => $visit1->toDateString(),
            'status' => 'Selesai',
        ]);

        // Mencoba hari yang sama dengan kunjungan Selesai -> GAGAL
        $failVisit = $visit1->toDateString();
        $resFail = $this->postJson('/api/permohonan', $this->getPayload($email, $failVisit));
        $resFail->assertStatus(422)
                ->assertJsonValidationErrors(['tanggal_kunjungan']);
    }

    /**
     * Skenario 13: Maksimal 2 kunjungan per hari tetap berlaku.
     */
    public function test_maksimal_dua_kunjungan_per_hari_tetap_berlaku()
    {
        $targetDate = Carbon::today()->addDays(3);
        while ($targetDate->isWeekend()) {
            $targetDate->addDay();
        }
        $targetDateStr = $targetDate->toDateString();

        // 2 kunjungan dari email lain pada tanggal target untuk dinas yang sama
        Permohonan::factory()->create([
            'dinas_id' => $this->dinas->id,
            'email' => 'other1@gmail.com',
            'tanggal_kunjungan' => $targetDateStr,
            'status' => 'Pending',
        ]);
        Permohonan::factory()->create([
            'dinas_id' => $this->dinas->id,
            'email' => 'other2@gmail.com',
            'tanggal_kunjungan' => $targetDateStr,
            'status' => 'Disetujui',
        ]);

        // Email ke-3 mencoba booking tanggal yang sama -> GAGAL karena slot penuh
        $resFull = $this->postJson('/api/permohonan', $this->getPayload('email3@gmail.com', $targetDateStr));
        $resFull->assertStatus(422)
                ->assertJsonValidationErrors(['tanggal_kunjungan']);
    }
}
