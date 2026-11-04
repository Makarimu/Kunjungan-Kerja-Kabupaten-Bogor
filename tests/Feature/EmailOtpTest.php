<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Cache;
use App\Mail\EmailOtpMail;
use App\Models\Blacklist;

class EmailOtpTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_send_otp_to_valid_email()
    {
        Mail::fake();

        $response = $this->postJson('/api/permohonan/send-otp', [
            'email' => 'tamu@bappedalitbang.go.id',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        Mail::assertSent(EmailOtpMail::class, function ($mail) {
            return $mail->email === 'tamu@bappedalitbang.go.id'
                && strlen($mail->otp) === 6;
        });

        $this->assertTrue(Cache::has('email_otp_tamu@bappedalitbang.go.id'));
    }

    public function test_send_otp_fails_for_invalid_email()
    {
        $response = $this->postJson('/api/permohonan/send-otp', [
            'email' => 'bukan-email-valid',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_send_otp_blocked_if_blacklisted()
    {
        Blacklist::create([
            'tipe' => 'email',
            'nilai' => 'spam@baduser.com',
            'alasan' => 'Pelanggaran spam',
            'status' => 'aktif',
        ]);

        $response = $this->postJson('/api/permohonan/send-otp', [
            'email' => 'spam@baduser.com',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_verify_otp_fails_with_wrong_code()
    {
        Cache::put('email_otp_test@bogorkab.go.id', '654321', now()->addMinutes(10));

        $response = $this->postJson('/api/permohonan/verify-otp', [
            'email' => 'test@bogorkab.go.id',
            'otp' => '999999',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_verify_otp_succeeds_with_correct_code()
    {
        Cache::put('email_otp_test@bogorkab.go.id', '789123', now()->addMinutes(10));

        $response = $this->postJson('/api/permohonan/verify-otp', [
            'email' => 'test@bogorkab.go.id',
            'otp' => '789123',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertNotNull($response->json('verification_token'));
        $this->assertTrue(Cache::has('email_otp_verified_test@bogorkab.go.id'));
        $this->assertFalse(Cache::has('email_otp_test@bogorkab.go.id')); // OTP harus sudah dihapus setelah dipakai
    }
}

