<?php

namespace App\Services;

use App\Models\Permohonan;
use App\Models\PermohonanStatusLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Exception;

class PermohonanService
{
    protected $fileService;
    protected $emailService;
    protected $kalenderService;

    public function __construct(FileUploadService $fileService, EmailService $emailService, KalenderService $kalenderService)
    {
        $this->fileService = $fileService;
        $this->emailService = $emailService;
        $this->kalenderService = $kalenderService;
    }

    public function generateKode(): string
    {
        $dateStr = Carbon::now()->format('Ymd');
        do {
            // Generate 4 random digits (0-9)
            $digits = array_map(fn() => (string) random_int(0, 9), range(1, 4));
            // Generate 1 random uppercase letter A-Z (ASCII 65 to 90)
            $letter = chr(random_int(65, 90));
            // Posisi huruf acak pada indeks 0 sampai 4 (posisi 1 sampai 5)
            $pos = random_int(0, 4);
            array_splice($digits, $pos, 0, $letter);
            $suffix = implode('', $digits);

            $kode = "KUNKER-{$dateStr}-{$suffix}";
        } while (Permohonan::where('kode', $kode)->exists());

        return $kode;
    }

    public function submit(array $data): Permohonan
    {
        // Pra-validasi ringan (sebelum upload file)
        $dinasId = $data['dinas_id'] ?? null;
        if (!$this->kalenderService->isTanggalValid($data['tanggal_kunjungan'], $data['email'] ?? null, $dinasId)) {
            $minHari = $this->kalenderService->getMinHari();
            throw new Exception("Tanggal kunjungan tidak valid, batas maksimal 2 pengajuan per dinas telah tercapai, slot penuh, atau kurang dari H+{$minHari}.");
        }

        if (isset($data['dinas_id'])) {
            $dinas = \App\Models\Dinas::find($data['dinas_id']);
            if ($dinas) {
                $data['dinas_tujuan'] = $dinas->nama;
            }
        }

        $data['status'] = 'Pending';
        $data['tgl_pengajuan_awal'] = Carbon::now();

        // Proses Files — mendukung UploadedFile (multipart) maupun base64 string
        if (isset($data['surat_permohonan'])) {
            $data['surat_permohonan'] = $this->fileService->uploadBase64(
                $data['surat_permohonan'],
                $data['surat_permohonan_nama'] ?? null,
                $data['surat_permohonan_mime'] ?? null,
                'permohonan',
                ['application/pdf']
            );
        }

        if (isset($data['daftar_pertanyaan'])) {
            $data['daftar_pertanyaan'] = $this->fileService->uploadBase64(
                $data['daftar_pertanyaan'],
                $data['daftar_pertanyaan_nama'] ?? null,
                $data['daftar_pertanyaan_mime'] ?? null,
                'permohonan',
                ['application/pdf']
            );
        }

        // Buang kolom meta file yang tidak ada di tabel database
        unset(
            $data['surat_permohonan_nama'], $data['surat_permohonan_mime'],
            $data['daftar_pertanyaan_nama'], $data['daftar_pertanyaan_mime']
        );

        $maxAttempts = 10;
        $permohonan = null;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $permohonan = DB::transaction(function () use ($data) {
                    // Race-condition safe: cek kuota per dinas DI DALAM transaction dengan pessimistic lock
                    if (isset($data['email']) && isset($data['tanggal_kunjungan'])) {
                        $cleanEmail = strtolower(trim($data['email']));
                        $dinasId = $data['dinas_id'] ?? null;

                        $query = Permohonan::whereRaw('LOWER(TRIM(email)) = ?', [$cleanEmail])
                            ->whereDate('tanggal_kunjungan', $data['tanggal_kunjungan'])
                            ->whereNotIn('status', ['Ditolak', 'Dibatalkan']);

                        if ($dinasId) {
                            $query->where('dinas_id', $dinasId);
                        } elseif (!empty($data['dinas_tujuan'])) {
                            $query->where('dinas_tujuan', $data['dinas_tujuan']);
                        }

                        $dinasBookedCount = $query->lockForUpdate()->count();

                        if ($dinasBookedCount >= 2) {
                            $dinasName = 'kedinasan ini';
                            if ($dinasId) {
                                $d = \App\Models\Dinas::find($dinasId);
                                if ($d) $dinasName = $d->singkatan ?: $d->nama;
                            } elseif (!empty($data['dinas_tujuan'])) {
                                $dinasName = $data['dinas_tujuan'];
                            }
                            throw new Exception("Email Anda sudah mencapai batas maksimal 2 pengajuan kunjungan untuk {$dinasName} pada tanggal tersebut.");
                        }
                    }

                    $data['kode'] = $this->generateKode();

                    $permohonan = Permohonan::create($data);

                    // Log Status
                    PermohonanStatusLog::create([
                        'permohonan_id' => $permohonan->id,
                        'status_baru' => 'Pending',
                        'keterangan' => 'Pengajuan awal'
                    ]);

                    return $permohonan;
                });

                break;
            } catch (\Illuminate\Database\QueryException $e) {
                $isDuplicate = str_contains($e->getMessage(), '1062') ||
                               str_contains($e->getMessage(), 'UNIQUE') ||
                               str_contains(strtolower($e->getMessage()), 'duplicate');
                if ($isDuplicate && $attempt < $maxAttempts) {
                    continue;
                }
                throw $e;
            }
        }

        // Email dikirim SETELAH database transaction berhasil commit
        $this->emailService->sendStatusEmail($permohonan);

        return $permohonan;
    }

    public function prosesAdmin(Permohonan $permohonan, array $data, string $adminName): Permohonan
    {
        $statusSebelumnya = $permohonan->status;
        $aksi = $data['aksi'];

        if ($aksi === 'acc') {
            $permohonan->status = 'Disetujui';
            $permohonan->narasumber = $data['narasumber'] ?? null;
            $permohonan->jam_penerimaan = $data['jam_penerimaan'] ?? null;
            $permohonan->keterangan_admin = $data['keterangan'] ?? null;
            $permohonan->bisa_direvisi = null;
            $permohonan->tgl_disetujui = Carbon::now();
        } else if ($aksi === 'tolak') {
            $permohonan->status = 'Ditolak';
            $permohonan->keterangan_admin = $data['keterangan'] ?? null;
            $permohonan->bisa_direvisi = $data['bisa_revisi'] ?? 'Tidak';
            $permohonan->narasumber = null;
            $permohonan->jam_penerimaan = null;
        }

        $permohonan->tgl_diproses = Carbon::now();

        DB::transaction(function () use ($permohonan, $statusSebelumnya, $adminName) {
            $permohonan->save();

            PermohonanStatusLog::create([
                'permohonan_id' => $permohonan->id,
                'status_lama' => $statusSebelumnya,
                'status_baru' => $permohonan->status,
                'keterangan' => $permohonan->keterangan_admin,
                'diubah_oleh' => $adminName
            ]);
        });

        $this->emailService->sendStatusEmail($permohonan);

        return $permohonan;
    }

    public function revisi(Permohonan $permohonan, array $data): Permohonan
    {
        if ($permohonan->status !== 'Ditolak' || $permohonan->bisa_direvisi !== 'Ya') {
            throw new Exception("Permohonan ini tidak dapat direvisi.");
        }

        // Cek tanggal jika berubah atau dinas berubah
        $dinasForCheck = $data['dinas_id'] ?? $permohonan->dinas_id;
        $tglBaru = $data['tanggal_kunjungan'];
        $tglLama = $permohonan->tanggal_kunjungan ? $permohonan->tanggal_kunjungan->toDateString() : null;
        if ($tglBaru !== $tglLama || $dinasForCheck != $permohonan->dinas_id) {
            $emailForCheck = $data['email'] ?? $permohonan->email;
            $cleanEmail = strtolower(trim($emailForCheck));
            $dinasCount = Permohonan::whereRaw('LOWER(TRIM(email)) = ?', [$cleanEmail])
                ->where('dinas_id', $dinasForCheck)
                ->whereDate('tanggal_kunjungan', $tglBaru)
                ->whereNotIn('status', ['Ditolak', 'Dibatalkan'])
                ->where('id', '!=', $permohonan->id)
                ->count();

            if ($dinasCount >= 2) {
                throw new Exception("Email Anda sudah mencapai batas maksimal 2 pengajuan kunjungan untuk dinas ini pada tanggal tersebut.");
            }

            if (!$this->kalenderService->isTanggalValid($tglBaru, $emailForCheck, $dinasForCheck)) {
                throw new Exception("Tanggal kunjungan yang baru tidak valid atau kuota telah tercapai.");
            }
        }

        $keteranganLama = $permohonan->keterangan_admin;
        $statusSebelumnya = $permohonan->status;

        if (isset($data['dinas_id'])) {
            $dinas = \App\Models\Dinas::find($data['dinas_id']);
            if ($dinas) {
                $permohonan->dinas_tujuan = $dinas->nama;
            }
        }

        // Simpan referensi file baru jika ada, dan keluarkan dari array data agar tidak menimpa file lama dengan null
        $newSuratPermohonan = $data['surat_permohonan'] ?? null;
        $newDaftarPertanyaan = $data['daftar_pertanyaan'] ?? null;
        unset(
            $data['surat_permohonan'], $data['daftar_pertanyaan'],
            $data['surat_permohonan_nama'], $data['surat_permohonan_mime'],
            $data['daftar_pertanyaan_nama'], $data['daftar_pertanyaan_mime']
        );

        $permohonan->fill($data);
        $permohonan->status = 'Revisi';
        $permohonan->tgl_revisi = Carbon::now();
        $permohonan->keterangan_admin = "Revisi dari penolakan: " . $keteranganLama;
        $permohonan->bisa_direvisi = null;

        if ($newSuratPermohonan) {
            if ($permohonan->getRawOriginal('surat_permohonan')) {
                $this->fileService->deleteFile($permohonan->getRawOriginal('surat_permohonan'));
            }
            $permohonan->surat_permohonan = $this->fileService->uploadBase64(
                $newSuratPermohonan,
                $data['surat_permohonan_nama'] ?? null,
                $data['surat_permohonan_mime'] ?? null,
                'permohonan',
                ['application/pdf']
            );
        }

        if ($newDaftarPertanyaan) {
            if ($permohonan->getRawOriginal('daftar_pertanyaan')) {
                $this->fileService->deleteFile($permohonan->getRawOriginal('daftar_pertanyaan'));
            }
            $permohonan->daftar_pertanyaan = $this->fileService->uploadBase64(
                $newDaftarPertanyaan,
                $data['daftar_pertanyaan_nama'] ?? null,
                $data['daftar_pertanyaan_mime'] ?? null,
                'permohonan',
                ['application/pdf']
            );
        }

        DB::transaction(function () use ($permohonan, $statusSebelumnya) {
            $permohonan->save();

            PermohonanStatusLog::create([
                'permohonan_id' => $permohonan->id,
                'status_lama' => $statusSebelumnya,
                'status_baru' => 'Revisi',
                'keterangan' => 'Pengajuan revisi oleh pemohon'
            ]);
        });

        $this->emailService->sendStatusEmail($permohonan);

        return $permohonan;
    }

    public function uploadBuktiMenginap(Permohonan $permohonan, array $data): Permohonan
    {
        if ($permohonan->status !== 'Disetujui' || $permohonan->rencana_menginap !== 'Ya') {
            throw new Exception("Tidak dapat mengupload bukti menginap.");
        }

        if (isset($data['bukti_menginap'])) {
            if ($permohonan->getRawOriginal('bukti_menginap')) {
                $this->fileService->deleteFile($permohonan->getRawOriginal('bukti_menginap'));
            }
            $permohonan->bukti_menginap = $this->fileService->uploadBase64(
                $data['bukti_menginap'],
                $data['bukti_menginap_nama'] ?? null,
                $data['bukti_menginap_mime'] ?? null
            );
            $permohonan->save();
        }

        return $permohonan;
    }

    /**
     * Admin menyelesaikan kunjungan. Status berubah ke Selesai,
     * sistem otomatis mengirim email kepada pemohon untuk memberikan penilaian.
     */
    public function selesaikan(Permohonan $permohonan, string $adminName): Permohonan
    {
        if ($permohonan->status !== 'Disetujui') {
            throw new Exception('Hanya permohonan berstatus Disetujui yang dapat diselesaikan.');
        }

        $statusSebelumnya = $permohonan->status;

        $permohonan->status                    = 'Selesai';
        $permohonan->tanggal_selesai_kunjungan = Carbon::now();

        DB::transaction(function () use ($permohonan, $statusSebelumnya, $adminName) {
            $permohonan->save();

            PermohonanStatusLog::create([
                'permohonan_id' => $permohonan->id,
                'status_lama'   => $statusSebelumnya,
                'status_baru'   => 'Selesai',
                'keterangan'    => 'Kunjungan dinyatakan selesai oleh admin',
                'diubah_oleh'   => $adminName,
            ]);
        });

        // Kirim email notifikasi kepada pemohon bahwa kunjungan selesai & rating bisa diberikan
        $this->emailService->sendStatusEmail($permohonan);
        $this->emailService->schedulePdfSummaryNotification($permohonan);

        return $permohonan;
    }

    public function delete(Permohonan $permohonan): void
    {
        $this->fileService->deleteFile($permohonan->getRawOriginal('surat_permohonan'));
        $this->fileService->deleteFile($permohonan->getRawOriginal('daftar_pertanyaan'));
        $this->fileService->deleteFile($permohonan->getRawOriginal('bukti_menginap'));
        $permohonan->delete();
    }
}
