#!/usr/bin/env bash
# mockup تیشرت — از image.png پروژه یا فایل source محلی
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/public/mockups/basic"
REPO="$(cd "$ROOT/.." && pwd)"
mkdir -p "$DIR"

if [[ ! -f "$DIR/tshirt-source.png" && ! -f "$DIR/tshirt-source.jpg" ]]; then
  if [[ -f "$REPO/image.png" ]]; then
    echo "↓ using repo image.png"
    cp "$REPO/image.png" "$DIR/tshirt-source.png"
  else
    echo "↓ downloading fallback mockup..."
    URL="https://dgmockup.com/wp-content/uploads/2026/04/White-T-Shirt-Mockup-%E2%80%94-Front-Back-View-Free-PSD-Preview.jpg"
    curl -fsSL -L -A "Mozilla/5.0" "$URL" -o "$DIR/tshirt-source.jpg"
  fi
fi

python3 "$ROOT/scripts/prepare-basic-tshirt-mockup.py"
echo "✓ T-shirt mockup ready in public/mockups/basic/"
