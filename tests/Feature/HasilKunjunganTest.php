<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Permohonan;
use App\Mail\RingkasanTersediaMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HasilKunjunganTest extends TestCase
{
    use RefreshDatabase;

    protected Admin $admin;
    protected string $token;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::disk('public')->makeDirectory('hasil-kunjungan');
        Mail::fake();

        $this->admin = Admin::factory()->create([
            'username' => 'admin_pdf_test',
            'password' => bcrypt('password123'),
        ]);

        $this->token = $this->postJson('/api/auth/login', [
            'username' => 'admin_pdf_test',
            'password' => 'password123',
        ])->json('token');
    }

    public function test_01_upload_pdf_validasi_mime_dan_ukuran(): void
    {
        $permohonan = Permohonan::factory()->create(['status' => 'Selesai']);

        // Test Non-PDF file
        $txtFile = UploadedFile::fake()->create('dokumen.txt', 100, 'text/plain');
        $resNonPdf = $this->postJson("/api/admin/permohonan/{$permohonan->id}/upload-pdf", [
            'pdf' => $txtFile,
        ], ['Authorization' => "Bearer {$this->token}"]);

        $resNonPdf->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'File harus berupa PDF dengan ukuran maksimal 10 MB.');

        // Test File oversize (>10 MB)
        $largePdf = UploadedFile::fake()->create('large.pdf', 12000, 'application/pdf');
        $resLarge = $this->postJson("/api/admin/permohonan/{$permohonan->id}/upload-pdf", [
            'pdf' => $largePdf,
        ], ['Authorization' => "Bearer {$this->token}"]);

        $resLarge->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'File harus berupa PDF dengan ukuran maksimal 10 MB.');
    }

    public function test_02_upload_pdf_sukses_simpan_storage_dan_queue_email_kedua(): void
    {
        $permohonan = Permohonan::factory()->create([
            'status' => 'Selesai',
            'email'  => 'pemohon.pdf@example.com',
        ]);

        $validPdf = UploadedFile::fake()->create('ringkasan.pdf', 500, 'application/pdf');

        $res = $this->postJson("/api/admin/permohonan/{$permohonan->id}/upload-pdf", [
            'pdf' => $validPdf,
        ], ['Authorization' => "Bearer {$this->token}"]);

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.has_pdf', true);

        $permohonan->refresh();
        $this->assertNotNull($permohonan->hasil_kunjungan_pdf);
        Storage::disk('public')->assertExists($permohonan->hasil_kunjungan_pdf);

        // Pastikan Email Kedua Terkirim
        Mail::assertSent(RingkasanTersediaMail::class, function ($mail) use ($permohonan) {
            return $mail->hasTo($permohonan->email);
        });
    }

    public function test_03_pdf_status_dan_download_publik(): void
    {
        $permohonan = Permohonan::factory()->create(['status' => 'Selesai']);

        // Check PDF status sebelum upload
        $resBefore = $this->getJson("/api/permohonan/{$permohonan->kode}/pdf-status");
        $resBefore->assertStatus(200)->assertJsonPath('data.has_pdf', false);

        // Upload PDF
        $validPdf = UploadedFile::fake()->create('ringkasan_hasil.pdf', 300, 'application/pdf');
        $this->postJson("/api/admin/permohonan/{$permohonan->id}/upload-pdf", [
            'pdf' => $validPdf,
        ], ['Authorization' => "Bearer {$this->token}"]);

        // Check PDF status setelah upload
        $resAfter = $this->getJson("/api/permohonan/{$permohonan->kode}/pdf-status");
        $resAfter->assertStatus(200)
            ->assertJsonPath('data.has_pdf', true)
            ->assertJsonPath('data.kode', $permohonan->kode);

        // Download PDF
        $resDownload = $this->get("/api/permohonan/{$permohonan->kode}/download-pdf");
        $resDownload->assertStatus(200)
            ->assertHeader('content-type', 'application/pdf');
    }
}
