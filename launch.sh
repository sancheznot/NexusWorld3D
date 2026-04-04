#!/usr/bin/env bash
# =============================================================================
# Interactive launcher — dev stack, Docker, migrations, logs.
# Usage: ./launch.sh
# =============================================================================

set -o pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT" || exit 1

R='\033[0;31m'
G='\033[0;32m'
Y='\033[1;33m'
B='\033[0;34m'
C='\033[0;36m'
M='\033[0;35m'
N='\033[0m'
BOLD='\033[1m'

banner() {
  echo -e "${C}${BOLD}"
  echo "  ╔═══════════════════════════════════════════════════════════╗"
  echo "  ║  NexusWorld3D · Launch menu                               ║"
  echo "  ╚═══════════════════════════════════════════════════════════╝"
  echo -e "${N}"
}

warn() { echo -e "${Y}▸ $*${N}" >&2; }
ok() { echo -e "${G}✓ $*${N}"; }
err() { echo -e "${R}✗ $*${N}" >&2; }

check_env_file() {
  if [[ ! -f "$ROOT/.env.local" ]]; then
    warn "Missing .env.local"
    if [[ -f "$ROOT/.env.local.example" ]]; then
      read -r -p "Copy from .env.local.example? [y/N] " a
      case "$a" in
        s|S|y|Y)
          cp "$ROOT/.env.local.example" "$ROOT/.env.local"
          ok "Created .env.local — edit and add secrets."
          ;;
      esac
    fi
  fi
}

compose_run() {
  bash "$ROOT/scripts/compose-with-env.sh" "$@"
}

need_compose_env() {
  if [[ ! -f "$ROOT/.env.local" ]] && [[ ! -f "$ROOT/.env" ]]; then
    err "Need .env.local or .env (include MARIADB_* from env.docker.example)."
    return 1
  fi
  return 0
}

cmd_dev() {
  check_env_file
  warn "Starting Next (PORT → 3000) + Colyseus (COLYSEUS_PORT → 3001)…"
  warn "Press Ctrl+C to stop."
  export COLYSEUS_PORT="${COLYSEUS_PORT:-3001}"
  export SOCKET_PORT="${SOCKET_PORT:-$COLYSEUS_PORT}"
  export PORT="${PORT:-3000}"
  npm run dev
}

# ES: Solo contenedor MariaDB + npm run dev (sin build de imagen app).
# EN: MariaDB container only + npm run dev (no app image build).
cmd_dev_with_docker_db() {
  need_compose_env || return 1
  if [[ ! -f "$ROOT/docker-compose.dev-db.yml" ]]; then
    err "Missing docker-compose.dev-db.yml"
    return 1
  fi
  check_env_file
  warn "Docker: MariaDB published on 127.0.0.1 — host port = MARIADB_HOST_PORT from .env.local (default 3306)."
  if compose_run -f "$ROOT/docker-compose.yml" -f "$ROOT/docker-compose.dev-db.yml" up -d mariadb --wait 2>/dev/null; then
    ok "MariaDB is healthy (--wait)."
  else
    warn "Falling back without --wait (older Compose?)…"
    compose_run -f "$ROOT/docker-compose.yml" -f "$ROOT/docker-compose.dev-db.yml" up -d mariadb || {
      err "Docker failed. If you see 'bind: address already in use' on 3306, add to .env.local:"
      err "  MARIADB_HOST_PORT=3307"
      err "  MARIADB_PORT=3307   (same as host port for Node on your machine)"
      err "Or stop the other MySQL/MariaDB using that port."
      return 1
    }
    sleep 8
    ok "MariaDB should be up; if npm fails, wait a few seconds and retry."
  fi
  warn "In .env.local use MARIADB_HOST=127.0.0.1 and MARIADB_PORT equal to the published host port (same as MARIADB_HOST_PORT)."
  warn "Starting npm run dev…"
  export COLYSEUS_PORT="${COLYSEUS_PORT:-3001}"
  export SOCKET_PORT="${SOCKET_PORT:-$COLYSEUS_PORT}"
  export PORT="${PORT:-3000}"
  npm run dev
}

cmd_start_prod() {
  check_env_file
  if [[ ! -d "$ROOT/.next" ]]; then
    err "No .next build — run Build from the menu first."
    return 1
  fi
  warn "Unified server (combined) on PORT=${PORT:-3000}…"
  PORT="${PORT:-3000}" npm run start
}

cmd_docker_up() {
  need_compose_env || return 1
  warn "Full stack: runs next build inside image + production app container (slow). Use Basic → Dev+DB for daily work."
  compose_run -f "$ROOT/docker-compose.yml" up --build
}

cmd_docker_up_d() {
  need_compose_env || return 1
  warn "Full stack production build — see Docker logs after up."
  compose_run -f "$ROOT/docker-compose.yml" up --build -d
  ok "Containers running in background. Advanced → Docker logs to follow."
}

cmd_docker_down() {
  need_compose_env || return 1
  compose_run -f "$ROOT/docker-compose.yml" down
}

cmd_docker_logs() {
  need_compose_env || return 1
  compose_run -f "$ROOT/docker-compose.yml" logs -f --tail=100
}

cmd_docker_db_stop() {
  need_compose_env || return 1
  warn "Stopping MariaDB stack (compose project)…"
  compose_run -f "$ROOT/docker-compose.yml" -f "$ROOT/docker-compose.dev-db.yml" stop mariadb 2>/dev/null \
    || compose_run -f "$ROOT/docker-compose.yml" stop mariadb
}

cmd_migrate() {
  check_env_file
  npm run db:migrate
}

cmd_install() {
  npm install
}

cmd_build() {
  npm run build
}

cmd_health() {
  echo -e "${B}HTTP Next (3000):${N}"
  curl -sS -o /dev/null -w "%{http_code}\n" --max-time 3 http://127.0.0.1:3000/ || err "No response on :3000"
  echo -e "${B}Colyseus (3001) — any HTTP code is OK for a quick probe:${N}"
  curl -sS -o /dev/null -w "%{http_code}\n" --max-time 3 http://127.0.0.1:3001/ || err "No response on :3001"
}

kill_ports() {
  warn "Freeing ports 3000 and 3001…"
  for p in 3000 3001; do
    if command -v fuser >/dev/null 2>&1; then
      fuser -k "${p}/tcp" 2>/dev/null && ok "Port $p" || true
    elif command -v lsof >/dev/null 2>&1; then
      pids=$(lsof -t -iTCP:"$p" -sTCP:LISTEN 2>/dev/null || true)
      if [[ -n "$pids" ]]; then
        kill $pids 2>/dev/null && ok "Port $p" || err "Could not kill listener on $p"
      else
        warn "Nothing listening on $p"
      fi
    else
      err "Install psmisc (fuser) or lsof for this option."
      return 1
    fi
  done
}

# ES: Limpia lo típico de opciones 1 y 2 (Next+Colyseus y MariaDB Docker).
# EN: Clean up after options 1–2 (Next+Colyseus and Docker MariaDB).
cmd_stop_dev_stack() {
  warn "Stop dev stack — frees :3000 / :3001 (npm run dev) and stops Docker MariaDB if running."
  read -r -p "Proceed? [y/N]: " c
  if [[ ! "$c" =~ ^[sSyY]$ ]]; then
    warn "Cancelled."
    return 0
  fi
  kill_ports || true
  if [[ -f "$ROOT/.env.local" ]] || [[ -f "$ROOT/.env" ]]; then
    warn "Stopping MariaDB container (compose project)…"
    if compose_run -f "$ROOT/docker-compose.yml" -f "$ROOT/docker-compose.dev-db.yml" stop mariadb 2>/dev/null; then
      ok "MariaDB container stopped (dev-db compose)."
    elif compose_run -f "$ROOT/docker-compose.yml" stop mariadb 2>/dev/null; then
      ok "MariaDB container stopped (base compose)."
    else
      warn "No MariaDB container found or already stopped."
    fi
  else
    warn "No .env.local / .env — skipped Docker MariaDB stop."
  fi
  ok "Dev stack cleanup finished."
}

open_env_example() {
  ${EDITOR:-nano} "$ROOT/.env.local.example"
}

open_env_local() {
  check_env_file
  ${EDITOR:-nano} "$ROOT/.env.local"
}

# ES: Lista vertical (bash "select" pone opciones en columnas y se ve mal).
# EN: Vertical list (bash "select" uses columns and looks messy).
pick_menu() {
  local header="$1"
  shift
  local -a labels=("$@")
  local count=${#labels[@]}
  local i
  echo ""
  echo -e "${M}${BOLD}${header}${N}"
  for ((i = 0; i < count; i++)); do
    printf "  ${C}%d)${N} %s\n" "$((i + 1))" "${labels[$i]}"
  done
  echo ""
  echo -ne "${C}▶${N} Enter number "
  printf "${Y}[1-%s, 0 = back]${N}: " "$count"
  read -r REPLY
  REPLY="${REPLY#"${REPLY%%[![:space:]]*}"}"
  REPLY="${REPLY%"${REPLY##*[![:space:]]}"}"
}

menu_basic() {
  while true; do
    pick_menu "── Basic ──" \
      "Dev: Next + Colyseus (npm run dev, no Docker)" \
      "Dev: Docker MariaDB only + npm run dev (no app image build)" \
      "Stop dev stack (ports 3000/3001 + Docker MariaDB from option 2)" \
      "Install dependencies (npm install)" \
      "Production build (next build)" \
      "Local production: unified server (npm run start)" \
      "Health check :3000 / :3001 (curl)" \
      "Edit .env.local" \
      "View .env.local.example template" \
      "Back to main menu"
    case $REPLY in
      1) cmd_dev ;;
      2) cmd_dev_with_docker_db ;;
      3) cmd_stop_dev_stack ;;
      4) cmd_install ;;
      5) cmd_build ;;
      6) cmd_start_prod ;;
      7) cmd_health ;;
      8) open_env_local ;;
      9) open_env_example ;;
      10 | 0) return 0 ;;
      *) err "Invalid option — try again." ;;
    esac
  done
}

menu_advanced() {
  while true; do
    pick_menu "── Advanced ──" \
      "Docker: FULL stack — production build + app + MariaDB (slow)" \
      "Docker: FULL stack detached (-d, production build)" \
      "Docker Compose: down (all services)" \
      "Docker: stop MariaDB only (keep volumes)" \
      "Docker: follow logs (-f)" \
      "MariaDB: run migrations (npm run db:migrate, uses .env.local)" \
      "Free ports 3000 and 3001 (fuser/lsof)" \
      "Back to main menu"
    case $REPLY in
      1) cmd_docker_up ;;
      2) cmd_docker_up_d ;;
      3) cmd_docker_down ;;
      4) cmd_docker_db_stop ;;
      5) cmd_docker_logs ;;
      6) cmd_migrate ;;
      7) read -r -p "Sure? [y/N]: " c && [[ "$c" =~ ^[sSyY]$ ]] && kill_ports ;;
      8 | 0) return 0 ;;
      *) err "Invalid option — try again." ;;
    esac
  done
}

main_menu() {
  while true; do
    banner
    check_env_file
    echo -e "${B}Project root:${N} $ROOT"
    pick_menu "── Main menu ──" \
      "Basic menu (dev, build, env, health)" \
      "Advanced menu (Docker, migrations, logs)" \
      "Exit"
    case $REPLY in
      1) menu_basic ;;
      2) menu_advanced ;;
      3 | 0)
        ok "Goodbye"
        exit 0
        ;;
      *) err "Invalid option — try again." ;;
    esac
  done
}

main_menu
