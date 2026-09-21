import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import dataSource from '../database/data-source';
import configuration from '../config/configuration';
import { Theme } from '../common/entities/theme.entity';
import { ThemeRelease } from '../modules/theme-migration/entities/theme-release.entity';
import { ThemeArtifactImporterService } from '../modules/theme-artifacts/theme-artifact-importer.service';
import { ThemeArtifactPublisherService } from '../modules/theme-artifacts/theme-artifact-publisher.service';
import { ThemeArtifactMetricsService } from '../modules/theme-artifacts/storage/theme-artifact-metrics.service';
import { S3CompatibleObjectStorageService } from '../modules/theme-artifacts/storage/s3-compatible-object-storage.service';

const apply = process.argv.includes('--apply');
const releaseArg = process.argv.find((arg) =>
  arg.startsWith('--theme-release-id='),
);
const themeReleaseId =
  releaseArg?.slice('--theme-release-id='.length).trim() || undefined;

async function main(): Promise<void> {
  const configService = new ConfigService(configuration());
  await dataSource.initialize();
  try {
    const metrics = new ThemeArtifactMetricsService();
    const objectStorage = new S3CompatibleObjectStorageService(
      configService,
      metrics,
    );
    const publisher = new ThemeArtifactPublisherService(
      configService,
      dataSource,
      objectStorage,
      metrics,
    );
    const importer = new ThemeArtifactImporterService(
      configService,
      dataSource.getRepository(ThemeRelease),
      dataSource.getRepository(Theme),
      publisher,
    );
    const result = await importer.importAll({ apply, themeReleaseId });
    process.stdout.write(
      `${JSON.stringify({ result, metrics: metrics.snapshot() })}\n`,
    );
    if (result.failed > 0) process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
