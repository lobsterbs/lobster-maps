/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PMTILES_URL?: string;
  readonly VITE_SATELLITE_TILES_URL?: string;
  readonly VITE_SATELLITE_ATTRIBUTION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
