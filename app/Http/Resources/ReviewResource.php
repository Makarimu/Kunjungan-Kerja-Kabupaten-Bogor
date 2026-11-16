<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'permohonan_id'    => $this->permohonan_id,
            'kode_permohonan'  => $this->whenLoaded('permohonan', fn() => $this->permohonan->kode, $this->permohonan?->kode),
            'instansi'         => $this->whenLoaded('permohonan', fn() => $this->permohonan->instansi, $this->permohonan?->instansi),
            'dinas_tujuan'     => $this->whenLoaded('permohonan', fn() => $this->permohonan->dinas?->nama ?: ($this->permohonan->dinas_tujuan ?: 'Pemerintah Kabupaten Bogor'), $this->permohonan?->dinas?->nama ?: ($this->permohonan?->dinas_tujuan ?: 'Pemerintah Kabupaten Bogor')),
            'nama_pic'         => $this->whenLoaded('permohonan', fn() => $this->permohonan->nama_pic, $this->permohonan?->nama_pic),
            'rating'           => $this->rating,
            'review'           => $this->review,
            'status'           => $this->status,
            'created_at'       => $this->created_at,
            'updated_at'       => $this->updated_at,
        ];
    }
}
