#!/usr/bin/env bash
# =============================================================================
# دیپلوی / آپدیت CORALAY روی سرور
# -----------------------------------------------------------------------------
# استفاده:
#   ./scripts/deploy.sh          # build + up
#   ./scripts/deploy.sh --pull     # git pull سپس deploy
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ فایل $ENV_FILE یافت نشد."
  echo "   cp .env.production.example .env.production"
  echo "   سپس مقادیر را ویرایش کنید."
  exit 1
fi

if [[ "${1:-}" == "--pull" ]]; then
  echo "⬇️  git pull..."
  git pull --ff-only
fi

echo "🔨 build ایمیج‌ها..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo "🚀 بالا آوردن سرویس‌ها..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

echo ""
echo "✅ دیپلوی تمام شد."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo ""
echo "بررسی سلامت: curl -s http://localhost/health"
echo "لاگ API:       docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f api"
echo "لاگ فرانت:     docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f web"
