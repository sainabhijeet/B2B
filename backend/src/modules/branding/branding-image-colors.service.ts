import { BadRequestException, Injectable } from '@nestjs/common';
import type { Palette } from '@vibrant/color';
import { Vibrant } from 'node-vibrant/node';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const DATA_URL_RE =
  /^data:image\/(png|jpeg|jpg|gif|webp);base64,([\s\S]+)$/i;

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

@Injectable()
export class BrandingImageColorsService {
  /**
   * Dominant colors from a data URL image (PNG/JPEG/WebP/GIF).
   * Uses node-vibrant (MMCQ) — primary = most vibrant; secondary = another distinct swatch.
   */
  async extractFromDataUrl(imageDataUrl: string): Promise<{ primary: string; secondary: string }> {
    const raw = imageDataUrl.trim();
    const m = DATA_URL_RE.exec(raw);
    if (!m) {
      throw new BadRequestException(
        'Invalid image: expected data URL (data:image/png|jpeg|jpg|gif|webp;base64,...).',
      );
    }
    const b64 = m[2].replace(/\s/g, '');
    let buf: Buffer;
    try {
      buf = Buffer.from(b64, 'base64');
    } catch {
      throw new BadRequestException('Invalid base64 image data.');
    }
    if (!buf.length || buf.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException(`Image too large (max ${MAX_IMAGE_BYTES / (1024 * 1024)} MB).`);
    }

    let palette: Palette;
    try {
      palette = await Vibrant.from(buf).getPalette();
    } catch {
      throw new BadRequestException('Could not read image pixels for color extraction.');
    }

    const swatches: { hex: string; population: number }[] = [];
    const keys = [
      'Vibrant',
      'DarkVibrant',
      'LightVibrant',
      'Muted',
      'DarkMuted',
      'LightMuted',
    ] as const;
    for (const k of keys) {
      const s = palette[k];
      const hex = s?.hex;
      if (hex && /^#[0-9A-Fa-f]{6}$/i.test(hex)) {
        swatches.push({ hex: hex.toLowerCase(), population: s.population ?? 0 });
      }
    }

    if (swatches.length === 0) {
      throw new BadRequestException('No prominent colors detected in this image.');
    }

    swatches.sort((a, b) => b.population - a.population);
    const primary = swatches[0]!.hex;
    let secondary = swatches.find((x) => x.hex !== primary)?.hex ?? swatches[1]?.hex ?? primary;
    if (secondary === primary && swatches.length > 1) {
      secondary = swatches[1]!.hex;
    }
    if (secondary === primary) {
      secondary = this.shiftHue(primary);
    }
    return { primary, secondary };
  }

  /** Fallback when palette returns a single hue. */
  private shiftHue(hex: string): string {
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return '#4b5563';
    const r = parseInt(m[1], 16);
    const g = parseInt(m[2], 16);
    const b = parseInt(m[3], 16);
    return rgbToHex(Math.round(r * 0.85 + 30), Math.round(g * 0.9 + 20), Math.min(255, b + 40));
  }
}
