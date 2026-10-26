<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Permohonan;
use App\Models\Dinas;
use App\Services\KalenderService;
use Carbon\Carbon;

class MaxKunjunganPerDinasTest extends TestCase
{
    use RefreshDatabase;

    protected KalenderService $kalenderService;
    protected Dinas $dinasDiskominfo;
    protected Dinas $dinasBappenda;
    protected Dinas $dinasDinkes;

    protected function setUp(): void
    {
        parent::setUp();
        $this->kalenderService = app(KalenderService::class);

        $this->dinasDiskominfo = Dinas::create([
            'id' => 9,
            'nama' => 'Dinas Komunikasi dan Informatika',
            'singkatan' => 'DISKOMINFO',
            'latitude' => -6.485570,
            'longitude' => 106.838141,
        ]);

        $this->dinasBappenda = Dinas::create([
            'id' => 27,
            'nama' => 'Badan Pengelolaan Pendapatan Daerah',
            'singkatan' => 'BAPPENDA',
            'latitude' => -6.484995,
            'longitude' => 106.835242,
        ]);

        $this->dinasDinkes = Dinas::create([
            'id' => 4,
            'nama' => 'Dinas Kesehatan',
            'singkatan' => 'DINKES',
            'latitude' => -6.482472,
            'longitude' => 106.832463,
        ]);
    }

    private function getPayload(string $email, string $tanggalKunjungan, int $dinasId): array
    {
        return [
            'tanggal_kunjungan' => $tanggalKunjungan,
            'nomor_surat' => '001/TEST/2026',
            'instansi' => 'Instansi Pengunjung',
            'nama_ketua_rombongan' => 'Ketua Test',
            'jabatan_ketua_rombongan' => 'Jabatan Test',
            'nama_pic' => 'PIC Test',
            'jabatan_pic' => 'Jabatan PIC',
            'no_telp' => '081234567890',
            'email' => $email,
            'tujuan' => 'Maksud dan Tujuan Test Kunjungan Kerja',
            'dinas_id' => $dinasId,
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

    public function test_maksimal_dua_kali_per_kedinasan_di_hari_tersebut_per_akun()
    {
        $email = 'user@instansi.go.id';
        $targetDate = Carbon::today()->addDays(10);
        while ($targetDate->isWeekend()) {
            $targetDate->addDay();
        }
        $targetDateStr = $targetDate->toDateString();

        // 1. Kunjungan 1 ke DISKOMINFO -> BERHASIL
        $res1 = $this->postJson('/api/permohonan', $this->getPayload($email, $targetDateStr, $this->dinasDiskominfo->id));
        $res1->assertStatus(201);

        // 2. Kunjungan 2 ke DISKOMINFO pada tanggal yang sama -> BERHASIL
        $res2 = $this->postJson('/api/permohonan', $this->getPayload($email, $targetDateStr, $this->dinasDiskominfo->id));
        $res2->assertStatus(201);

        // 3. Kunjungan 3 ke DISKOMINFO pada tanggal yang sama -> DITOLAK
        $res3 = $this->postJson('/api/permohonan', $this->getPayload($email, $targetDateStr, $this->dinasDiskominfo->id));
        $res3->assertStatus(422)
             ->assertJsonValidationErrors(['tanggal_kunjungan']);

        // 4. Kunjungan ke dinas LAIN (BAPPENDA) pada tanggal yang sama -> TETAP BISA
        $resBap1 = $this->postJson('/api/permohonan', $this->getPayload($email, $targetDateStr, $this->dinasBappenda->id));
        $resBap1->assertStatus(201);

        // 5. Kunjungan kedua ke BAPPENDA pada tanggal yang sama -> BERHASIL
        $resBap2 = $this->postJson('/api/permohonan', $this->getPayload($email, $targetDateStr, $this->dinasBappenda->id));
        $resBap2->assertStatus(201);

        // 6. Kunjungan ketiga ke BAPPENDA pada tanggal yang sama -> DITOLAK
        $resBap3 = $this->postJson('/api/permohonan', $this->getPayload($email, $targetDateStr, $this->dinasBappenda->id));
        $resBap3->assertStatus(422)
             ->assertJsonValidationErrors(['tanggal_kunjungan']);

        // 7. Akun LAIN (emailB) mengajukan ke dinas DINKES pada tanggal yang sama -> BISA
        $emailB = 'userB@instansi.go.id';
        $resOther = $this->postJson('/api/permohonan', $this->getPayload($emailB, $targetDateStr, $this->dinasDinkes->id));
        $resOther->assertStatus(201);
    }

    public function test_user_booked_dates_hanya_mengunci_jika_dinas_tersebut_sudah_mencapai_dua_kali()
    {
        $email = 'user@instansi.go.id';
        $targetDate = Carbon::today()->addDays(12);
        while ($targetDate->isWeekend()) {
            $targetDate->addDay();
        }
        $targetDateStr = $targetDate->toDateString();

        // 1 kunjungan ke DISKOMINFO: tanggal belum terkunci untuk dinas tersebut
        Permohonan::factory()->create([
            'email' => $email,
            'dinas_id' => $this->dinasDiskominfo->id,
            'tanggal_kunjungan' => $targetDateStr,
            'status' => 'Pending',
        ]);

        $res1 = $this->getJson('/api/permohonan/tanggal-terpakai?email=' . urlencode($email) . '&dinas_id=' . $this->dinasDiskominfo->id);
        $res1->assertStatus(200);
        $this->assertNotContains($targetDateStr, $res1->json('user_booked_dates'));

        // 2 kunjungan ke DISKOMINFO: tanggal terkunci bagi user untuk DISKOMINFO
        Permohonan::factory()->create([
            'email' => $email,
            'dinas_id' => $this->dinasDiskominfo->id,
            'tanggal_kunjungan' => $targetDateStr,
            'status' => 'Pending',
        ]);

        $res2 = $this->getJson('/api/permohonan/tanggal-terpakai?email=' . urlencode($email) . '&dinas_id=' . $this->dinasDiskominfo->id);
        $res2->assertStatus(200);
        $this->assertContains($targetDateStr, $res2->json('user_booked_dates'));

        // Untuk dinas BAPPENDA, tanggal masih belum terkunci
        $resBap = $this->getJson('/api/permohonan/tanggal-terpakai?email=' . urlencode($email) . '&dinas_id=' . $this->dinasBappenda->id);
        $resBap->assertStatus(200);
        $this->assertNotContains($targetDateStr, $resBap->json('user_booked_dates'));
    }
}
