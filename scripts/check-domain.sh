#!/usr/bin/env bash
# =============================================================================
# مقایسه دسترسی IP مستقیم vs دامنه — تشخیص CDN / 1Panel
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/compose.sh"

PORT="${HTTP_PORT:-8090}"
DOMAIN="coralay.ir"
SITE_URL="https://${DOMAIN}"

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  source .env 2>/dev/null || true
  PORT="${HTTP_PORT:-8090}"
  if [[ -n "${PUBLIC_SITE_URL:-}" ]]; then
    SITE_URL="${PUBLIC_SITE_URL%/}"
    DOMAIN="$(echo "$SITE_URL" | sed -E 's#^https?://##; s#/.*##')"
  fi
fi

LOCAL="http://127.0.0.1:${PORT}"
ADMIN_BODY='{"phone":"09120000000","password":"admin123"}'

probe() {
  local label="$1"
  shift
  local code body
  body=$(curl -s -w "\n%{http_code}" "$@" 2>/dev/null || echo -e "\n000")
  code=$(echo "$body" | tail -1)
  body=$(echo "$body" | sed '$d')
  printf "%-42s HTTP %-3s  %s\n" "$label" "$code" "$(echo "$body" | head -c 80 | tr '\n' ' ')"
}

echo "=== تنظیمات ==="
echo "دامنه: $DOMAIN"
echo "SITE_URL: $SITE_URL"
echo "پورت Docker: $PORT"
grep -E '^(CORS_ORIGINS|PUBLIC_SITE_URL)=' .env 2>/dev/null || true
echo ""

echo "=== A) مستقیم Docker (باید OK باشد) ==="
probe "GET /health (local)" "$LOCAL/health"
probe "GET /api shop (Host: $DOMAIN)" -H "Host: $DOMAIN" "$LOCAL/api/v1/catalog/shop"
probe "POST admin login (Host: $DOMAIN)" -H "Host: $DOMAIN" -X POST "$LOCAL/api/v1/auth/admin/login" \
  -H "Content-Type: application/json" -d "$ADMIN_BODY"
echo ""

echo "=== B) از خود سرور با دامنه (CDN + 1Panel) ==="
probe "GET $SITE_URL/health" "$SITE_URL/health"
probe "GET $SITE_URL/api/.../shop" "$SITE_URL/api/v1/catalog/shop"
probe "GET https://www.$DOMAIN/api/.../shop" "https://www.${DOMAIN}/api/v1/catalog/shop"
probe "POST $SITE_URL/api/.../login" -X POST "$SITE_URL/api/v1/auth/admin/login" \
  -H "Content-Type: application/json" -d "$ADMIN_BODY"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/admin/categories" 2>/dev/null || echo "000")
printf "%-42s HTTP %-3s  (صفحه HTML ادمین)\n" "GET $SITE_URL/admin/categories" "$CODE"
echo ""

echo "=== C) هدرهای پاسخ دامنه (کش CDN؟) ==="
curl -sI "$SITE_URL/api/v1/catalog/shop" 2>/dev/null | grep -iE '^(HTTP|server|cf-|x-cache|age|via|location):' || \
  curl -sI "$SITE_URL/api/v1/catalog/shop" 2>/dev/null | head -12
echo ""

echo "=== D) 1Panel روی پورت 443؟ ==="
if curl -sf -o /dev/null --max-time 3 "https://127.0.0.1/health" -H "Host: $DOMAIN" -k 2>/dev/null; then
  echo "✅ OpenResty/1Panel روی 443 پاسخ می‌دهد (Host: $DOMAIN)"
  probe "GET /health via 127.0.0.1:443" -k -H "Host: $DOMAIN" "https://127.0.0.1/health"
else
  echo "❌ از localhost:443 با Host $DOMAIN پاسخ نیامد — reverse proxy 1Panel را چک کن"
fi
echo ""

echo "=== تفسیر ==="
cat <<'HELP'
• A OK و B fail  → مشکل CDN پارس‌پک یا Reverse Proxy در 1Panel (نه Docker)
• POST روی دامنه fail ولی GET OK → کش CDN یا WAF — /api/* را Bypass Cache کن
• www fail و بدون www OK → هر دو دامنه را در 1Panel و CDN اضافه کن
• IP کار می‌کند ولی دامنه نه → حتماً Purge Cache + SSL Full + Origin پورت 443
HELP
