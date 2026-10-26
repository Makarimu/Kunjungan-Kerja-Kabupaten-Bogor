declare global {
  interface Window {
    __APP_CONFIG__?: {
      baseUrl?: string;
      basePath?: string;
      apiUrl?: string;
      csrfToken?: string;
      turnstileSiteKey?: string;
    };
  }
}

export const getTurnstileSiteKey = (): string => {
  if (typeof window !== 'undefined' && window.__APP_CONFIG__?.turnstileSiteKey) {
    return window.__APP_CONFIG__.turnstileSiteKey;
  }
  return import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || '0x4AAAAAAFXM8EJ0ckqHt88H';
};

export const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.__APP_CONFIG__?.baseUrl) {
    const urlStr = window.__APP_CONFIG__.baseUrl;
    const hostname = window.location.hostname;
    // If on localhost/127.0.0.1, ignore baseUrl if it points to a remote server
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      try {
        const parsed = new URL(urlStr, window.location.origin);
        if (parsed.hostname !== hostname) {
          return '';
        }
      } catch {
        // ignore
      }
    }
    return urlStr.replace(/\/+$/, '');
  }
  return '';
};

export const getBasePath = (): string => {
  if (typeof window !== 'undefined') {
    if (window.__APP_CONFIG__?.basePath !== undefined && window.__APP_CONFIG__.basePath !== '') {
      const configPath = window.__APP_CONFIG__.basePath.replace(/\/+$/, '');
      const hostname = window.location.hostname;
      // If on localhost/127.0.0.1, check if current path actually starts with config path
      // This prevents a production APP_URL path prefix from breaking local root serve
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        if (!window.location.pathname.startsWith(configPath)) {
          return '';
        }
      }
      return configPath;
    }
    // Fallback detection from window.location if config is empty / not injected
    const path = window.location.pathname;
    const match = path.match(/^(\/[^/]+\/public)/);
    if (match) return match[1];
  }
  return '';
};

export const getApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.__APP_CONFIG__?.apiUrl) {
    const urlStr = window.__APP_CONFIG__.apiUrl;
    const hostname = window.location.hostname;
    // If on localhost/127.0.0.1, ignore apiUrl if it points to a remote server
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      try {
        const parsed = new URL(urlStr, window.location.origin);
        if (parsed.hostname !== hostname) {
          const basePath = getBasePath();
          return basePath ? `${basePath}/api` : '/api';
        }
      } catch {
        // ignore
      }
    }
    return urlStr.replace(/\/+$/, '');
  }
  const customApi = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (customApi) return customApi;
  const basePath = getBasePath();
  return basePath ? `${basePath}/api` : '/api';
};

export const assetUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const baseUrl = getBaseUrl();
  if (baseUrl) {
    return `${baseUrl}/${cleanPath}`;
  }
  const basePath = getBasePath();
  return basePath ? `${basePath}/${cleanPath}` : `/${cleanPath}`;
};


