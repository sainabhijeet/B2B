#!/usr/bin/env bash
# GeoNames files download → backend/storage/geonames (gitignored)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-$ROOT/storage/geonames}"
mkdir -p "$TARGET"
cd "$TARGET"
echo "[download-geonames] writing to $TARGET"
curl -fsSL -o IN.zip "https://download.geonames.org/export/dump/IN.zip"
curl -fsSL -o admin1CodesASCII.txt "https://download.geonames.org/export/dump/admin1CodesASCII.txt"
unzip -o -q IN.zip IN.txt
rm -f IN.zip
echo ""
echo "Done. Ab ye command chalao (PostgreSQL + migrations + countries:seed pehle):"
echo "  export GEONAMES_DIR=\"$TARGET\""
echo "  cd \"$ROOT\""
echo "  npm run india:import-geonames"
echo ""
echo "Poora India dump (bahut rows):"
echo "  MIN_POPULATION=0 CONFIRM=1 npm run india:import-geonames"
