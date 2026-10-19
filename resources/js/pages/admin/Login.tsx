import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../../api/admin/auth';
import { AuthContext } from '../../contexts/AuthContext';
import { assetUrl, getTurnstileSiteKey } from '../../utils/url';

const LOGO_URL = assetUrl('/image/icon.png');
const BG_URL = assetUrl('/image/login_bg.jpg');

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onTurnstileLoaded?: () => void;
  }
}

export default function Login() {
  const navigate = useNavigate();
  const { loginContext } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const siteKey = getTurnstileSiteKey();

    const renderWidget = () => {
      if (!isMounted || !turnstileRef.current || !window.turnstile) return;
      if (widgetIdRef.current !== null) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
      try {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (isMounted) {
              setTurnstileToken(token);
              setError('');
            }
          },
          'expired-callback': () => {
            if (isMounted) setTurnstileToken('');
          },
          'error-callback': () => {
            if (isMounted) setTurnstileToken('');
          },
          theme: 'light',
        });
      } catch (e) {
        console.error('Turnstile render error:', e);
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
        const interval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(interval);
            if (isMounted) renderWidget();
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, []);

  const doLogin = async () => {
    if (!username || !password) {
      setError('Masukkan username dan password.');
      return;
    }
    if (!turnstileToken) {
      setError('Silakan selesaikan verifikasi Cloudflare Turnstile terlebih dahulu.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiLogin(username, password, turnstileToken);
      // Handle both response formats
      const token = res.data?.token || res.token;
      const userData = res.data?.user || res.data?.admin || res.user || res.admin || { name: username };
      
      if (!token) throw new Error('Token tidak ditemukan dalam respons');
      
      loginContext(userData, token);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Username atau password salah.');
      // Reset Turnstile widget so user gets a fresh challenge
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
          setTurnstileToken('');
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .login-screen { min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${BG_URL}') center/cover no-repeat; padding:24px; }
        .login-card { background:white; border-radius:20px; padding:40px 36px; width:100%; max-width:400px; box-shadow:0 24px 64px rgba(0,17,120,0.22); border:1px solid rgba(228, 231, 237, 0.8); }
        .login-logo { text-align:center; margin-bottom:28px; }
        .login-logo h2 { color:#001178; font-size:22px; font-weight:800; margin-top:12px; letter-spacing:-0.4px; }
        .login-logo p { color:#64748B; font-size:13.5px; margin-top:4px; }
        .login-field { display:flex; flex-direction:column; gap:6px; margin-bottom:18px; }
        .login-field label { font-size:12px; font-weight:700; color:#334155; text-transform:uppercase; letter-spacing:0.5px; }
        .login-field input { border:1px solid #D9DEE5; border-radius:8px; padding:11px 14px; min-height:44px; font-size:13.5px; font-family:inherit; background:#fff; width:100%; color:#0F172A; box-sizing:border-box; transition:border-color 0.2s, box-shadow 0.2s; }
        .login-field input:focus { outline:none; border-color:#0028B3; box-shadow:0 0 0 3.5px rgba(0,40,179,0.15); }
        .pw-wrapper { position:relative; }
        .pw-wrapper input { padding-right:44px !important; }
        .btn-pw { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#64748B; padding:4px; display:flex; align-items:center; transition:color 0.15s; }
        .btn-pw:hover { color:#0028B3; }
        .btn-login { width:100%; background:#0028B3; color:white; border:none; border-radius:8px; padding:12px; min-height:46px; font-size:14.5px; font-weight:700; cursor:pointer; font-family:inherit; transition:all 0.2s cubic-bezier(0.4,0,0.2,1); margin-top:6px; box-shadow:0 4px 16px rgba(0,40,179,0.25); display:inline-flex; align-items:center; justify-content:center; }
        .btn-login:hover:not(:disabled) { background:#001178; transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,17,120,0.3); }
        .btn-login:active:not(:disabled) { transform:translateY(0); }
        .btn-login:disabled { background:#94A3B8; cursor:not-allowed; transform:none; }
        .login-err { color:#B91C1C; font-size:13px; text-align:center; margin-top:14px; padding:8px 12px; background:#FEF2F2; border-radius:8px; border:1px solid #FCA5A5; }
      `}</style>
      <div className="login-screen">
        <div className="login-card">
          <div className="login-logo">
            <img src={LOGO_URL} alt="Bappenda Juara" style={{height:'48px',width:'auto',margin:'0 auto',display:'block'}} referrerPolicy="no-referrer"/>
            <h2>Login Admin</h2>
            <p>Sistem Kunjungan Kerja</p>
          </div>

          <div className="login-field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key==='Enter' && doLogin()}
              placeholder="Masukkan username"
            />
          </div>

          <div className="login-field">
            <label>Password</label>
            <div className="pw-wrapper">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key==='Enter' && doLogin()}
                placeholder="Masukkan password"
              />
              <button type="button" className="btn-pw" onClick={() => setShowPw(!showPw)}>
                {showPw ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Cloudflare Turnstile Verification */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', minHeight: '65px', width: '100%', overflow: 'hidden' }}>
            <div ref={turnstileRef} />
          </div>

          <button className="btn-login" disabled={loading} onClick={doLogin}>
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>

          {error && <p className="login-err">{error}</p>}
        </div>
      </div>
    </>
  );
}
