export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'LOST'
export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

export const LEAD_STATUSES: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'LOST',
]

export const MEETING_STATUSES: MeetingStatus[] = ['SCHEDULED', 'COMPLETED', 'CANCELLED']

export const CLIENT_TIERS = ['Gold', 'Platinum', 'Strategic'] as const
export type ClientTier = (typeof CLIENT_TIERS)[number]

export interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone: string | null
  status: LeadStatus
  value: string // Prisma Decimal is serialized as a string over JSON
  createdAt: string
  updatedAt: string
}

export interface KeyClient {
  id: string
  companyName: string
  primaryContact: string
  email: string
  phone: string | null
  tier: string
  annualRevenue: string
  createdAt: string
  updatedAt: string
}

export interface Meeting {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  status: MeetingStatus
  leadId: string | null
  clientId: string | null
  lead?: Lead | null
  client?: KeyClient | null
  createdAt: string
  updatedAt: string
}

export type LeadInput = {
  name: string
  company: string
  email: string
  phone?: string | null
  status: LeadStatus
  value: number
}

export type ClientInput = {
  companyName: string
  primaryContact: string
  email: string
  phone?: string | null
  tier: string
  annualRevenue: number
}

export type MeetingInput = {
  title: string
  description?: string | null
  startTime: string
  endTime: string
  status: MeetingStatus
  leadId?: string | null
  clientId?: string | null
}

export type SuggestionCategory = 'FEATURE' | 'IMPROVEMENT' | 'BUG' | 'OTHER'
export type SuggestionStatus = 'NEW' | 'PLANNED' | 'DONE' | 'DECLINED'

export const SUGGESTION_CATEGORIES: SuggestionCategory[] = [
  'FEATURE',
  'IMPROVEMENT',
  'BUG',
  'OTHER',
]
export const SUGGESTION_STATUSES: SuggestionStatus[] = ['NEW', 'PLANNED', 'DONE', 'DECLINED']

export interface Suggestion {
  id: string
  message: string
  category: SuggestionCategory
  status: SuggestionStatus
  submittedBy: string | null
  createdAt: string
  updatedAt: string
}

export type SuggestionInput = {
  message: string
  category: SuggestionCategory
}

// --- Activities (per-account log + follow-ups) ---
export type ActivityType = 'MEETING' | 'CALL' | 'EMAIL' | 'NOTE' | 'TASK' | 'OTHER'

export const ACTIVITY_TYPES: ActivityType[] = [
  'MEETING',
  'CALL',
  'EMAIL',
  'NOTE',
  'TASK',
  'OTHER',
]

export interface Activity {
  id: string
  type: ActivityType
  occurredAt: string
  note: string
  followUpAt: string | null
  followUpNote: string | null
  followUpDone: boolean
  followUpDoneAt: string | null
  leadId: string | null
  clientId: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

// Payload for creating an activity. Exactly one of leadId/clientId must be set.
export type ActivityInput = {
  type: ActivityType
  occurredAt: string
  note: string
  followUpAt?: string | null
  followUpNote?: string | null
  leadId?: string | null
  clientId?: string | null
}

// One entry in the merged timeline (activity or existing meeting).
export interface TimelineItem {
  id: string
  kind: 'activity' | 'meeting'
  type: string
  title: string | null
  note: string | null
  at: string
  followUpAt: string | null
  followUpNote: string | null
  followUpDone: boolean
  createdBy: string | null
}

// A follow-up row for the dashboard: an activity with its parent lead/client.
export interface FollowUp extends Activity {
  lead: Lead | null
  client: KeyClient | null
}
