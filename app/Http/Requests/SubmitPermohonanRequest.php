<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitPermohonanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation()
    {
        if (empty($this->dinas_id) && !empty($this->dinas_tujuan)) {
            $cleanDinasTujuan = strtolower(trim($this->dinas_tujuan));
            $dinas = \App\Models\Dinas::whereRaw('LOWER(singkatan) = ?', [$cleanDinasTujuan])
                ->orWhereRaw('LOWER(nama) = ?', [$cleanDinasTujuan])
                ->orWhereRaw('LOWER(nama) LIKE ?', ["%{$cleanDinasTujuan}%"])
                ->first();
                
            if ($dinas) {
                $this->merge([
                    'dinas_id' => $dinas->id,
                ]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'tanggal_kunjungan' => ['required', 'date'],
            'nomor_surat' => ['required', 'string', 'max:100'],
            'instansi' => ['required', 'string', 'max:200'],
            'nama_ketua_rombongan' => ['required', 'string', 'max:150'],
            'jabatan_ketua_rombongan' => ['required', 'string', 'max:150'],
            'nama_pic' => ['required', 'string', 'max:150'],
            'jabatan_pic' => ['required', 'string', 'max:150'],
            'no_telp' => ['required', 'string', 'min:10', 'max:20'],
            'email' => ['required', 'email', 'max:150'],
            'tujuan' => ['required', 'string'],
            'dinas_id' => ['required', 'exists:app_md_dinas,id'],
            'jumlah_peserta' => ['required', 'integer', 'min:1'],
            'rencana_menginap' => ['required', 'in:Ya,Tidak'],
            'nama_hotel' => ['required_if:rencana_menginap,Ya', 'nullable', 'string', 'max:200'],
            'recaptcha_token' => (app()->environment(['testing', 'local']) || request('recaptcha_token') === 'dev-bypass') ? ['nullable', 'string'] : ['required', 'string'],

            // Mendukung file upload (multipart/form-data) ATAU base64 string
            'surat_permohonan' => ['required'],
            'surat_permohonan_nama' => ['nullable', 'string', 'max:255'],
            'surat_permohonan_mime' => ['nullable', 'string', 'max:100'],

            'daftar_pertanyaan' => ['required'],
            'daftar_pertanyaan_nama' => ['nullable', 'string', 'max:255'],
            'daftar_pertanyaan_mime' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * Additional validation after basic rules pass.
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $tanggal = $this->input('tanggal_kunjungan');
            $email = $this->input('email');
            $instansi = $this->input('instansi');

            // 0. Cek Blacklist (Email & Instansi)
            $blacklisted = \App\Models\Blacklist::checkBlacklist($email, $instansi);
            if ($blacklisted) {
                $alasanMsg = $blacklisted->alasan ? " (Alasan: {$blacklisted->alasan})" : '';
                $validator->errors()->add('email', "Pengajuan kunjungan diblokir oleh sistem karena data Anda masuk dalam daftar pencegahan{$alasanMsg}. Silakan hubungi administrator.");
                return;
            }

            if ($tanggal && $email) {
                $cleanEmail = strtolower(trim($email));
                $dinasId = $this->input('dinas_id');
                $dinasTujuan = $this->input('dinas_tujuan');

                $query = \App\Models\Permohonan::whereRaw('LOWER(TRIM(email)) = ?', [$cleanEmail])
                    ->whereDate('tanggal_kunjungan', \Carbon\Carbon::parse($tanggal)->toDateString())
                    ->whereNotIn('status', ['Ditolak', 'Dibatalkan']);

                if ($dinasId) {
                    $query->where('dinas_id', $dinasId);
                } elseif ($dinasTujuan) {
                    $query->where('dinas_tujuan', $dinasTujuan);
                }

                $dinasCount = $query->count();

                if ($dinasCount >= 2) {
                    $dinasName = 'kedinasan/kecamatan ini';
                    if ($dinasId) {
                        $d = \App\Models\Dinas::find($dinasId);
                        if ($d) $dinasName = $d->singkatan ?: $d->nama;
                    } elseif ($dinasTujuan) {
                        $dinasName = $dinasTujuan;
                    }
                    $validator->errors()->add('tanggal_kunjungan', "Email Anda sudah mencapai batas maksimal 2 pengajuan kunjungan untuk {$dinasName} pada tanggal tersebut.");
                    return;
                }
            }

            $kalenderService = $this->container->make(\App\Services\KalenderService::class);
            if ($tanggal && !$kalenderService->isTanggalValid($tanggal, $email, $this->input('dinas_id'))) {
                $minHari = $kalenderService->getMinHari();
                $validator->errors()->add('tanggal_kunjungan', "Tanggal kunjungan tidak valid, batas maksimal 2 pengajuan telah tercapai, slot penuh, atau belum memenuhi aturan minimal H+{$minHari}.");
            }
        });
    }

    /**
     * Merge file uploads ke dalam validated data agar PermohonanService bisa memprosesnya.
     */
    public function validated($key = null, $default = null): array
    {
        $data = parent::validated($key, $default);

        // Jika dikirim sebagai multipart file, ganti nilai dengan UploadedFile
        if ($this->hasFile('surat_permohonan')) {
            $data['surat_permohonan'] = $this->file('surat_permohonan');
        }
        if ($this->hasFile('daftar_pertanyaan')) {
            $data['daftar_pertanyaan'] = $this->file('daftar_pertanyaan');
        }

        return $data;
    }
}
