# Hosted CRM

Full-stack CRM — **Leads**, **Meetings**, and **Key Clients** — with a dashboard,
month calendar, VIP client cards, and full CRUD + filtering.

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS v4 + **shadcn/ui** + TanStack Query + Lucide icons (`frontend/`)
- **Backend:** Node.js + Express + TypeScript, RESTful API (`backend/`)
- **Database:** PostgreSQL via Prisma ORM

## Features

- **Dashboard** — open pipeline value, total leads, upcoming meetings, and key-client count/revenue as live stat cards.
- **Leads** — filterable/searchable table with add / edit / delete and status pipeline stages.
- **Meetings** — month-grid calendar; click a day to schedule, click a meeting to edit; filter by status; link each meeting to a lead or key client.
- **Key Clients** — VIP cards grouped by tier (Gold / Platinum / Strategic) with add / edit / delete and tier/search filtering.
- Optimistic-feel UX via TanStack Query cache invalidation + toast notifications; the whole dashboard refreshes on every mutation.

## Project layout

```
hosted-crm/
├── frontend/   # Vite + React + Tailwind (dev server on :5173, proxies /api → :5050)
└── backend/    # Express + Prisma (API on :5050)
```

## Getting started

### 1. Backend + database

```bash
cd backend
npm install
cp .env.example .env
```

Then pick a database:

**Option A — local, zero-setup (recommended for development).** Prisma ships a local
Postgres (PGlite, no Docker) via `prisma dev`. In its own terminal:

```bash
cd backend
npx prisma dev --name crmdev   # prints a DATABASE_URL; leave this running
```

Copy the printed `postgres://…` into `backend/.env` as `DATABASE_URL` and append
`pgbouncer=true` to the query string (avoids a prepared-statement clash with the local pooler),
e.g. `…/template1?pgbouncer=true&sslmode=disable&connection_limit=1`.

**Option B — hosted.** Get a free Postgres from [Supabase](https://supabase.com),
[Neon](https://neon.tech), or [Railway](https://railway.app) and paste its connection string
into `backend/.env` as `DATABASE_URL`.

Then create the tables, seed sample data, and start the API:

```bash
cd backend
npm run prisma:push          # create tables from prisma/schema.prisma
npm run seed                 # optional: insert sample data
npm run dev                  # start API on http://localhost:5050
```

> Note: the API defaults to port **5050**. Port 5000 is reserved by the macOS AirPlay Receiver.
> The local `prisma dev` database is ephemeral — re-run `prisma:push` + `seed` after restarting it.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                  # start UI on http://localhost:5173
```

The Vite dev server proxies `/api/*` to the backend, so no CORS config is needed in development.

## API endpoints

| Method | Path                 | Description                                            |
| ------ | -------------------- | ----------------------------------------------------- |
| GET    | `/api/health`        | Health check                                          |
| GET    | `/api/leads`         | List leads. Filters: `?status=`, `?search=`           |
| POST   | `/api/leads`         | Create a lead                                         |
| PUT    | `/api/leads/:id`     | Update a lead                                         |
| DELETE | `/api/leads/:id`     | Delete a lead                                         |
| GET    | `/api/meetings`      | List meetings (with lead + client). Filters: `?status=`, `?from=`, `?to=` |
| POST   | `/api/meetings`      | Create a meeting                                     |
| PUT    | `/api/meetings/:id`  | Update a meeting                                     |
| DELETE | `/api/meetings/:id`  | Delete a meeting                                     |
| GET    | `/api/clients`       | List key clients. Filters: `?tier=`, `?search=`      |
| POST   | `/api/clients`       | Create a key client                                  |
| PUT    | `/api/clients/:id`   | Update a key client                                  |
| DELETE | `/api/clients/:id`   | Delete a key client                                  |

## Data models

`Lead`, `KeyClient`, and `Meeting` (see [backend/prisma/schema.prisma](backend/prisma/schema.prisma)).
`Meeting` optionally links to a `Lead` or a `KeyClient`.

## Deploy

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full production guide. In short:

- **Backend** → Docker on Railway or Render ([backend/Dockerfile](backend/Dockerfile)); migrations
  apply automatically on deploy via `prisma migrate deploy`.
- **Frontend** → Vercel ([frontend/vercel.json](frontend/vercel.json)).
- **Database** → managed Postgres (Supabase / Neon / Railway) with a pooled `DATABASE_URL`
  and a direct `DIRECT_URL` for migrations.
