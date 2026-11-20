<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ExportPermohonanRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Only authenticated admins (via sanctum) can export
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'rentang'    => ['required', 'in:semua,tanggal'],
            'start_date' => ['nullable', 'date', 'required_if:rentang,tanggal'],
            'end_date'   => [
                'nullable', 'date',
                'required_if:rentang,tanggal',
                'after_or_equal:start_date',
            ],
            'status'     => ['nullable', 'array'],
            'status.*'   => ['string', 'in:Pending,Revisi,Disetujui,Ditolak,Selesai'],
        ];
    }

    public function messages(): array
    {
        return [
            'rentang.required'    => 'Pilih rentang data (Semua / Berdasarkan Tanggal).',
            'start_date.required_if' => 'Tanggal awal wajib diisi jika menggunakan rentang tanggal.',
            'end_date.required_if'   => 'Tanggal akhir wajib diisi jika menggunakan rentang tanggal.',
            'end_date.after_or_equal'=> 'Tanggal akhir harus sama atau setelah tanggal awal.',
        ];
    }
}
