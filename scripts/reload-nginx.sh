#!/usr/bin/env bash
# =============================================================================
# اعمال تنظیمات nginx — recreate کانتینر روی شبکه compose
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/compose.sh"
ensure_prod_compose

if [[ ! -f infra/nginx/prod.conf ]]; then
  echo "❌ infra/nginx/prod.conf یافت نشد"
  exit 1
fi

if grep -q '<<<<<<<' infra/nginx/prod.conf 2>/dev/null; then
  echo "❌ conflict در infra/nginx/prod.conf — اول git reset --hard origin/main"
  exit 1
fi

PORT="${HTTP_PORT:-8090}"
if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  source .env 2>/dev/null || true
  PORT="${HTTP_PORT:-8090}"
fi

echo "=== compose: $COMPOSE_FILE ==="
echo "=== recreate nginx (resolve مجدد web/api) ==="
dc up -d --force-recreate nginx

echo ""
echo "=== تست syntax داخل کانتینر ==="
sleep 2
dc exec -T nginx nginx -t

echo ""
echo "=== health ==="
curl -sf "http://127.0.0.1:${PORT}/health" && echo "" || echo "❌ /health fail"

echo ""
echo "=== API shop (Host: coralay.ir) ==="
curl -sf -H "Host: coralay.ir" "http://127.0.0.1:${PORT}/api/v1/catalog/shop" | head -c 120
echo ""

echo ""
echo "=== upstream از داخل nginx ==="
dc exec -T nginx wget -qO- http://api:8000/health 2>/dev/null && echo " ✅ api:8000" || echo "❌ api:8000 unreachable"
dc exec -T nginx wget -q -S -O /dev/null http://web:3000/ 2>&1 | head -1 || echo "❌ web:3000 unreachable"
