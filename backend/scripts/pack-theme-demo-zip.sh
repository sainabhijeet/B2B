#!/usr/bin/env bash
# Build a WEB theme ZIP from `storage/themes/web/theme1` for admin upload testing.
# Usage (from repo root or backend/):
#   bash backend/scripts/pack-theme-demo-zip.sh
# Output: backend/storage/theme-demo-playground.zip
# Admin → Themes → Upload: file = that zip, theme name e.g. "Demo Playground", slug = theme-demo-playground

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC="$BACKEND_ROOT/storage/themes/web/theme1"
OUT_ZIP="$BACKEND_ROOT/storage/theme-demo-playground.zip"
TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

if [[ ! -d "$SRC" ]]; then
  echo "Missing source theme: $SRC" >&2
  exit 1
fi

cp -R "$SRC" "$TMP/theme-demo-playground"

python3 - "$TMP/theme-demo-playground/theme.json" <<'PY'
import json, sys
from pathlib import Path
path = Path(sys.argv[1])
data = json.loads(path.read_text(encoding="utf-8"))
data["name"] = "Demo Playground (upload test)"
data["storefrontKey"] = "jewellery"
# Builder / validator alignment: every section `type` used in theme1 templates
data["capabilities"] = {
    "allowed_sections": [
        "header",
        "hero-split",
        "category-grid",
        "product-grid",
        "testimonial-carousel",
        "newsletter",
        "editorial-banner",
        "footer-columns",
        "product-detail",
        "product-carousel",
    ]
}
path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
PY

( cd "$TMP" && zip -r -q "$OUT_ZIP" theme-demo-playground )
echo "Wrote: $OUT_ZIP"
echo "Admin: Themes → Upload → ZIP file above, slug: theme-demo-playground (or leave empty to auto-slug from name)."
