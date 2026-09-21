/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional; empty/missing → built-in live API origin in `apiBase.ts`. */
  readonly VITE_API_URL?: string;
  /** Dev only: Vite proxy target for `/api` (default http://localhost:3000). */
  readonly VITE_DEV_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
