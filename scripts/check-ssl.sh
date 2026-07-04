#!/usr/bin/env bash
# =============================================================================
# تشخیص HTTP vs HTTPS — وقتی IP و http://دامنه OK ولی https://دامنه 502 است
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/compose.sh"

DOMAIN="selectbox.ir"
ADMIN_BODY='{"phone":"09120000000","password":"admin123"}'
PORT="${HTTP_PORT:-8090}"
[[ -f .env ]] && source .env 2>/dev/null || true
PORT="${HTTP_PORT:-8090}"

kind() {
  local body="$1"
  if echo "$body" | grep -q '^{'; then echo "JSON ✅"
  elif echo "$body" | grep -qi '<html'; then echo "HTML ❌ (CDN/WAF/502)"
  else echo "$(echo "$body" | head -c 40)"
  fi
}

test_url() {
  local label="$1"
  shift
  local out code body
  out=$(curl -s -w "\n%{http_code}" "$@" 2>/dev/null || echo -e "\n000")
  code=$(echo "$out" | tail -1)
  body=$(echo "$out" | sed '$d')
  printf "%-36s HTTP %-3s  %s\n" "$label" "$code" "$(kind "$body")"
}

echo "=== Docker مستقیم (127.0.0.1:${PORT}) ==="
test_url "POST login" -H "Host: $DOMAIN" -X POST "http://127.0.0.1:${PORT}/api/v1/auth/admin/login" \
  -H "Content-Type: application/json" -d "$ADMIN_BODY"
echo ""

echo "=== دامنه — HTTP vs HTTPS ==="
test_url "HTTP  GET  /api/.../shop" "http://${DOMAIN}/api/v1/catalog/shop"
test_url "HTTP  POST /api/.../login" -X POST "http://${DOMAIN}/api/v1/auth/admin/login" \
  -H "Content-Type: application/json" -d "$ADMIN_BODY"
test_url "HTTPS GET  /api/.../shop" "https://${DOMAIN}/api/v1/catalog/shop"
test_url "HTTPS POST /api/.../login" -X POST "https://${DOMAIN}/api/v1/auth/admin/login" \
  -H "Content-Type: application/json" -d "$ADMIN_BODY"
echo ""

echo "=== 1Panel روی سرور (localhost) ==="
test_url "HTTP  :80  /health" -H "Host: $DOMAIN" "http://127.0.0.1/health"
test_url "HTTPS :443 /health" -k -H "Host: $DOMAIN" "https://127.0.0.1/health"
echo ""

echo "=== تفسیر ==="
cat <<'HELP'

┌─────────────────────────────────────────────────────────────────┐
│ HTTP ✅  و  HTTPS ❌ 502  →  SSL بین CDN و سرور خراب است       │
│                                                                 │
│ راه‌حل A (سریع) — CDN پارس‌پک:                                  │
│   SSL Mode → Flexible                                           │
│   (CDN با کاربر HTTPS، با سرور HTTP روی پورت 80)                │
│                                                                 │
│ راه‌حل B (درست) — 1Panel:                                       │
│   Website → HTTPS → Let's Encrypt فعال                          │
│   سپس CDN → SSL Full                                            │
│   تست: curl -k https://127.0.0.1/health -H "Host: selectbox.ir"   │
│        باید {"status":"ok"} بدهد                                  │
│                                                                 │
│ تا fix نشود، ادمین فقط با http://IP:8090 کار می‌کند             │
│ مرورگر https:// را force می‌کند → POST به HTTPS → 502            │
└─────────────────────────────────────────────────────────────────┘

HELP
