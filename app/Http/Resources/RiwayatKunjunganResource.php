<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RiwayatKunjunganResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     * HANYA MENGEMBALIKAN DATA PUBLIK SANITIZED.
     * SANGAT DILARANG MENGEMBALIKAN: nama_pic, no_telp, email, nomor_surat, file upload, kode.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'instansi'          => $this->instansi,
            'dinas_id'          => $this->dinas_id,
            'dinas_tujuan'      => $this->dinas?->nama ?: ($this->dinas_tujuan ?: 'Pemerintah Kabupaten Bogor'),
            'dinas_singkatan'   => $this->dinas?->singkatan ?? null,
            'tanggal_kunjungan' => $this->tanggal_kunjungan ? $this->tanggal_kunjungan->format('Y-m-d') : null,
            'tujuan'            => $this->tujuan,
            'jumlah_peserta'    => (int) $this->jumlah_peserta,
            'rating'            => $this->review ? (int) $this->review->rating : null,
            'review'            => $this->review ? $this->review->review : null,
            'created_at_review' => $this->review && $this->review->created_at ? $this->review->created_at->toIso8601String() : null,
        ];
    }
}
