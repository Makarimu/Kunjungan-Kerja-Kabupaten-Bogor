<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PermohonanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'kode' => $this->kode,
            'nomor_surat' => $this->nomor_surat,
            'instansi' => $this->instansi,
            'nama_ketua_rombongan' => $this->nama_ketua_rombongan,
            'jabatan_ketua_rombongan' => $this->jabatan_ketua_rombongan,
            'nama_pic' => $this->nama_pic,
            'jabatan_pic' => $this->jabatan_pic,
            'no_telp' => $this->no_telp,
            'email' => $this->email,
            'tanggal_kunjungan' => $this->tanggal_kunjungan,
            'tujuan' => $this->tujuan,
            'dinas_tujuan' => $this->dinas_tujuan,
            'dinas_id' => $this->dinas_id,
            'dinas' => $this->dinas ? [
                'id' => $this->dinas->id,
                'nama' => $this->dinas->nama,
                'singkatan' => $this->dinas->singkatan,
                'nomor_telepon' => $this->dinas->nomor_telepon,
            ] : null,
            'jumlah_peserta' => $this->jumlah_peserta,
            'rencana_menginap' => $this->rencana_menginap,
            'nama_hotel' => $this->nama_hotel,
            'link_surat_1' => $this->linkSurat1,
            'link_surat_2' => $this->linkSurat2,
            'link_bukti_menginap' => $this->linkBuktiMenginap,
            'linkSurat1' => $this->linkSurat1,
            'linkSurat2' => $this->linkSurat2,
            'linkBuktiMenginap' => $this->linkBuktiMenginap,
            'surat_permohonan_url' => $this->linkSurat1,
            'surat_daftar_pertanyaan_url' => $this->linkSurat2,
            'bukti_menginap_url' => $this->linkBuktiMenginap,
            'status' => $this->status,
            'keterangan_admin' => $this->keterangan_admin,
            'bisa_direvisi' => $this->bisa_direvisi,
            'bisa_revisi' => $this->bisa_direvisi,
            'narasumber' => $this->narasumber,
            'jam_penerimaan' => $this->jam_penerimaan,
            'tgl_pengajuan_awal' => $this->tgl_pengajuan_awal,
            'tgl_diproses' => $this->tgl_diproses,
            'tgl_revisi' => $this->tgl_revisi,
            'tgl_disetujui' => $this->tgl_disetujui,
            // Ringkasan PDF
            'tanggal_selesai_kunjungan' => $this->tanggal_selesai_kunjungan,
            'link_ringkasan_pdf'        => $this->linkRingkasanPdf,
            'ringkasan_uploaded_at'     => $this->getPdfUploadedAt()?->toDateTimeString(),
            'ringkasan_sent_at'         => $this->ringkasan_sent_at,
            'ringkasan_sent_by'         => $this->ringkasan_sent_by,
            // === FIELD KUNCI: gunakan ini sebagai satu-satunya gate di frontend ===
            'pdf_ready'                 => !empty($this->getPdfPath()),
            'ringkasan_pdf'             => $this->getPdfPath(),
            'has_pdf'                   => !empty($this->getPdfPath()),
            'pdf_available'             => !empty($this->getPdfPath()),
            'pdf_nama_file'             => $this->getPdfFileName(),
            'pdf_filename'              => $this->getPdfFileName(),
            'pdf_uploaded_at'           => $this->getPdfUploadedAt()?->toDateTimeString(),
            'pdf_ukuran_file'           => $this->getPdfFileSizeFormatted(),
            // download_url HANYA diisi apabila PDF benar-benar ada di storage
            'download_url'              => !empty($this->getPdfPath()) ? url("/api/permohonan/{$this->kode}/download-pdf") : null,
            'pdf_download_url'          => !empty($this->getPdfPath()) ? url("/api/permohonan/{$this->kode}/download-pdf") : null,
            'pdf_url'                   => !empty($this->getPdfPath()) ? url("/api/permohonan/{$this->kode}/download-pdf") : null,
            'hasil_kunjungan_pdf'       => $this->getPdfPath(),
            'hasil_kunjungan_uploaded_at' => $this->getPdfUploadedAt()?->toDateTimeString(),
            // === Timestamp tambahan untuk stepper & audit ===
            'completed_at'              => $this->tanggal_selesai_kunjungan,
            'review_exists'             => $this->review !== null,
            'review_submitted_at'       => $this->review?->created_at?->toDateTimeString(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'review'     => $this->review ? new ReviewResource($this->review) : null,
            'has_review' => $this->review !== null,
        ];
    }
}

