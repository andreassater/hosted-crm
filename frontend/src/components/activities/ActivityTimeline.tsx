import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Bell, Check, Trash2, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import { activitiesApi } from '@/lib/api'
import type { TimelineItem } from '@/types'
import { activityType } from './labels'
import { ActivityDialog } from './ActivityDialog'
import { formatDateTimeNo, formatDateNo, followUpBucket } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type Props = {
  leadId?: string
  clientId?: string
  name: string
}

const BUCKET_CLASS = {
  overdue: 'bg-rose-50 text-rose-700 ring-rose-200',
  today: 'bg-amber-50 text-amber-700 ring-amber-200',
  upcoming: 'bg-slate-50 text-slate-600 ring-slate-200',
} as const

export function ActivityTimeline({ leadId, clientId, name }: Props) {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const parentFilter = leadId ? { leadId } : clientId ? { clientId } : {}

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['timeline', parentFilter],
    queryFn: () => activitiesApi.timeline(parentFilter),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['timeline', parentFilter] })
    qc.invalidateQueries({ queryKey: ['followups'] })
  }

  const complete = useMutation({
    mutationFn: (id: string) => activitiesApi.update(id, { followUpDone: true }),
    onSuccess: () => {
      invalidate()
      toast.success('Oppfølging fullført')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => activitiesApi.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success('Aktivitet slettet')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground">Aktivitetslogg</h4>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Logg aktivitet
        </Button>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Laster…</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Ingen aktiviteter ennå. Logg den første.
        </p>
      ) : (
        <ol className="space-y-3 border-l pl-4">
          {items.map((item: TimelineItem) => {
            const { label, className, Icon } = activityType(item.type)
            const openFollowUp = Boolean(item.followUpAt && !item.followUpDone)
            const bucket = item.followUpAt ? followUpBucket(item.followUpAt) : null
            return (
              <li key={`${item.kind}-${item.id}`} className="relative">
                <span className="absolute top-1 -left-[1.4rem] flex h-6 w-6 items-center justify-center rounded-full bg-background ring-1 ring-foreground/10">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1',
                          className
                        )}
                      >
                        {label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTimeNo(item.at)}
                      </span>
                      {item.kind === 'meeting' && (
                        <span className="text-xs text-muted-foreground">· fra kalender</span>
                      )}
                    </div>
                    {item.kind === 'activity' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Slett aktivitet"
                        className="-mt-1 -mr-1 h-7 w-7 shrink-0"
                        onClick={() => {
                          if (confirm('Slette denne aktiviteten?')) remove.mutate(item.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    )}
                  </div>

                  {item.title && <p className="mt-2 text-sm font-medium">{item.title}</p>}
                  {item.note && (
                    <p className="mt-1 text-sm whitespace-pre-wrap text-foreground/90">
                      {item.note}
                    </p>
                  )}

                  {item.followUpAt && bucket && (
                    <div
                      className={cn(
                        'mt-3 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs ring-1',
                        item.followUpDone
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : BUCKET_CLASS[bucket]
                      )}
                    >
                      <Bell className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1">
                        <span className="font-medium">Oppfølging {formatDateNo(item.followUpAt)}</span>
                        {item.followUpNote ? ` — ${item.followUpNote}` : ''}
                        {item.followUpDone && ' (fullført)'}
                      </span>
                      {openFollowUp && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 gap-1 px-2 text-xs"
                          onClick={() => complete.mutate(item.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Ferdig
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {items.length === 0 && !isLoading && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          Møter fra kalenderen dukker opp her automatisk.
        </div>
      )}

      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        leadId={leadId}
        clientId={clientId}
        name={name}
      />
    </div>
  )
}
