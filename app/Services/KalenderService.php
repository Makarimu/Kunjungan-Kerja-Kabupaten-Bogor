<?php

namespace App\Services;

use App\Models\Permohonan;
use App\Models\TanggalDiblokir;
use App\Models\Setting;
use Carbon\Carbon;

class KalenderService
{
    const MAKS_PER_HARI = 2;
    const MIN_HARI = 1;

    /**
     * Dapatkan batas minimal hari pengajuan kunjungan dari Pengaturan Super Admin
     */
    public function getMinHari(): int
    {
        $val = Setting::get('min_hari_kunjungan');
        if ($val !== null && is_numeric($val) && (int)$val >= 1) {
            return (int)$val;
        }
        return self::MIN_HARI;
    }

    public function getMinimumVisitDate(?string $email = null): Carbon
    {
        $minHari = $this->getMinHari();
        $minDate = Carbon::today()->addDays($minHari);

        if (!empty($email)) {
            $cleanEmail = strtolower(trim($email));
            $latestVisit = Permohonan::whereRaw('LOWER(TRIM(email)) = ?', [$cleanEmail])
                ->whereIn('status', ['Disetujui', 'Selesai'])
                ->max('tanggal_kunjungan');

            if ($latestVisit) {
                $minFromLatest = Carbon::parse($latestVisit)->startOfDay()->addDays($minHari);
                if ($minFromLatest->gt($minDate)) {
                    $minDate = $minFromLatest;
                }
            }
        }

        return $minDate;
    }

    public function getUserBookedDates(?string $email = null, ?int $dinasId = null): array
    {
        if (empty($email)) {
            return [];
        }

        $cleanEmail = strtolower(trim($email));
        $query = Permohonan::whereRaw('LOWER(TRIM(email)) = ?', [$cleanEmail])
            ->whereDate('tanggal_kunjungan', '>=', Carbon::today())
            ->whereNotIn('status', ['Ditolak', 'Dibatalkan']);

        if (!empty($dinasId)) {
            // Batas per akun adalah maksimal 2 kali per kedinasan/kecamatan di hari tersebut
            return $query->where('dinas_id', $dinasId)
                ->groupBy('tanggal_kunjungan')
                ->havingRaw('COUNT(*) >= 2')
                ->pluck('tanggal_kunjungan')
                ->map(fn($d) => $d ? Carbon::parse($d)->format('Y-m-d') : null)
                ->filter()
                ->values()
                ->toArray();
        }

        return [];
    }

    public function getKuotaPerHari(?int $dinasId = null): int
    {
        if ($dinasId) {
            $dinas = \App\Models\Dinas::find($dinasId);
            if ($dinas && $dinas->kuota_per_hari !== null && (int)$dinas->kuota_per_hari >= 1) {
                return (int)$dinas->kuota_per_hari;
            }
        }
        return (int) config('visit.max_per_hari', self::MAKS_PER_HARI);
    }

    public function isTanggalValid(string $tanggal, ?string $email = null, ?int $dinasId = null): bool
    {
        $date = Carbon::parse($tanggal)->startOfDay();

        // 0. Validasi Email: Maksimal 2x per kedinasan/kecamatan pada tanggal yang sama
        if (!empty($email) && !empty($dinasId)) {
            $cleanEmail = strtolower(trim($email));
            $dinasCount = Permohonan::whereRaw('LOWER(TRIM(email)) = ?', [$cleanEmail])
                ->where('dinas_id', $dinasId)
                ->whereDate('tanggal_kunjungan', $date->toDateString())
                ->whereNotIn('status', ['Ditolak', 'Dibatalkan'])
                ->count();

            if ($dinasCount >= 2) {
                return false;
            }
        }

        // 1. Validasi Minimal H+1 (berdasarkan tanggal pengajuan atau kunjungan terakhir email)
        $minDate = $this->getMinimumVisitDate($email);
        if ($date->lt($minDate)) {
            return false;
        }

        // 2. Validasi Hari Kerja (Senin - Jumat)
        if ($date->isWeekend()) {
            return false;
        }

        // 3. Validasi Tanggal Diblokir Manual
        $isBlockedQuery = TanggalDiblokir::whereDate('tanggal', $date->toDateString());
        if ($dinasId) {
            $isBlockedQuery->where(function($q) use ($dinasId) {
                $q->whereNull('dinas_id')->orWhere('dinas_id', $dinasId);
            });
        } else {
            $isBlockedQuery->whereNull('dinas_id');
        }
        $isBlocked = $isBlockedQuery->exists();
        if ($isBlocked) {
            return false;
        }

        // 4. Validasi Kapasitas Penuh (>= kuota_per_hari per dinas / default config)
        // Hanya menghitung permohonan yang aktif / tidak ditolak / tidak dibatalkan
        $countQuery = Permohonan::whereDate('tanggal_kunjungan', $date->toDateString())
            ->whereNotIn('status', ['Ditolak', 'Dibatalkan']);
            
        if ($dinasId) {
            $countQuery->where('dinas_id', $dinasId);
        }
            
        $count = $countQuery->count();
        $maxKuota = $this->getKuotaPerHari($dinasId);

        if ($count >= $maxKuota) {
            return false;
        }

        return true;
    }

    public function getKalenderAvailability(?int $dinasId = null): array
    {
        if (!$dinasId) {
            return [
                'all_busy' => [],
                'blocked' => [],
                'blocked_details' => (object)[],
                'full' => [],
                'approved_visits' => (object)[],
                'kuota_per_hari' => self::MAKS_PER_HARI,
            ];
        }

        $maxKuota = $this->getKuotaPerHari($dinasId);

        $diblokirQuery = TanggalDiblokir::whereDate('tanggal', '>=', Carbon::today())
            ->where(function($q) use ($dinasId) {
                $q->whereNull('dinas_id')->orWhere('dinas_id', $dinasId);
            });
        
        $diblokirModels = $diblokirQuery->get();
        $diblokir = [];
        $blockedDetails = [];
        foreach ($diblokirModels as $d) {
            if ($d->tanggal) {
                $tglStr = $d->tanggal->format('Y-m-d');
                $diblokir[] = $tglStr;
                $blockedDetails[$tglStr] = [
                    'keterangan' => $d->keterangan ?: 'Agenda internal dinas',
                    'diblokir_oleh' => $d->diblokir_oleh ?: 'Admin Dinas',
                ];
            }
        }
        
        $penuhQuery = Permohonan::selectRaw('tanggal_kunjungan, count(*) as total')
            ->whereDate('tanggal_kunjungan', '>=', Carbon::today())
            ->whereNotIn('status', ['Ditolak', 'Dibatalkan'])
            ->where('dinas_id', $dinasId);
            
        $penuh = $penuhQuery->groupBy('tanggal_kunjungan')
            ->having('total', '>=', $maxKuota)
            ->get()
            ->map(fn($p) => $p->tanggal_kunjungan ? Carbon::parse($p->tanggal_kunjungan)->format('Y-m-d') : null)
            ->filter()
            ->values()
            ->toArray();

        // Ambil permohonan aktif (Disetujui, Selesai, Pending, Revisi) untuk dinas terkait
        $allVisitsModels = Permohonan::whereDate('tanggal_kunjungan', '>=', Carbon::today())
            ->whereNotIn('status', ['Ditolak', 'Dibatalkan'])
            ->where('dinas_id', $dinasId)
            ->orderBy('tanggal_kunjungan', 'asc')
            ->orderByRaw("CASE WHEN status IN ('Disetujui', 'Selesai') THEN 0 ELSE 1 END")
            ->orderBy('jam_penerimaan', 'asc')
            ->get();

        $approvedVisits = [];
        foreach ($allVisitsModels as $p) {
            if ($p->tanggal_kunjungan) {
                $tgl = Carbon::parse($p->tanggal_kunjungan)->format('Y-m-d');
                if (!isset($approvedVisits[$tgl])) {
                    $approvedVisits[$tgl] = [];
                }
                $isApproved = in_array($p->status, ['Disetujui', 'Selesai']);
                $approvedVisits[$tgl][] = [
                    'id' => $p->id,
                    'status' => $p->status,
                    'is_approved' => $isApproved,
                    'instansi' => $p->instansi,
                    'nama_tamu' => $p->nama_ketua_rombongan ?: $p->nama_pic,
                    'jumlah_peserta' => (int) ($p->jumlah_peserta ?: 0),
                    'jam_penerimaan' => $p->jam_penerimaan ? Carbon::parse($p->jam_penerimaan)->format('H:i') . ' WIB' : null,
                ];
            }
        }

        return [
            'all_busy' => array_values(array_unique(array_merge($diblokir, $penuh))),
            'blocked' => array_values(array_unique($diblokir)),
            'blocked_details' => $blockedDetails,
            'full' => array_values(array_unique($penuh)),
            'approved_visits' => $approvedVisits,
            'kuota_per_hari' => $maxKuota,
        ];
    }

    public function getTanggalTerpakai(?int $dinasId = null): array
    {
        return $this->getKalenderAvailability($dinasId)['all_busy'];
    }
}
