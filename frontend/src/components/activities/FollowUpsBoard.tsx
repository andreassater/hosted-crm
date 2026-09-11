import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, Building2, User, CalendarCheck } from 'lucide-react'
import { toast } from 'sonner'
import { activitiesApi } from '@/lib/api'
import type { FollowUp } from '@/types'
import { activityType } from './labels'
import { formatDateNo, followUpBucket } from '@/lib/format'
import type { FollowUpBucket } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/** Shared query for the follow-up list (also drives the header counter). */
export function useFollowUps() {
  return useQuery({ queryKey: ['followups'], queryFn: () => activitiesApi.followups() })
}

/** Count of follow-ups that need attention now (overdue + due today). */
export function dueCount(followups: FollowUp[]): number {
  return followups.filter(
    (f) => f.followUpAt && followUpBucket(f.followUpAt) !== 'upcoming'
  ).length
}

const GROUPS: { bucket: FollowUpBucket; label: string; dot: string }[] = [
  { bucket: 'overdue', label: 'Forfalt', dot: 'bg-rose-500' },
  { bucket: 'today', label: 'I dag', dot: 'bg-amber-500' },
  { bucket: 'upcoming', label: 'Kommende', dot: 'bg-slate-400' },
]

function parentLabel(f: FollowUp): { name: string; sub: string; Icon: typeof User } {
  if (f.client) return { name: f.client.companyName, sub: f.client.primaryContact, Icon: Building2 }
  if (f.lead) return { name: f.lead.name, sub: f.lead.company, Icon: User }
  return { name: 'Ukjent', sub: '', Icon: User }
}

export function FollowUpsBoard() {
  const qc = useQueryClient()
  const { data: followups = [], isLoading } = useFollowUps()

  const complete = useMutation({
    mutationFn: (id: string) => activitiesApi.update(id, { followUpDone: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['followups'] })
      qc.invalidateQueries({ queryKey: ['timeline'] })
      toast.success('Oppfølging fullført')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) {
    return <p className="py-10 text-center text-muted-foreground">Laster…</p>
  }

  if (followups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
        <CalendarCheck className="h-7 w-7" />
        <p className="text-sm">Ingen åpne oppfølginger. Alt er ajour 🎉</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {GROUPS.map(({ bucket, label, dot }) => {
        const rows = followups.filter((f) => f.followUpAt && followUpBucket(f.followUpAt) === bucket)
        if (rows.length === 0) return null
        return (
          <section key={bucket} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full', dot)} />
              <h3 className="font-heading text-sm font-semibold">{label}</h3>
              <span className="text-xs text-muted-foreground">({rows.length})</span>
            </div>
            <ul className="space-y-2">
              {rows.map((f) => {
                const parent = parentLabel(f)
                const { label: typeLabel, className } = activityType(f.type)
                return (
                  <li
                    key={f.id}
                    className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <parent.Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium">{parent.name}</span>
                        {parent.sub && (
                          <span className="text-xs text-muted-foreground">· {parent.sub}</span>
                        )}
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1',
                            className
                          )}
                        >
                          {typeLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Bell
                          className={cn(
                            'h-3.5 w-3.5 shrink-0',
                            bucket === 'overdue'
                              ? 'text-rose-600'
                              : bucket === 'today'
                                ? 'text-amber-600'
                                : 'text-muted-foreground'
                          )}
                        />
                        <span
                          className={cn(
                            'font-medium tabular-nums',
                            bucket === 'overdue' && 'text-rose-600'
                          )}
                        >
                          {formatDateNo(f.followUpAt!)}
                        </span>
                        {f.followUpNote && (
                          <span className="truncate text-muted-foreground">— {f.followUpNote}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => complete.mutate(f.id)}
                    >
                      <Check className="h-4 w-4" />
                      Ferdig
                    </Button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
