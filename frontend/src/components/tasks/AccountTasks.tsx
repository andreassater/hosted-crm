import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react'
import { toast } from 'sonner'
import { tasksApi } from '@/lib/api'
import type { TaskStatus } from '@/types'
import { formatDateNo, followUpBucket } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TaskDialog } from './TaskDialog'
import { Button } from '@/components/ui/button'

type Props = {
  leadId?: string
  clientId?: string
}

/** Compact task list for a single lead/client, shown in its expandable panel. */
export function AccountTasks({ leadId, clientId }: Props) {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const filter = leadId ? { leadId } : clientId ? { clientId } : {}

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: () => tasksApi.list(filter),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tasks'] })
    qc.invalidateQueries({ queryKey: ['leads'] })
    qc.invalidateQueries({ queryKey: ['clients'] })
  }

  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksApi.update(id, { status }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  })
  const remove = useMutation({
    mutationFn: (id: string) => tasksApi.remove(id),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground">Oppgaver</h4>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Ny oppgave
        </Button>
      </div>

      {isLoading ? (
        <p className="py-2 text-sm text-muted-foreground">Laster…</p>
      ) : tasks.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Ingen oppgaver ennå.</p>
      ) : (
        <ul className="space-y-1.5">
          {tasks.map((t) => {
            const done = t.status === 'DONE'
            const overdue = !done && t.dueDate && followUpBucket(t.dueDate) === 'overdue'
            return (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-foreground/10"
              >
                <button
                  type="button"
                  aria-label={done ? 'Merk som åpen' : 'Merk som fullført'}
                  onClick={() => toggle.mutate({ id: t.id, status: done ? 'OPEN' : 'DONE' })}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
                <span className={cn('flex-1 truncate', done && 'text-muted-foreground line-through')}>
                  {t.title}
                </span>
                {t.dueDate && (
                  <span className={cn('shrink-0 text-xs', overdue ? 'text-rose-600' : 'text-muted-foreground')}>
                    {formatDateNo(t.dueDate)}
                  </span>
                )}
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t.assignee ? t.assignee.name || t.assignee.email : '—'}
                </span>
                <button
                  type="button"
                  aria-label="Slett oppgave"
                  className="shrink-0"
                  onClick={() => {
                    if (confirm(`Slette oppgaven "${t.title}"?`)) remove.mutate(t.id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultLeadId={leadId}
        defaultClientId={clientId}
        lockParent
      />
    </div>
  )
}
