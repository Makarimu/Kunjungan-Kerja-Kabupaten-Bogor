<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repositories\Contracts\PermohonanRepositoryInterface;
use App\Repositories\PermohonanRepository;
use App\Repositories\Contracts\TanggalDiblokirRepositoryInterface;
use App\Repositories\TanggalDiblokirRepository;
use App\Repositories\Contracts\KontakTeleponRepositoryInterface;
use App\Repositories\KontakTeleponRepository;
use App\Repositories\Contracts\ReviewRepositoryInterface;
use App\Repositories\ReviewRepository;
use App\Repositories\Contracts\RiwayatKunjunganRepositoryInterface;
use App\Repositories\RiwayatKunjunganRepository;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\View;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoTransportFactory;
use Symfony\Component\Mailer\Transport\Dsn;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(PermohonanRepositoryInterface::class, PermohonanRepository::class);
        $this->app->bind(TanggalDiblokirRepositoryInterface::class, TanggalDiblokirRepository::class);
        $this->app->bind(KontakTeleponRepositoryInterface::class, KontakTeleponRepository::class);
        $this->app->bind(ReviewRepositoryInterface::class, ReviewRepository::class);
        $this->app->bind(RiwayatKunjunganRepositoryInterface::class, RiwayatKunjunganRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register Brevo (Sendinblue) as a custom mail transport driver
        Mail::extend('brevo', function (array $config = []) {
            $apiKey = $config['key'] ?? config('services.brevo.key');

            return (new BrevoTransportFactory())
                ->create(new Dsn('brevo+api', 'default', $apiKey));
        });
        $host = (string) (request()->getHost() ?: '');
        $isLocalHost = str_contains($host, '127.0.0.1') || str_contains($host, 'localhost');
        if ($this->app->environment('production') && !$isLocalHost) {
            URL::forceScheme('https');
        }

        View::composer('emails.*', function ($view) {
            $customUrl = env('EMAIL_LOGO_URL');
            if (!empty($customUrl)) {
                $logoUrl = $customUrl;
            } elseif (app()->environment('production') || (str_starts_with((string) config('app.url'), 'https://') && !str_contains((string) config('app.url'), 'localhost') && !str_contains((string) config('app.url'), '127.0.0.1'))) {
                $logoUrl = asset('image/icon.png');
            } else {
                $logoUrl = 'https://raw.githubusercontent.com/Makarimu/Revisi-Bapenda/main/public/image/icon.png';
            }

            $view->with('emailLogoUrl', $logoUrl);
        });

        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)
            ->by(strtolower((string) $request->input('username')).'|'.$request->ip()));
        RateLimiter::for('public-api', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));
        RateLimiter::for('admin-api', fn (Request $request) => Limit::perMinute(120)
            ->by((string) optional($request->user())->getAuthIdentifier() ?: $request->ip()));
    }
}
