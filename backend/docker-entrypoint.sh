#!/bin/sh
set -e

# Apply any pending Prisma migrations before starting the app.
# Set RUN_MIGRATIONS=false when you run migrations in a separate release/pre-deploy
# step (recommended when running more than one replica, to avoid concurrent migrations).
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "==> Applying database migrations (prisma migrate deploy)"
  npx prisma migrate deploy
else
  echo "==> Skipping migrations (RUN_MIGRATIONS=false)"
fi

echo "==> Starting: $*"
exec "$@"
