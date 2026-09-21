require('reflect-metadata');
require('dotenv').config({ path: '.env', override: true });

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../../dist/app.module');
const { BuildService } = require('../../dist/build-system/build.service');

const tenantId = process.argv[2];
const pollIntervalMs = 10_000;

if (!tenantId) {
  console.error('Usage: node src/scripts/rebuild-tenant-app.js <tenant-id>');
  process.exitCode = 1;
  return;
}

const actor = {
  sub: 'local-rebuild-script',
  role: 'SUPER_ADMIN',
  tenantId: null,
};

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const builds = app.get(BuildService);
    const history = await builds.listBuilds(actor, { tenantId });
    const previous = history.data.find(
      (job) => job.status === 'SUCCESS' && job.buildType === 'ANDROID_APK',
    );

    if (!previous) {
      throw new Error(
        `No successful Android APK build exists for tenant ${tenantId}.`,
      );
    }

    const started = await builds.retryBuild(actor, previous.id);
    const buildId = started.data.id;
    console.log(
      `[REBUILD] Started ${buildId} from ${previous.id} (${previous.packageName}).`,
    );

    while (true) {
      const current = await builds.getBuildById(actor, buildId);
      console.log(
        `[REBUILD] ${current.data.status} (${current.data.progress}%) - ${current.data.artifacts.length} artifact(s).`,
      );

      if (current.data.status === 'SUCCESS') {
        for (const artifact of current.data.artifacts) {
          console.log(
            `[ARTIFACT] ${artifact.artifactType} ${artifact.versionName} (${artifact.versionCode}) ${artifact.filePath} ${artifact.fileSize} bytes`,
          );
        }
        return;
      }

      if (current.data.status === 'FAILED') {
        throw new Error(current.data.errorMessage || 'Build failed.');
      }

      await delay(pollIntervalMs);
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(`[REBUILD] ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
