import type {
  Lead,
  LeadInput,
  KeyClient,
  ClientInput,
  Meeting,
  MeetingInput,
  Suggestion,
  SuggestionInput,
  SuggestionCategory,
  SuggestionStatus,
} from '@/types'

import { supabase } from './supabase'

// Base URL for the API.
//   - Local dev / Vercel rewrite: leave VITE_API_URL unset → same-origin "/api/*".
//   - Direct cross-origin backend: set VITE_API_URL="https://api.example.com"
//     (the backend must allow this origin via CORS_ORIGIN).
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/** Attach the current Supabase access token (when auth is enabled). */
async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {}
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function http<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v) search.set(k, v)
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

// --- Leads ---
export const leadsApi = {
  list: (filters: { status?: string; search?: string } = {}) =>
    http<Lead[]>(`/api/leads${qs(filters)}`),
  create: (data: LeadInput) =>
    http<Lead>('/api/leads', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<LeadInput>) =>
    http<Lead>(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => http<void>(`/api/leads/${id}`, { method: 'DELETE' }),
}

// --- Key Clients ---
export const clientsApi = {
  list: (filters: { tier?: string; search?: string } = {}) =>
    http<KeyClient[]>(`/api/clients${qs(filters)}`),
  create: (data: ClientInput) =>
    http<KeyClient>('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ClientInput>) =>
    http<KeyClient>(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => http<void>(`/api/clients/${id}`, { method: 'DELETE' }),
}

// --- Meetings ---
export const meetingsApi = {
  list: (filters: { status?: string; from?: string; to?: string } = {}) =>
    http<Meeting[]>(`/api/meetings${qs(filters)}`),
  create: (data: MeetingInput) =>
    http<Meeting>('/api/meetings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<MeetingInput>) =>
    http<Meeting>(`/api/meetings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => http<void>(`/api/meetings/${id}`, { method: 'DELETE' }),
}

// --- Suggestions (improvement tips) ---
export const suggestionsApi = {
  list: (filters: { status?: string; category?: string } = {}) =>
    http<Suggestion[]>(`/api/suggestions${qs(filters)}`),
  create: (data: SuggestionInput) =>
    http<Suggestion>('/api/suggestions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { status?: SuggestionStatus; category?: SuggestionCategory }) =>
    http<Suggestion>(`/api/suggestions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => http<void>(`/api/suggestions/${id}`, { method: 'DELETE' }),
}
