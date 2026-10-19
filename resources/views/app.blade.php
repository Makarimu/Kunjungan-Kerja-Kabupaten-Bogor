<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="{{ asset('image/logoK.png') }}?v=4" />
    <link rel="shortcut icon" type="image/png" href="{{ asset('image/logoK.png') }}?v=4" />
    <link rel="apple-touch-icon" href="{{ asset('image/logoK.png') }}?v=4" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sistem Kunjungan Kerja</title>
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
    <script>
      window.__APP_CONFIG__ = {
        baseUrl: @json(url('/')),
        basePath: @json(rtrim(request()->getBasePath() ?: (parse_url(url('/'), PHP_URL_PATH) ?: ''), '/')),
        apiUrl: @json(url('/api')),
        csrfToken: @json(csrf_token()),
        recaptchaSiteKey: @json(config('services.recaptcha.site_key') ?: env('VITE_RECAPTCHA_SITE_KEY')),
        turnstileSiteKey: @json(config('services.turnstile.site_key') ?: env('VITE_CLOUDFLARE_TURNSTILE_SITE_KEY', '1x00000000000000000000AA')),
      };
    </script>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/main.tsx'])
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
