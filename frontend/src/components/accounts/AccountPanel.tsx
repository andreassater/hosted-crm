import { AccountTasks } from '@/components/tasks/AccountTasks'
import { ActivityTimeline } from '@/components/activities/ActivityTimeline'

type Props = {
  leadId?: string
  clientId?: string
  name: string
}

/** The expandable panel shown under a lead row / client card: tasks + activity log. */
export function AccountPanel({ leadId, clientId, name }: Props) {
  return (
    <div className="space-y-6">
      <AccountTasks leadId={leadId} clientId={clientId} />
      <ActivityTimeline leadId={leadId} clientId={clientId} name={name} />
    </div>
  )
}
