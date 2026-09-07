import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { clientsApi } from '@/lib/api'
import { CLIENT_TIERS } from '@/types'
import type { KeyClient, ClientInput } from '@/types'
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
  client?: KeyClient | null
}

const empty: ClientInput = {
  companyName: '',
  primaryContact: '',
  email: '',
  phone: '',
  tier: 'Gold',
  annualRevenue: 0,
}

export function ClientDialog({ open, onOpenChange, client }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState<ClientInput>(empty)
  const isEdit = Boolean(client)

  useEffect(() => {
    if (open) {
      setForm(
        client
          ? {
              companyName: client.companyName,
              primaryContact: client.primaryContact,
              email: client.email,
              phone: client.phone ?? '',
              tier: client.tier,
              annualRevenue: Number(client.annualRevenue),
            }
          : empty
      )
    }
  }, [open, client])

  const mutation = useMutation({
    mutationFn: (data: ClientInput) =>
      isEdit && client ? clientsApi.update(client.id, data) : clientsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success(isEdit ? 'Client updated' : 'Client created')
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate({ ...form, phone: form.phone || null })
  }

  const set = <K extends keyof ClientInput>(key: K, value: ClientInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit key client' : 'New key client'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Update this VIP account.' : 'Add a VIP account.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="client-company">Company name</Label>
              <Input
                id="client-company"
                required
                value={form.companyName}
                onChange={(e) => set('companyName', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-contact">Primary contact</Label>
              <Input
                id="client-contact"
                required
                value={form.primaryContact}
                onChange={(e) => set('primaryContact', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="client-phone">Phone</Label>
                <Input
                  id="client-phone"
                  value={form.phone ?? ''}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client-revenue">Annual revenue (USD)</Label>
                <Input
                  id="client-revenue"
                  type="number"
                  min="0"
                  step="1000"
                  value={form.annualRevenue}
                  onChange={(e) => set('annualRevenue', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Tier</Label>
              <Select value={form.tier} onValueChange={(v) => set('tier', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_TIERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
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
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
