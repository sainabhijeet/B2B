import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp = require('sharp');

const ANDROID_LAUNCHER_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
} as const;

/**
 * Converts supported tenant artwork (including SVG) into a square PNG canvas.
 * A large normalized source keeps every Android density crisp.
 */
export async function normalizeLauncherIcon(
  bytes: Buffer,
): Promise<Buffer | null> {
  try {
    return await sharp(bytes, {
      density: 384,
      limitInputPixels: 64 * 1024 * 1024,
    })
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        withoutEnlargement: false,
      })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

export async function writeAndroidLauncherIcons(
  resRoot: string,
  normalizedPng: Buffer,
): Promise<void> {
  await Promise.all(
    Object.entries(ANDROID_LAUNCHER_SIZES).map(async ([density, size]) => {
      const target = join(resRoot, density, 'ic_launcher.png');
      const icon = await sharp(normalizedPng)
        .resize(size, size, { fit: 'fill' })
        .png()
        .toBuffer();
      await fs.mkdir(dirname(target), { recursive: true });
      await fs.writeFile(target, icon);
    }),
  );
}
