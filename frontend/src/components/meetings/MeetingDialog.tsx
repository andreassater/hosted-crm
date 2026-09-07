import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { meetingsApi, leadsApi, clientsApi } from '@/lib/api'
import { MEETING_STATUSES } from '@/types'
import type { Meeting, MeetingInput, MeetingStatus } from '@/types'
import { MEETING_STATUS_LABEL } from '@/lib/status'
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
  meeting?: Meeting | null
  defaultDate?: Date | null
}

const NONE = 'none'

type FormState = {
  title: string
  description: string
  startTime: string // datetime-local
  endTime: string // datetime-local
  status: MeetingStatus
  relatedTo: string // 'none' | 'lead:<id>' | 'client:<id>'
}

function defaultStart(date?: Date | null): Date {
  const d = date ? new Date(date) : new Date()
  d.setHours(9, 0, 0, 0)
  return d
}

export function MeetingDialog({ open, onOpenChange, meeting, defaultDate }: Props) {
  const qc = useQueryClient()
  const isEdit = Boolean(meeting)
  const [form, setForm] = useState<FormState>(() => blank())

  const { data: leads = [] } = useQuery({ queryKey: ['leads', 'all'], queryFn: () => leadsApi.list() })
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => clientsApi.list(),
  })

  function blank(): FormState {
    const start = defaultStart(defaultDate)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    return {
      title: '',
      description: '',
      startTime: toDateTimeLocal(start.toISOString()),
      endTime: toDateTimeLocal(end.toISOString()),
      status: 'SCHEDULED',
      relatedTo: NONE,
    }
  }

  useEffect(() => {
    if (!open) return
    if (meeting) {
      setForm({
        title: meeting.title,
        description: meeting.description ?? '',
        startTime: toDateTimeLocal(meeting.startTime),
        endTime: toDateTimeLocal(meeting.endTime),
        status: meeting.status,
        relatedTo: meeting.leadId
          ? `lead:${meeting.leadId}`
          : meeting.clientId
            ? `client:${meeting.clientId}`
            : NONE,
      })
    } else {
      setForm(blank())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, meeting, defaultDate])

  const mutation = useMutation({
    mutationFn: (data: MeetingInput) =>
      isEdit && meeting ? meetingsApi.update(meeting.id, data) : meetingsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings'] })
      toast.success(isEdit ? 'Meeting updated' : 'Meeting scheduled')
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => meetingsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings'] })
      toast.success('Meeting deleted')
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    const start = new Date(form.startTime)
    const end = new Date(form.endTime)
    if (end < start) {
      toast.error('End time must be after start time.')
      return
    }
    const [kind, id] = form.relatedTo.split(':')
    mutation.mutate({
      title: form.title,
      description: form.description || null,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      status: form.status,
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
            <DialogTitle>{isEdit ? 'Edit meeting' : 'Schedule meeting'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Update this meeting.' : 'Add a meeting to the calendar.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="meeting-title">Title</Label>
              <Input
                id="meeting-title"
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meeting-desc">Description</Label>
              <Textarea
                id="meeting-desc"
                rows={2}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="meeting-start">Start</Label>
                <Input
                  id="meeting-start"
                  type="datetime-local"
                  required
                  value={form.startTime}
                  onChange={(e) => set('startTime', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="meeting-end">End</Label>
                <Input
                  id="meeting-end"
                  type="datetime-local"
                  required
                  value={form.endTime}
                  onChange={(e) => set('endTime', e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Related to</Label>
              <Select value={form.relatedTo} onValueChange={(v) => set('relatedTo', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {leads.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Leads</SelectLabel>
                      {leads.map((l) => (
                        <SelectItem key={l.id} value={`lead:${l.id}`}>
                          {l.name} — {l.company}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {clients.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Key clients</SelectLabel>
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
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v as MeetingStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {MEETING_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            {isEdit && meeting ? (
              <Button
                type="button"
                variant="ghost"
                className="text-rose-600 hover:text-rose-700"
                onClick={() => {
                  if (confirm(`Delete meeting "${meeting.title}"?`)) remove.mutate(meeting.id)
                }}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Schedule'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
