<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Dinas extends Model
{
    use HasFactory;

    protected $table = 'app_md_dinas';

    protected $fillable = [
        'nama',
        'singkatan',
        'nomor_telepon',
        'kuota_per_hari',
        'latitude',
        'longitude',
    ];

    protected $casts = [
        'kuota_per_hari' => 'integer',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    public function permohonan(): HasMany
    {
        return $this->hasMany(Permohonan::class, 'dinas_id');
    }

    public function admins(): HasMany
    {
        return $this->hasMany(Admin::class, 'dinas_id');
    }
}
