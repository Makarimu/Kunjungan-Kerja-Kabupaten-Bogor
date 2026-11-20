<?php

namespace App\Services;

use App\Models\Permohonan;
use App\Models\Review;
use App\Repositories\Contracts\ReviewRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Exception;

class ReviewService
{
    public function __construct(
        private ReviewRepositoryInterface $reviewRepo
    ) {}

    /**
     * Pemohon mengirim review. Hanya bisa jika status = Selesai dan belum pernah review.
     */
    public function submitReview(Permohonan $permohonan, array $data): Review
    {
        if (!in_array($permohonan->status, ['Selesai', 'Ringkasan_Terkirim'])) {
            throw new Exception('Review hanya dapat diberikan setelah kunjungan selesai.');
        }

        $existing = $this->reviewRepo->findByPermohonanId($permohonan->id);
        if ($existing) {
            throw new Exception('Anda sudah pernah memberikan penilaian untuk permohonan ini.');
        }

        return DB::transaction(function () use ($permohonan, $data) {
            return $this->reviewRepo->create([
                'permohonan_id' => $permohonan->id,
                'rating'        => $data['rating'],
                'review'        => $data['review'],
                'status'        => 'pending',
            ]);
        });
    }

    /**
     * Admin menyetujui review.
     */
    public function approveReview(Review $review): Review
    {
        DB::transaction(function () use ($review) {
            $this->reviewRepo->update($review, ['status' => 'approved']);
        });

        return $review->fresh();
    }

    /**
     * Admin menolak review.
     */
    public function rejectReview(Review $review): Review
    {
        DB::transaction(function () use ($review) {
            $this->reviewRepo->update($review, ['status' => 'rejected']);
        });

        return $review->fresh();
    }
}
