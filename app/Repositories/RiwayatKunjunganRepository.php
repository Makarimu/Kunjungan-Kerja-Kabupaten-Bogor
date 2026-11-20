<?php

namespace App\Repositories;

use App\Models\Permohonan;
use App\Models\Review;
use App\Repositories\Contracts\RiwayatKunjunganRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;

class RiwayatKunjunganRepository implements RiwayatKunjunganRepositoryInterface
{
    public function getRiwayatKunjungan(array $filters): LengthAwarePaginator
    {
        $permohonanTable = (new Permohonan)->getTable();

        // Query permohonan status Selesai atau Ringkasan_Terkirim yang memiliki review
        $query = Permohonan::query()
            ->whereIn('status', ['Selesai', 'Ringkasan_Terkirim'])
            ->whereHas('review', function ($q) {
                $q->where('status', 'approved');
            })
            ->with(['review', 'dinas']);

        // Filter Dinas Tujuan (Kabupaten Bogor)
        if (!empty($filters['dinas_id'])) {
            $dinasId = (int) $filters['dinas_id'];
            $query->where('dinas_id', $dinasId);
        }

        // Filter pencarian nama instansi pemohon atau dinas tujuan
        if (!empty($filters['search'])) {
            $search = trim($filters['search']);
            $query->where(function ($q) use ($search) {
                $q->where('instansi', 'like', "%{$search}%")
                  ->orWhere('dinas_tujuan', 'like', "%{$search}%")
                  ->orWhereHas('dinas', function ($qd) use ($search) {
                      $qd->where('nama', 'like', "%{$search}%")
                         ->orWhere('singkatan', 'like', "%{$search}%");
                  });
            });
        }

        // Filter rating (1-5)
        if (!empty($filters['rating'])) {
            $rating = (int) $filters['rating'];
            if ($rating >= 1 && $rating <= 5) {
                $query->whereHas('review', function ($q) use ($rating) {
                    $q->where('rating', $rating)->where('status', 'approved');
                });
            }
        }

        // Sorting
        $sort = $filters['sort'] ?? 'terbaru';
        if ($sort === 'terlama') {
            $query->orderBy(
                Review::select('created_at')
                    ->whereColumn('permohonan_id', "{$permohonanTable}.id")
                    ->limit(1),
                'asc'
            );
        } elseif ($sort === 'rating_tertinggi') {
            $query->orderBy(
                Review::select('rating')
                    ->whereColumn('permohonan_id', "{$permohonanTable}.id")
                    ->limit(1),
                'desc'
            )->orderBy('created_at', 'desc');
        } else {
            // Default: terbaru
            $query->orderBy(
                Review::select('created_at')
                    ->whereColumn('permohonan_id', "{$permohonanTable}.id")
                    ->limit(1),
                'desc'
            );
        }

        $perPage = isset($filters['per_page']) ? (int) $filters['per_page'] : 9;

        return $query->paginate($perPage);
    }

    public function getStatistik(): array
    {
        $baseQuery = Permohonan::query()
            ->whereIn('status', ['Selesai', 'Ringkasan_Terkirim'])
            ->whereHas('review', function ($q) {
                $q->where('status', 'approved');
            });

        $totalSelesai = (clone $baseQuery)->count();

        $avgRating = Review::where('status', 'approved')
            ->whereHas('permohonan', function ($q) {
                $q->whereIn('status', ['Selesai', 'Ringkasan_Terkirim']);
            })->avg('rating');

        return [
            'total_selesai'     => $totalSelesai,
            'total_review'      => $totalSelesai,
            'rata_rata_rating' => $avgRating ? round((float) $avgRating, 1) : 0,
        ];
    }
}
