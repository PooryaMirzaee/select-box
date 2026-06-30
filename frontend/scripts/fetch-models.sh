#!/usr/bin/env bash
# دانلود مدل GLB تیشرت برای پیش‌نمایش ۳D
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/public/models"
URL="https://raw.githubusercontent.com/adrianhajdin/project_threejs_ai/master/client/public/shirt_baked.glb"
DEST="$ROOT/public/models/shirt_baked.glb"

if [[ -f "$DEST" ]]; then
  echo "✓ shirt_baked.glb already exists"
  exit 0
fi

echo "Downloading shirt_baked.glb ..."
curl -fsSL -o "$DEST" "$URL"
echo "✓ Saved to public/models/shirt_baked.glb"
