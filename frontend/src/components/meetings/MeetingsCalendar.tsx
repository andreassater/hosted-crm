import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { meetingsApi } from '@/lib/api'
import { MEETING_STATUSES } from '@/types'
import type { Meeting } from '@/types'
import { MEETING_STATUS_CLASS, MEETING_STATUS_LABEL } from '@/lib/status'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { MeetingDialog } from './MeetingDialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const ALL = 'ALL'

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function MeetingsCalendar() {
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [status, setStatus] = useState<string>(ALL)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Meeting | null>(null)
  const [defaultDate, setDefaultDate] = useState<Date | null>(null)

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59)

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings', { month: dayKey(monthStart), status }],
    queryFn: () =>
      meetingsApi.list({
        from: monthStart.toISOString(),
        to: monthEnd.toISOString(),
        status: status === ALL ? undefined : status,
      }),
  })

  const byDay = useMemo(() => {
    const map = new Map<string, Meeting[]>()
    for (const m of meetings) {
      const k = dayKey(new Date(m.startTime))
      const list = map.get(k) ?? []
      list.push(m)
      map.set(k, list)
    }
    return map
  }, [meetings])

  // Build the grid: leading blanks for the weekday offset, then each day of month.
  const cells: (Date | null)[] = []
  for (let i = 0; i < monthStart.getDay(); i++) cells.push(null)
  for (let d = 1; d <= monthEnd.getDate(); d++) {
    cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d))
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function openNew(date?: Date) {
    setEditing(null)
    setDefaultDate(date ?? null)
    setDialogOpen(true)
  }
  function openEdit(m: Meeting) {
    setEditing(m)
    setDefaultDate(null)
    setDialogOpen(true)
  }
  const shiftMonth = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" aria-label="Next month" onClick={() => shiftMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-1 font-heading text-lg font-semibold">{monthLabel}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
          >
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {MEETING_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {MEETING_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => openNew()}>
            <Plus className="h-4 w-4" />
            Add meeting
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) {
              return <div key={i} className="min-h-24 border-r border-b bg-muted/20 last:border-r-0" />
            }
            const isToday = dayKey(date) === dayKey(today)
            const dayMeetings = byDay.get(dayKey(date)) ?? []
            return (
              <div
                key={i}
                className="group/day min-h-24 border-r border-b p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                      isToday ? 'bg-primary font-semibold text-primary-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {date.getDate()}
                  </span>
                  <button
                    type="button"
                    aria-label="Add meeting"
                    onClick={() => openNew(date)}
                    className="rounded p-0.5 text-muted-foreground opacity-0 transition hover:bg-muted group-hover/day:opacity-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-1 space-y-1">
                  {dayMeetings.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => openEdit(m)}
                      title={`${formatTime(m.startTime)} · ${m.title}`}
                      className={cn(
                        'block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] ring-1',
                        MEETING_STATUS_CLASS[m.status]
                      )}
                    >
                      <span className="font-medium">{formatTime(m.startTime)}</span> {m.title}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <MeetingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        meeting={editing}
        defaultDate={defaultDate}
      />
    </div>
  )
}
