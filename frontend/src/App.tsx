import { useEffect, useState } from 'react'
import { Activity, Building2, LogOut, Loader2 } from 'lucide-react'
import { API_BASE } from '@/lib/api'
import { useAuth, authEnabled } from '@/auth/AuthProvider'
import { Login } from '@/auth/Login'
import { StatCards } from '@/components/StatCards'
import { LeadsBoard } from '@/components/leads/LeadsBoard'
import { MeetingsCalendar } from '@/components/meetings/MeetingsCalendar'
import { ClientsGrid } from '@/components/clients/ClientsGrid'
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget'
import { FeedbackLog } from '@/components/feedback/FeedbackLog'
import { FollowUpsBoard } from '@/components/activities/FollowUpsBoard'
import { FollowUpBell } from '@/components/activities/FollowUpBell'
import { TasksBoard, useMyOverdueCount } from '@/components/tasks/TasksBoard'
import { Button } from '@/components/ui/button'
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
  const { ready, session, email, signOut } = useAuth()
  const [tab, setTab] = useState('leads')
  const myOverdue = useMyOverdueCount()

  // Auth gate (only when Supabase is configured).
  if (authEnabled && !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (authEnabled && !session) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-lg bg-primary p-1.5 text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="font-heading text-lg font-semibold">Axess Europe CRM</span>
          </div>
          <div className="flex items-center gap-3">
            <ApiStatus />
            <FollowUpBell onClick={() => setTab('followups')} />
            <FeedbackLog />
            {authEnabled && email && (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
                <Button variant="outline" size="sm" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </>
            )}
          </div>
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

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="clients">Key Clients</TabsTrigger>
            <TabsTrigger value="tasks">
              Oppgaver
              {myOverdue > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-medium text-white">
                  {myOverdue}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="followups">Oppfølging</TabsTrigger>
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
          <TabsContent value="tasks" className="mt-5">
            <TasksBoard />
          </TabsContent>
          <TabsContent value="followups" className="mt-5">
            <FollowUpsBoard />
          </TabsContent>
        </Tabs>
      </main>

      <FeedbackWidget />
    </div>
  )
}
