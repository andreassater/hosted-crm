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
