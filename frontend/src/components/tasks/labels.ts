import type { TaskStatus } from '@/types'

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  OPEN: 'Åpen',
  DONE: 'Fullført',
}

export const TASK_STATUS_CLASS: Record<TaskStatus, string> = {
  OPEN: 'bg-sky-100 text-sky-700 ring-sky-200',
  DONE: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
}
