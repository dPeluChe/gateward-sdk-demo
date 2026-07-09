/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GATEWARD_URL?: string;
  readonly VITE_GATEWARD_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
