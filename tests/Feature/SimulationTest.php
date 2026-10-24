<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Admin;
use App\Models\Permohonan;
use App\Models\TanggalDiblokir;
use App\Models\KontakTelepon;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;

class SimulationTest extends TestCase
{
    use RefreshDatabase;

    protected Admin $admin;
    protected string $token;
    protected \App\Models\Dinas $dinas;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::disk('public')->makeDirectory('permohonan');
        Mail::fake();

        $this->dinas = \App\Models\Dinas::firstOrCreate(
            ['singkatan' => 'BAPPENDA'],
            [
                'nama' => 'Badan Pendapatan Daerah',
                'aktif' => true,
                'warna' => '#0028B3',
                'kuota_per_hari' => 2,
            ]
        );

        // Buat admin test
        $this->admin = Admin::factory()->create([
            'username' => 'admin_test',
            'password' => bcrypt('password123'),
            'nama'     => 'Admin Tester',
        ]);
    }

    // ─────────────────────────────────────────────
    //  1. Login & Logout & Session Invalid
    // ─────────────────────────────────────────────

    public function test_01_login_berhasil()
    {
        $res = $this->postJson('/api/auth/login', [
            'username' => 'admin_test',
            'password' => 'password123',
        ]);
        $res->assertStatus(200)->assertJsonStructure(['token', 'admin']);
        $this->token = $res->json('token');
    }

    public function test_02_login_gagal_password_salah()
    {
        $this->postJson('/api/auth/login', [
            'username' => 'admin_test',
            'password' => 'salah',
        ])->assertStatus(401);
    }

    public function test_03_login_gagal_username_tidak_ada()
    {
        $this->postJson('/api/auth/login', [
            'username' => 'tidak_ada',
            'password' => 'apapun',
        ])->assertStatus(401);
    }

    public function test_04_session_invalid_ditolak()
    {
        $this->getJson('/api/auth/me', [
            'Authorization' => 'Bearer token-palsu-tidak-valid-xyz',
        ])->assertStatus(401);
    }

    public function test_05_logout_berhasil()
    {
        $token = $this->postJson('/api/auth/login', [
            'username' => 'admin_test',
            'password' => 'password123',
        ])->json('token');

        $this->postJson('/api/auth/logout', [], [
            'Authorization' => "Bearer $token",
        ])->assertStatus(200);
    }

    // ─────────────────────────────────────────────
    //  2. Data Kosong
    // ─────────────────────────────────────────────

    public function test_06_data_kosong_dashboard_statistik()
    {
        $token = $this->postJson('/api/auth/login', ['username' => 'admin_test', 'password' => 'password123'])->json('token');

        $res = $this->getJson('/api/admin/dashboard/statistik', ['Authorization' => "Bearer $token"]);
        $res->assertStatus(200)->assertJsonPath('data.Total', 0);
    }

    public function test_07_data_kosong_tabel_permohonan()
    {
        $token = $this->postJson('/api/auth/login', ['username' => 'admin_test', 'password' => 'password123'])->json('token');

        $res = $this->getJson('/api/admin/permohonan', ['Authorization' => "Bearer $token"]);
        $res->assertStatus(200);
        $this->assertCount(0, $res->json('data'));
    }

    // ─────────────────────────────────────────────
    //  3. Validasi Form (Data Tidak Valid)
    // ─────────────────────────────────────────────

    public function test_08_submit_permohonan_tanpa_data_gagal()
    {
        $this->postJson('/api/permohonan', [])->assertStatus(422);
    }

    public function test_09_submit_permohonan_tanggal_lampau_gagal()
    {
        $fileSurat = 'data:application/pdf;base64,' . base64_encode('dummy');
        $this->postJson('/api/permohonan', [
            'instansi'            => 'DPRD Bogor',
            'jumlah_peserta'      => 5,
            'tanggal_kunjungan'   => Carbon::now()->subDay()->format('Y-m-d'),
            'nama_pic'            => 'Budi',
            'kontak_pic'          => '08123456789',
            'surat_permohonan'    => $fileSurat,
            'surat_permohonan_nama' => 'surat.pdf',
        ])->assertStatus(422);
    }

    // ─────────────────────────────────────────────
    //  4. Permohonan Baru & Upload Dokumen
    // ─────────────────────────────────────────────

    public function test_10_submit_permohonan_baru_berhasil(): string
    {
        $tanggal = Carbon::now()->addDays(10);
        while ($tanggal->isWeekend()) {
            $tanggal->addDay();
        }

        $fileSurat = 'data:application/pdf;base64,' . base64_encode('dummy pdf content');
        $res = $this->postJson('/api/permohonan', [
            'dinas_id'              => $this->dinas->id,
            'tanggal_kunjungan'     => $tanggal->format('Y-m-d'),
            'nomor_surat'           => '123/ABC/2026',
            'instansi'              => 'DPRD Kab. Bogor',
            'nama_ketua_rombongan'  => 'Bapak Ketua',
            'jabatan_ketua_rombongan'=> 'Ketua DPRD',
            'nama_pic'              => 'Siti Aminah',
            'jabatan_pic'           => 'Sekretaris',
            'no_telp'               => '08111222333',
            'email'                 => 'siti@example.com',
            'tujuan'                => 'Kunjungan Kerja',
            'jumlah_peserta'        => 10,
            'rencana_menginap'      => 'Tidak',
            'surat_permohonan'      => $fileSurat,
            'surat_permohonan_nama' => 'surat-permohonan.pdf',
            'daftar_pertanyaan'     => $fileSurat,
            'daftar_pertanyaan_nama'=> 'daftar-pertanyaan.pdf',
        ]);
        $res->assertStatus(201)->assertJsonPath('data.status', 'Pending');
        $kode = $res->json('data.kode');
        $this->assertNotNull($kode);
        return $kode;
    }

    // ─────────────────────────────────────────────
    //  5. Cari & Filter Data
    // ─────────────────────────────────────────────

    public function test_11_search_permohonan_admin()
    {
        // Seed data
        Permohonan::factory()->create(['instansi' => 'Kementerian Keuangan', 'status' => 'Pending']);
        Permohonan::factory()->create(['instansi' => 'Dinas Pendidikan', 'status' => 'Disetujui']);

        $token = $this->postJson('/api/auth/login', ['username' => 'admin_test', 'password' => 'password123'])->json('token');

        $res = $this->getJson('/api/admin/permohonan?search=Kementerian', ['Authorization' => "Bearer $token"]);
        $res->assertStatus(200);
        $this->assertEquals(1, count($res->json('data')));
        $this->assertEquals('Kementerian Keuangan', $res->json('data.0.instansi'));
    }

    public function test_12_filter_permohonan_by_status()
    {
        Permohonan::factory()->create(['status' => 'Pending']);
        Permohonan::factory()->create(['status' => 'Disetujui']);
        Permohonan::factory()->create(['status' => 'Ditolak']);

        $token = $this->postJson('/api/auth/login', ['username' => 'admin_test', 'password' => 'password123'])->json('token');

        $res = $this->getJson('/api/admin/permohonan?status=Disetujui', ['Authorization' => "Bearer $token"]);
        $res->assertStatus(200);
        collect($res->json('data'))->each(fn ($p) => $this->assertEquals('Disetujui', $p['status']));
    }

    // ─────────────────────────────────────────────
    //  6. Persetujuan & Penolakan (Edit Data)
    // ─────────────────────────────────────────────

    public function test_13_admin_setujui_permohonan()
    {
        $p = Permohonan::factory()->create(['status' => 'Pending']);
        $token = $this->postJson('/api/auth/login', ['username' => 'admin_test', 'password' => 'password123'])->json('token');

        $res = $this->postJson("/api/admin/permohonan/{$p->kode}/proses", [
            'aksi'          => 'acc',
            'narasumber'    => 'Kepala Bidang A',
            'jam_penerimaan' => '09:00',
        ], ['Authorization' => "Bearer $token"]);
        $res->assertStatus(200);
        $this->assertEquals('Disetujui', Permohonan::find($p->id)->status);
    }

    public function test_14_admin_tolak_permohonan()
    {
        $p = Permohonan::factory()->create(['status' => 'Pending']);
        $token = $this->postJson('/api/auth/login', ['username' => 'admin_test', 'password' => 'password123'])->json('token');

        $res = $this->postJson("/api/admin/permohonan/{$p->kode}/proses", [
            'aksi'        => 'tolak',
            'keterangan'  => 'Surat tidak lengkap',
            'bisa_revisi' => 'Ya',
        ], ['Authorization' => "Bearer $token"]);
        $res->assertStatus(200);
        $this->assertEquals('Ditolak', Permohonan::find($p->id)->status);
    }

    // ─────────────────────────────────────────────
    //  7. Upload File (Bukti Penginapan)
    // ─────────────────────────────────────────────

    public function test_15_upload_bukti_penginapan()
    {
        $p = Permohonan::factory()->create(['status' => 'Disetujui', 'rencana_menginap' => 'Ya']);
        $fileBukti = 'data:image/jpeg;base64,' . base64_encode('dummy img');

        $res = $this->postJson("/api/permohonan/{$p->kode}/bukti-penginapan", [
            'bukti_menginap'      => $fileBukti,
            'bukti_menginap_nama' => 'bukti.jpg',
        ]);
        $res->assertStatus(200);
        $this->assertNotNull(Permohonan::find($p->id)->bukti_menginap);
    }

    // ─────────────────────────────────────────────
    //  8. Revisi Permohonan (Edit Data User)
    // ─────────────────────────────────────────────

    public function test_16_revisi_permohonan_berhasil()
    {
        $p = Permohonan::factory()->create([
            'dinas_id'      => $this->dinas->id,
            'status'        => 'Ditolak',
            'bisa_direvisi' => 'Ya',
        ]);
        $tanggal = Carbon::now()->addDays(15);
        while ($tanggal->isWeekend()) {
            $tanggal->addDay();
        }

        $fileSurat = 'data:application/pdf;base64,' . base64_encode('surat baru');

        $res = $this->postJson("/api/permohonan/{$p->kode}/revisi", [
            'dinas_id'              => $this->dinas->id,
            'tanggal_kunjungan'     => $tanggal->format('Y-m-d'),
            'nomor_surat'           => '124/ABC/2026',
            'instansi'              => 'DPRD Kab. Bogor',
            'nama_ketua_rombongan'  => 'Bapak Ketua',
            'jabatan_ketua_rombongan'=> 'Ketua DPRD',
            'nama_pic'              => 'Siti Aminah',
            'jabatan_pic'           => 'Sekretaris',
            'no_telp'               => '08111222333',
            'email'                 => 'siti@example.com',
            'tujuan'                => 'Kunjungan Kerja',
            'jumlah_peserta'        => 15,
            'rencana_menginap'      => 'Tidak',
            'surat_permohonan'      => $fileSurat,
            'surat_permohonan_nama' => 'surat-revisi.pdf',
        ]);
        $res->assertStatus(200);
        $this->assertEquals('Revisi', Permohonan::find($p->id)->status);
    }

    public function test_17_revisi_gagal_jika_tidak_boleh_revisi()
    {
        $p = Permohonan::factory()->create([
            'dinas_id'      => $this->dinas->id,
            'status'        => 'Ditolak',
            'bisa_direvisi' => 'Tidak',
        ]);
        $tanggal = Carbon::now()->addDays(15);
        while ($tanggal->isWeekend()) {
            $tanggal->addDay();
        }

        $fileSurat = 'data:application/pdf;base64,' . base64_encode('surat baru');

        $this->postJson("/api/permohonan/{$p->kode}/revisi", [
            'dinas_id'              => $this->dinas->id,
            'tanggal_kunjungan'     => $tanggal->format('Y-m-d'),
            'nomor_surat'           => '124/ABC/2026',
            'instansi'              => 'DPRD Kab. Bogor',
            'nama_ketua_rombongan'  => 'Bapak Ketua',
            'jabatan_ketua_rombongan'=> 'Ketua DPRD',
            'nama_pic'              => 'Siti Aminah',
            'jabatan_pic'           => 'Sekretaris',
            'no_telp'               => '08111222333',
            'email'                 => 'siti@example.com',
            'tujuan'                => 'Kunjungan Kerja',
            'jumlah_peserta'        => 15,
            'rencana_menginap'      => 'Tidak',
            'surat_permohonan'      => $fileSurat,
            'surat_permohonan_nama' => 'surat-revisi.pdf',
        ])->assertStatus(400);
    }

    // ─────────────────────────────────────────────
    //  9. Status Permohonan (Cek Kode)
    // ─────────────────────────────────────────────

    public function test_18_cek_status_permohonan_valid()
    {
        $p = Permohonan::factory()->create(['status' => 'Pending']);
        $res = $this->getJson("/api/permohonan/{$p->kode}");
        $res->assertStatus(200)->assertJsonPath('data.status', 'Pending');
    }

    public function test_19_cek_status_kode_tidak_ada()
    {
        $this->getJson('/api/permohonan/KUNKER-TIDAK-ADA')->assertStatus(404);
    }

    // ─────────────────────────────────────────────
    //  10. Data Penuh (Tanggal Diblokir)
    // ─────────────────────────────────────────────

    public function test_20_submit_ke_tanggal_diblokir_gagal()
    {
        TanggalDiblokir::create([
            'tanggal'      => '2030-06-15',
            'keterangan'   => 'Libur Nasional',
            'diblokir_oleh'=> 'Admin Test',
            'tgl_diblokir' => now(),
        ]);
        $fileSurat = 'data:application/pdf;base64,' . base64_encode('dummy');

        $this->postJson('/api/permohonan', [
            'instansi'              => 'DPRD',
            'jumlah_peserta'        => 5,
            'tanggal_kunjungan'     => '2030-06-15',
            'nama_pic'              => 'Budi',
            'kontak_pic'            => '08111',
            'surat_permohonan'      => $fileSurat,
            'surat_permohonan_nama' => 'surat.pdf',
        ])->assertStatus(422);
    }

    // ─────────────────────────────────────────────
    //  11. Hapus Data (Admin)
    // ─────────────────────────────────────────────

    public function test_21_hapus_permohonan()
    {
        $p = Permohonan::factory()->create();
        $token = $this->postJson('/api/auth/login', ['username' => 'admin_test', 'password' => 'password123'])->json('token');

        $this->deleteJson("/api/admin/permohonan/{$p->kode}", [], [
            'Authorization' => "Bearer $token",
        ])->assertStatus(200);

        $this->assertNull(Permohonan::find($p->id));
    }

    public function test_22_hapus_tanggal_diblokir()
    {
        TanggalDiblokir::create([
            'tanggal'      => '2030-01-01',
            'keterangan'   => 'Test',
            'diblokir_oleh'=> 'admin',
            'tgl_diblokir' => now(),
        ]);
        $token = $this->postJson('/api/auth/login', ['username' => 'admin_test', 'password' => 'password123'])->json('token');

        $this->deleteJson('/api/admin/tanggal-diblokir/2030-01-01', [], [
            'Authorization' => "Bearer $token",
        ])->assertStatus(200);

        $this->assertNull(TanggalDiblokir::where('tanggal', '2030-01-01')->first());
    }

    // ─────────────────────────────────────────────
    //  12. Kalender — Kelola Blokir
    // ─────────────────────────────────────────────

    public function test_23_admin_blokir_tanggal()
    {
        $token = $this->postJson('/api/auth/login', ['username' => 'admin_test', 'password' => 'password123'])->json('token');

        $res = $this->postJson('/api/admin/tanggal-diblokir', [
            'tanggal'    => '2030-08-17',
            'keterangan' => 'HUT RI',
        ], ['Authorization' => "Bearer $token"]);

        $res->assertStatus(201);
        $this->assertNotNull(TanggalDiblokir::whereDate('tanggal', '2030-08-17')->first());
    }

    // ─────────────────────────────────────────────
    //  13. Kontak Telepon (CRUD)
    // ─────────────────────────────────────────────

    public function test_24_crud_kontak_telepon()
    {
        $token = $this->postJson('/api/auth/login', ['username' => 'admin_test', 'password' => 'password123'])->json('token');
        $headers = ['Authorization' => "Bearer $token"];

        // CREATE
        $res = $this->postJson('/api/admin/kontak-telepon', [
            'nama_pic'       => 'Bapak Budi',
            'nomor_telepon'  => '08123456789',
            'keterangan'     => 'Kepala Bidang A',
        ], $headers);
        $res->assertStatus(201);
        $id = $res->json('data.id');

        // LIST
        $list = $this->getJson('/api/admin/kontak-telepon', $headers);
        $list->assertStatus(200);
        $this->assertEquals(1, count($list->json('data')));

        // UPDATE
        $this->putJson("/api/admin/kontak-telepon/{$id}", [
            'nama_pic'      => 'Bapak Budi Updated',
            'nomor_telepon' => '08199999999',
        ], $headers)->assertStatus(200);

        $this->assertEquals('Bapak Budi Updated', KontakTelepon::find($id)->nama_pic);

        // DELETE
        $this->deleteJson("/api/admin/kontak-telepon/{$id}", [], $headers)->assertStatus(200);
        $this->assertNull(KontakTelepon::find($id));
    }

    // ─────────────────────────────────────────────
    //  14. Dashboard Grafik & Statistik
    // ─────────────────────────────────────────────

    public function test_25_dashboard_statistik_setelah_ada_data()
    {
        Permohonan::factory()->create(['status' => 'Pending']);
        Permohonan::factory()->create(['status' => 'Disetujui']);
        Permohonan::factory()->create(['status' => 'Ditolak']);

        $token = $this->postJson('/api/auth/login', ['username' => 'admin_test', 'password' => 'password123'])->json('token');

        $res = $this->getJson('/api/admin/dashboard/statistik', ['Authorization' => "Bearer $token"]);
        $res->assertStatus(200);

        $data = $res->json('data');
        $this->assertEquals(3, $data['Total']);
        $this->assertEquals(1, $data['Pending']);
        $this->assertEquals(1, $data['Disetujui']);
        $this->assertEquals(1, $data['Ditolak']);
    }

    public function test_26_dashboard_grafik_bulanan()
    {
        Permohonan::factory()->create(['tanggal_kunjungan' => Carbon::now()->format('Y-m-d')]);
        $token = $this->postJson('/api/auth/login', ['username' => 'admin_test', 'password' => 'password123'])->json('token');

        $res = $this->getJson('/api/admin/dashboard/grafik-bulanan', ['Authorization' => "Bearer $token"]);
        $res->assertStatus(200);
        // Grafik mengembalikan array 12 bulan
        $grafik = $res->json('data');
        $this->assertIsArray($grafik);
        $this->assertCount(12, $grafik);
    }
}
