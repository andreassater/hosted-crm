import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Pencil, Trash2, Crown, Mail, Phone, History, ChevronDown, User as UserIcon, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { clientsApi } from '@/lib/api'
import { CLIENT_TIERS } from '@/types'
import type { KeyClient } from '@/types'
import { tierClass } from '@/lib/status'
import { formatCurrency, formatDateNo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ClientDialog } from './ClientDialog'
import { AccountPanel } from '@/components/accounts/AccountPanel'
import { useAccountFilters } from '@/components/accounts/AccountFilters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = 'ALL'

export function ClientsGrid() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState<string>(ALL)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<KeyClient | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { params: filterParams, element: filterElement } = useAccountFilters()

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', { tier, search, ...filterParams }],
    queryFn: () =>
      clientsApi.list({
        tier: tier === ALL ? undefined : tier,
        search: search || undefined,
        ...filterParams,
      }),
  })

  const inactiveThreshold = Number(filterParams.inactiveDays) || 30

  const remove = useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(client: KeyClient) {
    setEditing(client)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search company, contact, email…"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All tiers</SelectItem>
              {CLIENT_TIERS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Add client
        </Button>
      </div>

      {filterElement}

      {isLoading ? (
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      ) : clients.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">
          No key clients match your filters.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="group flex flex-col rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition hover:ring-foreground/20"
            >
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1',
                    tierClass(client.tier)
                  )}
                >
                  <Crown className="h-3 w-3" />
                  {client.tier}
                </span>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit client"
                    onClick={() => openEdit(client)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete client"
                    onClick={() => {
                      if (confirm(`Delete client "${client.companyName}"?`))
                        remove.mutate(client.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              </div>

              <h3 className="mt-3 font-heading text-lg font-semibold">{client.companyName}</h3>
              <p className="text-sm text-muted-foreground">{client.primaryContact}</p>

              {(() => {
                const inactive =
                  !client.lastActivityAt ||
                  Date.now() - new Date(client.lastActivityAt).getTime() >
                    inactiveThreshold * 864e5
                return (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <UserIcon className="h-3.5 w-3.5" />
                      {client.owner ? client.owner.name || client.owner.email : 'Uten eier'}
                    </span>
                    {!!client.openTaskCount && (
                      <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-700">
                        {client.openTaskCount} åpne oppgaver
                      </span>
                    )}
                    {inactive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        {client.lastActivityAt
                          ? `Inaktiv siden ${formatDateNo(client.lastActivityAt)}`
                          : 'Ingen aktivitet'}
                      </span>
                    )}
                  </div>
                )
              })()}

              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    {client.phone}
                  </div>
                )}
              </div>

              <div className="mt-4 border-t pt-3">
                <div className="text-xs text-muted-foreground">Annual revenue</div>
                <div className="font-heading text-xl font-semibold tabular-nums">
                  {formatCurrency(client.annualRevenue)}
                </div>
              </div>

              <button
                type="button"
                className="mt-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                onClick={() =>
                  setExpandedId((id) => (id === client.id ? null : client.id))
                }
              >
                <History className="h-4 w-4" />
                Aktivitet
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    expandedId === client.id && 'rotate-180'
                  )}
                />
              </button>

              {expandedId === client.id && (
                <div className="mt-3 border-t pt-4">
                  <AccountPanel clientId={client.id} name={client.companyName} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ClientDialog open={dialogOpen} onOpenChange={setDialogOpen} client={editing} />
    </div>
  )
}
