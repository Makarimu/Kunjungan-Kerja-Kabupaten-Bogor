<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Dinas;

class DinasController extends Controller
{
    private function ensureDinasReady(): void
    {
        try {
            if (!\Illuminate\Support\Facades\Schema::hasTable('app_md_dinas')) {
                \Illuminate\Support\Facades\Schema::create('app_md_dinas', function ($table) {
                    $table->id();
                    $table->string('nama', 200);
                    $table->string('singkatan', 50);
                    $table->string('nomor_telepon', 50)->nullable();
                    $table->unsignedInteger('kuota_per_hari')->default(2);
                    $table->double('latitude')->nullable();
                    $table->double('longitude')->nullable();
                    $table->timestamps();
                });
            } else {
                if (!\Illuminate\Support\Facades\Schema::hasColumn('app_md_dinas', 'kuota_per_hari')) {
                    \Illuminate\Support\Facades\Schema::table('app_md_dinas', function ($table) {
                        $table->unsignedInteger('kuota_per_hari')->default(2)->after('nomor_telepon');
                    });
                }
            }

            if (\Illuminate\Support\Facades\Schema::hasTable('app_md_dinas') && Dinas::count() === 0) {
                (new \Database\Seeders\DinasSeeder())->run();
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Auto-provisioning app_md_dinas: ' . $e->getMessage());
        }
    }

    // Public endpoint for visitor form dropdown
    public function listPublic()
    {
        $this->ensureDinasReady();
        $dinas = Dinas::orderBy('nama', 'asc')->get(['id', 'nama', 'singkatan', 'nomor_telepon', 'kuota_per_hari', 'latitude', 'longitude']);
        return response()->json([
            'success' => true,
            'data' => $dinas
        ]);
    }

    // Admin listing (all attributes)
    public function index()
    {
        $this->ensureDinasReady();
        $dinas = Dinas::orderBy('nama', 'asc')->get();
        return response()->json([
            'success' => true,
            'data' => $dinas
        ]);
    }

    // Super Admin: List dinas with quota settings
    public function getKuotaList()
    {
        $this->ensureDinasReady();
        $dinas = Dinas::orderBy('nama', 'asc')->get(['id', 'nama', 'singkatan', 'kuota_per_hari']);
        return response()->json([
            'success' => true,
            'data' => $dinas
        ]);
    }

    // Super Admin: Bulk update quotas
    public function updateKuotaBulk(Request $request)
    {
        if ($request->user() && $request->user()->dinas_id !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya Super Admin yang memiliki izin untuk mengatur kuota kunjungan.'
            ], 403);
        }

        $validated = $request->validate([
            'default_all' => 'nullable|integer|min:1|max:50',
            'items' => 'nullable|array',
            'items.*.id' => 'required_with:items|integer|exists:app_md_dinas,id',
            'items.*.kuota_per_hari' => 'required_with:items|integer|min:1|max:50',
        ]);

        \Illuminate\Support\Facades\DB::transaction(function () use ($validated) {
            // Jika ada opsi set semua dinas ke kuota tertentu
            if (isset($validated['default_all']) && (int)$validated['default_all'] >= 1) {
                Dinas::query()->update(['kuota_per_hari' => (int)$validated['default_all']]);
            }

            // Update item per dinas jika diberikan
            if (!empty($validated['items'])) {
                foreach ($validated['items'] as $item) {
                    Dinas::where('id', $item['id'])->update([
                        'kuota_per_hari' => (int)$item['kuota_per_hari']
                    ]);
                }
            }
        });

        $updated = Dinas::orderBy('nama', 'asc')->get(['id', 'nama', 'singkatan', 'kuota_per_hari']);

        return response()->json([
            'success' => true,
            'message' => 'Kuota kunjungan berhasil diperbarui.',
            'data' => $updated
        ]);
    }

    // Super Admin: Update single dinas quota
    public function updateKuotaSingle(Request $request, $id)
    {
        if ($request->user() && $request->user()->dinas_id !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya Super Admin yang memiliki izin untuk mengatur kuota kunjungan.'
            ], 403);
        }

        $dinas = Dinas::findOrFail($id);

        $validated = $request->validate([
            'kuota_per_hari' => 'required|integer|min:1|max:50',
        ]);

        $dinas->update(['kuota_per_hari' => $validated['kuota_per_hari']]);

        return response()->json([
            'success' => true,
            'message' => "Kuota kunjungan untuk {$dinas->singkatan} berhasil diatur ke {$dinas->kuota_per_hari} rombongan/hari.",
            'data' => $dinas
        ]);
    }

    // Store new Dinas
    public function store(Request $request)
    {
        if ($request->user() && $request->user()->dinas_id !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya Super Admin yang memiliki izin untuk menambah master data dinas.'
            ], 403);
        }

        $validated = $request->validate([
            'nama' => 'required|string|max:200',
            'singkatan' => 'required|string|max:50',
            'nomor_telepon' => 'nullable|string|max:50',
            'kuota_per_hari' => 'nullable|integer|min:1|max:50',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        if (empty($validated['kuota_per_hari'])) {
            $validated['kuota_per_hari'] = 2;
        }

        $dinas = Dinas::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Dinas berhasil ditambahkan.',
            'data' => $dinas
        ], 201);
    }

    // Update Dinas
    public function update(Request $request, $id)
    {
        if ($request->user() && $request->user()->dinas_id !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya Super Admin yang memiliki izin untuk mengubah master data dinas.'
            ], 403);
        }

        $dinas = Dinas::findOrFail($id);

        $validated = $request->validate([
            'nama' => 'required|string|max:200',
            'singkatan' => 'required|string|max:50',
            'nomor_telepon' => 'nullable|string|max:50',
            'kuota_per_hari' => 'nullable|integer|min:1|max:50',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        $dinas->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Dinas berhasil diperbarui.',
            'data' => $dinas
        ]);
    }

    // Destroy Dinas
    public function destroy(Request $request, $id)
    {
        if ($request->user() && $request->user()->dinas_id !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya Super Admin yang memiliki izin untuk menghapus master data dinas.'
            ], 403);
        }

        $dinas = Dinas::findOrFail($id);
        $dinas->delete();

        return response()->json([
            'success' => true,
            'message' => 'Dinas berhasil dihapus.'
        ]);
    }
}
