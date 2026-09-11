import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFollowUps, dueCount } from './FollowUpsBoard'

type Props = {
  onClick: () => void
}

/** Header bell showing the number of overdue + due-today follow-ups. */
export function FollowUpBell({ onClick }: Props) {
  const { data: followups = [] } = useFollowUps()
  const count = dueCount(followups)
  return (
    <Button
      variant="outline"
      size="sm"
      className="relative"
      onClick={onClick}
      aria-label="Oppfølginger"
    >
      <Bell className="h-4 w-4" />
      <span className="hidden sm:inline">Oppfølging</span>
      {count > 0 && (
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-xs font-medium text-white">
          {count}
        </span>
      )}
    </Button>
  )
}
