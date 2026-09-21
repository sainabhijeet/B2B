import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import dataSource from '../database/data-source';
import configuration from '../config/configuration';
import { ThemeReleaseArtifact } from '../modules/theme-artifacts/entities/theme-release-artifact.entity';
import { ThemeReleaseArtifactRepository } from '../modules/theme-artifacts/repositories/theme-release-artifact.repository';
import { ThemeArtifactMetricsService } from '../modules/theme-artifacts/storage/theme-artifact-metrics.service';
import { S3CompatibleObjectStorageService } from '../modules/theme-artifacts/storage/s3-compatible-object-storage.service';
import { ThemeArtifactVerificationService } from '../modules/theme-artifacts/theme-artifact-verification.service';

async function main(): Promise<void> {
  const configService = new ConfigService(configuration());
  await dataSource.initialize();
  try {
    const metrics = new ThemeArtifactMetricsService();
    const objectStorage = new S3CompatibleObjectStorageService(
      configService,
      metrics,
    );
    const verifier = new ThemeArtifactVerificationService(
      configService,
      new ThemeReleaseArtifactRepository(
        dataSource.getRepository(ThemeReleaseArtifact),
      ),
      objectStorage,
      metrics,
    );
    const result = await verifier.verifyAll();
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
