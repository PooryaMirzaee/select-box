#!/usr/bin/env bash
# پر کردن دادهٔ نمونه (دسته‌بندی، محصول، کوپن) — فقط اگر DB خالی باشد
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
docker compose cp backend/scripts/seed.py api:/app/seed.py
docker compose exec -T api python seed.py
docker compose exec -T api python seed.py reset-admin
echo "✅ seed تمام — ادمین: 09120000000 / admin123"
