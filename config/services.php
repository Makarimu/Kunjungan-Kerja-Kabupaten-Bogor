<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'recaptcha' => [
        'site_key' => env('RECAPTCHA_SITE_KEY', env('VITE_RECAPTCHA_SITE_KEY', '6LcxbZktAAAAAF2ul1Dyn5QypVrU65e8XJbe-HmB')),
        'secret_key' => env('RECAPTCHA_SECRET_KEY', env('VITE_RECAPTCHA_SECRET_KEY', '6LcxbZktAAAAAOXzpENxut9RXX8boVWE6luiPcn6')),
    ],

    'turnstile' => [
        'site_key' => env('CLOUDFLARE_TURNSTILE_SITE_KEY', env('VITE_CLOUDFLARE_TURNSTILE_SITE_KEY', '1x00000000000000000000AA')),
        'secret_key' => env('CLOUDFLARE_TURNSTILE_SECRET_KEY', '1x0000000000000000000000000000000AA'),
        'enabled' => env('CLOUDFLARE_TURNSTILE_ENABLED', true),
    ],

];
