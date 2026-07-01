#!/usr/bin/env bash
# =============================================================================
# اعمال تنظیمات nginx بدون rebuild — فقط کانتینر nginx را reload می‌کند
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f infra/nginx/prod.conf ]]; then
  echo "❌ infra/nginx/prod.conf یافت نشد"
  exit 1
fi

echo "=== تست syntax nginx ==="
docker run --rm \
  -v "$(pwd)/infra/nginx/prod.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:alpine nginx -t

echo ""
echo "=== recreate nginx ==="
docker compose up -d --force-recreate nginx

PORT="${HTTP_PORT:-8090}"
if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  source .env 2>/dev/null || true
  PORT="${HTTP_PORT:-8090}"
fi

echo ""
echo "=== تست API با Host IP (باید JSON باشد، نه Invalid host header) ==="
sleep 2
curl -s -H "Host: 127.0.0.1:${PORT}" "http://127.0.0.1:${PORT}/api/v1/catalog/shop" | head -c 120
echo ""
