import type { ConfigService } from '@nestjs/config';

export type ThemeMigrationFlags = {
  diagnosticsEnabled: boolean;
  shadowReadsEnabled: boolean;
  dualWriteEnabled: boolean;
  canonicalRuntimeEnabled: boolean;
  rolloutPercent: number;
  objectStorageEnabled: boolean;
  artifactDualPublishEnabled: boolean;
  artifactImportEnabled: boolean;
  artifactVerificationEnabled: boolean;
  artifactHealthChecksEnabled: boolean;
  releasePipelineEnabled: boolean;
  releasePreviewEnabled: boolean;
  releaseSecurityValidationEnabled: boolean;
  lifecycleEnabled: boolean;
  lifecycleMetricsEnabled: boolean;
  deploymentEngineEnabled: boolean;
  deploymentMetricsEnabled: boolean;
  runtimeShadowEnabled: boolean;
  runtimeComparisonStorageEnabled: boolean;
  runtimeMetricsEnabled: boolean;
  runtimeHealthEnabled: boolean;
  languageConsistencyEnabled: boolean;
  languagePublishBlocking: boolean;
};

/**
 * Phase 1 invariant: these flags are controls for migration tooling only.
 * Existing upload, selection, resolution, and rendering paths remain legacy.
 */
export type ThemeRuntimeIsolation = {
  legacyRuntimeAuthoritative: true;
  canonicalRuntimeReadEnabled: false;
  legacyWritesUnchanged: true;
  apiContractUnchanged: true;
  reservedRuntimeFlagsRequested: boolean;
};

export function readThemeMigrationFlags(
  configService: ConfigService,
): ThemeMigrationFlags {
  return {
    diagnosticsEnabled: configService.get<boolean>(
      'themeMigration.diagnosticsEnabled',
      false,
    ),
    shadowReadsEnabled: configService.get<boolean>(
      'themeMigration.shadowReadsEnabled',
      false,
    ),
    dualWriteEnabled: configService.get<boolean>(
      'themeMigration.dualWriteEnabled',
      false,
    ),
    canonicalRuntimeEnabled: configService.get<boolean>(
      'themeMigration.canonicalRuntimeEnabled',
      false,
    ),
    rolloutPercent: configService.get<number>(
      'themeMigration.rolloutPercent',
      0,
    ),
    objectStorageEnabled: configService.get<boolean>(
      'themeArtifacts.objectStorageEnabled',
      false,
    ),
    artifactDualPublishEnabled: configService.get<boolean>(
      'themeArtifacts.dualPublishEnabled',
      false,
    ),
    artifactImportEnabled: configService.get<boolean>(
      'themeArtifacts.importEnabled',
      false,
    ),
    artifactVerificationEnabled: configService.get<boolean>(
      'themeArtifacts.verificationEnabled',
      false,
    ),
    artifactHealthChecksEnabled: configService.get<boolean>(
      'themeArtifacts.healthChecksEnabled',
      false,
    ),
    releasePipelineEnabled: configService.get<boolean>(
      'themeReleasePipeline.enabled',
      false,
    ),
    releasePreviewEnabled: configService.get<boolean>(
      'themeReleasePipeline.previewEnabled',
      false,
    ),
    releaseSecurityValidationEnabled: configService.get<boolean>(
      'themeReleasePipeline.securityValidationEnabled',
      false,
    ),
    lifecycleEnabled: configService.get<boolean>(
      'themeReleaseLifecycle.enabled',
      false,
    ),
    lifecycleMetricsEnabled: configService.get<boolean>(
      'themeReleaseLifecycle.metricsEnabled',
      false,
    ),
    deploymentEngineEnabled: configService.get<boolean>(
      'themeDeploymentEngine.enabled',
      false,
    ),
    deploymentMetricsEnabled: configService.get<boolean>(
      'themeDeploymentEngine.metricsEnabled',
      false,
    ),
    runtimeShadowEnabled: configService.get<boolean>(
      'themeRuntimeShadow.enabled',
      false,
    ),
    runtimeComparisonStorageEnabled: configService.get<boolean>(
      'themeRuntimeShadow.comparisonStorageEnabled',
      false,
    ),
    runtimeMetricsEnabled: configService.get<boolean>(
      'themeRuntimeShadow.metricsEnabled',
      false,
    ),
    runtimeHealthEnabled: configService.get<boolean>(
      'themeRuntimeShadow.healthEnabled',
      false,
    ),
    languageConsistencyEnabled: configService.get<boolean>(
      'themeLanguageConsistency.enabled',
      false,
    ),
    languagePublishBlocking: configService.get<boolean>(
      'themeLanguageConsistency.publishBlocking',
      true,
    ),
  };
}

export type ThemeArtifactIsolation = {
  filesystemRuntimeAuthoritative: true;
  objectStorageRuntimeReadEnabled: false;
  canonicalDeploymentEnabled: false;
  publicApiChanged: false;
};

export function getThemeArtifactIsolation(): ThemeArtifactIsolation {
  return {
    filesystemRuntimeAuthoritative: true,
    objectStorageRuntimeReadEnabled: false,
    canonicalDeploymentEnabled: false,
    publicApiChanged: false,
  };
}

export function getThemeRuntimeIsolation(
  flags: ThemeMigrationFlags,
): ThemeRuntimeIsolation {
  const reservedRuntimeFlagsRequested =
    flags.shadowReadsEnabled ||
    flags.dualWriteEnabled ||
    flags.canonicalRuntimeEnabled ||
    flags.rolloutPercent > 0;
  return {
    legacyRuntimeAuthoritative: true,
    canonicalRuntimeReadEnabled: false,
    legacyWritesUnchanged: true,
    apiContractUnchanged: true,
    reservedRuntimeFlagsRequested,
  };
}
