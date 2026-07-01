#!/usr/bin/env bash
# پر کردن دادهٔ نمونه (دسته‌بندی، محصول، کوپن) — فقط اگر DB خالی باشد
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/compose.sh"
ensure_prod_compose
dc cp backend/scripts/seed.py api:/app/seed.py
dc exec -T api python seed.py
dc exec -T api python seed.py reset-admin
echo "✅ seed تمام — ادمین: 09120000000 / admin123"
