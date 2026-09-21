import { apiGet } from '@/lib/apiClient';

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

export function getThemeLocalizationHealth(): Promise<ThemeLocalizationHealth> {
  return apiGet('/internal/theme-localization/dashboard');
}
