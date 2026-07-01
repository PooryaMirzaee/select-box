#!/usr/bin/env bash
# =============================================================================
# رفع conflict گیت روی سرور — .env حفظ می‌شود
# -----------------------------------------------------------------------------
# cd /opt/1panel/docker/compose/coralay
# bash scripts/fix-server-git.sh
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_BACKUP=""
if [[ -f .env ]]; then
  ENV_BACKUP="$(mktemp)"
  cp .env "$ENV_BACKUP"
  echo "✅ .env در $ENV_BACKUP پشتیبان شد"
fi

echo "=== fetch + reset به origin/main ==="
git fetch origin
git reset --hard origin/main

if [[ -n "$ENV_BACKUP" && -f "$ENV_BACKUP" ]]; then
  cp "$ENV_BACKUP" .env
  echo "✅ .env بازگردانده شد"
fi

if grep -q '<<<<<<<' infra/nginx/prod.conf 2>/dev/null; then
  echo "❌ هنوز conflict در nginx — دستی گزارش کن"
  exit 1
fi

echo ""
echo "=== reload nginx ==="
bash scripts/reload-nginx.sh

echo ""
echo "=== check deploy ==="
bash scripts/check-deploy.sh

echo ""
echo "=== check admin ==="
bash scripts/check-admin.sh
