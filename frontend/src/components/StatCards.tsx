import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Users, CalendarClock, Crown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { leadsApi, clientsApi, meetingsApi } from '@/lib/api'
import { formatCurrency, formatCompactCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  accent: string
}) {
  return (
    <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn('inline-flex rounded-lg p-2', accent)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 font-heading text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

export function StatCards() {
  const { data: leads = [] } = useQuery({ queryKey: ['leads', 'all'], queryFn: () => leadsApi.list() })
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => clientsApi.list(),
  })
  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings', 'all'],
    queryFn: () => meetingsApi.list(),
  })

  const openLeads = leads.filter((l) => l.status !== 'LOST')
  const pipeline = openLeads.reduce((sum, l) => sum + Number(l.value), 0)
  const now = Date.now()
  const upcoming = meetings.filter(
    (m) => m.status === 'SCHEDULED' && new Date(m.startTime).getTime() >= now
  ).length
  const annualRevenue = clients.reduce((sum, c) => sum + Number(c.annualRevenue), 0)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={TrendingUp}
        label="Open pipeline value"
        value={formatCurrency(pipeline)}
        sub={`${openLeads.length} active lead${openLeads.length === 1 ? '' : 's'}`}
        accent="bg-emerald-50 text-emerald-600"
      />
      <StatCard
        icon={Users}
        label="Total leads"
        value={String(leads.length)}
        sub={`${leads.length - openLeads.length} lost`}
        accent="bg-sky-50 text-sky-600"
      />
      <StatCard
        icon={CalendarClock}
        label="Upcoming meetings"
        value={String(upcoming)}
        sub={`${meetings.length} total`}
        accent="bg-violet-50 text-violet-600"
      />
      <StatCard
        icon={Crown}
        label="Key clients"
        value={String(clients.length)}
        sub={`${formatCompactCurrency(annualRevenue)} annual revenue`}
        accent="bg-amber-50 text-amber-600"
      />
    </div>
  )
}
