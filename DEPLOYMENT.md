# Production Deployment Guide

A production setup for the Hosted CRM:

```
  Browser ──▶ Vercel (React SPA, static)
                 │  /api/*  (vercel.json rewrite → same-origin, no CORS)
                 ▼
            Railway / Render (Docker: Express + Prisma)
                 │  pooled DATABASE_URL (runtime)
                 │  direct DIRECT_URL (migrations)
                 ▼
            PostgreSQL (Supabase / Neon / Railway)
```

- **Frontend:** static build on **Vercel**.
- **Backend:** **Docker** container on **Railway** or **Render**. Migrations apply
  automatically on deploy (`prisma migrate deploy`).
- **Database:** managed **PostgreSQL** with a pooled connection for the app and a
  direct connection for migrations.

---

## 1. Provision PostgreSQL

Create a database on [Supabase](https://supabase.com), [Neon](https://neon.tech), or Railway
and grab **two** connection strings:

| Variable       | Which connection                     | Example (Supabase)                                                        |
| -------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `DATABASE_URL` | **Pooled** (used by the app runtime) | `postgresql://…@…pooler.supabase.com:6543/postgres?pgbouncer=true`         |
| `DIRECT_URL`   | **Direct** (used for migrations)     | `postgresql://…@db.[ref].supabase.co:5432/postgres`                        |

Why two: connection poolers (PgBouncer, in transaction mode) can't run schema migrations
reliably, so Prisma uses `directUrl` for `migrate`/`db push` and `url` for queries. This is
wired up in [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma). If your provider
has no pooler, set both to the same value.

---

## 2. Database migrations (how they work here)

This project uses **migration files** (not `db push`) so schema changes are versioned and
applied deterministically in production.

- **Create a migration (locally, when you change the schema):**
  ```bash
  cd backend
  npm run migrate:dev -- --name add_something   # creates prisma/migrations/<ts>_add_something/
  ```
  Commit the generated folder.

- **Apply migrations (automatically, in production):** the Docker entrypoint runs
  `prisma migrate deploy` on container start — see
  [`backend/docker-entrypoint.sh`](backend/docker-entrypoint.sh). No manual step needed.

- **Initial migration:** [`backend/prisma/migrations/0_init`](backend/prisma/migrations/0_init)
  is already committed (generated with `prisma migrate diff`), so a fresh database is created
  on first deploy.

> **Baselining an existing database** (one created earlier with `db push`, so it has the
> tables but no migration history): mark the init migration as already applied instead of
> re-running it:
> ```bash
> npx prisma migrate resolve --applied 0_init
> ```

---

## 3. Deploy the backend (Docker)

The image is defined in [`backend/Dockerfile`](backend/Dockerfile): multi-stage build,
non-root user, Prisma client generated at build time, migrations applied at start.

### Option A — Railway

1. **New Project → Deploy from GitHub repo.**
2. On the service: **Settings → Root Directory = `backend`** (so the Docker build context is
   `backend/`). Railway auto-detects the `Dockerfile` and
   [`backend/railway.json`](backend/railway.json).
3. Add a Postgres plugin (or use an external DB) and set **Variables**:
   `DATABASE_URL`, `DIRECT_URL`, `CORS_ORIGIN` (your Vercel URL), `NODE_ENV=production`.
   Do **not** set `PORT` — Railway injects it and the server reads `process.env.PORT`.
4. Deploy. On boot the entrypoint runs `prisma migrate deploy`, then starts the API.
5. Generate a public domain (**Settings → Networking**). Health check: `/api/health`.

### Option B — Render

1. **New → Blueprint**, point it at the repo. Render reads
   [`render.yaml`](render.yaml) and creates a Docker web service.
2. Set the `sync:false` env vars in the dashboard: `DATABASE_URL`, `DIRECT_URL`, `CORS_ORIGIN`.
3. Deploy. Health check path is `/api/health`.

### Test the image locally (needs Docker)

```bash
cd backend
docker build -t hosted-crm-api .
docker run --rm -p 5050:5050 \
  -e DATABASE_URL="postgresql://…:6543/postgres?pgbouncer=true" \
  -e DIRECT_URL="postgresql://…:5432/postgres" \
  -e PORT=5050 \
  hosted-crm-api
# → runs `prisma migrate deploy`, then serves on :5050
curl localhost:5050/api/health
```

---

## 4. Deploy the frontend (Vercel)

Config lives in [`frontend/vercel.json`](frontend/vercel.json).

1. **New Project** → import the repo → set **Root Directory = `frontend`**.
   Framework preset **Vite** is auto-detected (build `npm run build`, output `dist`).
2. **Connect the API.** Two options — pick one:
   - **Recommended (same-origin, no CORS):** edit `frontend/vercel.json` and replace the
     rewrite destination `https://your-backend.up.railway.app` with your real backend URL.
     The browser calls `/api/*` and Vercel proxies it. Leave `VITE_API_URL` unset.
   - **Cross-origin:** set env var `VITE_API_URL=https://<backend-url>` in Vercel, and set
     `CORS_ORIGIN=https://<your-site>.vercel.app` on the backend.
3. Deploy. Static assets are served with long-lived immutable caching; unknown routes fall
   back to `index.html` (SPA).

---

## 5. Environment variables reference

**Backend** (Railway/Render):

| Variable         | Required | Notes                                                             |
| ---------------- | -------- | ----------------------------------------------------------------- |
| `DATABASE_URL`   | ✅       | Pooled connection for the app.                                    |
| `DIRECT_URL`     | ✅       | Direct connection for migrations.                                 |
| `CORS_ORIGIN`    | prod     | Comma-separated allowed origins. Unset = allow all.               |
| `PORT`           | auto     | Injected by the platform; don't hardcode.                         |
| `RUN_MIGRATIONS` | optional | `false` to skip auto-migrate on start (see multi-replica note).   |
| `NODE_ENV`       | optional | `production`.                                                     |

**Frontend** (Vercel):

| Variable       | Required | Notes                                                     |
| -------------- | -------- | --------------------------------------------------------- |
| `VITE_API_URL` | optional | Only for the cross-origin option; unset when using the rewrite. |

---

## 6. Operational notes

- **Health checks:** both platforms poll `/api/health` (no DB dependency, so a DB blip
  doesn't kill the instance).
- **Multiple replicas:** running `migrate deploy` from every starting container can race.
  If you scale beyond one instance, set `RUN_MIGRATIONS=false` and run migrations once per
  release instead — Render's `preDeployCommand` (commented in `render.yaml`) or a Railway
  pre-deploy/release step: `npx prisma migrate deploy`.
- **Rollback:** migrations are forward-only. To undo, write a new migration that reverts the
  change, or restore from your provider's backup. Test migrations against staging first.
- **Zero-downtime schema changes:** prefer additive migrations (add nullable column → backfill
  → switch code → drop old) so old and new app versions can run against the same schema during
  a rolling deploy.
- **Secrets:** never commit real `.env` files (they're gitignored). Set all secrets in the
  platform dashboards.

---

## 7. Deploy checklist

- [ ] Postgres provisioned; `DATABASE_URL` + `DIRECT_URL` captured.
- [ ] Backend deployed on Railway/Render (root dir `backend`), env vars set.
- [ ] `/api/health` returns `{"status":"ok"}` on the public backend URL.
- [ ] `frontend/vercel.json` rewrite points at the backend URL (or `VITE_API_URL` set).
- [ ] Frontend deployed on Vercel (root dir `frontend`).
- [ ] `CORS_ORIGIN` set on the backend if using the cross-origin option.
- [ ] Load the site → "API online" badge is green, data loads, create/edit/delete work.
