<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Permohonan;
use App\Models\Review;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use RefreshDatabase;

    private Admin $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = Admin::create([
            'nama'     => 'Admin Test',
            'username' => 'admin_test',
            'password' => bcrypt('password123'),
        ]);
    }

    private function createPermohonan(string $status = 'Disetujui'): Permohonan
    {
        return Permohonan::create([
            'kode'                 => 'KUNKER-' . strtoupper(uniqid()),
            'nomor_surat'          => 'SURAT/001/2026',
            'instansi'             => 'Dinas Kominfo Test',
            'nama_ketua_rombongan' => 'Budi Santoso',
            'jabatan_ketua_rombongan' => 'Kepala Dinas',
            'nama_pic'             => 'Ahmad PIC',
            'jabatan_pic'          => 'Staf IT',
            'no_telp'              => '081234567890',
            'email'                => 'pic@example.com',
            'tanggal_kunjungan'    => '2026-08-10',
            'tujuan'               => 'Studi Banding Pengelolaan SPBE dan Pelayanan Publik',
            'jumlah_peserta'       => 5,
            'rencana_menginap'     => 'Tidak',
            'status'               => $status,
            'tgl_pengajuan_awal'   => now(),
        ]);
    }

    public function test_admin_dapat_menyelesaikan_kunjungan()
    {
        $permohonan = $this->createPermohonan('Disetujui');

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/permohonan/{$permohonan->kode}/selesai");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'Selesai',
                ],
            ]);

        $this->assertDatabaseHas('app_permohonan', [
            'id'     => $permohonan->id,
            'status' => 'Selesai',
        ]);
    }

    public function test_tidak_dapat_memberikan_review_jika_status_belum_selesai()
    {
        $permohonan = $this->createPermohonan('Disetujui');

        $response = $this->postJson("/api/permohonan/{$permohonan->kode}/review", [
            'rating' => 5,
            'review' => 'Pelayanan sangat memuaskan dan ramah.',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Review hanya dapat diberikan setelah kunjungan selesai.',
            ]);
    }

    public function test_pemohon_dapat_memberikan_review_jika_status_selesai()
    {
        $permohonan = $this->createPermohonan('Selesai');

        $response = $this->postJson("/api/permohonan/{$permohonan->kode}/review", [
            'rating' => 5,
            'review' => 'Pelayanan luar biasa, narasumber sangat menguasai materi.',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Terima kasih atas penilaian Anda.',
            ]);

        $this->assertDatabaseHas('app_reviews', [
            'permohonan_id' => $permohonan->id,
            'rating'        => 5,
            'status'        => 'pending',
        ]);
    }

    public function test_tidak_dapat_memberikan_review_dua_kali()
    {
        $permohonan = $this->createPermohonan('Selesai');

        Review::create([
            'permohonan_id' => $permohonan->id,
            'rating'        => 4,
            'review'        => 'Kunjungan kerja berlangsung lancar.',
            'status'        => 'pending',
        ]);

        $response = $this->postJson("/api/permohonan/{$permohonan->kode}/review", [
            'rating' => 5,
            'review' => 'Mencoba kirim ulasan kedua kali.',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Anda sudah pernah memberikan penilaian untuk permohonan ini.',
            ]);
    }

    public function test_validasi_backend_rating_dan_review()
    {
        $permohonan = $this->createPermohonan('Selesai');

        // Review kurang dari 10 karakter
        $response = $this->postJson("/api/permohonan/{$permohonan->kode}/review", [
            'rating' => 5,
            'review' => 'Pendek',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['review']);

        // Rating diluar range 1-5
        $response = $this->postJson("/api/permohonan/{$permohonan->kode}/review", [
            'rating' => 6,
            'review' => 'Pelayanan tempat kunjungan sangat bagus.',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['rating']);
    }

    public function test_review_pending_dan_rejected_tidak_tampil_di_landing_page()
    {
        $p1 = $this->createPermohonan('Selesai');
        Review::create([
            'permohonan_id' => $p1->id,
            'rating'        => 4,
            'review'        => 'Review pending ini tidak boleh muncul.',
            'status'        => 'pending',
        ]);

        $p2 = Permohonan::create(array_merge($p1->toArray(), ['kode' => 'KUNKER-20260727-9999']));
        Review::create([
            'permohonan_id' => $p2->id,
            'rating'        => 2,
            'review'        => 'Review rejected ini tidak boleh muncul.',
            'status'        => 'rejected',
        ]);

        $response = $this->getJson('/api/reviews/approved');

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    public function test_review_approved_tampil_di_landing_page()
    {
        $p = $this->createPermohonan('Selesai');
        Review::create([
            'permohonan_id' => $p->id,
            'rating'        => 5,
            'review'        => 'Review approved ini harus muncul di landing page.',
            'status'        => 'approved',
        ]);

        $response = $this->getJson('/api/reviews/approved');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.review', 'Review approved ini harus muncul di landing page.');
    }

    public function test_landing_page_maksimal_menampilkan_6_review_terbaru()
    {
        for ($i = 1; $i <= 8; $i++) {
            $p = $this->createPermohonan('Selesai');

            Review::create([
                'permohonan_id' => $p->id,
                'rating'        => 5,
                'review'        => "Review ke-{$i} dengan teks lebih dari sepuluh karakter.",
                'status'        => 'approved',
            ]);
        }

        $response = $this->getJson('/api/reviews/approved?limit=6');

        $response->assertStatus(200)
            ->assertJsonCount(6, 'data');
    }

    public function test_admin_dapat_approve_dan_reject_review()
    {
        $p = $this->createPermohonan('Selesai');
        $review = Review::create([
            'permohonan_id' => $p->id,
            'rating'        => 5,
            'review'        => 'Kunjungan kerja memuaskan dan bermanfaat.',
            'status'        => 'pending',
        ]);

        // Approve
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/reviews/{$review->id}/proses", ['aksi' => 'approve']);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Review berhasil disetujui.',
            ]);

        $this->assertDatabaseHas('app_reviews', [
            'id'     => $review->id,
            'status' => 'approved',
        ]);

        // Reject
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/reviews/{$review->id}/proses", ['aksi' => 'reject']);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Review berhasil ditolak.',
            ]);

        $this->assertDatabaseHas('app_reviews', [
            'id'     => $review->id,
            'status' => 'rejected',
        ]);
    }
}
