<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Permohonan;
use App\Models\Dinas;
use App\Services\KalenderService;
use Carbon\Carbon;

class DoubleBookingTest extends TestCase
{
    use RefreshDatabase;

    protected KalenderService $kalenderService;
    protected Dinas $dinas;

    protected function setUp(): void
    {
        parent::setUp();
        $this->kalenderService = app(KalenderService::class);

        $this->dinas = Dinas::create([
            'id' => 9,
            'nama' => 'Dinas Komunikasi dan Informatika',
            'singkatan' => 'DISKOMINFO',
            'latitude' => -6.485570,
            'longitude' => 106.838141,
        ]);
    }

    private function getPayload(string $email, string $tanggalKunjungan, ?int $dinasId = null): array
    {
        return [
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
            'dinas_id' => $dinasId ?: $this->dinas->id,
            'jumlah_peserta' => 5,
            'rencana_menginap' => 'Tidak',
            'turnstile_token' => 'dev-bypass',
            'surat_permohonan' => 'data:application/pdf;base64,' . base64_encode('%PDF-1.4 dummy content'),
            'surat_permohonan_nama' => 'surat.pdf',
            'surat_permohonan_mime' => 'application/pdf',
            'daftar_pertanyaan' => 'data:application/pdf;base64,' . base64_encode('%PDF-1.4 dummy content'),
            'daftar_pertanyaan_nama' => 'pertanyaan.pdf',
            'daftar_pertanyaan_mime' => 'application/pdf',
        ];
    }

    /**
     * TEST 1 & TEST 2: Email A belum mencapai 2x vs sudah 2x untuk dinas tersebut.
     */
    public function test_email_a_sudah_mengajukan_terdeteksi_di_user_booked_dates()
    {
        $emailA = 'emailA@domain.com';
        $targetDate = Carbon::today()->addDays(10);
        while ($targetDate->isWeekend()) {
            $targetDate->addDay();
        }
        $targetDateStr = $targetDate->toDateString();

        // Sebelum booking: user_booked_dates kosong
        $resBefore = $this->getJson('/api/permohonan/tanggal-terpakai?email=' . urlencode($emailA) . '&dinas_id=' . $this->dinas->id);
        $resBefore->assertStatus(200);
        $this->assertNotContains($targetDateStr, $resBefore->json('user_booked_dates'));

        // Booking 1 oleh Email A: belum mengunci tanggal
        Permohonan::factory()->create([
            'email' => $emailA,
            'dinas_id' => $this->dinas->id,
            'tanggal_kunjungan' => $targetDateStr,
            'status' => 'Pending',
        ]);

        $res1 = $this->getJson('/api/permohonan/tanggal-terpakai?email=' . urlencode($emailA) . '&dinas_id=' . $this->dinas->id);
        $res1->assertStatus(200);
        $this->assertNotContains($targetDateStr, $res1->json('user_booked_dates'));

        // Booking 2 oleh Email A: sekarang mengunci tanggal untuk dinas ini
        Permohonan::factory()->create([
            'email' => $emailA,
            'dinas_id' => $this->dinas->id,
            'tanggal_kunjungan' => $targetDateStr,
            'status' => 'Pending',
        ]);

        $resAfter = $this->getJson('/api/permohonan/tanggal-terpakai?email=' . urlencode($emailA) . '&dinas_id=' . $this->dinas->id);
        $resAfter->assertStatus(200);
        $this->assertContains($targetDateStr, $resAfter->json('user_booked_dates'));
    }

    /**
     * TEST 3: Email B tidak terpengaruh oleh user_booked_dates Email A.
     */
    public function test_email_b_tidak_terpengaruh_user_booked_dates_email_a()
    {
        $emailA = 'emailA@domain.com';
        $emailB = 'emailB@domain.com';
        $targetDate = Carbon::today()->addDays(10);
        while ($targetDate->isWeekend()) {
            $targetDate->addDay();
        }
        $targetDateStr = $targetDate->toDateString();

        Permohonan::factory()->create([
            'email' => $emailA,
            'dinas_id' => $this->dinas->id,
            'tanggal_kunjungan' => $targetDateStr,
            'status' => 'Pending',
        ]);
        Permohonan::factory()->create([
            'email' => $emailA,
            'dinas_id' => $this->dinas->id,
            'tanggal_kunjungan' => $targetDateStr,
            'status' => 'Pending',
        ]);

        $resB = $this->getJson('/api/permohonan/tanggal-terpakai?email=' . urlencode($emailB) . '&dinas_id=' . $this->dinas->id);
        $resB->assertStatus(200);
        $this->assertNotContains($targetDateStr, $resB->json('user_booked_dates'));
    }

    /**
     * TEST 4: Email A maksimal 2 kali per dinas di hari tersebut, ke-3 ditolak.
     */
    public function test_backend_menolak_submit_ganda_email_yang_sama_pada_tanggal_yang_sama()
    {
        $email = 'double@domain.com';
        $targetDate = Carbon::today()->addDays(10);
        while ($targetDate->isWeekend()) {
            $targetDate->addDay();
        }
        $targetDateStr = $targetDate->toDateString();

        // Submit 1 BERHASIL
        $res1 = $this->postJson('/api/permohonan', $this->getPayload($email, $targetDateStr));
        $res1->assertStatus(201);

        // Submit 2 dengan tanggal, dinas & email sama -> BERHASIL (kuota 2x)
        $res2 = $this->postJson('/api/permohonan', $this->getPayload($email, $targetDateStr));
        $res2->assertStatus(201);

        // Submit 3 dengan tanggal, dinas & email sama -> DITOLAK
        $res3 = $this->postJson('/api/permohonan', $this->getPayload($email, $targetDateStr));
        $res3->assertStatus(422)
             ->assertJsonValidationErrors(['tanggal_kunjungan']);
    }

    /**
     * TEST 8: Normalisasi email (case-insensitive & whitespace).
     */
    public function test_normalisasi_email_mencegah_double_booking()
    {
        $emailLower = 'same.user@domain.com';
        $emailUpper = ' SAME.USER@DOMAIN.COM ';
        $targetDate = Carbon::today()->addDays(10);
        while ($targetDate->isWeekend()) {
            $targetDate->addDay();
        }
        $targetDateStr = $targetDate->toDateString();

        // Buat 2 permohonan dengan email lower
        Permohonan::factory()->create([
            'email' => $emailLower,
            'dinas_id' => $this->dinas->id,
            'tanggal_kunjungan' => $targetDateStr,
            'status' => 'Pending',
        ]);
        Permohonan::factory()->create([
            'email' => $emailLower,
            'dinas_id' => $this->dinas->id,
            'tanggal_kunjungan' => $targetDateStr,
            'status' => 'Pending',
        ]);

        // Request API ke-3 dengan email uppercase & space -> ditolak
        $res = $this->postJson('/api/permohonan', $this->getPayload($emailUpper, $targetDateStr));
        $res->assertStatus(422)
            ->assertJsonValidationErrors(['tanggal_kunjungan']);
    }

    /**
     * TEST 9: Status DITOLAK tidak mengunci tanggal.
     */
    public function test_status_ditolak_tidak_mengunci_tanggal()
    {
        $email = 'rejected@domain.com';
        $targetDate = Carbon::today()->addDays(10);
        while ($targetDate->isWeekend()) {
            $targetDate->addDay();
        }
        $targetDateStr = $targetDate->toDateString();

        // 2 permohonan berstatus Ditolak
        Permohonan::factory()->create([
            'email' => $email,
            'dinas_id' => $this->dinas->id,
            'tanggal_kunjungan' => $targetDateStr,
            'status' => 'Ditolak',
        ]);
        Permohonan::factory()->create([
            'email' => $email,
            'dinas_id' => $this->dinas->id,
            'tanggal_kunjungan' => $targetDateStr,
            'status' => 'Ditolak',
        ]);

        $res = $this->getJson('/api/permohonan/tanggal-terpakai?email=' . urlencode($email) . '&dinas_id=' . $this->dinas->id);
        $res->assertStatus(200);
        $this->assertNotContains($targetDateStr, $res->json('user_booked_dates'));

        // Bisa mengajukan permohonan baru
        $resSubmit = $this->postJson('/api/permohonan', $this->getPayload($email, $targetDateStr));
        $resSubmit->assertStatus(201);
    }
}
