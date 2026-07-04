#!/usr/bin/env bash
# =============================================================================
# تشخیص API پنل ادمین — روی سرور داخل پوشه compose اجرا کنید
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${HTTP_PORT:-8090}"
DOMAIN="selectbox.ir"
ADMIN_PHONE="${ADMIN_PHONE:-09120000000}"
ADMIN_PASS="${ADMIN_PASS:-admin123}"

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  source .env 2>/dev/null || true
  PORT="${HTTP_PORT:-8090}"
  if [[ -n "${PUBLIC_SITE_URL:-}" ]]; then
    DOMAIN="$(echo "$PUBLIC_SITE_URL" | sed -E 's#^https?://##; s#/.*##')"
  fi
fi

HOST_HDR=(-H "Host: ${DOMAIN}")
BASE="http://127.0.0.1:${PORT}"

echo "=== ۱) لاگین ادمین ==="
LOGIN_CODE=$(curl -s -o /tmp/selectbox-admin-login.json -w "%{http_code}" "${HOST_HDR[@]}" \
  -X POST "${BASE}/api/v1/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"${ADMIN_PHONE}\",\"password\":\"${ADMIN_PASS}\"}")
LOGIN_JSON=$(cat /tmp/selectbox-admin-login.json 2>/dev/null || true)

if [[ "$LOGIN_CODE" != "200" ]]; then
  echo "❌ لاگین ادمین ناموفق — HTTP ${LOGIN_CODE}"
  echo "   $(echo "$LOGIN_JSON" | head -c 200)"
  if grep -q '<<<<<<<' infra/nginx/prod.conf 2>/dev/null; then
    echo "   ⚠️  conflict در infra/nginx/prod.conf — bash scripts/fix-server-git.sh"
  fi
  exit 1
fi

TOKEN=$(echo "$LOGIN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || true)
if [[ -z "$TOKEN" ]]; then
  echo "❌ توکن در پاسخ لاگین نیست:"
  echo "$LOGIN_JSON" | head -c 200
  exit 1
fi
echo "✅ توکن دریافت شد (${#TOKEN} کاراکتر)"

echo ""
echo "=== ۲) API ادمین (Host: ${DOMAIN}) ==="
ADMIN_PATHS=(
  "/api/v1/admin/dashboard"
  "/api/v1/admin/categories"
  "/api/v1/admin/categories/tree"
  "/api/v1/admin/designs"
  "/api/v1/admin/products"
  "/api/v1/admin/settings"
  "/api/v1/admin/header-nav"
  "/api/v1/admin/homepage"
  "/api/v1/admin/coupons"
)

for path in "${ADMIN_PATHS[@]}"; do
  BODY=$(curl -s -w "\n%{http_code}" "${HOST_HDR[@]}" \
    -H "Authorization: Bearer ${TOKEN}" \
    "${BASE}${path}")
  CODE=$(echo "$BODY" | tail -1)
  DATA=$(echo "$BODY" | sed '$d')
  BYTES=${#DATA}
  if [[ "$CODE" == "200" ]]; then
    echo "✅ ${path} → HTTP ${CODE} (${BYTES} بایت)"
  else
    echo "❌ ${path} → HTTP ${CODE}"
    echo "   $(echo "$DATA" | head -c 120)"
  fi
done

echo ""
echo "=== ۳) API با Host IP (اگر Invalid host header → nginx را fix کن) ==="
IP_HOST="127.0.0.1:${PORT}"
IP_BODY=$(curl -s -w "\n%{http_code}" -H "Host: ${IP_HOST}" \
  -H "Authorization: Bearer ${TOKEN}" \
  "${BASE}/api/v1/admin/categories")
IP_CODE=$(echo "$IP_BODY" | tail -1)
IP_DATA=$(echo "$IP_BODY" | sed '$d')
echo "HTTP ${IP_CODE}: $(echo "$IP_DATA" | head -c 80)"
if echo "$IP_DATA" | grep -q "Invalid host header"; then
  echo "❌ nginx هنوز Host داخلی api را نمی‌فرستد → bash scripts/reload-nginx.sh"
fi

echo ""
echo "=== ۴) CORS (مبدأ مرورگر) ==="
if [[ -f .env ]] && grep -q '^CORS_ORIGINS=' .env; then
  grep '^CORS_ORIGINS=' .env
  echo "دامنه‌ای که در مرورگر باز می‌کنی باید در CORS_ORIGINS باشد (با https://)"
else
  echo "(CORS_ORIGINS در .env یافت نشد)"
fi

echo ""
echo "=== ۵) nginx config (Host api برای /api/) ==="
if grep -q 'proxy_set_header Host api' infra/nginx/prod.conf 2>/dev/null; then
  echo "✅ infra/nginx/prod.conf شامل Host api است"
else
  echo "❌ nginx قدیمی است — git pull && bash scripts/reload-nginx.sh"
fi

echo ""
echo "=== ۶) مرورگر (دستی) ==="
cat <<'BROWSER'

1. F12 → تب Network → فیلتر: api
2. صفحه ادمین را رفرش کن (مثلاً /admin/products/new)
3. درخواست‌های قرمز را باز کن:
   - Status 401 → دوباره لاگین کن (/admin/login)
   - Status 400 + Invalid host header → nginx fix
   - (failed) net::ERR_CONNECTION_REFUSED + localhost:8000 → rebuild web لازم است
   - Status 403 → توکن یا نقش ادمین

BROWSER
