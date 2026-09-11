import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquarePlus, X, Send } from 'lucide-react'
import { toast } from 'sonner'
import { suggestionsApi } from '@/lib/api'
import { SUGGESTION_CATEGORIES } from '@/types'
import type { SuggestionCategory } from '@/types'
import { CATEGORY_LABEL } from './labels'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function FeedbackWidget() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<SuggestionCategory>('IMPROVEMENT')

  const create = useMutation({
    mutationFn: () => suggestionsApi.create({ message: message.trim(), category }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] })
      setMessage('')
      setCategory('IMPROVEMENT')
      setOpen(false)
      toast.success('Takk for tilbakemeldingen!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    create.mutate()
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open && (
        <form
          onSubmit={submit}
          className="w-[min(20rem,calc(100vw-2rem))] rounded-xl bg-card p-4 shadow-xl ring-1 ring-foreground/10"
        >
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="font-heading text-sm font-semibold">Send en tilbakemelding</h2>
              <p className="text-xs text-muted-foreground">Hvordan kan appen bli bedre?</p>
            </div>
            <button
              type="button"
              aria-label="Lukk"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Textarea
            autoFocus
            rows={4}
            required
            maxLength={2000}
            placeholder="Skriv tilbakemeldingen din her…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div className="mt-3 flex items-center gap-2">
            <Select value={category} onValueChange={(v) => setCategory(v as SuggestionCategory)}>
              <SelectTrigger size="sm" className="flex-1">
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
            <Button type="submit" size="sm" disabled={create.isPending || !message.trim()}>
              <Send className="h-4 w-4" />
              {create.isPending ? 'Sender…' : 'Send'}
            </Button>
          </div>
        </form>
      )}

      <Button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full shadow-lg"
        aria-expanded={open}
        aria-label="Gi tilbakemelding"
      >
        {open ? <X className="h-4 w-4" /> : <MessageSquarePlus className="h-4 w-4" />}
        {open ? 'Lukk' : 'Tilbakemelding'}
      </Button>
    </div>
  )
}
