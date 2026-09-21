import * as fs from 'node:fs';
import { ConfigService } from '@nestjs/config';
import configuration from '../config/configuration';
import dataSource from '../database/data-source';
import { ThemeReleaseCandidate } from '../modules/theme-release-pipeline/entities/theme-release-candidate.entity';
import { ThemeReleaseValidationHistory } from '../modules/theme-release-pipeline/entities/theme-release-validation-history.entity';
import { ThemeReleasePipelineService } from '../modules/theme-release-pipeline/theme-release-pipeline.service';
import { ThemeQuarantineStorageService } from '../modules/theme-release-pipeline/quarantine/theme-quarantine-storage.service';
import { ThemeReleasePreviewService } from '../modules/theme-release-pipeline/preview/theme-release-preview.service';
import { ThemeReleaseCandidateRepository } from '../modules/theme-release-pipeline/repositories/theme-release-candidate.repository';
import { ThemeReleaseValidationHistoryRepository } from '../modules/theme-release-pipeline/repositories/theme-release-validation-history.repository';

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`Missing required argument ${name}.`);
  return value;
}

async function main(): Promise<void> {
  const archivePath = argument('--zip');
  await dataSource.initialize();
  try {
    const config = new ConfigService(configuration());
    const pipeline = new ThemeReleasePipelineService(
      config,
      dataSource,
      new ThemeReleaseCandidateRepository(
        dataSource.getRepository(ThemeReleaseCandidate),
      ),
      new ThemeReleaseValidationHistoryRepository(
        dataSource.getRepository(ThemeReleaseValidationHistory),
      ),
      new ThemeQuarantineStorageService(config),
      new ThemeReleasePreviewService(config),
    );
    const result = await pipeline.intake({
      source: fs.createReadStream(archivePath),
      familySlug: argument('--family-slug'),
      channel: argument('--channel') as 'WEB' | 'MOBILE',
      version: argument('--version'),
      idempotencyKey: argument('--idempotency-key'),
      expectedSha256: process.argv.includes('--sha256')
        ? argument('--sha256')
        : undefined,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
