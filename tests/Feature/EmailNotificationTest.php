<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Permohonan;
use App\Services\EmailService;
use App\Mail\PermohonanPendingMail;
use App\Mail\PermohonanDisetujuiMail;
use App\Mail\PermohonanDitolakMail;
use App\Mail\PermohonanRevisiMail;
use App\Mail\KunjunganSelesaiMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

class EmailNotificationTest extends TestCase
{
    use RefreshDatabase;

    private EmailService $emailService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->emailService = app(EmailService::class);
    }

    public function test_01_email_terkirim_saat_status_pending(): void
    {
        Mail::fake();

        $permohonan = Permohonan::factory()->create([
            'status' => 'Pending',
            'email'  => 'pemohon.pending@gmail.com',
        ]);

        $result = $this->emailService->sendStatusEmail($permohonan);

        $this->assertTrue($result);
        Mail::assertSent(PermohonanPendingMail::class, function ($mail) use ($permohonan) {
            return $mail->hasTo('pemohon.pending@gmail.com') &&
                   $mail->permohonan->kode === $permohonan->kode;
        });
    }

    public function test_02_email_terkirim_saat_status_disetujui(): void
    {
        Mail::fake();

        $permohonan = Permohonan::factory()->create([
            'status' => 'Disetujui',
            'email'  => 'pemohon.disetujui@gmail.com',
        ]);

        $result = $this->emailService->sendStatusEmail($permohonan);

        $this->assertTrue($result);
        Mail::assertSent(PermohonanDisetujuiMail::class, function ($mail) use ($permohonan) {
            return $mail->hasTo('pemohon.disetujui@gmail.com') &&
                   $mail->permohonan->kode === $permohonan->kode;
        });
    }

    public function test_03_email_terkirim_saat_status_ditolak_tanpa_revisi(): void
    {
        Mail::fake();

        $permohonan = Permohonan::factory()->create([
            'status'        => 'Ditolak',
            'bisa_direvisi' => 'Tidak',
            'email'         => 'pemohon.ditolak@gmail.com',
        ]);

        $result = $this->emailService->sendStatusEmail($permohonan);

        $this->assertTrue($result);
        Mail::assertSent(PermohonanDitolakMail::class, function ($mail) use ($permohonan) {
            return $mail->hasTo('pemohon.ditolak@gmail.com') &&
                   $mail->permohonan->kode === $permohonan->kode;
        });
    }

    public function test_04_email_terkirim_saat_status_ditolak_dengan_revisi(): void
    {
        Mail::fake();

        $permohonan = Permohonan::factory()->create([
            'status'        => 'Ditolak',
            'bisa_direvisi' => 'Ya',
            'email'         => 'pemohon.revisi@gmail.com',
        ]);

        $result = $this->emailService->sendStatusEmail($permohonan);

        $this->assertTrue($result);
        Mail::assertSent(PermohonanRevisiMail::class, function ($mail) use ($permohonan) {
            return $mail->hasTo('pemohon.revisi@gmail.com') &&
                   $mail->permohonan->kode === $permohonan->kode;
        });
    }

    public function test_05_email_terkirim_saat_status_revisi(): void
    {
        Mail::fake();

        $permohonan = Permohonan::factory()->create([
            'status' => 'Revisi',
            'email'  => 'pemohon.revisi2@gmail.com',
        ]);

        $result = $this->emailService->sendStatusEmail($permohonan);

        $this->assertTrue($result);
        Mail::assertSent(PermohonanRevisiMail::class, function ($mail) use ($permohonan) {
            return $mail->hasTo('pemohon.revisi2@gmail.com') &&
                   $mail->permohonan->kode === $permohonan->kode;
        });
    }

    public function test_06_email_terkirim_saat_status_selesai(): void
    {
        Mail::fake();

        $permohonan = Permohonan::factory()->create([
            'status' => 'Selesai',
            'email'  => 'pemohon.selesai@gmail.com',
        ]);

        $result = $this->emailService->sendStatusEmail($permohonan);

        $this->assertTrue($result);
        Mail::assertSent(KunjunganSelesaiMail::class, function ($mail) use ($permohonan) {
            return $mail->hasTo('pemohon.selesai@gmail.com') &&
                   $mail->permohonan->kode === $permohonan->kode;
        });
    }

    public function test_07_validasi_email_kosong_dan_invalid(): void
    {
        Mail::fake();

        $permohonanKosong = Permohonan::factory()->create([
            'status' => 'Pending',
            'email'  => '',
        ]);
        $resultKosong = $this->emailService->sendStatusEmail($permohonanKosong);
        $this->assertFalse($resultKosong);

        $permohonanInvalid = Permohonan::factory()->create([
            'status' => 'Pending',
            'email'  => 'invalid-email-format',
        ]);
        $resultInvalid = $this->emailService->sendStatusEmail($permohonanInvalid);
        $this->assertFalse($resultInvalid);

        Mail::assertNothingSent();
    }

    public function test_08_email_dikirim_ke_email_pemohon_bukan_smtp(): void
    {
        Mail::fake();

        $permohonan = Permohonan::factory()->create([
            'status' => 'Selesai',
            'email'  => 'andi@gmail.com',
        ]);

        $result = $this->emailService->sendStatusEmail($permohonan);

        $this->assertTrue($result);
        Mail::assertSent(KunjunganSelesaiMail::class, function ($mail) {
            return $mail->hasTo('andi@gmail.com') && !$mail->hasTo(config('mail.from.address'));
        });
    }
}
