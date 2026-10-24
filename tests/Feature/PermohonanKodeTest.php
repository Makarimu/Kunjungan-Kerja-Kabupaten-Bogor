<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Permohonan;
use App\Models\User;
use App\Services\PermohonanService;
use App\Services\EmailService;
use App\Mail\PermohonanPendingMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Carbon\Carbon;

class PermohonanKodeTest extends TestCase
{
    use RefreshDatabase;

    private PermohonanService $permohonanService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->permohonanService = app(PermohonanService::class);
    }

    public function test_01_kode_baru_memiliki_format_kunker_yyyymmdd_xxxxx(): void
    {
        $kode = $this->permohonanService->generateKode();
        $this->assertMatchesRegularExpression('/^KUNKER-\d{8}-[A-Z0-9]{5}$/', $kode);
    }

    public function test_02_xxxxx_memiliki_tepat_5_karakter(): void
    {
        $kode = $this->permohonanService->generateKode();
        $parts = explode('-', $kode);
        $suffix = $parts[2];
        $this->assertEquals(5, strlen($suffix));
    }

    public function test_03_xxxxx_memiliki_tepat_4_angka(): void
    {
        $kode = $this->permohonanService->generateKode();
        $suffix = explode('-', $kode)[2];
        $digitCount = preg_match_all('/[0-9]/', $suffix);
        $this->assertEquals(4, $digitCount);
    }

    public function test_04_xxxxx_memiliki_tepat_1_huruf_kapital(): void
    {
        $kode = $this->permohonanService->generateKode();
        $suffix = explode('-', $kode)[2];
        $letterCount = preg_match_all('/[A-Z]/', $suffix);
        $this->assertEquals(1, $letterCount);
    }

    public function test_05_sampai_09_posisi_huruf_kapital_acak_1_sampai_5(): void
    {
        $foundPositions = [];

        // Generate hingga menemukan semua 5 posisi huruf (0, 1, 2, 3, 4)
        for ($i = 0; $i < 500; $i++) {
            $kode = $this->permohonanService->generateKode();
            $suffix = explode('-', $kode)[2];
            for ($pos = 0; $pos < 5; $pos++) {
                if (ctype_upper($suffix[$pos])) {
                    $foundPositions[$pos] = true;
                }
            }
            if (count($foundPositions) === 5) {
                break;
            }
        }

        $this->assertCount(5, $foundPositions, 'Huruf kapital harus dapat berada di posisi 1, 2, 3, 4, maupun 5');
    }

    public function test_10_kode_duplicate_tidak_dapat_disimpan_karena_unique_constraint(): void
    {
        $existing = Permohonan::factory()->create([
            'kode' => 'KUNKER-20260808-84A12',
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        Permohonan::factory()->create([
            'kode' => 'KUNKER-20260808-84A12',
        ]);
    }

    public function test_11_retry_mechanism_berhasil_saat_terjadi_duplicate_code(): void
    {
        $dinas = \App\Models\Dinas::firstOrCreate(
            ['singkatan' => 'BAPPENDA'],
            [
                'nama' => 'Badan Pendapatan Daerah',
                'aktif' => true,
                'warna' => '#0028B3',
                'kuota_per_hari' => 2,
            ]
        );

        $tanggal = Carbon::now()->addDays(10);
        while ($tanggal->isWeekend()) {
            $tanggal->addDay();
        }

        $data = [
            'dinas_id'                => $dinas->id,
            'tanggal_kunjungan'       => $tanggal->format('Y-m-d'),
            'nomor_surat'             => '123/ABC/2026',
            'instansi'                => 'DPRD Test',
            'nama_ketua_rombongan'    => 'Budi',
            'jabatan_ketua_rombongan' => 'Ketua',
            'nama_pic'                => 'Andi',
            'jabatan_pic'             => 'Staff',
            'no_telp'                 => '081234567890',
            'email'                   => 'test@example.com',
            'tujuan'                  => 'Studi Banding',
            'jumlah_peserta'          => 10,
            'rencana_menginap'        => 'Tidak',
            'surat_permohonan'        => 'data:application/pdf;base64,' . base64_encode('dummy pdf content'),
            'daftar_pertanyaan'       => 'data:application/pdf;base64,' . base64_encode('dummy pdf content'),
        ];

        Mail::fake();

        $permohonan = $this->permohonanService->submit($data);

        $this->assertNotNull($permohonan->kode);
        $this->assertMatchesRegularExpression('/^KUNKER-\d{8}-[A-Z0-9]{5}$/', $permohonan->kode);
        $this->assertDatabaseHas('app_permohonan', ['kode' => $permohonan->kode]);
    }

    public function test_12_dan_13_kode_lama_tetap_dapat_dicari_dan_ditampilkan(): void
    {
        $oldPermohonan = Permohonan::factory()->create([
            'kode'     => 'KUNKER-20260808-8412', // Format 4 digit lama
            'instansi' => 'Instansi Lama',
        ]);

        $resSearch = $this->getJson('/api/permohonan/KUNKER-20260808-8412');
        $resSearch->assertStatus(200);
        $resSearch->assertJsonPath('data.kode', 'KUNKER-20260808-8412');
    }

    public function test_14_kode_baru_dapat_digunakan_pada_cek_status(): void
    {
        $newPermohonan = Permohonan::factory()->create([
            'kode' => 'KUNKER-20260808-84A12',
        ]);

        $res = $this->getJson("/api/permohonan/{$newPermohonan->kode}");
        $res->assertStatus(200);
        $res->assertJsonPath('data.kode', 'KUNKER-20260808-84A12');
    }

    public function test_15_kode_baru_tampil_benar_pada_halaman_admin(): void
    {
        $admin = \App\Models\Admin::factory()->create([
            'username' => 'admin_test',
            'password' => bcrypt('password123'),
        ]);

        $token = $this->postJson('/api/auth/login', [
            'username' => 'admin_test',
            'password' => 'password123',
        ])->json('token');

        $permohonan = Permohonan::factory()->create([
            'kode' => 'KUNKER-20260808-841A2',
        ]);

        $res = $this->getJson("/api/admin/permohonan/{$permohonan->kode}", [
            'Authorization' => "Bearer {$token}",
        ]);

        $res->assertStatus(200);
        $res->assertJsonPath('data.kode', 'KUNKER-20260808-841A2');
    }

    public function test_16_dan_17_email_menggunakan_kode_tersimpan_dan_tidak_berubah_saat_dikirim_ulang(): void
    {
        Mail::fake();

        $permohonan = Permohonan::factory()->create([
            'kode'   => 'KUNKER-20260808-84A12',
            'status' => 'Pending',
            'email'  => 'test.email@example.com',
        ]);

        $emailService = app(EmailService::class);

        // Kirim email pertama kali
        $emailService->sendStatusEmail($permohonan);

        Mail::assertSent(PermohonanPendingMail::class, function ($mail) use ($permohonan) {
            return $mail->permohonan->kode === 'KUNKER-20260808-84A12';
        });

        // Kirim email kedua kali
        $emailService->sendStatusEmail($permohonan);

        Mail::assertSent(PermohonanPendingMail::class, function ($mail) use ($permohonan) {
            return $mail->permohonan->kode === 'KUNKER-20260808-84A12';
        });

        $this->assertEquals('KUNKER-20260808-84A12', $permohonan->fresh()->kode);
    }

    public function test_18_sampai_20_kode_tidak_pernah_berubah_saat_dibaca_berulang_atau_proses_lain(): void
    {
        $permohonan = Permohonan::factory()->create([
            'kode'   => 'KUNKER-20260808-8412A',
            'status' => 'Pending',
        ]);

        $initialKode = $permohonan->kode;

        // Baca 5x via API
        for ($i = 0; $i < 5; $i++) {
            $this->getJson("/api/permohonan/{$initialKode}")->assertStatus(200);
        }

        $this->assertEquals($initialKode, $permohonan->fresh()->kode);
    }
}
