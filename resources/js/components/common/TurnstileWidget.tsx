import React, { useEffect, useRef, useState, memo } from 'react';
import { getTurnstileSiteKey } from '../../utils/url';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (err?: string) => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  style?: React.CSSProperties;
}


export const TurnstileWidget = memo(function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  theme = 'light',
  className = '',
  style = {},
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState<string>('');
  const [verified, setVerified] = useState<boolean>(false);
  const siteKey = getTurnstileSiteKey();

  // Gunakan ref untuk callbacks agar re-render parent tidak memicu useEffect ulang
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let isMounted = true;

    if (!siteKey) {
      setLoadError('Cloudflare Turnstile site key belum dikonfigurasi.');
      return;
    }

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      if (widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (isMounted) {
              setLoadError('');
              setVerified(true);
              onVerifyRef.current(token);
            }
          },
          'expired-callback': () => {
            if (isMounted) {
              setVerified(false);
              onExpireRef.current?.();
            }
          },
          'error-callback': (code?: string) => {
            if (isMounted) {
              setVerified(false);
              const msg = 'Verifikasi Cloudflare Turnstile gagal. Silakan muat ulang atau coba lagi.';
              setLoadError(msg);
              onErrorRef.current?.(code || msg);
            }
          },
          theme,
        });
      } catch (err: any) {
        if (isMounted) {
          setLoadError('Gagal memuat widget verifikasi keamanan.');
          onErrorRef.current?.(err?.message);
        }
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.querySelector('script[src*="turnstile/v0/api.js"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoaded&render=explicit';
        script.async = true;
        script.defer = true;
        window.onTurnstileLoaded = () => {
          if (isMounted) renderWidget();
        };
        document.head.appendChild(script);
      } else {
        const checkInterval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(checkInterval);
            if (isMounted) renderWidget();
          }
        }, 100);
        return () => clearInterval(checkInterval);
      }
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme]); // Hanya re-run jika siteKey atau theme berubah!

  return (
    <div
      className={`turnstile-wrapper ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '75px',
        ...style,
      }}
    >
      <div ref={containerRef} />
      {verified && (
        <span style={{ color: '#16A34A', fontSize: '12px', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ✓ Verifikasi berhasil
        </span>
      )}
      {loadError && (
        <p style={{ color: '#B91C1C', fontSize: '12px', marginTop: '6px', textAlign: 'center' }}>
          {loadError}
        </p>
      )}
    </div>
  );
});

export default TurnstileWidget;
