# Hosted CRM

Full-stack CRM starter — **Leads**, **Meetings**, and **Key Clients**.

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS v4 + Lucide icons (`frontend/`)
- **Backend:** Node.js + Express + TypeScript, RESTful API (`backend/`)
- **Database:** PostgreSQL via Prisma ORM

## Project layout

```
hosted-crm/
├── frontend/   # Vite + React + Tailwind (dev server on :5173, proxies /api → :5050)
└── backend/    # Express + Prisma (API on :5050)
```

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env         # then set DATABASE_URL to your Postgres connection string
npm install
npm run prisma:generate      # generate the Prisma client
npm run prisma:push          # create tables in your database (needs a live DATABASE_URL)
npm run seed                 # optional: insert sample data
npm run dev                  # start API on http://localhost:5050
```

Get a free hosted Postgres from [Supabase](https://supabase.com), [Neon](https://neon.tech),
or [Railway](https://railway.app), or run one locally, and paste the connection string into
`backend/.env` as `DATABASE_URL`.

> Note: the API defaults to port **5050**. Port 5000 is reserved by the macOS AirPlay Receiver.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                  # start UI on http://localhost:5173
```

The Vite dev server proxies `/api/*` to the backend, so no CORS config is needed in development.

## API endpoints

| Method | Path            | Description                          |
| ------ | --------------- | ------------------------------------ |
| GET    | `/api/health`   | Health check                         |
| GET    | `/api/leads`    | List leads (newest first)            |
| POST   | `/api/leads`    | Create a lead                        |
| GET    | `/api/meetings` | List meetings (with lead + client)   |
| POST   | `/api/meetings` | Create a meeting                     |
| GET    | `/api/clients`  | List key clients (by company name)   |
| POST   | `/api/clients`  | Create a key client                  |

## Data models

`Lead`, `KeyClient`, and `Meeting` (see [backend/prisma/schema.prisma](backend/prisma/schema.prisma)).
`Meeting` optionally links to a `Lead` or a `KeyClient`.

## Deploy

- Backend → Railway or Render
- Frontend → Vercel or Netlify
- Database → Supabase / Neon / Railway Postgres
