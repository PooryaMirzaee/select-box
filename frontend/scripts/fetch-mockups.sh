#!/usr/bin/env bash
# دانلود عکس mockup برای پیش‌نمایش سفارشی‌سازی (استاندارد POD)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/public/mockups/tshirt" "$ROOT/public/mockups/mug"

TSHIRT_URL="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&h=1400&q=85"
MUG_URL="https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1200&h=1200&q=85"

download() {
  local url="$1" dest="$2"
  if [[ -f "$dest" ]]; then
    echo "✓ $(basename "$dest") already exists"
    return 0
  fi
  echo "Downloading $(basename "$dest") ..."
  curl -fsSL -o "$dest" "$url"
  echo "✓ Saved to $dest"
}

download "$TSHIRT_URL" "$ROOT/public/mockups/tshirt/base.jpg"
download "$MUG_URL" "$ROOT/public/mockups/mug/base.jpg"

echo "✓ Mockup assets ready (mask.svg + config.json are in repo)"
