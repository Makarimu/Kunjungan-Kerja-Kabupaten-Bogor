<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use Carbon\Carbon;

class PermohonanExport implements
    FromCollection,
    WithHeadings,
    WithMapping,
    WithStyles,
    WithTitle,
    WithEvents,
    WithColumnFormatting
{
    protected Collection $data;
    protected string $exportedAt;
    private int $rowNumber = 0;

    public function __construct(Collection $data)
    {
        $this->data       = $data;
        $this->exportedAt = Carbon::now()->locale('id')->isoFormat('dddd, D MMMM YYYY HH:mm') . ' WIB';
    }

    public function title(): string
    {
        return 'Data Permohonan';
    }

    public function collection(): Collection
    {
        return $this->data;
    }

    public function headings(): array
    {
        return [
            'No.',
            'No. Permohonan',
            'Nomor Surat',
            'Tanggal Pengajuan',
            'Nama Instansi',
            'Nama PIC',
            'Jabatan PIC',
            'Nomor Telepon',
            'Email',
            'Ketua Rombongan',
            'Jabatan Ketua Rombongan',
            'Jumlah Peserta',
            'Dinas Tujuan',
            'Tanggal Kunjungan',
            'Jam Penerimaan',
            'Maksud / Tujuan Kunjungan',
            'Rencana Menginap',
            'Nama Hotel / Penginapan',
            'Status Bukti Penginapan',
            'Status',
            'Narasumber / Pejabat Penerima',
            'Tanggal Persetujuan',
            'Tanggal Selesai',
            'Catatan / Keterangan Admin',
        ];
    }

    public function map($row): array
    {
        $this->rowNumber++;

        // Status Penginapan & Bukti
        $rencanaMenginap = $row->rencana_menginap ?? 'Tidak';
        $hotel = ($rencanaMenginap === 'Ya' || !empty($row->nama_hotel))
            ? ($row->nama_hotel ?: 'Belum Ditentukan')
            : '-';

        $buktiPenginapan = $row->bukti_menginap
            ? 'Sudah Diunggah'
            : ($rencanaMenginap === 'Ya' ? 'Belum Diunggah' : 'Tidak Ada');

        // Tanggal Persetujuan
        $tglDisetujui = '-';
        if (!empty($row->tgl_disetujui)) {
            $tglDisetujui = Carbon::parse($row->tgl_disetujui)->locale('id')->isoFormat('D MMMM YYYY HH:mm');
        } elseif ($row->status === 'Disetujui' && !empty($row->tgl_diproses)) {
            $tglDisetujui = Carbon::parse($row->tgl_diproses)->locale('id')->isoFormat('D MMMM YYYY HH:mm');
        }

        // Tanggal Selesai Kunjungan
        $tglSelesai = '-';
        if (!empty($row->tanggal_selesai_kunjungan)) {
            $tglSelesai = Carbon::parse($row->tanggal_selesai_kunjungan)->locale('id')->isoFormat('D MMMM YYYY HH:mm');
        } elseif ($row->status === 'Selesai' && !empty($row->updated_at)) {
            $tglSelesai = Carbon::parse($row->updated_at)->locale('id')->isoFormat('D MMMM YYYY HH:mm');
        }

        return [
            $this->rowNumber,
            $row->kode,
            $row->nomor_surat ?? '-',
            $row->created_at ? Carbon::parse($row->created_at)->locale('id')->isoFormat('D MMMM YYYY HH:mm') : '-',
            $row->instansi ?? '-',
            $row->nama_pic ?? '-',
            $row->jabatan_pic ?? '-',
            $row->no_telp ? (string) $row->no_telp : '-',
            $row->email ?? '-',
            $row->nama_ketua_rombongan ?? '-',
            $row->jabatan_ketua_rombongan ?? '-',
            $row->jumlah_peserta ? $row->jumlah_peserta . ' orang' : '-',
            $row->dinas_tujuan ?? '-',
            $row->tanggal_kunjungan ? Carbon::parse($row->tanggal_kunjungan)->locale('id')->isoFormat('D MMMM YYYY') : '-',
            $row->jam_penerimaan ? $row->jam_penerimaan . ' WIB' : '-',
            $row->tujuan ?? '-',
            $rencanaMenginap,
            $hotel,
            $buktiPenginapan,
            $row->status ?? '-',
            $row->narasumber ?? '-',
            $tglDisetujui,
            $tglSelesai,
            $row->keterangan_admin ?? '-',
        ];
    }

    public function columnFormats(): array
    {
        return [
            'H' => NumberFormat::FORMAT_TEXT, // No. Telepon agar angka 0 di depan tidak terpotong
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $totalColumns = count($this->headings());
                $lastCol      = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($totalColumns);

                // Insert title rows before the data
                $sheet->insertNewRowBefore(1, 2);

                // Row 1: Title
                $sheet->mergeCells("A1:{$lastCol}1");
                $sheet->setCellValue('A1', 'DATA PERMOHONAN KUNJUNGAN KERJA');
                $sheet->getStyle('A1')->applyFromArray([
                    'font'      => ['bold' => true, 'size' => 14, 'color' => ['rgb' => '1B4332']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'D1FAE5']],
                ]);
                $sheet->getRowDimension(1)->setRowHeight(30);

                // Row 2: Export date
                $sheet->mergeCells("A2:{$lastCol}2");
                $sheet->setCellValue('A2', 'Tanggal Export: ' . $this->exportedAt);
                $sheet->getStyle('A2')->applyFromArray([
                    'font'      => ['italic' => true, 'size' => 10, 'color' => ['rgb' => '374151']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F0FDF4']],
                ]);
                $sheet->getRowDimension(2)->setRowHeight(20);

                // Header row (now row 3)
                $sheet->getStyle("A3:{$lastCol}3")->applyFromArray([
                    'font'      => ['bold' => true, 'size' => 10, 'color' => ['rgb' => 'FFFFFF']],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '2E7D32']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
                    'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'FFFFFF']]],
                ]);
                $sheet->getRowDimension(3)->setRowHeight(26);

                // Auto-width for all columns
                for ($col = 1; $col <= $totalColumns; $col++) {
                    $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col);
                    $sheet->getColumnDimension($colLetter)->setAutoSize(true);
                }

                // Style data rows
                $lastDataRow = $sheet->getHighestRow();
                if ($lastDataRow >= 4) {
                    $sheet->getStyle("A4:{$lastCol}{$lastDataRow}")->applyFromArray([
                        'font'    => ['size' => 10],
                        'borders' => [
                            'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D1D5DB']],
                        ],
                        'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                    ]);

                    // Zebra striping
                    for ($row = 4; $row <= $lastDataRow; $row++) {
                        if ($row % 2 === 0) {
                            $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray([
                                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F9FAFB']],
                            ]);
                        }
                    }

                    // Specific column alignments for readability
                    $centeredCols = ['A', 'B', 'C', 'D', 'H', 'L', 'N', 'O', 'Q', 'S', 'T', 'V', 'W'];
                    foreach ($centeredCols as $c) {
                        $sheet->getStyle("{$c}4:{$c}{$lastDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    }

                    // Wrap text for long content: Maksud / Tujuan (P) & Catatan Admin (X)
                    $sheet->getStyle("P4:P{$lastDataRow}")->getAlignment()->setWrapText(true);
                    $sheet->getStyle("X4:X{$lastDataRow}")->getAlignment()->setWrapText(true);
                }

                // Freeze panes at row 4 (so title + header stay visible when scrolling)
                $sheet->freezePane('A4');
            },
        ];
    }
}
