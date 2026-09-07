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
- **Auth:** **Supabase Auth** — the SPA signs users in and sends a JWT; the Express API
  verifies it on every request. Single-tenant (internal team; all authenticated users see all data).

---

## 0. Authentication & security (Supabase Auth)

The API is closed by default: every `/api/*` route except `/api/health` requires a valid
Supabase access token (verified via the project's JWKS in
[`backend/src/auth.ts`](backend/src/auth.ts)). Requests are also protected by Helmet security
headers, CORS allowlisting, rate limiting, and Zod input validation.

**Set up Supabase Auth (one time):**
1. In your Supabase project → **Authentication → Providers → Email**: enable it. For an
   internal-only tool, **turn off "Allow new users to sign up"** and add teammates via
   **Authentication → Users → Add user / Invite** (they get an email to set a password).
2. (Optional but recommended) also set `ALLOWED_EMAIL_DOMAIN=axessgroup.com` on the backend so
   only your domain's emails are accepted even if a stray account exists.
3. Copy **Project URL** and the **anon public key** from **Project Settings → API**.

**Wire it up:**
- Backend env: `SUPABASE_URL=https://<ref>.supabase.co` (and optionally `ALLOWED_EMAIL_DOMAIN`).
  Remove `AUTH_DISABLED` in production — leaving it `true` disables all auth.
- Frontend env (Vercel): `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. When both are set the
  app shows a login screen; when unset it runs unauthenticated (local review only).

> **Local review without auth:** the backend `.env` ships with `AUTH_DISABLED=true` and the
> frontend has no `VITE_SUPABASE_*`, so `localhost` works without login. Both flip to enforced
> automatically once the Supabase env vars are set — do that before going live.

**Still on the security roadmap** (not yet implemented): per-user roles (e.g. view-only vs.
admin-delete), an audit trail of who changed what, and automated database backups. Ask if you
want these next.

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
| `DATABASE_URL`         | ✅       | Pooled connection for the app.                                    |
| `DIRECT_URL`           | ✅       | Direct connection for migrations.                                 |
| `SUPABASE_URL`         | ✅ prod  | Supabase project URL; its JWKS verifies access tokens.            |
| `ALLOWED_EMAIL_DOMAIN` | optional | Restrict accepted users to this email domain (e.g. `axessgroup.com`). |
| `CORS_ORIGIN`          | prod     | Comma-separated allowed origins. Unset = allow all.               |
| `AUTH_DISABLED`        | dev only | `true` bypasses auth. **Never set in production.**                |
| `PORT`                 | auto     | Injected by the platform; don't hardcode.                         |
| `RUN_MIGRATIONS`       | optional | `false` to skip auto-migrate on start (see multi-replica note).   |
| `NODE_ENV`             | optional | `production`.                                                     |

**Frontend** (Vercel):

| Variable                  | Required | Notes                                                     |
| ------------------------- | -------- | --------------------------------------------------------- |
| `VITE_API_URL`            | optional | Only for the cross-origin option; unset when using the rewrite. |
| `VITE_SUPABASE_URL`       | ✅ prod  | Supabase project URL (enables the login screen).          |
| `VITE_SUPABASE_ANON_KEY`  | ✅ prod  | Supabase anon public key.                                 |

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

## 7. CI/CD (GitHub Actions)

Pipeline: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

**On every pull request and push to `main` (CI):**
- **Backend** — `npm ci`, `prisma generate`, `npm run build` (typecheck + compile), then
  spins up a `postgres:16` service and runs `prisma migrate deploy` + `prisma migrate status`
  to prove the migrations apply cleanly to a fresh database.
- **Frontend** — `npm ci`, `npm run lint` (oxlint), `npm run build`.

**On push to `main` only (CD)** — deploy jobs run *after* CI passes, and each **skips
automatically unless its secrets are set**, so the pipeline is green out of the box:
- **Frontend → Vercel** via the Vercel CLI (`vercel pull/build/deploy --prod`).
- **Backend → Render** by calling a deploy hook.

### Required GitHub secrets (repo → Settings → Secrets and variables → Actions)

| Secret                   | Enables            | Where to get it                                             |
| ------------------------ | ------------------ | ---------------------------------------------------------- |
| `VERCEL_TOKEN`           | frontend deploy    | Vercel → Account Settings → Tokens                          |
| `VERCEL_ORG_ID`          | frontend deploy    | `frontend/.vercel/project.json` after `vercel link`, or project settings |
| `VERCEL_PROJECT_ID`      | frontend deploy    | same as above                                              |
| `RENDER_DEPLOY_HOOK_URL` | backend deploy     | Render → service → Settings → Deploy Hook                   |

Notes:
- The Vercel project must have **Root Directory = `frontend`** (the CLI respects it during build).
- **Railway** users: skip `RENDER_DEPLOY_HOOK_URL` and let Railway's native GitHub integration
  auto-deploy on push (the deploy-backend job then simply skips).
- Prefer platform-native Git integrations entirely? Delete the two `deploy-*` jobs and keep
  only the CI jobs.

## 8. Deploy checklist

- [ ] Postgres provisioned; `DATABASE_URL` + `DIRECT_URL` captured.
- [ ] Supabase Auth configured: email provider on, public sign-up **off**, team invited.
- [ ] Backend has `SUPABASE_URL` set and **no** `AUTH_DISABLED`; frontend has `VITE_SUPABASE_*`.
- [ ] Backend deployed on Railway/Render (root dir `backend`), env vars set.
- [ ] `/api/health` returns `{"status":"ok"}` on the public backend URL.
- [ ] `frontend/vercel.json` rewrite points at the backend URL (or `VITE_API_URL` set).
- [ ] Frontend deployed on Vercel (root dir `frontend`).
- [ ] `CORS_ORIGIN` set on the backend if using the cross-origin option.
- [ ] Load the site → "API online" badge is green, data loads, create/edit/delete work.
