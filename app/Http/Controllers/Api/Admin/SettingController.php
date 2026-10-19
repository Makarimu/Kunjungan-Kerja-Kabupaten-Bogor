<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Get public topbar settings
     */
    public function getPublicSettings()
    {
        $settings = [
            'header_telepon' => Setting::get('header_telepon', 'Telp: (021) 875-8605'),
            'header_jam_layanan' => Setting::get('header_jam_layanan', 'Jam Layanan: Senin – Jumat (08.00 – 16.00 WIB)'),
            'header_link_portal_bogor' => Setting::get('header_link_portal_bogor', 'https://bogorkab.go.id'),
            'header_link_portal_ekabo' => Setting::get('header_link_portal_ekabo', 'https://ekabo.bogorkab.go.id'),
            'min_hari_kunjungan' => (int) Setting::get('min_hari_kunjungan', 1),
        ];

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    /**
     * Get all admin settings
     */
    public function getAdminSettings(Request $request)
    {
        if ($request->user() && $request->user()->dinas_id !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya Super Admin yang berhak mengakses pengaturan publik.',
            ], 403);
        }

        $settings = Setting::all()->pluck('value', 'key');

        return response()->json([
            'success' => true,
            'data' => [
                'header_telepon' => $settings->get('header_telepon', 'Telp: (021) 875-8605'),
                'header_jam_layanan' => $settings->get('header_jam_layanan', 'Jam Layanan: Senin – Jumat (08.00 – 16.00 WIB)'),
                'header_link_portal_bogor' => $settings->get('header_link_portal_bogor', 'https://bogorkab.go.id'),
                'header_link_portal_ekabo' => $settings->get('header_link_portal_ekabo', 'https://ekabo.bogorkab.go.id'),
                'min_hari_kunjungan' => (int) $settings->get('min_hari_kunjungan', 1),
            ],
        ]);
    }

    /**
     * Update settings
     */
    public function updateSettings(Request $request)
    {
        if ($request->user() && $request->user()->dinas_id !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya Super Admin yang berhak mengubah pengaturan publik.',
            ], 403);
        }

        $validated = $request->validate([
            'header_telepon' => 'nullable|string|max:255',
            'header_jam_layanan' => 'nullable|string|max:255',
            'header_link_portal_bogor' => 'nullable|string|max:500',
            'header_link_portal_ekabo' => 'nullable|string|max:500',
            'min_hari_kunjungan' => 'nullable|integer|min:1|max:60',
        ]);

        foreach ($validated as $key => $value) {
            Setting::set($key, $value !== null ? (string)$value : null);
        }

        return response()->json([
            'success' => true,
            'message' => 'Pengaturan berhasil diperbarui.',
            'data' => [
                'header_telepon' => Setting::get('header_telepon'),
                'header_jam_layanan' => Setting::get('header_jam_layanan'),
                'header_link_portal_bogor' => Setting::get('header_link_portal_bogor'),
                'header_link_portal_ekabo' => Setting::get('header_link_portal_ekabo'),
                'min_hari_kunjungan' => (int) Setting::get('min_hari_kunjungan', 1),
            ],
        ]);
    }
}
