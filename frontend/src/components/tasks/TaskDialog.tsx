import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { tasksApi, leadsApi, clientsApi } from '@/lib/api'
import type { Task, TaskInput } from '@/types'
import { useAuth } from '@/auth/AuthProvider'
import { OwnerSelect } from '@/components/users/OwnerSelect'
import { toDateTimeLocal } from '@/lib/format'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  // Prefill + lock the linked account/deal when opened from its panel.
  defaultLeadId?: string
  defaultClientId?: string
  lockParent?: boolean
}

const NONE = 'none'

type FormState = {
  title: string
  description: string
  assigneeId: string | null
  dueDate: string // datetime-local or ''
  relatedTo: string // 'none' | 'lead:<id>' | 'client:<id>'
}

function relatedFrom(leadId?: string | null, clientId?: string | null): string {
  if (leadId) return `lead:${leadId}`
  if (clientId) return `client:${clientId}`
  return NONE
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultLeadId,
  defaultClientId,
  lockParent,
}: Props) {
  const qc = useQueryClient()
  const { userId } = useAuth()
  const isEdit = Boolean(task)

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    assigneeId: null,
    dueDate: '',
    relatedTo: NONE,
  })

  // Only need the pickers when the parent isn't locked.
  const { data: leads = [] } = useQuery({
    queryKey: ['leads', 'all'],
    queryFn: () => leadsApi.list(),
    enabled: open && !lockParent,
  })
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => clientsApi.list(),
    enabled: open && !lockParent,
  })

  useEffect(() => {
    if (!open) return
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? '',
        assigneeId: task.assigneeId,
        dueDate: task.dueDate ? toDateTimeLocal(task.dueDate) : '',
        relatedTo: relatedFrom(task.leadId, task.clientId),
      })
    } else {
      setForm({
        title: '',
        description: '',
        assigneeId: userId, // default new tasks to me
        dueDate: '',
        relatedTo: relatedFrom(defaultLeadId, defaultClientId),
      })
    }
  }, [open, task, userId, defaultLeadId, defaultClientId])

  const mutation = useMutation({
    mutationFn: (data: TaskInput) =>
      isEdit && task ? tasksApi.update(task.id, data) : tasksApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success(isEdit ? 'Oppgave oppdatert' : 'Oppgave opprettet')
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    const [kind, id] = form.relatedTo.split(':')
    mutation.mutate({
      title: form.title,
      description: form.description || null,
      assigneeId: form.assigneeId,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      leadId: kind === 'lead' ? id : null,
      clientId: kind === 'client' ? id : null,
    })
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Rediger oppgave' : 'Ny oppgave'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Oppdater oppgaven.' : 'Opprett en oppgave og tildel den til noen.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="task-title">Tittel</Label>
              <Input
                id="task-title"
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-desc">Beskrivelse</Label>
              <Textarea
                id="task-desc"
                rows={2}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Ansvarlig</Label>
                <OwnerSelect
                  value={form.assigneeId}
                  onChange={(v) => set('assigneeId', v)}
                  noneLabel="Ingen ansvarlig"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-due">Forfallsdato</Label>
                <Input
                  id="task-due"
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(e) => set('dueDate', e.target.value)}
                />
              </div>
            </div>
            {!lockParent && (
              <div className="grid gap-2">
                <Label>Knyttet til</Label>
                <Select value={form.relatedTo} onValueChange={(v) => set('relatedTo', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Ingen (frittstående)</SelectItem>
                    {leads.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Deals</SelectLabel>
                        {leads.map((l) => (
                          <SelectItem key={l.id} value={`lead:${l.id}`}>
                            {l.name} — {l.company}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {clients.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Kontoer</SelectLabel>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={`client:${c.id}`}>
                            {c.companyName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Lagrer…' : isEdit ? 'Lagre' : 'Opprett oppgave'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
