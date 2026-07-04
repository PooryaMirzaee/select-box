#!/usr/bin/env bash
# =============================================================================
# بررسی سریع سلامت دیپلوی SelectBox — روی سرور داخل پوشه compose اجرا کنید
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/compose.sh"

PORT="${HTTP_PORT:-8090}"
DOMAIN="selectbox.ir"

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  source .env 2>/dev/null || true
  PORT="${HTTP_PORT:-8090}"
  if [[ -n "${PUBLIC_SITE_URL:-}" ]]; then
    DOMAIN="$(echo "$PUBLIC_SITE_URL" | sed -E 's#^https?://##; s#/.*##')"
  fi
fi

echo "=== docker compose ps ($COMPOSE_FILE) ==="
dc ps 2>/dev/null || true

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
echo "=== homepage HTML (Host: ${DOMAIN:-selectbox.ir}) ==="
HOME_CODE=$(curl -s -o /tmp/selectbox-home.html -w "%{http_code}" -H "Host: ${DOMAIN:-selectbox.ir}" "http://127.0.0.1:${PORT}/")
echo "HTTP $HOME_CODE"
if [[ "$HOME_CODE" == "200" ]]; then
  grep -o '<title>[^<]*</title>' /tmp/selectbox-home.html 2>/dev/null | head -1 || true
  if grep -q "خطایی رخ داد\|server_error" /tmp/selectbox-home.html 2>/dev/null; then
    echo "❌ HTML شامل صفحهٔ خطای Next.js است — docker compose logs web --tail 40"
  fi
elif grep -q "۵۰۰\|server_error\|خطایی رخ داد" /tmp/selectbox-home.html 2>/dev/null; then
  echo "❌ صفحهٔ خطای ۵۰۰ از Next.js — docker compose logs web --tail 30"
else
  head -c 200 /tmp/selectbox-home.html 2>/dev/null; echo ""
fi

echo ""
echo "=== homepage HTML (بدون Host — مثل IP مستقیم) ==="
IP_CODE=$(curl -s -o /tmp/selectbox-home-ip.html -w "%{http_code}" "http://127.0.0.1:${PORT}/")
echo "HTTP $IP_CODE"
if grep -q "خطایی رخ داد\|server_error" /tmp/selectbox-home-ip.html 2>/dev/null; then
  echo "❌ صفحهٔ خطا در HTML — docker compose logs web --tail 40"
elif [[ "$IP_CODE" == "200" ]]; then
  grep -o '<title>[^<]*</title>' /tmp/selectbox-home-ip.html 2>/dev/null | head -1 || true
fi

echo ""
echo "=== API با Host IP (قبل از fix nginx باید Invalid host header بدهد) ==="
IP_HOST="127.0.0.1:${PORT}"
API_IP=$(curl -s -o /tmp/selectbox-api-ip.txt -w "%{http_code}" -H "Host: ${IP_HOST}" "http://127.0.0.1:${PORT}/api/v1/catalog/shop")
echo "HTTP $API_IP"
head -c 80 /tmp/selectbox-api-ip.txt 2>/dev/null; echo ""

echo ""
echo "=== site_url in API ==="
curl -sf -H "Host: ${DOMAIN:-selectbox.ir}" "http://127.0.0.1:${PORT}/api/v1/catalog/shop" 2>/dev/null \
  | grep -o '"site_url":"[^"]*"' || echo "(not found)"

echo ""
echo "=== admin login test ==="
HOST_HDR=()
[[ -n "$DOMAIN" ]] && HOST_HDR=(-H "Host: $DOMAIN")
CODE=$(curl -s -o /tmp/selectbox-login.json -w "%{http_code}" "${HOST_HDR[@]}" \
  -X POST "http://127.0.0.1:${PORT}/api/v1/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"09120000000","password":"admin123"}')
echo "HTTP $CODE"
head -c 120 /tmp/selectbox-login.json 2>/dev/null; echo ""

echo ""
echo "=== web logs (last 15) ==="
dc logs web --tail 15 2>/dev/null || true

echo ""
echo "=== api logs (last 15) ==="
dc logs api --tail 15 2>/dev/null || true
