import type { SuggestionCategory, SuggestionStatus } from '@/types'

export const CATEGORY_LABEL: Record<SuggestionCategory, string> = {
  FEATURE: 'Ny funksjon',
  IMPROVEMENT: 'Forbedring',
  BUG: 'Feil',
  OTHER: 'Annet',
}
export const CATEGORY_CLASS: Record<SuggestionCategory, string> = {
  FEATURE: 'bg-violet-100 text-violet-700',
  IMPROVEMENT: 'bg-sky-100 text-sky-700',
  BUG: 'bg-rose-100 text-rose-700',
  OTHER: 'bg-slate-100 text-slate-700',
}
export const STATUS_LABEL: Record<SuggestionStatus, string> = {
  NEW: 'Ny',
  PLANNED: 'Planlagt',
  DONE: 'Ferdig',
  DECLINED: 'Avvist',
}
export const STATUS_CLASS: Record<SuggestionStatus, string> = {
  NEW: 'bg-slate-100 text-slate-700',
  PLANNED: 'bg-amber-100 text-amber-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  DECLINED: 'bg-rose-100 text-rose-700',
}
