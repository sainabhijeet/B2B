import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { quarantineRoot } from '../quarantine/theme-quarantine-storage.service';

export type ReleasePreviewManifest = {
  schemaVersion: 1;
  renderer: 'deferred';
  candidateId: string;
  imageCandidates: string[];
  selectedImage: string | null;
  generatedAt: string;
};

@Injectable()
export class ThemeReleasePreviewService {
  constructor(private readonly configService: ConfigService) {}

  async generate(
    candidateId: string,
    extractionPath: string,
  ): Promise<{ key: string; manifest: ReleasePreviewManifest }> {
    const files: string[] = [];
    const imageDirectory = path.join(extractionPath, 'assets', 'images');
    try {
      for (const name of await fs.readdir(imageDirectory)) {
        if (/\.(?:png|jpe?g|gif|webp|svg)$/i.test(name))
          files.push(`assets/images/${name}`);
      }
    } catch {
      // Preview generation is allowed to produce a no-image manifest.
    }
    files.sort((a, b) => a.localeCompare(b));
    const selectedImage =
      files.find((file) => /(?:hero|preview|cover|banner|home)/i.test(file)) ??
      files[0] ??
      null;
    const manifest: ReleasePreviewManifest = {
      schemaVersion: 1,
      renderer: 'deferred',
      candidateId,
      imageCandidates: files.slice(0, 50),
      selectedImage,
      generatedAt: new Date().toISOString(),
    };
    const directory = path.join(
      quarantineRoot(this.configService),
      'candidates',
      candidateId,
      'preview',
    );
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(
      path.join(directory, 'preview.json'),
      JSON.stringify(manifest, null, 2),
      'utf8',
    );
    return { key: `candidates/${candidateId}/preview/preview.json`, manifest };
  }
}
