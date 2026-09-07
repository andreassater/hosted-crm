/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute backend URL. Leave unset to use same-origin "/api" (dev proxy or Vercel rewrite). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
