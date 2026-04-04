#!/usr/bin/env bash
# ES: Ejecuta docker compose con --env-file (.env.local primero, si no .env).
# EN: Run docker compose with --env-file (.env.local first, else .env).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env.local" ]]; then
  EF=(--env-file "$ROOT/.env.local")
elif [[ -f "$ROOT/.env" ]]; then
  EF=(--env-file "$ROOT/.env")
else
  echo "compose-with-env: need .env.local or .env in project root" >&2
  exit 1
fi

exec docker compose "${EF[@]}" "$@"
