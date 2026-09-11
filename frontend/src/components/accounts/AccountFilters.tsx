import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock } from 'lucide-react'
import { usersApi } from '@/lib/api'
import { userLabel } from '@/components/users/OwnerSelect'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = 'ALL'
const STORAGE_KEY = 'crm.inactiveDays'

export type AccountFilterParams = {
  owner?: string
  overdueTasks?: string
  inactiveDays?: string
}

function loadThreshold(): number {
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY))
    return Number.isFinite(v) && v > 0 ? v : 30
  } catch {
    return 30
  }
}

/** Owns the owner / overdue / inactivity filter state and renders the control row. */
export function useAccountFilters(): { params: AccountFilterParams; element: ReactNode } {
  const [owner, setOwner] = useState<string>(ALL)
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [inactiveOnly, setInactiveOnly] = useState(false)
  const [threshold, setThreshold] = useState<number>(loadThreshold)

  const params: AccountFilterParams = {
    owner: owner === ALL ? undefined : owner,
    overdueTasks: overdueOnly ? 'true' : undefined,
    inactiveDays: inactiveOnly ? String(threshold) : undefined,
  }

  const element = (
    <AccountFilters
      owner={owner}
      onOwner={setOwner}
      overdueOnly={overdueOnly}
      onOverdue={setOverdueOnly}
      inactiveOnly={inactiveOnly}
      onInactive={setInactiveOnly}
      threshold={threshold}
      onThreshold={(n) => {
        setThreshold(n)
        try {
          localStorage.setItem(STORAGE_KEY, String(n))
        } catch {
          /* ignore */
        }
      }}
    />
  )

  return { params, element }
}

type Props = {
  owner: string
  onOwner: (v: string) => void
  overdueOnly: boolean
  onOverdue: (v: boolean) => void
  inactiveOnly: boolean
  onInactive: (v: boolean) => void
  threshold: number
  onThreshold: (n: number) => void
}

function AccountFilters({
  owner,
  onOwner,
  overdueOnly,
  onOverdue,
  inactiveOnly,
  onInactive,
  threshold,
  onThreshold,
}: Props) {
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={owner} onValueChange={onOwner}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Alle eiere</SelectItem>
          <SelectItem value="me">Mine</SelectItem>
          <SelectItem value="none">Uten eier</SelectItem>
          {users.length > 0 && (
            <SelectGroup>
              <SelectLabel>Team</SelectLabel>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {userLabel(u)}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>

      <button
        type="button"
        onClick={() => onOverdue(!overdueOnly)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition',
          overdueOnly
            ? 'bg-rose-50 text-rose-700 ring-rose-200'
            : 'text-muted-foreground ring-foreground/10 hover:text-foreground'
        )}
      >
        <AlertTriangle className="h-4 w-4" />
        Forfalte oppgaver
      </button>

      <button
        type="button"
        onClick={() => onInactive(!inactiveOnly)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition',
          inactiveOnly
            ? 'bg-amber-50 text-amber-700 ring-amber-200'
            : 'text-muted-foreground ring-foreground/10 hover:text-foreground'
        )}
      >
        <Clock className="h-4 w-4" />
        Inaktive
      </button>
      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <span>&gt;</span>
        <Input
          type="number"
          min="1"
          value={threshold}
          onChange={(e) => onThreshold(Math.max(1, Number(e.target.value) || 1))}
          className="h-8 w-16"
          aria-label="Inaktivitetsterskel i dager"
        />
        <span>dager</span>
      </div>
    </div>
  )
}
