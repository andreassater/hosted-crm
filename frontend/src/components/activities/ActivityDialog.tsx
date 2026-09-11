import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { activitiesApi } from '@/lib/api'
import { ACTIVITY_TYPES } from '@/types'
import type { ActivityType } from '@/types'
import { ACTIVITY_TYPE_LABEL } from './labels'
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Exactly one of these identifies the account/contact the activity belongs to.
  leadId?: string
  clientId?: string
  name: string
}

type FormState = {
  type: ActivityType
  occurredAt: string // datetime-local
  note: string
  withFollowUp: boolean
  followUpAt: string // datetime-local
  followUpNote: string
}

function blank(): FormState {
  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  nextWeek.setHours(9, 0, 0, 0)
  return {
    type: 'NOTE',
    occurredAt: toDateTimeLocal(now.toISOString()),
    note: '',
    withFollowUp: false,
    followUpAt: toDateTimeLocal(nextWeek.toISOString()),
    followUpNote: '',
  }
}

export function ActivityDialog({ open, onOpenChange, leadId, clientId, name }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>(blank)

  useEffect(() => {
    if (open) setForm(blank())
  }, [open])

  const parentFilter = leadId ? { leadId } : clientId ? { clientId } : {}

  const mutation = useMutation({
    mutationFn: () =>
      activitiesApi.create({
        type: form.type,
        occurredAt: new Date(form.occurredAt).toISOString(),
        note: form.note,
        followUpAt: form.withFollowUp ? new Date(form.followUpAt).toISOString() : null,
        followUpNote: form.withFollowUp ? form.followUpNote || null : null,
        leadId: leadId ?? null,
        clientId: clientId ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeline', parentFilter] })
      qc.invalidateQueries({ queryKey: ['followups'] })
      toast.success('Aktivitet logget')
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (form.withFollowUp && !form.followUpNote.trim()) {
      toast.error('Legg til en kort beskrivelse for oppfølgingen.')
      return
    }
    mutation.mutate()
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Logg aktivitet</DialogTitle>
            <DialogDescription>{name}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => set('type', v as ActivityType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ACTIVITY_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="activity-date">Dato</Label>
                <Input
                  id="activity-date"
                  type="datetime-local"
                  required
                  value={form.occurredAt}
                  onChange={(e) => set('occurredAt', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="activity-note">Notat</Label>
              <Textarea
                id="activity-note"
                rows={3}
                required
                placeholder="Hva skjedde?"
                value={form.note}
                onChange={(e) => set('note', e.target.value)}
              />
            </div>

            <div className="rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={form.withFollowUp}
                  onChange={(e) => set('withFollowUp', e.target.checked)}
                />
                Sett neste oppfølging
              </label>
              {form.withFollowUp && (
                <div className="mt-3 grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="followup-date">Forfallsdato</Label>
                    <Input
                      id="followup-date"
                      type="datetime-local"
                      value={form.followUpAt}
                      onChange={(e) => set('followUpAt', e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="followup-note">Kort beskrivelse</Label>
                    <Input
                      id="followup-note"
                      placeholder="F.eks. Ring for å følge opp tilbud"
                      value={form.followUpNote}
                      onChange={(e) => set('followUpNote', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Lagrer…' : 'Logg aktivitet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
