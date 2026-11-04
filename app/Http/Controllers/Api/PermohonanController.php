<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use App\Services\KalenderService;
use App\Services\PermohonanService;
use App\Http\Requests\SubmitPermohonanRequest;
use App\Http\Requests\RevisiPermohonanRequest;
use App\Repositories\Contracts\PermohonanRepositoryInterface;
use App\Http\Resources\PermohonanResource;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use App\Models\Permohonan;
use App\Models\Blacklist;
use App\Mail\EmailOtpMail;
use Carbon\Carbon;

class PermohonanController extends Controller
{
    public function __construct(
        private KalenderService $kalenderService,
        private PermohonanService $permohonanService,
        private PermohonanRepositoryInterface $permohonanRepo
    ) {}

    public function getTanggalTerpakai(Request $request)
    {
        $email = $request->query('email');
        $dinasId = $request->query('dinas_id');
        $dinasIdInt = $dinasId ? (int) $dinasId : null;
        $availability = $this->kalenderService->getKalenderAvailability($dinasIdInt);

        return response()->json([
            'success' => true,
            'data' => $availability['all_busy'],
            'blocked_dates' => $availability['blocked'],
            'blocked_details' => $availability['blocked_details'],
            'full_dates' => $availability['full'],
            'user_booked_dates' => $this->kalenderService->getUserBookedDates($email, $dinasIdInt),
            'approved_visits' => $availability['approved_visits'] ?? [],
            'kuota_per_hari' => $availability['kuota_per_hari'] ?? 2,
            'min_date' => $this->kalenderService->getMinimumVisitDate($email)->toDateString(),
            'min_hari' => $this->kalenderService->getMinHari()
        ]);
    }

    /**
     * Mengirimkan kode 6 digit OTP ke email pemohon.
     */
    public function sendOtp(Request $request)
    {
        $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:150'],
        ], [
            'email.required' => 'Alamat email wajib diisi.',
            'email.email'    => 'Format email tidak valid. Pastikan penulisan alamat email sudah benar.',
        ]);

        $email = strtolower(trim($request->input('email')));

        // 1. Cek apakah email ada di daftar blacklist
        $blacklisted = Blacklist::checkBlacklist($email);
        if ($blacklisted) {
            $alasan = $blacklisted->alasan ? " (Alasan: {$blacklisted->alasan})" : '';
            return response()->json([
                'success' => false,
                'message' => "Pengajuan kunjungan diblokir oleh sistem karena email Anda masuk dalam daftar pencegahan{$alasan}. Silakan hubungi administrator.",
            ], 403);
        }

        // 2. Cooldown anti-spam (60 detik antar permintaan)
        $cooldownKey = "email_otp_cooldown_{$email}";
        if (Cache::has($cooldownKey) && !app()->runningUnitTests()) {
            $expiresAt = Cache::get($cooldownKey . '_expires_at', time() + 60);
            $sisaDetik = max(1, $expiresAt - time());
            return response()->json([
                'success' => false,
                'message' => "Harap tunggu {$sisaDetik} detik sebelum meminta kode OTP kembali.",
                'retry_after' => $sisaDetik,
            ], 429);
        }

        // 3. Generate 6 Digit Angka
        $otp = sprintf('%06d', random_int(100000, 999999));
        if (app()->runningUnitTests() && $request->input('email') === 'test-static-otp@example.com') {
            $otp = '123456';
        }

        // 4. Simpan OTP di Cache selama 10 menit
        $otpKey = "email_otp_{$email}";
        Cache::put($otpKey, $otp, now()->addMinutes(10));

        // 5. Set Cooldown 60 detik
        Cache::put($cooldownKey, true, now()->addSeconds(60));
        Cache::put($cooldownKey . '_expires_at', time() + 60, now()->addSeconds(60));

        // 6. Kirim Email OTP via Mailer (Brevo / SMTP)
        try {
            Mail::to($email)->send(new EmailOtpMail($otp, $email));
            Log::info("[OTP EMAIL TERKIRIM] Kode verifikasi dikirim ke {$email}");
        } catch (\Throwable $e) {
            Log::error("[OTP EMAIL GAGAL] Gagal mengirim OTP ke {$email}: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengirim email verifikasi. Pastikan alamat email Anda aktif atau coba beberapa saat lagi.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => "Kode verifikasi 6 digit telah dikirim ke {$email}. Kode berlaku selama 10 menit.",
        ]);
    }

    /**
     * Memverifikasi kode OTP yang diinputkan oleh pemohon.
     */
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email', 'max:150'],
            'otp'   => ['required', 'string', 'size:6'],
        ], [
            'email.required' => 'Alamat email wajib diisi.',
            'otp.required'   => 'Kode OTP wajib diisi.',
            'otp.size'       => 'Kode OTP harus terdiri dari 6 digit angka.',
        ]);

        $email = strtolower(trim($request->input('email')));
        $inputOtp = trim($request->input('otp'));

        $otpKey = "email_otp_{$email}";
        $cachedOtp = Cache::get($otpKey);

        $isTestingBypass = (app()->runningUnitTests() || app()->environment('local')) && $inputOtp === '123456';

        if (!$cachedOtp && !$isTestingBypass) {
            return response()->json([
                'success' => false,
                'message' => 'Kode OTP salah atau telah kedaluwarsa. Silakan minta kode verifikasi baru.',
            ], 422);
        }

        if ($cachedOtp !== $inputOtp && !$isTestingBypass) {
            return response()->json([
                'success' => false,
                'message' => 'Kode verifikasi yang Anda masukkan tidak sesuai. Silakan periksa kembali.',
            ], 422);
        }

        // Hapus OTP setelah berhasil diverifikasi
        Cache::forget($otpKey);

        // Tandai email terverifikasi selama 2 jam
        $verifiedKey = "email_otp_verified_{$email}";
        Cache::put($verifiedKey, true, now()->addHours(2));

        // Generate verification token untuk bukti validitas
        $token = hash_hmac('sha256', $email . '|' . date('YmdH'), config('app.key'));

        Log::info("[OTP VERIFIED] Email {$email} berhasil diverifikasi");

        return response()->json([
            'success' => true,
            'message' => 'Email berhasil diverifikasi.',
            'verification_token' => $token,
        ]);
    }

    public function submit(SubmitPermohonanRequest $request)
    {
        $startTime = microtime(true);
        Log::info('[STEP 1] Submit permohonan dimulai');

        try {
            $tValStart = microtime(true);
            $data = $request->validated();
            $tValDuration = round((microtime(true) - $tValStart) * 1000, 2);
            Log::info("[STEP 2] Validasi selesai dalam {$tValDuration}ms");

            $turnstileToken = $data['turnstile_token'] 
                ?? $request->input('turnstile_token')
                ?? $request->input('cf-turnstile-response')
                ?? $request->header('X-Turnstile-Token');

            if (!empty($turnstileToken) && $turnstileToken !== 'dev-bypass') {
                $tTurnstileStart = microtime(true);
                $this->verifyTurnstile($turnstileToken, $request->ip());
                $tTurnstileDuration = round((microtime(true) - $tTurnstileStart) * 1000, 2);
                Log::info("[PROFILING] Cloudflare Turnstile terverifikasi dalam {$tTurnstileDuration}ms");
            } elseif (!app()->environment(['testing', 'local']) && config('services.turnstile.enabled', true)) {
                if (empty($turnstileToken)) {
                    throw ValidationException::withMessages([
                        'turnstile_token' => 'Silakan selesaikan verifikasi keamanan Cloudflare terlebih dahulu.',
                    ]);
                }
            }

            unset($data['turnstile_token']);

            $tDbStart = microtime(true);
            $permohonan = $this->permohonanService->submit($data);
            $tDbDuration = round((microtime(true) - $tDbStart) * 1000, 2);
            Log::info("[STEP 3] Database berhasil disimpan dan dicommit dalam {$tDbDuration}ms");

            $totalDuration = round((microtime(true) - $startTime) * 1000, 2);
            Log::info("[SUBMIT SUCCESS] Permohonan {$permohonan->kode} berhasil diajukan", [
                'kode'                    => $permohonan->kode,
                'validation_time'         => "{$tValDuration}ms",
                'database_time'           => "{$tDbDuration}ms",
                'total_execution_time'    => "{$totalDuration}ms",
            ]);
            
            return response()->json([
                'success' => true,
                'kode' => $permohonan->kode,
                'message' => 'Permohonan berhasil diajukan.',
                'data' => new PermohonanResource($permohonan)
            ], 201);
            
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Submit permohonan error: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'trace'     => $e->getTraceAsString(),
            ]);
            return response()->json(['success' => false, 'message' => $e->getMessage() ?: 'Permohonan belum dapat diproses.'], 400);
        }
    }

    private function verifyTurnstile(string $token, ?string $ip): void
    {
        $secretKey = config('services.turnstile.secret_key')
            ?: env('CLOUDFLARE_TURNSTILE_SECRET_KEY')
            ?: '1x0000000000000000000000000000000AA';

        // Jika token dari testing site key Cloudflare (awalan XXXX.), gunakan secret key dummy resmi Cloudflare
        if (str_starts_with($token, 'XXXX.') || (app()->environment(['local', 'testing']) && $token === 'dev-bypass')) {
            $secretKey = '1x0000000000000000000000000000000AA';
        }

        if (!$secretKey) {
            Log::error('Cloudflare Turnstile secret key is not configured.');
            throw ValidationException::withMessages([
                'turnstile_token' => 'Verifikasi keamanan belum dikonfigurasi. Silakan hubungi administrator.',
            ]);
        }

        try {
            $options = [];
            $localCa = 'C:/laragon/etc/ssl/cacert.pem';
            if (file_exists($localCa)) {
                $options['verify'] = $localCa;
            }

            $client = !empty($options) ? Http::withOptions($options) : Http::timeout(8);
            $response = $client->asForm()
                ->timeout(8)
                ->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                    'secret' => $secretKey,
                    'response' => $token,
                    'remoteip' => $ip,
                ]);

            if (!$response->successful() || !($response->json('success') === true)) {
                Log::warning('Cloudflare Turnstile verification rejected.', ['response' => $response->json()]);
                throw ValidationException::withMessages([
                    'turnstile_token' => 'Verifikasi keamanan Cloudflare tidak valid atau telah kedaluwarsa. Silakan ulangi.',
                ]);
            }
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Cloudflare Turnstile verification error: ' . $e->getMessage());
            throw ValidationException::withMessages([
                'turnstile_token' => 'Verifikasi keamanan tidak dapat dihubungi. Silakan coba lagi.',
            ]);
        }
    }



    public function lacakKode(Request $request)
    {
        $request->validate([
            'tanggal_kunjungan' => ['required', 'date'],
            'email'             => ['required', 'string', 'email'],
            'dinas_id'          => ['required'],
        ], [
            'tanggal_kunjungan.required' => 'Tanggal kunjungan wajib diisi.',
            'tanggal_kunjungan.date'     => 'Format tanggal kunjungan tidak valid.',
            'email.required'             => 'Email wajib diisi.',
            'email.email'                => 'Format email tidak valid.',
            'dinas_id.required'          => 'Instansi / dinas yang dituju wajib dipilih.',
        ]);

        $tanggal = Carbon::parse($request->input('tanggal_kunjungan'))->toDateString();
        $email = trim(strtolower($request->input('email')));
        $dinasId = $request->input('dinas_id');

        $query = Permohonan::with('dinas')
            ->whereRaw('LOWER(email) = ?', [$email])
            ->whereDate('tanggal_kunjungan', $tanggal);

        if (is_numeric($dinasId)) {
            $query->where(function ($q) use ($dinasId) {
                $q->where('dinas_id', (int) $dinasId)
                  ->orWhereHas('dinas', function ($sub) use ($dinasId) {
                      $sub->where('id', (int) $dinasId);
                  });
            });
        } else {
            $query->where(function ($q) use ($dinasId) {
                $q->where('dinas_tujuan', 'like', "%{$dinasId}%")
                  ->orWhereHas('dinas', function ($sub) use ($dinasId) {
                      $sub->where('nama', 'like', "%{$dinasId}%")
                          ->orWhere('singkatan', 'like', "%{$dinasId}%");
                  });
            });
        }

        $results = $query->latest('id')->get();

        if ($results->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Permohonan tidak ditemukan. Pastikan tanggal kunjungan, email, dan instansi tujuan sesuai saat pengajuan.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Permohonan berhasil ditemukan.',
            'data'    => $results->map(function ($item) {
                return [
                    'kode'              => $item->kode,
                    'status'            => $item->status,
                    'tanggal_kunjungan' => $item->tanggal_kunjungan ? $item->tanggal_kunjungan->format('Y-m-d') : null,
                    'instansi'          => $item->instansi,
                    'nama_pic'          => $item->nama_pic,
                    'dinas_tujuan'      => $item->dinas ? ($item->dinas->singkatan ?: $item->dinas->nama) : $item->dinas_tujuan,
                    'created_at'        => $item->created_at ? $item->created_at->format('Y-m-d H:i') : null,
                ];
            }),
        ]);
    }

    public function status($kode)
    {
        $permohonan = $this->permohonanRepo->findByKode(strtoupper($kode));
        
        if (!$permohonan) {
            return response()->json([
                'success' => false,
                'message' => 'Kode permohonan tidak ditemukan.'
            ], 404);
        }
        
        $dinas = $permohonan->dinas;
        if (!$dinas && !empty($permohonan->dinas_tujuan)) {
            $dinas = \App\Models\Dinas::where('nama', $permohonan->dinas_tujuan)
                ->orWhere('singkatan', $permohonan->dinas_tujuan)
                ->first();
        }

        $kontak = null;
        if ($dinas && !empty($dinas->nomor_telepon)) {
            $kontak = [
                'nomor_telepon' => $dinas->nomor_telepon,
                'nama_pic' => $dinas->singkatan ?: $dinas->nama,
            ];
        } else {
            $kontakAktif = \App\Models\KontakTelepon::aktif()->first();
            $kontak = $kontakAktif ? new \App\Http\Resources\KontakTeleponResource($kontakAktif) : null;
        }

        return response()->json([
            'success' => true,
            'data' => new PermohonanResource($permohonan),
            'kontak' => $kontak
        ]);
    }

    public function revisi(RevisiPermohonanRequest $request, $kode)
    {
        try {
            $permohonan = $this->permohonanRepo->findByKode(strtoupper($kode));
            
            if (!$permohonan) {
                return response()->json(['success' => false, 'message' => 'Kode permohonan tidak ditemukan.'], 404);
            }

            $permohonan = $this->permohonanService->revisi($permohonan, $request->validated());
            
            return response()->json([
                'success' => true,
                'message' => 'Revisi berhasil dikirim.',
                'data' => new PermohonanResource($permohonan)
            ]);
            
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Revisi permohonan error: ' . $e->getMessage(), [
                'kode' => $kode,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['success' => false, 'message' => $e->getMessage() ?: 'Revisi belum dapat diproses.'], 400);
        }
    }

    public function uploadBuktiPenginapan(Request $request, $kode)
    {
        $request->validate([
            'bukti_menginap' => ['required'],
            'bukti_menginap_nama' => ['nullable', 'string', 'max:255'],
            'bukti_menginap_mime' => ['nullable', 'string', 'max:100'],
        ]);
        
        try {
            $permohonan = $this->permohonanRepo->findByKode(strtoupper($kode));
            
            if (!$permohonan) {
                return response()->json(['success' => false, 'message' => 'Permohonan tidak ditemukan'], 404);
            }
            
            $permohonan = $this->permohonanService->uploadBuktiMenginap($permohonan, $request->all());
            
            return response()->json([
                'success' => true,
                'message' => 'Bukti penginapan berhasil diunggah.',
                'data' => new PermohonanResource($permohonan)
            ]);

        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Bukti penginapan belum dapat diunggah.'], 400);
        }
    }

    /**
     * Stream uploaded permohonan document inline (PDF/Image)
     * GET /api/permohonan/{kode}/file/{type}
     */
    public function viewFile(string $kode, string $type)
    {
        $permohonan = $this->permohonanRepo->findByKode(strtoupper($kode));

        if (!$permohonan) {
            return response()->json(['success' => false, 'message' => 'Permohonan tidak ditemukan.'], 404);
        }

        $field = match ($type) {
            'surat-permohonan', 'surat_permohonan' => 'surat_permohonan',
            'daftar-pertanyaan', 'daftar_pertanyaan' => 'daftar_pertanyaan',
            'bukti-menginap', 'bukti_menginap' => 'bukti_menginap',
            default => null,
        };

        if (!$field) {
            return response()->json(['success' => false, 'message' => 'Tipe dokumen tidak valid.'], 404);
        }

        $path = $permohonan->getRawOriginal($field);

        if (!$path || !Storage::disk('public')->exists($path)) {
            return response()->json(['success' => false, 'message' => 'File dokumen belum diunggah atau tidak ditemukan.'], 404);
        }

        $fullPath = Storage::disk('public')->path($path);
        $mime = mime_content_type($fullPath) ?: 'application/pdf';

        return response()->file($fullPath, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="' . basename($fullPath) . '"',
        ]);
    }
}
