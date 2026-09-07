import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { leadsApi } from '@/lib/api'
import { LEAD_STATUSES } from '@/types'
import type { Lead, LeadInput, LeadStatus } from '@/types'
import { LEAD_STATUS_LABEL } from '@/lib/status'
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
  lead?: Lead | null
}

const empty: LeadInput = {
  name: '',
  company: '',
  email: '',
  phone: '',
  status: 'NEW',
  value: 0,
}

export function LeadDialog({ open, onOpenChange, lead }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState<LeadInput>(empty)
  const isEdit = Boolean(lead)

  useEffect(() => {
    if (open) {
      setForm(
        lead
          ? {
              name: lead.name,
              company: lead.company,
              email: lead.email,
              phone: lead.phone ?? '',
              status: lead.status,
              value: Number(lead.value),
            }
          : empty
      )
    }
  }, [open, lead])

  const mutation = useMutation({
    mutationFn: (data: LeadInput) =>
      isEdit && lead ? leadsApi.update(lead.id, data) : leadsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      toast.success(isEdit ? 'Lead updated' : 'Lead created')
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate({ ...form, phone: form.phone || null })
  }

  const set = <K extends keyof LeadInput>(key: K, value: LeadInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit lead' : 'New lead'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Update this lead in your pipeline.' : 'Add a lead to your pipeline.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="lead-name">Name</Label>
              <Input
                id="lead-name"
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-company">Company</Label>
              <Input
                id="lead-company"
                required
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lead-phone">Phone</Label>
                <Input
                  id="lead-phone"
                  value={form.phone ?? ''}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lead-value">Value (USD)</Label>
                <Input
                  id="lead-value"
                  type="number"
                  min="0"
                  step="100"
                  value={form.value}
                  onChange={(e) => set('value', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set('status', v as LeadStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LEAD_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
