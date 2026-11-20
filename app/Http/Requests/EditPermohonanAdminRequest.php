<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EditPermohonanAdminRequest extends FormRequest
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
        ];
    }
}
