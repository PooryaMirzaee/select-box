#!/usr/bin/env bash
# لایه‌های mockup حرفه‌ای — روش kuaitu/vue-fabric-editor (MIT ecosystem)
# منبع: stamp-images (مورد استفاده در آموزش رسمی vue-fabric-editor)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="https://yxyy-pandora.oss-cn-beijing.aliyuncs.com/stamp-images"
DIR="$ROOT/public/mockups/pro/tshirt"
mkdir -p "$DIR"

download() {
  local name="$1"
  local dest="$DIR/$name"
  if [[ -f "$dest" ]]; then
    echo "✓ $name"
    return 0
  fi
  echo "↓ $name"
  curl -fsSL "$BASE/$name" -o "$dest"
}

download "shirt-origin.jpg"
download "shirt-shadow.jpg"
download "shirt-mask.png"
download "design.png"

echo "✓ Pro t-shirt mockup layers ready in public/mockups/pro/tshirt/"
