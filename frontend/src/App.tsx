import { useEffect, useState } from 'react'
import { Activity, Building2 } from 'lucide-react'
import { API_BASE } from '@/lib/api'
import { StatCards } from '@/components/StatCards'
import { LeadsBoard } from '@/components/leads/LeadsBoard'
import { MeetingsCalendar } from '@/components/meetings/MeetingsCalendar'
import { ClientsGrid } from '@/components/clients/ClientsGrid'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Health = { status: string }

function ApiStatus() {
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((r) => (r.ok ? (r.json() as Promise<Health>) : Promise.reject()))
      .then((h) => setOk(h.status === 'ok'))
      .catch(() => setOk(false))
  }, [])
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Activity className="h-4 w-4" />
      {ok === null ? (
        <span className="text-muted-foreground">checking…</span>
      ) : ok ? (
        <span className="text-emerald-600">API online</span>
      ) : (
        <span className="text-rose-600">API offline</span>
      )}
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-lg bg-primary p-1.5 text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="font-heading text-lg font-semibold">Hosted CRM</span>
          </div>
          <ApiStatus />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <section>
          <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Pipeline, meetings, and key accounts at a glance.
          </p>
          <div className="mt-5">
            <StatCards />
          </div>
        </section>

        <Tabs defaultValue="leads" className="w-full">
          <TabsList>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="clients">Key Clients</TabsTrigger>
          </TabsList>
          <TabsContent value="leads" className="mt-5">
            <LeadsBoard />
          </TabsContent>
          <TabsContent value="meetings" className="mt-5">
            <MeetingsCalendar />
          </TabsContent>
          <TabsContent value="clients" className="mt-5">
            <ClientsGrid />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
