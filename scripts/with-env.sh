#!/bin/bash

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: bash scripts/with-env.sh <env-file> <command...>"
  exit 1
fi

ENV_FILE="$1"
shift

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "Warning: env file '$ENV_FILE' not found. Continuing with current process env."
fi

# Keep psql-based scripts compatible by mapping DB_* to PG* when PG* is unset.
export PGHOST="${PGHOST:-${DB_HOST:-}}"
export PGPORT="${PGPORT:-${DB_PORT:-}}"
export PGDATABASE="${PGDATABASE:-${DB_NAME:-}}"
export PGUSER="${PGUSER:-${DB_USER:-}}"
export PGPASSWORD="${PGPASSWORD:-${DB_PASSWORD:-}}"

exec "$@"
