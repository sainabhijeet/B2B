import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ENTERPRISE_SUPPORTED_LANGUAGES } from '../../common/localization/localization.constants';
import { ThemeReleaseCandidate } from './entities/theme-release-candidate.entity';
import { translationCoverageBlockers } from './validation/translation.validator';

type CoverageLike = {
  requiredLanguages?: unknown;
  completeness?: unknown;
  parityPercent?: unknown;
  missingLocales?: unknown;
  invalidJson?: unknown;
  missing?: unknown;
  brokenNamespaces?: unknown;
  mixedLanguageCandidates?: unknown;
  readyForPublish?: unknown;
  blockers?: unknown;
  generatedAt?: unknown;
};

export type ThemeLocalizationHealthCandidate = {
  candidateId: string;
  familySlug: string;
  channel: string;
  version: string;
  status: string;
  completeness: number;
  parityPercent: number;
  readyForPublish: boolean;
  blockers: string[];
  missingLocaleCount: number;
  missingKeyCount: number;
  invalidJsonCount: number;
  brokenNamespaceCount: number;
  mixedLanguageCount: number;
  validatedAt: string | null;
};

export type ThemeLocalizationHealth = {
  schemaVersion: 1;
  status: 'healthy' | 'degraded' | 'critical';
  generatedAt: string;
  supportedLanguages: string[];
  totals: {
    candidates: number;
    readyForPublish: number;
    blocked: number;
    missingLocales: number;
    missingKeys: number;
    invalidJson: number;
    brokenNamespaces: number;
    mixedLanguageCandidates: number;
  };
  metrics: {
    averageCompleteness: number;
    averageParity: number;
    readinessPercent: number;
  };
  blockerCounts: Record<string, number>;
  missingByLanguage: Record<string, number>;
  candidates: ThemeLocalizationHealthCandidate[];
};

@Injectable()
export class ThemeLocalizationHealthService {
  constructor(
    @InjectRepository(ThemeReleaseCandidate)
    private readonly candidates: Repository<ThemeReleaseCandidate>,
  ) {}

  async health(): Promise<ThemeLocalizationHealth> {
    const rows = await this.candidates.find({
      order: { updatedAt: 'DESC' },
      take: 250,
    });
    const candidates = rows.map((row) => this.fromCandidate(row));
    const totals = candidates.reduce(
      (acc, item) => {
        acc.candidates += 1;
        if (item.readyForPublish) acc.readyForPublish += 1;
        else acc.blocked += 1;
        acc.missingLocales += item.missingLocaleCount;
        acc.missingKeys += item.missingKeyCount;
        acc.invalidJson += item.invalidJsonCount;
        acc.brokenNamespaces += item.brokenNamespaceCount;
        acc.mixedLanguageCandidates += item.mixedLanguageCount;
        return acc;
      },
      {
        candidates: 0,
        readyForPublish: 0,
        blocked: 0,
        missingLocales: 0,
        missingKeys: 0,
        invalidJson: 0,
        brokenNamespaces: 0,
        mixedLanguageCandidates: 0,
      },
    );
    const blockerCounts: Record<string, number> = {};
    for (const candidate of candidates) {
      for (const blocker of candidate.blockers) {
        blockerCounts[blocker] = (blockerCounts[blocker] ?? 0) + 1;
      }
    }
    const missingByLanguage = this.missingByLanguage(rows);
    const averageCompleteness = this.average(
      candidates.map((item) => item.completeness),
    );
    const averageParity = this.average(
      candidates.map((item) => item.parityPercent),
    );
    const readinessPercent = totals.candidates
      ? Math.round((totals.readyForPublish / totals.candidates) * 100)
      : 100;
    return {
      schemaVersion: 1,
      status:
        totals.invalidJson > 0 || totals.missingLocales > 0
          ? 'critical'
          : totals.blocked > 0
            ? 'degraded'
            : 'healthy',
      generatedAt: new Date().toISOString(),
      supportedLanguages: [...ENTERPRISE_SUPPORTED_LANGUAGES],
      totals,
      metrics: {
        averageCompleteness,
        averageParity,
        readinessPercent,
      },
      blockerCounts,
      missingByLanguage,
      candidates,
    };
  }

  async metrics() {
    const health = await this.health();
    return {
      schemaVersion: 1,
      generatedAt: health.generatedAt,
      status: health.status,
      totals: health.totals,
      metrics: health.metrics,
      blockerCounts: health.blockerCounts,
      missingByLanguage: health.missingByLanguage,
    };
  }

  private fromCandidate(
    row: ThemeReleaseCandidate,
  ): ThemeLocalizationHealthCandidate {
    const coverage = this.coverage(row.validationReportJson);
    const blockers = this.blockers(coverage);
    const missingLocales = this.arrayValue(coverage?.missingLocales);
    const missing = this.arrayValue(coverage?.missing);
    const invalidJson = this.arrayValue(coverage?.invalidJson);
    const brokenNamespaces = this.arrayValue(coverage?.brokenNamespaces);
    const mixedLanguageCandidates = this.arrayValue(
      coverage?.mixedLanguageCandidates,
    );
    return {
      candidateId: row.id,
      familySlug: row.familySlug,
      channel: row.channel,
      version: row.version,
      status: row.status,
      completeness: this.numberValue(coverage?.completeness),
      parityPercent: this.numberValue(
        coverage?.parityPercent,
        this.numberValue(coverage?.completeness),
      ),
      readyForPublish: coverage?.readyForPublish === true && !blockers.length,
      blockers,
      missingLocaleCount: missingLocales.length,
      missingKeyCount: missing.length,
      invalidJsonCount: invalidJson.length,
      brokenNamespaceCount: brokenNamespaces.length,
      mixedLanguageCount: mixedLanguageCandidates.length,
      validatedAt: row.validatedAt?.toISOString() ?? null,
    };
  }

  private coverage(report: Record<string, unknown>): CoverageLike | null {
    const coverage = report.translationCoverage;
    return coverage && typeof coverage === 'object' && !Array.isArray(coverage)
      ? (coverage as CoverageLike)
      : null;
  }

  private blockers(coverage: CoverageLike | null): string[] {
    const declared = this.arrayValue(coverage?.blockers)
      .filter((item): item is string => typeof item === 'string')
      .filter(Boolean);
    return declared.length
      ? [...new Set(declared)]
      : translationCoverageBlockers(coverage as Record<string, unknown> | null);
  }

  private missingByLanguage(
    rows: ThemeReleaseCandidate[],
  ): Record<string, number> {
    const out: Record<string, number> = Object.fromEntries(
      ENTERPRISE_SUPPORTED_LANGUAGES.map((language) => [language, 0]),
    );
    for (const row of rows) {
      const coverage = this.coverage(row.validationReportJson);
      for (const item of this.arrayValue(coverage?.missing)) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        const language = (item as { language?: unknown }).language;
        if (typeof language === 'string') {
          out[language] = (out[language] ?? 0) + 1;
        }
      }
    }
    return out;
  }

  private arrayValue(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private numberValue(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private average(values: number[]): number {
    if (!values.length) return 100;
    return Math.round(
      values.reduce((sum, item) => sum + item, 0) / values.length,
    );
  }
}
