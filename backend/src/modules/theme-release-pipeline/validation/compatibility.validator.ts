import { isKnownRegistrySectionType } from '../../themes/theme-manifest.util';
import { issue, ValidationIssue } from './validation-report.types';

export function validateCompatibility(
  manifest: Record<string, unknown> | null,
  supportedEngineMajor: number,
): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  suggestions: ValidationIssue[];
} {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const suggestions: ValidationIssue[] = [];
  if (!manifest) return { errors, warnings, suggestions };
  const components = manifest.components;
  if (
    components &&
    typeof components === 'object' &&
    !Array.isArray(components)
  ) {
    for (const name of Object.keys(components as Record<string, unknown>)) {
      if (!isKnownRegistrySectionType(name)) {
        warnings.push(
          issue(
            'UNSUPPORTED_COMPONENT',
            'WARNING',
            `Component "${name}" is not in the platform registry.`,
            `theme.json.components.${name}`,
          ),
        );
      }
    }
  }
  const engine = manifest.engineVersion ?? manifest.engine;
  if (typeof engine === 'number' && engine > supportedEngineMajor) {
    errors.push(
      issue(
        'UNSUPPORTED_ENGINE_VERSION',
        'ERROR',
        `Engine version ${engine} is unsupported.`,
        'theme.json.engine',
      ),
    );
  }
  if (!manifest.templates)
    suggestions.push(
      issue(
        'MISSING_TEMPLATES',
        'SUGGESTION',
        'Add template declarations for predictable preview generation.',
        'theme.json.templates',
      ),
    );
  return { errors, warnings, suggestions };
}
