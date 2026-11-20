interface ImportMetaEnv {
  /** Browser key for Google Maps (Maps JavaScript API + Routes API). See .env.example. */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  /** Cloud-based map style id; defaults to Google's DEMO_MAP_ID. */
  readonly VITE_GOOGLE_MAP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
