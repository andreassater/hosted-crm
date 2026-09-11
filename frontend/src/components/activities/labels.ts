import { Users, Phone, Mail, StickyNote, ListChecks, Circle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ActivityType } from '@/types'

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  MEETING: 'Møte',
  CALL: 'Samtale',
  EMAIL: 'E-post',
  NOTE: 'Notat',
  TASK: 'Oppgave',
  OTHER: 'Annet',
}

// Badge colours per type (background + text + ring).
export const ACTIVITY_TYPE_CLASS: Record<ActivityType, string> = {
  MEETING: 'bg-sky-100 text-sky-700 ring-sky-200',
  CALL: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  EMAIL: 'bg-violet-100 text-violet-700 ring-violet-200',
  NOTE: 'bg-slate-100 text-slate-700 ring-slate-200',
  TASK: 'bg-amber-100 text-amber-700 ring-amber-200',
  OTHER: 'bg-slate-100 text-slate-700 ring-slate-200',
}

export const ACTIVITY_TYPE_ICON: Record<ActivityType, LucideIcon> = {
  MEETING: Users,
  CALL: Phone,
  EMAIL: Mail,
  NOTE: StickyNote,
  TASK: ListChecks,
  OTHER: Circle,
}

/** Look up label/class/icon for a raw type string (timeline items are widened to string). */
export function activityType(type: string) {
  const t = (type in ACTIVITY_TYPE_LABEL ? type : 'OTHER') as ActivityType
  return { label: ACTIVITY_TYPE_LABEL[t], className: ACTIVITY_TYPE_CLASS[t], Icon: ACTIVITY_TYPE_ICON[t] }
}
