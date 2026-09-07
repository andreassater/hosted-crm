import type { LeadStatus, MeetingStatus } from '@/types'

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  PROPOSAL_SENT: 'Proposal Sent',
  LOST: 'Lost',
}

// Tailwind classes per lead status (badge background/text).
export const LEAD_STATUS_CLASS: Record<LeadStatus, string> = {
  NEW: 'bg-slate-100 text-slate-700',
  CONTACTED: 'bg-sky-100 text-sky-700',
  QUALIFIED: 'bg-violet-100 text-violet-700',
  PROPOSAL_SENT: 'bg-amber-100 text-amber-700',
  LOST: 'bg-rose-100 text-rose-700',
}

export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const MEETING_STATUS_CLASS: Record<MeetingStatus, string> = {
  SCHEDULED: 'bg-sky-100 text-sky-700 ring-sky-200',
  COMPLETED: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  CANCELLED: 'bg-rose-100 text-rose-700 ring-rose-200',
}

export const TIER_CLASS: Record<string, string> = {
  Gold: 'bg-amber-100 text-amber-700 ring-amber-200',
  Platinum: 'bg-slate-200 text-slate-700 ring-slate-300',
  Strategic: 'bg-violet-100 text-violet-700 ring-violet-200',
}

export function tierClass(tier: string): string {
  return TIER_CLASS[tier] ?? 'bg-slate-100 text-slate-700 ring-slate-200'
}
