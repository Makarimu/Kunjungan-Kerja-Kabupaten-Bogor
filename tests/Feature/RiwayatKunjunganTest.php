<?php

namespace Tests\Feature;

use App\Models\Permohonan;
use App\Models\Review;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RiwayatKunjunganTest extends TestCase
{
    use RefreshDatabase;

    public function test_01_hanya_menampilkan_kunjungan_selesai_dan_ada_review(): void
    {
        // 1. Permohonan Selesai + Review (harus tampil)
        $p1 = Permohonan::factory()->create([
            'instansi' => 'Dinas Pendidikan',
            'status' => 'Selesai',
        ]);
        Review::create([
            'permohonan_id' => $p1->id,
            'rating' => 5,
            'review' => 'Sangat memuaskan dan informatif.',
            'status' => 'approved',
        ]);

        // 2. Permohonan Selesai tapi TANPA Review (TIDAK boleh tampil)
        Permohonan::factory()->create([
            'instansi' => 'Dinas Kesehatan',
            'status' => 'Selesai',
        ]);

        // 3. Permohonan Pending + Review (TIDAK boleh tampil)
        $p3 = Permohonan::factory()->create([
            'instansi' => 'Dinas Perhubungan',
            'status' => 'Pending',
        ]);
        Review::create([
            'permohonan_id' => $p3->id,
            'rating' => 4,
            'review' => 'Bagus.',
            'status' => 'pending',
        ]);

        $response = $this->getJson('/api/riwayat-kunjungan');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.instansi', 'Dinas Pendidikan')
            ->assertJsonPath('statistik.total_selesai', 1)
            ->assertJsonPath('statistik.rata_rata_rating', 5);
    }

    public function test_02_memastikan_data_sensitif_disembunyikan(): void
    {
        $p = Permohonan::factory()->create([
            'instansi' => 'Kementerian Keuangan',
            'nama_pic' => 'Budi Raharjo',
            'no_telp' => '081234567890',
            'email' => 'budi@kemenkeu.go.id',
            'nomor_surat' => '123/KEMENKEU/2026',
            'kode' => 'SENSITIVE123',
            'status' => 'Selesai',
        ]);
        Review::create([
            'permohonan_id' => $p->id,
            'rating' => 4,
            'review' => 'Pelayanan ramah.',
            'status' => 'approved',
        ]);

        $response = $this->getJson('/api/riwayat-kunjungan');

        $response->assertStatus(200);

        $json = $response->json('data.0');

        // Pastikan field publik ada
        $this->assertArrayHasKey('id', $json);
        $this->assertArrayHasKey('instansi', $json);
        $this->assertArrayHasKey('tanggal_kunjungan', $json);
        $this->assertArrayHasKey('tujuan', $json);
        $this->assertArrayHasKey('jumlah_peserta', $json);
        $this->assertArrayHasKey('rating', $json);
        $this->assertArrayHasKey('review', $json);
        $this->assertArrayHasKey('created_at_review', $json);

        // Pastikan data sensitif TIDAK ADA
        $this->assertArrayNotHasKey('nama_pic', $json);
        $this->assertArrayNotHasKey('no_telp', $json);
        $this->assertArrayNotHasKey('email', $json);
        $this->assertArrayNotHasKey('nomor_surat', $json);
        $this->assertArrayNotHasKey('kode', $json);
        $this->assertArrayNotHasKey('surat_permohonan', $json);
        $this->assertArrayNotHasKey('daftar_pertanyaan', $json);
        $this->assertArrayNotHasKey('bukti_menginap', $json);
    }

    public function test_03_filter_search_dan_rating_dan_sorting(): void
    {
        $p1 = Permohonan::factory()->create([
            'instansi' => 'Bappeda Jakarta',
            'status' => 'Selesai',
        ]);
        Review::create(['permohonan_id' => $p1->id, 'rating' => 5, 'review' => 'Mantap', 'status' => 'approved']);

        $p2 = Permohonan::factory()->create([
            'instansi' => 'DPRD Jabar',
            'status' => 'Selesai',
        ]);
        Review::create(['permohonan_id' => $p2->id, 'rating' => 3, 'review' => 'Cukup', 'status' => 'approved']);

        // Search test
        $resSearch = $this->getJson('/api/riwayat-kunjungan?search=Jakarta');
        $resSearch->assertStatus(200)->assertJsonCount(1, 'data')->assertJsonPath('data.0.instansi', 'Bappeda Jakarta');

        // Rating filter test
        $resRating = $this->getJson('/api/riwayat-kunjungan?rating=3');
        $resRating->assertStatus(200)->assertJsonCount(1, 'data')->assertJsonPath('data.0.instansi', 'DPRD Jabar');

        // Sorting test (rating_tertinggi)
        $resSort = $this->getJson('/api/riwayat-kunjungan?sort=rating_tertinggi');
        $resSort->assertStatus(200)->assertJsonPath('data.0.rating', 5);
    }
}
