import type { ConfigService } from '@nestjs/config';
import {
  getThemeArtifactIsolation,
  getThemeRuntimeIsolation,
  readThemeMigrationFlags,
} from './theme-migration-flags';

describe('theme migration flags', () => {
  it('keeps the Phase 1 runtime invariant independent of flag values', () => {
    const config = {
      get: jest.fn((key: string, fallback: unknown) => {
        const values: Record<string, unknown> = {
          'themeMigration.diagnosticsEnabled': true,
          'themeMigration.shadowReadsEnabled': true,
          'themeMigration.dualWriteEnabled': true,
          'themeMigration.canonicalRuntimeEnabled': true,
          'themeMigration.rolloutPercent': 100,
          'themeArtifacts.objectStorageEnabled': true,
          'themeArtifacts.dualPublishEnabled': true,
          'themeArtifacts.importEnabled': true,
          'themeArtifacts.verificationEnabled': true,
          'themeArtifacts.healthChecksEnabled': true,
          'themeReleasePipeline.enabled': true,
          'themeReleasePipeline.previewEnabled': true,
          'themeReleasePipeline.securityValidationEnabled': true,
          'themeReleaseLifecycle.enabled': true,
          'themeReleaseLifecycle.metricsEnabled': true,
          'themeDeploymentEngine.enabled': true,
          'themeDeploymentEngine.metricsEnabled': true,
          'themeRuntimeShadow.enabled': true,
          'themeRuntimeShadow.comparisonStorageEnabled': true,
          'themeRuntimeShadow.metricsEnabled': true,
          'themeRuntimeShadow.healthEnabled': true,
        };
        return values[key] ?? fallback;
      }),
    } as unknown as ConfigService;

    const flags = readThemeMigrationFlags(config);

    expect(flags).toEqual({
      diagnosticsEnabled: true,
      shadowReadsEnabled: true,
      dualWriteEnabled: true,
      canonicalRuntimeEnabled: true,
      rolloutPercent: 100,
      objectStorageEnabled: true,
      artifactDualPublishEnabled: true,
      artifactImportEnabled: true,
      artifactVerificationEnabled: true,
      artifactHealthChecksEnabled: true,
      releasePipelineEnabled: true,
      releasePreviewEnabled: true,
      releaseSecurityValidationEnabled: true,
      lifecycleEnabled: true,
      lifecycleMetricsEnabled: true,
      deploymentEngineEnabled: true,
      deploymentMetricsEnabled: true,
      runtimeShadowEnabled: true,
      runtimeComparisonStorageEnabled: true,
      runtimeMetricsEnabled: true,
      runtimeHealthEnabled: true,
      languageConsistencyEnabled: false,
      languagePublishBlocking: true,
    });
    expect(getThemeRuntimeIsolation(flags)).toEqual({
      legacyRuntimeAuthoritative: true,
      canonicalRuntimeReadEnabled: false,
      legacyWritesUnchanged: true,
      apiContractUnchanged: true,
      reservedRuntimeFlagsRequested: true,
    });
  });

  it('keeps Phase 2 storage writes and runtime reads isolated', () => {
    const config = {
      get: jest.fn((_key: string, fallback: unknown) => fallback),
    } as unknown as ConfigService;
    expect(readThemeMigrationFlags(config)).toEqual({
      diagnosticsEnabled: false,
      shadowReadsEnabled: false,
      dualWriteEnabled: false,
      canonicalRuntimeEnabled: false,
      rolloutPercent: 0,
      objectStorageEnabled: false,
      artifactDualPublishEnabled: false,
      artifactImportEnabled: false,
      artifactVerificationEnabled: false,
      artifactHealthChecksEnabled: false,
      releasePipelineEnabled: false,
      releasePreviewEnabled: false,
      releaseSecurityValidationEnabled: false,
      lifecycleEnabled: false,
      lifecycleMetricsEnabled: false,
      deploymentEngineEnabled: false,
      deploymentMetricsEnabled: false,
      runtimeShadowEnabled: false,
      runtimeComparisonStorageEnabled: false,
      runtimeMetricsEnabled: false,
      runtimeHealthEnabled: false,
      languageConsistencyEnabled: false,
      languagePublishBlocking: true,
    });
    expect(getThemeRuntimeIsolation(readThemeMigrationFlags(config))).toEqual(
      expect.objectContaining({
        legacyRuntimeAuthoritative: true,
        canonicalRuntimeReadEnabled: false,
      }),
    );
    expect(getThemeArtifactIsolation()).toEqual({
      filesystemRuntimeAuthoritative: true,
      objectStorageRuntimeReadEnabled: false,
      canonicalDeploymentEnabled: false,
      publicApiChanged: false,
    });
  });
});
