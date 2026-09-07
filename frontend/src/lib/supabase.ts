import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Auth is enabled only when Supabase env vars are present. This lets the same build
 * run unauthenticated locally (no env → matches backend AUTH_DISABLED) and enforce
 * login in production (env set → matches backend requireAuth).
 */
export const authEnabled = Boolean(url && anonKey)

export const supabase = authEnabled ? createClient(url as string, anonKey as string) : null
