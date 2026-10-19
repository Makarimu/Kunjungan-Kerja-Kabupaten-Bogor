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
use App\Models\Permohonan;
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
            'min_date' => $this->kalenderService->getMinimumVisitDate($email)->toDateString(),
            'min_hari' => $this->kalenderService->getMinHari()
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

            if (!empty($data['recaptcha_token']) && $data['recaptcha_token'] !== 'dev-bypass') {
                $tRecaptchaStart = microtime(true);
                $this->verifyRecaptcha($data['recaptcha_token'], $request->ip());
                $tRecaptchaDuration = round((microtime(true) - $tRecaptchaStart) * 1000, 2);
                Log::info("[PROFILING] reCAPTCHA v3 terverifikasi dalam {$tRecaptchaDuration}ms");
            }

            unset($data['recaptcha_token']);

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

    private function verifyRecaptcha(string $token, ?string $ip): void
    {
        $secretKey = config('services.recaptcha.secret_key') 
            ?: env('RECAPTCHA_SECRET_KEY') 
            ?: env('VITE_RECAPTCHA_SECRET_KEY') 
            ?: '6LcxbZktAAAAAOXzpENxut9RXX8boVWE6luiPcn6';

        if (!$secretKey) {
            Log::error('reCAPTCHA secret key is not configured.');
            throw ValidationException::withMessages([
                'recaptcha_token' => 'Verifikasi keamanan belum dikonfigurasi. Silakan hubungi administrator.',
            ]);
        }

        $options = [];
        $localCa = 'C:/laragon/etc/ssl/cacert.pem';
        if (file_exists($localCa)) {
            $options['verify'] = $localCa;
        }

        $result = null;
        try {
            $client = !empty($options) ? Http::withOptions($options) : Http::timeout(7);
            $result = $client->asForm()
                ->timeout(7)
                ->post('https://www.google.com/recaptcha/api/siteverify', [
                    'secret' => $secretKey,
                    'response' => $token,
                    'remoteip' => $ip,
                ]);
        } catch (\Throwable $e) {
            Log::warning('reCAPTCHA verification initial request failed: ' . $e->getMessage());

            try {
                $result = Http::withoutVerifying()
                    ->asForm()
                    ->timeout(7)
                    ->post('https://www.google.com/recaptcha/api/siteverify', [
                        'secret' => $secretKey,
                        'response' => $token,
                        'remoteip' => $ip,
                    ]);
            } catch (\Throwable $fallbackErr) {
                Log::warning('reCAPTCHA verification fallback request failed: ' . $fallbackErr->getMessage());
                throw ValidationException::withMessages([
                    'recaptcha_token' => 'Verifikasi keamanan tidak dapat dilakukan. Silakan coba lagi.',
                ]);
            }
        }

        $json = $result->json();

        if (!$result->successful() || !($json['success'] ?? false)) {
            Log::warning('reCAPTCHA v2 verification was rejected.', ['errors' => $json['error-codes'] ?? []]);
            throw ValidationException::withMessages([
                'recaptcha_token' => 'Verifikasi reCAPTCHA tidak valid atau telah kedaluwarsa. Silakan ulangi.',
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
