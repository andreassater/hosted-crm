import type {
  Lead,
  LeadInput,
  KeyClient,
  ClientInput,
  Meeting,
  MeetingInput,
} from '@/types'

async function http<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
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
