#!/usr/bin/env bash
# =============================================================================
# تنظیم خودکار تولید CORALAY برای coralay.ir
# -----------------------------------------------------------------------------
# روی سرور:
#   cd /opt/1panel/docker/compose/coralay
#   git pull
#   bash scripts/configure-coralay.sh
#
# برای پاک کردن دیتابیس و شروع از صفر (داده از بین می‌رود):
#   bash scripts/configure-coralay.sh --reset-db
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DOMAIN="coralay.ir"
SITE_URL="https://${DOMAIN}"
WWW_SITE_URL="https://www.${DOMAIN}"
HTTP_PORT="${HTTP_PORT:-8090}"
RESET_DB=false

for arg in "$@"; do
  case "$arg" in
    --reset-db) RESET_DB=true ;;
  esac
done

echo "🔧 تنظیم CORALAY برای ${SITE_URL}"

POSTGRES_PASSWORD=""
JWT_SECRET=""
if [[ -f .env ]]; then
  POSTGRES_PASSWORD="$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2- || true)"
  JWT_SECRET="$(grep '^JWT_SECRET=' .env | cut -d= -f2- || true)"
fi

if [[ "$RESET_DB" == true ]]; then
  echo "⚠️  پاک کردن volumeهای postgres و uploads..."
  docker compose down -v 2>/dev/null || true
  POSTGRES_PASSWORD=""
  JWT_SECRET=""
fi

[[ -z "$POSTGRES_PASSWORD" ]] && POSTGRES_PASSWORD="$(openssl rand -hex 16)"
[[ -z "$JWT_SECRET" ]] && JWT_SECRET="$(openssl rand -hex 32)"

cat > .env <<EOF
PUBLIC_SITE_URL=${SITE_URL}
NEXT_PUBLIC_API_URL=
HTTP_PORT=${HTTP_PORT}
POSTGRES_USER=coralay
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=coralay
JWT_SECRET=${JWT_SECRET}
TRUSTED_HOSTS=${DOMAIN},www.${DOMAIN},nginx,api,localhost,127.0.0.1
CORS_ORIGINS=${SITE_URL},${WWW_SITE_URL}
PAYMENT_GATEWAY=mock
ZARINPAL_MERCHANT_ID=
ZARINPAL_SANDBOX=true
MOCK_PAYMENT_SECRET=
SMS_IR_API_KEY=
SMS_IR_TEMPLATE_ID=0
EOF

echo "✅ .env ساخته شد"
cp docker-compose.prod.yml docker-compose.yml

echo "🔨 build و up..."
docker compose up -d --build

echo "⏳ منتظر healthy شدن api..."
for i in $(seq 1 40); do
  if docker compose ps api 2>/dev/null | grep -q healthy; then
    break
  fi
  sleep 3
done

echo "👤 ساخت ادمین..."
docker compose cp backend/scripts/seed.py api:/app/seed.py
docker compose exec -T api python seed.py reset-admin

echo ""
echo "🔍 بررسی..."
bash scripts/check-deploy.sh || true

echo ""
echo "=============================================="
echo "✅ تنظیمات coralay.ir اعمال شد"
echo ""
echo "۱) در 1Panel → Website → Reverse Proxy:"
echo "   Domain: coralay.ir , www.coralay.ir"
echo "   Proxy:  http://127.0.0.1:${HTTP_PORT}"
echo ""
echo "۲) در CDN پارس‌پک:"
echo "   A record → IP سرور (ابر روشن)"
echo "   SSL فعال | /api و /admin کش نشود"
echo ""
echo "۳) ورود ادمین:"
echo "   ${SITE_URL}/admin/login"
echo "   09120000000 / admin123"
echo "=============================================="
