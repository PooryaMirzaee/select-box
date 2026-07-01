#!/usr/bin/env bash
# =============================================================================
# انتخاب فایل compose — تولید از docker-compose.prod.yml
# -----------------------------------------------------------------------------
# source "$(dirname "$0")/compose.sh"   # از داخل scripts/
# source scripts/compose.sh             # از ریشه پروژه
# =============================================================================

COMPOSE_FILE="docker-compose.yml"
if [[ -f docker-compose.prod.yml ]]; then
  if ! grep -qE '^  nginx:' docker-compose.yml 2>/dev/null; then
    COMPOSE_FILE="docker-compose.prod.yml"
  fi
fi

dc() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

ensure_prod_compose() {
  if [[ "$COMPOSE_FILE" == "docker-compose.prod.yml" ]]; then
    cp docker-compose.prod.yml docker-compose.yml
    COMPOSE_FILE="docker-compose.yml"
  fi
}
