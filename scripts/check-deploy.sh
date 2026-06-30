#!/usr/bin/env bash
# =============================================================================
# بررسی سریع سلامت دیپلوی CORALAY — روی سرور داخل پوشه compose اجرا کنید
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${HTTP_PORT:-8090}"
DOMAIN=""

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  source .env 2>/dev/null || true
  PORT="${HTTP_PORT:-8090}"
  if [[ -n "${PUBLIC_SITE_URL:-}" ]]; then
    DOMAIN="$(echo "$PUBLIC_SITE_URL" | sed -E 's#^https?://##; s#/.*##')"
  fi
fi

echo "=== docker compose ps ==="
docker compose ps 2>/dev/null || true

echo ""
echo "=== .env (بدون رمز) ==="
if [[ -f .env ]]; then
  grep -E '^(PUBLIC_SITE_URL|HTTP_PORT|TRUSTED_HOSTS|NEXT_PUBLIC_API_URL)=' .env || true
  grep -q '^POSTGRES_PASSWORD=' .env && echo "POSTGRES_PASSWORD=***"
  grep -q '^JWT_SECRET=' .env && echo "JWT_SECRET=***"
else
  echo "❌ فایل .env یافت نشد"
fi

echo ""
echo "=== health (nginx :$PORT) ==="
curl -sf "http://127.0.0.1:${PORT}/health" && echo "" || echo "❌ /health fail"

echo ""
echo "=== API shop settings ==="
if [[ -n "$DOMAIN" ]]; then
  curl -sf -H "Host: $DOMAIN" "http://127.0.0.1:${PORT}/api/v1/catalog/shop" | head -c 200
  echo ""
else
  curl -sf "http://127.0.0.1:${PORT}/api/v1/catalog/shop" | head -c 200
  echo ""
fi

echo ""
echo "=== admin login test ==="
HOST_HDR=()
[[ -n "$DOMAIN" ]] && HOST_HDR=(-H "Host: $DOMAIN")
CODE=$(curl -s -o /tmp/coralay-login.json -w "%{http_code}" "${HOST_HDR[@]}" \
  -X POST "http://127.0.0.1:${PORT}/api/v1/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"09120000000","password":"admin123"}')
echo "HTTP $CODE"
head -c 120 /tmp/coralay-login.json 2>/dev/null; echo ""

echo ""
echo "=== web logs (last 15) ==="
docker compose logs web --tail 15 2>/dev/null || true

echo ""
echo "=== api logs (last 15) ==="
docker compose logs api --tail 15 2>/dev/null || true
