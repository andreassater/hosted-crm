const currency = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'NOK',
  maximumFractionDigits: 0,
})

/** Format a numeric string/number as NOK (no øre). */
export function formatCurrency(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value
  return currency.format(Number.isFinite(n) ? n : 0)
}

/** Compact currency, e.g. 1,2 mill. kr. */
export function formatCompactCurrency(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number.isFinite(n) ? n : 0)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Norwegian date, e.g. "11. sep. 2026". */
export function formatDateNo(iso: string): string {
  return new Date(iso).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Norwegian date + time, e.g. "11. sep. 2026, 14:30". */
export function formatDateTimeNo(iso: string): string {
  return new Date(iso).toLocaleString('nb-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export type FollowUpBucket = 'overdue' | 'today' | 'upcoming'

/** Classify a follow-up date relative to today (local time). */
export function followUpBucket(iso: string): FollowUpBucket {
  const d = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
  if (d < startOfToday) return 'overdue'
  if (d < startOfTomorrow) return 'today'
  return 'upcoming'
}

/** Value for a datetime-local input (local time, no timezone suffix). */
export function toDateTimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}
