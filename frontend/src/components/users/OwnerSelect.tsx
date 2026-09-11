import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/lib/api'
import type { User } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const NONE = 'none'

export function userLabel(u: Pick<User, 'name' | 'email'>): string {
  return u.name || u.email
}

type Props = {
  value: string | null
  onChange: (value: string | null) => void
  noneLabel?: string
}

/** Dropdown of team members (roster), with an "unassigned" option. */
export function OwnerSelect({ value, onChange, noneLabel = 'Ingen eier' }: Props) {
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() })
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <SelectTrigger>
        <SelectValue placeholder={noneLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{noneLabel}</SelectItem>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {userLabel(u)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
