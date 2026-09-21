export type ValidationSeverity = 'ERROR' | 'WARNING' | 'SUGGESTION';

export type ValidationIssue = {
  code: string;
  severity: ValidationSeverity;
  path: string | null;
  message: string;
};

export type ThemeValidationReport = {
  schemaVersion: 1;
  status: 'PASSED' | 'FAILED' | 'APPROVAL_READY';
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  suggestions: ValidationIssue[];
  compatibilityScore: number;
  securityScore: number;
  performanceScore: number;
  packageSha256: string | null;
  packageSizeBytes: number | null;
  validatedAt: string;
  translationCoverage?: Record<string, unknown>;
};

export function issue(
  code: string,
  severity: ValidationSeverity,
  message: string,
  path: string | null = null,
): ValidationIssue {
  return { code, severity, path, message };
}

export function scoreForIssues(
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  categoryCodes: Set<string>,
): number {
  const categoryErrors = errors.filter((entry) =>
    categoryCodes.has(entry.code),
  ).length;
  const categoryWarnings = warnings.filter((entry) =>
    categoryCodes.has(entry.code),
  ).length;
  return Math.max(
    0,
    Math.min(100, 100 - categoryErrors * 25 - categoryWarnings * 5),
  );
}
