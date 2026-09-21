#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../assets/images" && pwd)"
mkdir -p "$ROOT"
export ROOT
python3 - <<'PY'
import os
import struct
import zlib
from pathlib import Path

def write_png(path: Path, w: int, h: int, rgb: tuple[int, int, int]) -> None:
    r, g, b = rgb
    raw = b"".join(b"\x00" + bytes([r, g, b]) * w for _ in range(h))
    comp = zlib.compress(raw, 9)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", comp) + chunk(b"IEND", b"")
    path.write_bytes(png)

root = Path(os.environ["ROOT"])
cream = (253, 248, 238)
gold = (201, 162, 39)
names = [
    "hero-woman.png",
    "category-arch.png",
    "product-bracelet.png",
    "product-necklace.png",
    "product-ring.png",
    "product-ring-coral.png",
    "lifestyle-hand.png",
    "lifestyle-necklaces.png",
    "brand-logos.png",
    "hero-reference.png",
]
for i, name in enumerate(names):
    write_png(root / name, 240, 160, gold if i % 2 else cream)
print("ok", root)
PY
