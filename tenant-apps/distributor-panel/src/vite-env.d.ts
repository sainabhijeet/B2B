/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_STOREFRONT_DEV_ORIGIN?: string;
  readonly VITE_STOREFRONT_PORT?: string;
  readonly VITE_MOBILE_APP_PREVIEW_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
