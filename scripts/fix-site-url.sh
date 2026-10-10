#!/usr/bin/env bash
# اصلاح site_url در دیتابیس — هم‌تراز با PUBLIC_SITE_URL
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/compose.sh"
ensure_prod_compose

SITE_URL="http://dashtestan-store.ir"
if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  source .env 2>/dev/null || true
  SITE_URL="${PUBLIC_SITE_URL:-$SITE_URL}"
fi

DOMAIN="$(echo "$SITE_URL" | sed -E 's#^https?://##; s#/.*##')"

echo "=== site_url → $SITE_URL ==="
dc exec -T api python -c "
from app.db.session import SessionLocal
from app.services.settings import normalize_site_url, set_setting, get_setting, DEFAULTS

url = normalize_site_url('${SITE_URL}')
db = SessionLocal()
try:
    before = get_setting(db, 'site_url', DEFAULTS['site_url'])
    set_setting(db, 'site_url', url)
    after = get_setting(db, 'site_url', DEFAULTS['site_url'])
    print(f'before: {before}')
    print(f'after:  {after}')
finally:
    db.close()
"

echo ""
echo "=== API shop ==="
curl -sf -H "Host: ${DOMAIN}" "http://127.0.0.1:${HTTP_PORT:-8092}/api/v1/catalog/shop" \
  | grep -o '"site_url":"[^"]*"' || true
