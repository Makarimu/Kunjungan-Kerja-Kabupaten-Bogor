/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  turnstile?: {
    render: (
      container: string | HTMLElement,
      options: {
        sitekey: string;
        callback?: (token: string) => void;
        'error-callback'?: (code?: string) => void;
        'expired-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto' | string;
        size?: 'normal' | 'compact' | 'flexible' | string;
      }
    ) => string;
    reset: (widgetId?: string) => void;
    remove: (widgetId?: string) => void;
  };
  onTurnstileLoaded?: () => void;
}

