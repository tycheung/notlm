/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Optional public web app origin for share links (e.g. https://app.example.com) */
  readonly VITE_PUBLIC_APP_URL?: string;
  /** Poll CloudFront /live/* instead of API SSE for published boards. */
  readonly VITE_LIVE_SCORES_CDN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 