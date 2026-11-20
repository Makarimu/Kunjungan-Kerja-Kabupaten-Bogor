<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RevisiPermohonanRequest extends FormRequest
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

        $kode = $this->route('kode');
        $current = $kode ? \App\Models\Permohonan::where('kode', strtoupper($kode))->first() : null;

        $updates = [];
        if ($current) {
            if (!$this->filled('rencana_menginap') && !empty($current->rencana_menginap)) {
                $updates['rencana_menginap'] = $current->rencana_menginap;
            }
            if (!$this->filled('jumlah_peserta') && !empty($current->jumlah_peserta)) {
                $updates['jumlah_peserta'] = $current->jumlah_peserta;
            }
            $targetRencana = $this->input('rencana_menginap') ?? ($updates['rencana_menginap'] ?? $current->rencana_menginap);
            if ($targetRencana === 'Ya' && !$this->filled('nama_hotel') && !empty($current->nama_hotel)) {
                $updates['nama_hotel'] = $current->nama_hotel;
            }
        }

        if (!empty($updates)) {
            $this->merge($updates);
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
            
            // In revisi, files are optional (can keep old files)
            'surat_permohonan' => ['nullable'],
            'surat_permohonan_nama' => ['nullable', 'string', 'max:255'],
            'surat_permohonan_mime' => ['nullable', 'string', 'max:100'],
            
            'daftar_pertanyaan' => ['nullable'],
            'daftar_pertanyaan_nama' => ['nullable', 'string', 'max:255'],
            'daftar_pertanyaan_mime' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * Validasi tambahan: cek duplikat email+tanggal (kecualikan permohonan saat ini).
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $tanggal = $this->input('tanggal_kunjungan');
            $email = $this->input('email');
            $instansi = $this->input('instansi');
            $kode = $this->route('kode');

            // 0. Cek Blacklist
            $blacklisted = \App\Models\Blacklist::checkBlacklist($email, $instansi);
            if ($blacklisted) {
                $alasanMsg = $blacklisted->alasan ? " (Alasan: {$blacklisted->alasan})" : '';
                $validator->errors()->add('email', "Pengajuan revisi diblokir oleh sistem karena data Anda masuk dalam daftar pencegahan{$alasanMsg}. Silakan hubungi administrator.");
                return;
            }

            if ($tanggal && $email && $kode) {
                $cleanEmail = strtolower(trim($email));
                $current = \App\Models\Permohonan::where('kode', strtoupper($kode))->first();
                
                $alreadyBooked = \App\Models\Permohonan::whereRaw('LOWER(TRIM(email)) = ?', [$cleanEmail])
                    ->whereDate('tanggal_kunjungan', \Carbon\Carbon::parse($tanggal)->toDateString())
                    ->whereNotIn('status', ['Ditolak', 'Dibatalkan'])
                    ->when($current, fn($q) => $q->where('id', '!=', $current->id))
                    ->exists();

                if ($alreadyBooked) {
                    $validator->errors()->add('tanggal_kunjungan', 'Email Anda sudah memiliki pengajuan kunjungan pada tanggal tersebut.');
                }
            }
        });
    }

    public function validated($key = null, $default = null): array
    {
        $data = parent::validated($key, $default);

        if ($this->hasFile('surat_permohonan')) {
            $data['surat_permohonan'] = $this->file('surat_permohonan');
        }
        if ($this->hasFile('daftar_pertanyaan')) {
            $data['daftar_pertanyaan'] = $this->file('daftar_pertanyaan');
        }

        return $data;
    }
}
