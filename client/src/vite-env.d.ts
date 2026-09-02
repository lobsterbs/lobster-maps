/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAPTILER_KEY?: string;
  readonly VITE_ORS_KEY?: string;
  readonly VITE_MAPILLARY_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
