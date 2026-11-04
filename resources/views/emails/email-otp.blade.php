<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kode Verifikasi Email Kunjungan Kerja</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr>
            <td style="background: linear-gradient(135deg, #001178 0%, #0028B3 60%, #1883FF 100%); padding: 32px 30px; text-align: center;">
                <img src="{{ $emailLogoUrl ?? (str_starts_with(config('app.url'), 'https://') ? asset('image/icon.png') : 'https://raw.githubusercontent.com/Makarimu/Revisi-Bapenda/main/public/image/icon.png') }}" alt="Kabupaten Bogor" style="height: 50px; width: auto; max-width: 240px; margin-bottom: 12px; display: inline-block; border: 0; background: transparent;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.3px;">Verifikasi Email Pemohon</h1>
                <p style="color: #C5DBFF; margin: 6px 0 0 0; font-size: 13px;">Sistem Informasi Kunjungan Kerja Kabupaten Bogor</p>
            </td>
        </tr>

        <!-- Body Content -->
        <tr>
            <td style="padding: 36px 32px;">
                <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.6; color: #374151;">
                    Halo,<br>
                    Kami menerima permintaan verifikasi email untuk pengajuan permohonan kunjungan kerja ke Pemerintah Kabupaten Bogor menggunakan alamat email: <strong>{{ $email }}</strong>.
                </p>

                <p style="margin: 0 0 22px 0; font-size: 14px; line-height: 1.5; color: #4B5563;">
                    Gunakan 6 digit kode OTP verifikasi berikut untuk melanjutkan formulir pendaftaran Anda:
                </p>

                <!-- OTP Code Card -->
                <div style="background: #F8FAFC; border: 2px dashed #0028B3; border-radius: 12px; padding: 22px; margin-bottom: 24px; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 1.5px; text-transform: uppercase;">KODE VERIFIKASI (OTP)</p>
                    <div style="margin: 0 auto; display: inline-block; font-size: 36px; font-weight: 800; color: #0028B3; letter-spacing: 8px; font-family: 'Consolas', 'Courier New', monospace; padding: 6px 16px; background: #EFF6FF; border-radius: 8px; border: 1px solid #BFDBFE;">
                        {{ $otp }}
                    </div>
                    <p style="margin: 12px 0 0 0; font-size: 12px; color: #DC2626; font-weight: 600;">
                        ⏱ Berlaku selama 10 menit
                    </p>
                </div>

                <!-- Info Alert -->
                <div style="background-color: #FEF9C3; border: 1px solid #FDE047; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 12.5px; line-height: 1.5; color: #854D0E;">
                        <strong>⚠️ Penting:</strong> Jangan bagikan kode verifikasi ini kepada siapapun demi keamanan data Anda. Jika Anda tidak merasa mengajukan permohonan kunjungan kerja di Kabupaten Bogor, silakan abaikan email ini.
                    </p>
                </div>

                <p style="margin: 0; font-size: 13.5px; line-height: 1.5; color: #6B7280;">
                    Terima kasih,<br>
                    <strong>Tim Pelayanan Kunjungan Kerja</strong><br>
                    Pemerintah Kabupaten Bogor
                </p>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 30px; text-align: center;">
                <p style="margin: 0; font-size: 11.5px; color: #94A3B8; line-height: 1.5;">
                    Pesan ini dibuat secara otomatis oleh sistem. Mohon tidak membalas langsung ke alamat email ini.<br>
                    &copy; {{ date('Y') }} Badan Pendapatan Daerah (Bappenda) Pemerintah Kabupaten Bogor.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>

