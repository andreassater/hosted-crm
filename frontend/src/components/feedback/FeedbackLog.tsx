import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Inbox, MessageSquare, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { suggestionsApi } from '@/lib/api'
import { SUGGESTION_STATUSES } from '@/types'
import type { Suggestion, SuggestionStatus } from '@/types'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CATEGORY_LABEL, CATEGORY_CLASS, STATUS_LABEL, STATUS_CLASS } from './labels'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = 'ALL'

export function FeedbackLog() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>(ALL)

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['suggestions', { status: statusFilter }],
    queryFn: () =>
      suggestionsApi.list({ status: statusFilter === ALL ? undefined : statusFilter }),
  })

  // Count of unreviewed items (always fetched, independent of the filter).
  const { data: all = [] } = useQuery({
    queryKey: ['suggestions', { status: ALL }],
    queryFn: () => suggestionsApi.list(),
  })
  const newCount = all.filter((s) => s.status === 'NEW').length

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SuggestionStatus }) =>
      suggestionsApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suggestions'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => suggestionsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] })
      toast.success('Tilbakemelding slettet')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Inbox className="h-4 w-4" />
          <span className="hidden sm:inline">Tilbakemeldinger</span>
          {newCount > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
              {newCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Tilbakemeldinger</DialogTitle>
          <DialogDescription>Innsendte forbedringstips fra teamet.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between px-6 py-3">
          <span className="text-sm text-muted-foreground">{suggestions.length} vist</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="Alle statuser" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle statuser</SelectItem>
              {SUGGESTION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <p className="py-10 text-center text-muted-foreground">Laster…</p>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <MessageSquare className="h-6 w-6" />
              <p className="text-sm">Ingen tilbakemeldinger ennå.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {suggestions.map((s: Suggestion) => (
                <li key={s.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        'inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                        CATEGORY_CLASS[s.category]
                      )}
                    >
                      {CATEGORY_LABEL[s.category]}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Slett"
                      className="-mt-1 -mr-1 shrink-0"
                      onClick={() => {
                        if (confirm('Slette denne tilbakemeldingen?')) remove.mutate(s.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  </div>

                  <p className="mt-2 text-sm whitespace-pre-wrap">{s.message}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                    <span>{s.submittedBy ?? 'Anonym'}</span>
                    <span>·</span>
                    <span>{formatDate(s.createdAt)}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 font-medium',
                          STATUS_CLASS[s.status]
                        )}
                      >
                        {STATUS_LABEL[s.status]}
                      </span>
                      <Select
                        value={s.status}
                        onValueChange={(v) =>
                          updateStatus.mutate({ id: s.id, status: v as SuggestionStatus })
                        }
                      >
                        <SelectTrigger size="sm" className="h-7 w-[120px]" aria-label="Endre status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUGGESTION_STATUSES.map((st) => (
                            <SelectItem key={st} value={st}>
                              {STATUS_LABEL[st]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
