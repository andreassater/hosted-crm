import { useEffect, useState } from 'react'
import { Users, CalendarClock, Crown, Activity } from 'lucide-react'

type Health = { status: string; timestamp: string }

const sections = [
  {
    icon: Users,
    title: 'Leads',
    desc: 'Pipeline kanban for tracking lead value and status.',
    accent: 'text-sky-600 bg-sky-50',
  },
  {
    icon: CalendarClock,
    title: 'Meetings',
    desc: 'Calendar / agenda view for upcoming meetings.',
    accent: 'text-violet-600 bg-violet-50',
  },
  {
    icon: Crown,
    title: 'Key Clients',
    desc: 'VIP profiles with spending-tier categorization.',
    accent: 'text-amber-600 bg-amber-50',
  },
]

function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setHealth)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-semibold tracking-tight">Hosted CRM</h1>
          <div className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            {health ? (
              <span className="text-emerald-600">API {health.status}</span>
            ) : error ? (
              <span className="text-rose-600">API offline</span>
            ) : (
              <span className="text-slate-400">checking…</span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="mb-8 text-slate-600">
          Full-stack starter — React + Vite + Tailwind on the frontend, Express + Prisma +
          PostgreSQL on the backend.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map(({ icon: Icon, title, desc, accent }) => (
            <div
              key={title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className={`mb-4 inline-flex rounded-lg p-2.5 ${accent}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
