import { Fragment, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Pencil, Trash2, History } from 'lucide-react'
import { toast } from 'sonner'
import { leadsApi } from '@/lib/api'
import { LEAD_STATUSES } from '@/types'
import type { Lead } from '@/types'
import { LEAD_STATUS_LABEL, LEAD_STATUS_CLASS } from '@/lib/status'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { LeadDialog } from './LeadDialog'
import { ActivityTimeline } from '@/components/activities/ActivityTimeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const ALL = 'ALL'

export function LeadsBoard() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>(ALL)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', { status, search }],
    queryFn: () =>
      leadsApi.list({
        status: status === ALL ? undefined : status,
        search: search || undefined,
      }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => leadsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(lead: Lead) {
    setEditing(lead)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, company, email…"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {LEAD_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Add lead
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No leads match your filters.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <Fragment key={lead.id}>
                  <TableRow>
                    <TableCell>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-xs text-muted-foreground">{lead.email}</div>
                    </TableCell>
                    <TableCell>{lead.company}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          LEAD_STATUS_CLASS[lead.status]
                        )}
                      >
                        {LEAD_STATUS_LABEL[lead.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(lead.value)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Vis aktivitet"
                          className={cn(expandedId === lead.id && 'bg-muted')}
                          onClick={() =>
                            setExpandedId((id) => (id === lead.id ? null : lead.id))
                          }
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Edit lead"
                          onClick={() => openEdit(lead)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete lead"
                          onClick={() => {
                            if (confirm(`Delete lead "${lead.name}"?`)) remove.mutate(lead.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === lead.id && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5} className="bg-muted/30 p-4">
                        <ActivityTimeline leadId={lead.id} name={`${lead.name} — ${lead.company}`} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <LeadDialog open={dialogOpen} onOpenChange={setDialogOpen} lead={editing} />
    </div>
  )
}
