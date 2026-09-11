import { useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Lightbulb, Send, Trash2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { suggestionsApi } from '@/lib/api'
import { SUGGESTION_CATEGORIES, SUGGESTION_STATUSES } from '@/types'
import type { Suggestion, SuggestionCategory, SuggestionStatus } from '@/types'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = 'ALL'

const CATEGORY_LABEL: Record<SuggestionCategory, string> = {
  FEATURE: 'Ny funksjon',
  IMPROVEMENT: 'Forbedring',
  BUG: 'Feil',
  OTHER: 'Annet',
}
const CATEGORY_CLASS: Record<SuggestionCategory, string> = {
  FEATURE: 'bg-violet-100 text-violet-700',
  IMPROVEMENT: 'bg-sky-100 text-sky-700',
  BUG: 'bg-rose-100 text-rose-700',
  OTHER: 'bg-slate-100 text-slate-700',
}
const STATUS_LABEL: Record<SuggestionStatus, string> = {
  NEW: 'Ny',
  PLANNED: 'Planlagt',
  DONE: 'Ferdig',
  DECLINED: 'Avvist',
}
const STATUS_CLASS: Record<SuggestionStatus, string> = {
  NEW: 'bg-slate-100 text-slate-700',
  PLANNED: 'bg-amber-100 text-amber-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  DECLINED: 'bg-rose-100 text-rose-700',
}

export function SuggestionsBoard() {
  const qc = useQueryClient()
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<SuggestionCategory>('IMPROVEMENT')
  const [statusFilter, setStatusFilter] = useState<string>(ALL)

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['suggestions', { status: statusFilter }],
    queryFn: () =>
      suggestionsApi.list({ status: statusFilter === ALL ? undefined : statusFilter }),
  })

  const create = useMutation({
    mutationFn: () => suggestionsApi.create({ message: message.trim(), category }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] })
      setMessage('')
      setCategory('IMPROVEMENT')
      toast.success('Takk for tipset!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

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
      toast.success('Tips slettet')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    create.mutate()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1.4fr]">
      {/* Submission form */}
      <form
        onSubmit={submit}
        className="h-fit space-y-4 rounded-xl bg-card p-6 ring-1 ring-foreground/10"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-lg bg-amber-50 p-2 text-amber-600">
            <Lightbulb className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-heading text-base font-semibold">Har du et forbedringstips?</h2>
            <p className="text-sm text-muted-foreground">Del hvordan appen kan bli bedre.</p>
          </div>
        </div>

        <Textarea
          rows={5}
          required
          maxLength={2000}
          placeholder="Skriv tipset ditt her…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={(v) => setCategory(v as SuggestionCategory)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUGGESTION_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={create.isPending || !message.trim()}>
            <Send className="h-4 w-4" />
            {create.isPending ? 'Sender…' : 'Send tips'}
          </Button>
        </div>
      </form>

      {/* List of suggestions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">
            Innsendte tips{' '}
            <span className="text-muted-foreground">({suggestions.length})</span>
          </h2>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
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

        {isLoading ? (
          <p className="py-10 text-center text-muted-foreground">Laster…</p>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center text-muted-foreground">
            <MessageSquare className="h-6 w-6" />
            <p className="text-sm">Ingen tips ennå. Vær den første til å dele en idé!</p>
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
                    aria-label="Slett tips"
                    className="-mt-1 -mr-1 shrink-0"
                    onClick={() => {
                      if (confirm('Slette dette tipset?')) remove.mutate(s.id)
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
    </div>
  )
}
