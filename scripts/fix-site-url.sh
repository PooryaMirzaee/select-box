#!/usr/bin/env bash
# اصلاح site_url در دیتابیس — باید https://selectbox.ir باشد نه selectbox.ir
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/compose.sh"
ensure_prod_compose

SITE_URL="https://selectbox.ir"
if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  source .env 2>/dev/null || true
  SITE_URL="${PUBLIC_SITE_URL:-$SITE_URL}"
fi

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
echo "=== API shop (باید site_url با https باشد) ==="
curl -sf -H "Host: selectbox.ir" "http://127.0.0.1:${HTTP_PORT:-8090}/api/v1/catalog/shop" \
  | grep -o '"site_url":"[^"]*"' || true
