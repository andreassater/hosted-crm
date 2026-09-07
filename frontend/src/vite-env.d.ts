/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute backend URL. Leave unset to use same-origin "/api" (dev proxy or Vercel rewrite). */
  readonly VITE_API_URL?: string
  /** Supabase project URL. When set (with the anon key), the app requires login. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anonymous (public) key. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
