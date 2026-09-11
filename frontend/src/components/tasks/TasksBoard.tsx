import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Building2, User as UserIcon, CheckCircle2, Circle, ListTodo } from 'lucide-react'
import { toast } from 'sonner'
import { tasksApi } from '@/lib/api'
import type { Task, TaskStatus } from '@/types'
import { useAuth, authEnabled } from '@/auth/AuthProvider'
import { formatDateNo, followUpBucket } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TaskDialog } from './TaskDialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = 'ALL'

/** Count of the current user's open, overdue tasks (drives the tab badge). */
export function useMyOverdueCount() {
  const { userId } = useAuth()
  const { data = [] } = useQuery({
    queryKey: ['tasks', { assignee: 'me', scope: 'overdue' }],
    queryFn: () => tasksApi.list({ assignee: 'me', scope: 'overdue' }),
    enabled: !authEnabled || !!userId,
  })
  return data.length
}

export function TasksBoard() {
  const qc = useQueryClient()
  const [mine, setMine] = useState(true)
  const [status, setStatus] = useState<string>(ALL)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  const filters = {
    assignee: mine ? ('me' as const) : undefined,
    status: status === ALL ? undefined : (status as TaskStatus),
  }

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksApi.list(filters),
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
    onSuccess: () => {
      invalidate()
      toast.success('Oppgave slettet')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setMine(true)}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-medium transition',
                mine ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
            >
              Mine oppgaver
            </button>
            <button
              type="button"
              onClick={() => setMine(false)}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-medium transition',
                !mine ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
            >
              Alle
            </button>
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle statuser</SelectItem>
              <SelectItem value="OPEN">Åpne</SelectItem>
              <SelectItem value="DONE">Fullførte</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Ny oppgave
        </Button>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-muted-foreground">Laster…</p>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <ListTodo className="h-7 w-7" />
          <p className="text-sm">
            {mine ? 'Du har ingen oppgaver her.' : 'Ingen oppgaver matcher filteret.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => {
            const overdue =
              t.status === 'OPEN' && t.dueDate && followUpBucket(t.dueDate) === 'overdue'
            const done = t.status === 'DONE'
            return (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
              >
                <button
                  type="button"
                  aria-label={done ? 'Merk som åpen' : 'Merk som fullført'}
                  className="mt-0.5 shrink-0"
                  onClick={() =>
                    toggle.mutate({ id: t.id, status: done ? 'OPEN' : 'DONE' })
                  }
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground transition hover:text-foreground" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p className={cn('font-medium', done && 'text-muted-foreground line-through')}>
                    {t.title}
                  </p>
                  {t.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="h-3.5 w-3.5" />
                      {t.assignee ? t.assignee.name || t.assignee.email : 'Uten ansvarlig'}
                    </span>
                    {t.dueDate && (
                      <span className={cn('font-medium', overdue && 'text-rose-600')}>
                        Forfall {formatDateNo(t.dueDate)}
                        {overdue && ' · forfalt'}
                      </span>
                    )}
                    {(t.client || t.lead) && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {t.client ? t.client.companyName : `${t.lead!.name} — ${t.lead!.company}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Rediger oppgave"
                    onClick={() => {
                      setEditing(t)
                      setDialogOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Slett oppgave"
                    onClick={() => {
                      if (confirm(`Slette oppgaven "${t.title}"?`)) remove.mutate(t.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editing} />
    </div>
  )
}
