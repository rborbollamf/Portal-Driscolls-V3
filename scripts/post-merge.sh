#!/usr/bin/env bash

set -euo pipefail

echo "Installing locked Node.js dependencies..."
npm ci --no-audit --fund=false

echo "Applying pending database migrations..."
npm run db:migrate

if [[ "${NODE_ENV:-development}" != "production" && -f "data/db.json" ]]; then
  database_record_count="$(
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "
      SELECT
        (SELECT COUNT(*) FROM app_users) +
        (SELECT COUNT(*) FROM producers) +
        (SELECT COUNT(*) FROM legal_entities) +
        (SELECT COUNT(*) FROM ranches) +
        (SELECT COUNT(*) FROM crops) +
        (SELECT COUNT(*) FROM financial_snapshots) +
        (SELECT COUNT(*) FROM validation_tasks) +
        (SELECT COUNT(*) FROM alerts) +
        (SELECT COUNT(*) FROM rules) +
        (SELECT COUNT(*) FROM audit_logs);
    "
  )"

  if [[ "$database_record_count" == "0" ]]; then
    echo "Initializing the empty development database from data/db.json..."
    npm run db:import
  fi
fi

echo "Post-merge setup completed."