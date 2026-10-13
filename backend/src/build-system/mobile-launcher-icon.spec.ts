import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp = require('sharp');
import {
  normalizeLauncherIcon,
  writeAndroidLauncherIcons,
} from './mobile-launcher-icon';

describe('mobile launcher icon', () => {
  it('converts SVG branding and writes every Android density', async () => {
    const svg = Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="20" fill="#d4145a"/>
        <text x="50" y="62" text-anchor="middle" font-size="42" fill="white">G</text>
      </svg>
    `);
    const normalized = await normalizeLauncherIcon(svg);
    expect(normalized).not.toBeNull();
    expect(await sharp(normalized as Buffer).metadata()).toMatchObject({
      format: 'png',
      width: 1024,
      height: 1024,
    });

    const root = await fs.mkdtemp(join(tmpdir(), 'launcher-icons-'));
    try {
      await writeAndroidLauncherIcons(root, normalized as Buffer);
      const expected = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192,
      };
      for (const [density, size] of Object.entries(expected)) {
        const metadata = await sharp(
          join(root, density, 'ic_launcher.png'),
        ).metadata();
        expect(metadata).toMatchObject({
          format: 'png',
          width: size,
          height: size,
        });
      }
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
