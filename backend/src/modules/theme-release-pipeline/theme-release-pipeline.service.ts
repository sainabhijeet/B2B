import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { Readable } from 'node:stream';
import { DataSource } from 'typeorm';
import { readThemeMigrationFlags } from '../../common/observability/theme-migration-flags';
import { writeThemeMigrationLog } from '../../common/observability/theme-migration-log';
import type { ThemeChannel } from '../../common/entities/theme.entity';
import { ThemeReleaseCandidate } from './entities/theme-release-candidate.entity';
import { ThemeReleaseValidationHistory } from './entities/theme-release-validation-history.entity';
import { ThemeReleaseCandidateRepository } from './repositories/theme-release-candidate.repository';
import { ThemeReleaseValidationHistoryRepository } from './repositories/theme-release-validation-history.repository';
import { ThemeQuarantineStorageService } from './quarantine/theme-quarantine-storage.service';
import { ThemeReleasePreviewService } from './preview/theme-release-preview.service';
import { validateAssets } from './validation/asset.validator';
import { validateCompatibility } from './validation/compatibility.validator';
import { validateManifest } from './validation/manifest.validator';
import { validateSecurity } from './validation/security.validator';
import {
  issue,
  scoreForIssues,
  ThemeValidationReport,
  ValidationIssue,
} from './validation/validation-report.types';
import { inspectZipStructure } from './validation/zip-structure.validator';
import { validateTranslations } from './validation/translation.validator';

export type ThemeReleaseIntakeInput = {
  source: Readable | Buffer;
  familySlug: string;
  channel: ThemeChannel;
  version: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  expectedSha256?: string;
};

export type ThemeReleaseIntakeResult = {
  status: 'DISABLED' | 'QUARANTINED' | 'REJECTED' | 'APPROVAL_READY';
  candidate: ThemeReleaseCandidate | null;
  report: ThemeValidationReport | null;
};

@Injectable()
export class ThemeReleasePipelineService {
  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly candidateRepository: ThemeReleaseCandidateRepository,
    private readonly historyRepository: ThemeReleaseValidationHistoryRepository,
    private readonly quarantine: ThemeQuarantineStorageService,
    private readonly preview: ThemeReleasePreviewService,
  ) {}

  async intake(
    input: ThemeReleaseIntakeInput,
  ): Promise<ThemeReleaseIntakeResult> {
    const flags = readThemeMigrationFlags(this.configService);
    if (!flags.releasePipelineEnabled) {
      writeThemeMigrationLog({
        event: 'theme.release.intake.skipped',
        phase: 'phase-3',
        implementation: 'release-validation-pipeline',
        mode: 'disabled',
        metadata: { reason: 'feature_flag_disabled' },
      });
      return { status: 'DISABLED', candidate: null, report: null };
    }
    const familySlug = input.familySlug.trim().toLowerCase();
    const version = input.version.trim().slice(0, 32) || 'unknown';
    const existingByKey = await this.candidateRepository.findByIdempotencyKey(
      input.idempotencyKey,
    );
    if (existingByKey) return this.resultFromCandidate(existingByKey);
    const existingRelease = await this.candidateRepository.findByReleaseKey(
      familySlug,
      input.channel,
      version,
    );
    if (existingRelease) return this.resultFromCandidate(existingRelease);

    writeThemeMigrationLog({
      event: 'theme.release.intake.requested',
      phase: 'phase-3',
      implementation: 'release-validation-pipeline',
      channel: input.channel,
      mode: 'quarantine',
      metadata: { familySlug, version },
    });
    const archive = await this.quarantine.write(
      input.idempotencyKey,
      input.source,
      this.configService.get<number>(
        'themeReleasePipeline.maxArchiveBytes',
        100 * 1024 * 1024,
      ),
    );
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    let candidate: ThemeReleaseCandidate;
    try {
      await runner.startTransaction();
      candidate = runner.manager.getRepository(ThemeReleaseCandidate).create({
        idempotencyKey: input.idempotencyKey,
        familySlug,
        channel: input.channel,
        version,
        status: 'QUARANTINED',
        quarantineKey: archive.key,
        packageSha256: archive.sha256,
        packageSizeBytes: String(archive.sizeBytes),
        manifestVersion: null,
        manifestJson: {},
        releaseMetadataJson: {
          familySlug,
          channel: input.channel,
          version: input.version,
          ...(input.metadata ?? {}),
          ...(input.expectedSha256
            ? { expectedSha256: input.expectedSha256 }
            : {}),
        },
        validationReportJson: {},
        compatibilityScore: null,
        securityScore: null,
        performanceScore: null,
        previewManifestJson: {},
        previewKey: null,
        validationRunCount: 0,
        validatedAt: null,
      });
      await runner.manager.getRepository(ThemeReleaseCandidate).save(candidate);
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      if (this.isUniqueViolation(error)) {
        const concurrent = await this.candidateRepository.findByIdempotencyKey(
          input.idempotencyKey,
        );
        if (concurrent) return this.resultFromCandidate(concurrent);
      }
      throw error;
    } finally {
      await runner.release();
    }
    return this.validateCandidate(candidate.id);
  }

  async validateCandidate(
    candidateId: string,
  ): Promise<ThemeReleaseIntakeResult> {
    const candidate = await this.candidateRepository.findById(candidateId);
    if (!candidate) throw new Error('Release candidate was not found.');
    const flags = readThemeMigrationFlags(this.configService);
    if (!flags.releasePipelineEnabled)
      return this.resultFromCandidate(candidate);
    const archive = await this.quarantine.inspect(candidate.quarantineKey);
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const suggestions: ValidationIssue[] = [];
    let manifest: Record<string, unknown> | null = null;
    let translationCoverage: Record<string, unknown> | undefined;
    let previewManifest: Record<string, unknown> = {};
    let previewKey: string | null = null;
    if (!archive) {
      errors.push(
        issue('QUARANTINE_MISSING', 'ERROR', 'Quarantined archive is missing.'),
      );
    } else {
      const expectedSha256 = (
        candidate.releaseMetadataJson as { expectedSha256?: unknown }
      ).expectedSha256;
      if (
        typeof expectedSha256 === 'string' &&
        expectedSha256.toLowerCase() !== archive.sha256
      ) {
        errors.push(
          issue(
            'PACKAGE_HASH_MISMATCH',
            'ERROR',
            'Package SHA-256 does not match the supplied expected hash.',
            'package.zip',
          ),
        );
      }
      const structure = await inspectZipStructure(archive.absolutePath, {
        maxArchiveBytes: this.configService.get<number>(
          'themeReleasePipeline.maxArchiveBytes',
          100 * 1024 * 1024,
        ),
        maxUncompressedBytes: this.configService.get<number>(
          'themeReleasePipeline.maxUncompressedBytes',
          500 * 1024 * 1024,
        ),
        maxCompressionRatio: this.configService.get<number>(
          'themeReleasePipeline.maxCompressionRatio',
          100,
        ),
      });
      errors.push(...structure.errors);
      warnings.push(...structure.warnings);
      if (errors.length === 0) {
        let root: string;
        try {
          root = await this.quarantine.extract(archive);
          const manifestResult = await validateManifest(
            root,
            candidate.channel,
            this.configService.get<number>(
              'themeReleasePipeline.supportedEngineMajor',
              2,
            ),
          );
          manifest = manifestResult.manifest;
          errors.push(...manifestResult.errors);
          warnings.push(...manifestResult.warnings);
          suggestions.push(...manifestResult.suggestions);
          if (flags.languageConsistencyEnabled && manifest) {
            const translations = await validateTranslations(root, manifest);
            errors.push(...translations.errors);
            warnings.push(...translations.warnings);
            translationCoverage = translations.coverage;
          }
          const assets = await validateAssets(root, manifest);
          errors.push(...assets.errors);
          warnings.push(...assets.warnings);
          suggestions.push(...assets.suggestions);
          const compatibility = validateCompatibility(
            manifest,
            this.configService.get<number>(
              'themeReleasePipeline.supportedEngineMajor',
              2,
            ),
          );
          errors.push(...compatibility.errors);
          warnings.push(...compatibility.warnings);
          suggestions.push(...compatibility.suggestions);
          if (flags.releaseSecurityValidationEnabled) {
            const security = await validateSecurity(root);
            errors.push(...security.errors);
            warnings.push(...security.warnings);
          } else {
            errors.push(
              issue(
                'SECURITY_VALIDATION_DISABLED',
                'ERROR',
                'Security validation must be enabled before a release can be approval-ready.',
              ),
            );
          }
          if (flags.releasePreviewEnabled && errors.length === 0) {
            try {
              const preview = await this.preview.generate(candidate.id, root);
              previewKey = preview.key;
              previewManifest = preview.manifest;
            } catch {
              warnings.push(
                issue(
                  'PREVIEW_GENERATION_FAILED',
                  'WARNING',
                  'Preview generation could not complete.',
                ),
              );
            }
          }
        } catch (error) {
          errors.push(
            issue(
              'INVALID_THEME_STRUCTURE',
              'ERROR',
              error instanceof Error
                ? error.message
                : 'Theme structure validation failed.',
            ),
          );
        }
      }
    }
    const report = this.buildReport(
      errors,
      warnings,
      suggestions,
      candidate,
      archive,
      translationCoverage,
    );
    const status = errors.length === 0 ? 'APPROVAL_READY' : 'REJECTED';
    const updated = await this.persistValidation(
      candidate,
      report,
      status,
      manifest,
      previewManifest,
      previewKey,
    );
    writeThemeMigrationLog({
      event: `theme.release.validation.${status === 'APPROVAL_READY' ? 'completed' : 'failed'}`,
      phase: 'phase-3',
      implementation: 'release-validation-pipeline',
      themeId: null,
      channel: candidate.channel,
      mode: status,
      durationMs: 0,
      metadata: {
        candidateId: candidate.id,
        errors: report.errors.length,
        warnings: report.warnings.length,
        compatibilityScore: report.compatibilityScore,
        securityScore: report.securityScore,
        performanceScore: report.performanceScore,
      },
    });
    return { status, candidate: updated, report };
  }

  async getCandidate(
    candidateId: string,
  ): Promise<ThemeReleaseCandidate | null> {
    if (!readThemeMigrationFlags(this.configService).releasePipelineEnabled)
      return null;
    return this.candidateRepository.findById(candidateId);
  }

  async getValidationHistory(
    candidateId: string,
  ): Promise<ThemeReleaseValidationHistory[]> {
    if (!readThemeMigrationFlags(this.configService).releasePipelineEnabled)
      return [];
    return this.historyRepository.findByCandidateId(candidateId);
  }

  private buildReport(
    errors: ValidationIssue[],
    warnings: ValidationIssue[],
    suggestions: ValidationIssue[],
    candidate: ThemeReleaseCandidate,
    archive: { sha256: string; sizeBytes: number } | null,
    translationCoverage?: Record<string, unknown>,
  ): ThemeValidationReport {
    const compatibilityCodes = new Set([
      'INVALID_VERSION',
      'UNSUPPORTED_ENGINE_VERSION',
      'UNSUPPORTED_COMPONENT',
      'INVALID_THEME_STRUCTURE',
      'BROKEN_REFERENCE',
      'INVALID_JSON_SCHEMA',
    ]);
    const securityCodes = new Set([
      'ZIP_BOMB',
      'INVALID_PATH',
      'SECURITY_RISK',
      'SECRET_DETECTED',
      'UNSUPPORTED_SOURCE',
      'INVALID_IMAGE',
      'INVALID_FONT',
      'SECURITY_VALIDATION_DISABLED',
      'PACKAGE_HASH_MISMATCH',
    ]);
    const performanceCodes = new Set([
      'ZIP_BOMB',
      'ARCHIVE_TOO_LARGE',
      'LARGE_ASSET_SET',
      'NO_STYLESHEET',
    ]);
    return {
      schemaVersion: 1,
      status: errors.length === 0 ? 'APPROVAL_READY' : 'FAILED',
      errors: errors.filter((entry) => entry.severity === 'ERROR'),
      warnings: warnings.filter((entry) => entry.severity === 'WARNING'),
      suggestions: suggestions.filter(
        (entry) => entry.severity === 'SUGGESTION',
      ),
      compatibilityScore: scoreForIssues(errors, warnings, compatibilityCodes),
      securityScore: scoreForIssues(errors, warnings, securityCodes),
      performanceScore: scoreForIssues(errors, warnings, performanceCodes),
      packageSha256: archive?.sha256 ?? candidate.packageSha256,
      packageSizeBytes:
        archive?.sizeBytes ??
        (candidate.packageSizeBytes
          ? Number(candidate.packageSizeBytes)
          : null),
      validatedAt: new Date().toISOString(),
      ...(translationCoverage ? { translationCoverage } : {}),
    };
  }

  private async persistValidation(
    candidate: ThemeReleaseCandidate,
    report: ThemeValidationReport,
    status: ThemeReleaseCandidate['status'],
    manifest: Record<string, unknown> | null,
    previewManifest: Record<string, unknown>,
    previewKey: string | null,
  ): Promise<ThemeReleaseCandidate> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      const candidateRepository = runner.manager.getRepository(
        ThemeReleaseCandidate,
      );
      const persisted = await candidateRepository.findOneBy({
        id: candidate.id,
      });
      if (!persisted)
        throw new Error('Release candidate disappeared during validation.');
      Object.assign(persisted, {
        status,
        packageSha256: report.packageSha256,
        packageSizeBytes:
          report.packageSizeBytes === null
            ? null
            : String(report.packageSizeBytes),
        manifestVersion:
          typeof manifest?.version === 'string' ? manifest.version : null,
        manifestJson: manifest ?? {},
        validationReportJson: report,
        compatibilityScore: report.compatibilityScore,
        securityScore: report.securityScore,
        performanceScore: report.performanceScore,
        previewManifestJson: previewManifest,
        previewKey,
        validationRunCount: candidate.validationRunCount + 1,
        validatedAt: new Date(),
      });
      await candidateRepository.save(persisted);
      const runKey = `validation-${report.packageSha256 ?? candidate.id}`;
      await runner.manager.getRepository(ThemeReleaseValidationHistory).insert({
        candidateId: candidate.id,
        runKey,
        status,
        reportJson: report,
        packageSha256: report.packageSha256,
        compatibilityScore: report.compatibilityScore,
        securityScore: report.securityScore,
        performanceScore: report.performanceScore,
      } as never);
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      if (!this.isUniqueViolation(error)) throw error;
    } finally {
      await runner.release();
    }
    return (await this.candidateRepository.findById(candidate.id)) ?? candidate;
  }

  private resultFromCandidate(
    candidate: ThemeReleaseCandidate,
  ): ThemeReleaseIntakeResult {
    const report =
      candidate.validationReportJson as unknown as ThemeValidationReport;
    const status =
      candidate.status === 'APPROVAL_READY'
        ? 'APPROVAL_READY'
        : candidate.status === 'REJECTED'
          ? 'REJECTED'
          : 'QUARANTINED';
    return {
      status,
      candidate,
      report: report?.schemaVersion === 1 ? report : null,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      (error as { driverError?: { code?: string } })?.driverError?.code ===
      '23505'
    );
  }
}
