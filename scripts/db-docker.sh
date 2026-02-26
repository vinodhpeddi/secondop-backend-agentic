#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ACTION="${1:-}"
if [[ -z "$ACTION" ]]; then
  echo "Usage: bash backend/scripts/db-docker.sh <migrate|seed|reset>"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker is not installed."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Error: Docker Compose v2 is required."
  exit 1
fi

if [[ -f backend/.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source backend/.env
  set +a
fi

POSTGRES_DB="${POSTGRES_DB:-${DB_NAME:-secondop_db}}"
POSTGRES_USER="${POSTGRES_USER:-${DB_USER:-postgres}}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-${DB_PASSWORD:-postgres}}"
POSTGRES_PORT="${POSTGRES_PORT:-${DB_PORT:-5432}}"
export POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD POSTGRES_PORT

migrations=(
  "001_initial_schema.sql"
  "002_cases_and_messages.sql"
  "003_prescriptions_and_labs.sql"
  "004_billing_and_payments.sql"
  "005_case_analysis_and_intake.sql"
  "006_agent_analysis_runs.sql"
  "007_agentic_shadow_results.sql"
)

wait_for_postgres() {
  echo "Waiting for Postgres container to become ready..."
  for _ in $(seq 1 60); do
    if docker compose exec -T postgres pg_isready -U "$POSTGRES_USER" >/dev/null 2>&1; then
      echo "Postgres is ready."
      return 0
    fi
    sleep 1
  done

  echo "Error: Postgres did not become ready in time."
  exit 1
}

run_migrations() {
  echo "Running database migrations..."
  for migration in "${migrations[@]}"; do
    echo "  -> $migration"
    docker compose exec -T postgres psql \
      -v ON_ERROR_STOP=1 \
      -U "$POSTGRES_USER" \
      -d "$POSTGRES_DB" \
      -f "/workspace/migrations/$migration"
  done
}

run_seed() {
  echo "Running seed script..."
  docker compose exec -T postgres psql \
    -v ON_ERROR_STOP=1 \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -f "/workspace/seed-data.sql"
}

reset_database() {
  echo "Resetting public schema..."
  docker compose exec -T postgres psql \
    -v ON_ERROR_STOP=1 \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
}

docker compose up -d postgres >/dev/null
wait_for_postgres

case "$ACTION" in
  migrate)
    run_migrations
    ;;
  seed)
    run_seed
    ;;
  reset)
    reset_database
    run_migrations
    run_seed
    ;;
  *)
    echo "Error: Unknown action '$ACTION'. Use migrate, seed, or reset."
    exit 1
    ;;
esac

echo "Done."
