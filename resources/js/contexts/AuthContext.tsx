import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { getMe, logout as apiLogout } from '../api/admin/auth';
import { getBasePath } from '../utils/url';

export const AuthContext = createContext<any>(null);

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 menit
const LAST_ACTIVITY_KEY = 'admin_last_activity';

// Helper pembersih sesi menyeluruh
const clearAuthStorage = () => {
  sessionStorage.removeItem('admin_token');
  sessionStorage.removeItem('admin_nama');
  sessionStorage.removeItem(LAST_ACTIVITY_KEY);
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_nama');
  localStorage.removeItem(LAST_ACTIVITY_KEY);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const logoutContext = useCallback(async (reason: 'timeout' | 'manual' = 'manual') => {
    try {
      await apiLogout();
    } catch {
      // ignore network errors on logout
    } finally {
      clearAuthStorage();
      setUser(null);
      const basePath = getBasePath();
      const target = reason === 'timeout' ? '/login?timeout=1' : '/login';
      const loginPath = basePath ? `${basePath}${target}` : target;
      const pureLoginPath = basePath ? `${basePath}/login` : '/login';
      if (window.location.pathname !== pureLoginPath || (reason === 'timeout' && !window.location.search.includes('timeout=1'))) {
        window.location.href = loginPath;
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      // Bersihkan sisa localStorage lama agar sesi hanya terikat pada tab saat ini (sessionStorage)
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_nama');
      localStorage.removeItem(LAST_ACTIVITY_KEY);

      // Gunakan sessionStorage: otomatis musnah saat tab ditutup
      const token = sessionStorage.getItem('admin_token');
      if (token) {
        // Cek apakah sesi sudah idle timeout saat tab tidak aktif
        const lastActivityStr = sessionStorage.getItem(LAST_ACTIVITY_KEY);
        if (lastActivityStr) {
          const lastActivity = parseInt(lastActivityStr, 10);
          if (!isNaN(lastActivity) && Date.now() - lastActivity >= IDLE_TIMEOUT_MS) {
            clearAuthStorage();
            if (isMounted) {
              setUser(null);
              setLoading(false);
            }
            const basePath = getBasePath();
            const currentPath = window.location.pathname;
            const adminPath = `${basePath}/admin`;
            const loginPath = basePath ? `${basePath}/login?timeout=1` : '/login?timeout=1';
            if (currentPath.startsWith(adminPath)) {
              window.location.href = loginPath;
            }
            return;
          }
        }

        try {
          const res = await getMe();
          if (isMounted) {
            if (res && res.success) {
              setUser(res.admin);
              sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
            } else {
              clearAuthStorage();
              setUser(null);
            }
          }
        } catch {
          if (isMounted) {
            clearAuthStorage();
            setUser(null);
          }
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const loginContext = useCallback((adminData: any, token: string) => {
    clearAuthStorage();
    // Simpan ke sessionStorage (otomatis terhapus seketika saat tab ditutup)
    sessionStorage.setItem('admin_token', token);
    sessionStorage.setItem('admin_nama', adminData.nama);
    sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    setUser(adminData);
  }, []);

  // Idle timeout activity listeners & interval checker (hanya aktif jika admin sedang login)
  useEffect(() => {
    if (!user) return;

    let lastSavedTime = Date.now();
    const existing = sessionStorage.getItem(LAST_ACTIVITY_KEY);
    if (!existing) {
      sessionStorage.setItem(LAST_ACTIVITY_KEY, lastSavedTime.toString());
    }

    const handleActivity = () => {
      const now = Date.now();
      // Throttle penulisan ke sessionStorage maksimal 1 kali per 3 detik
      if (now - lastSavedTime > 3000) {
        lastSavedTime = now;
        sessionStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const storedLastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
        const lastActive = storedLastActivity ? parseInt(storedLastActivity, 10) : lastSavedTime;
        if (Date.now() - lastActive >= IDLE_TIMEOUT_MS) {
          logoutContext('timeout');
        } else {
          handleActivity();
        }
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Cek secara berkala (setiap 10 detik) apakah idle sudah melebihi 30 menit
    const intervalId = setInterval(() => {
      const storedLastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
      const lastActive = storedLastActivity ? parseInt(storedLastActivity, 10) : lastSavedTime;
      if (Date.now() - lastActive >= IDLE_TIMEOUT_MS) {
        clearInterval(intervalId);
        logoutContext('timeout');
      }
    }, 10000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [user, logoutContext]);

  const value = useMemo(
    () => ({ user, loading, loginContext, logoutContext }),
    [user, loading, loginContext, logoutContext]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
