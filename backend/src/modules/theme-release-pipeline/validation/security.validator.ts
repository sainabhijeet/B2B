import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { issue, ValidationIssue } from './validation-report.types';

export async function validateSecurity(
  root: string,
): Promise<{ errors: ValidationIssue[]; warnings: ValidationIssue[] }> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const walk = async (directory: string): Promise<void> => {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name.toString());
      const relative = path.relative(root, absolute).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        if (
          entry.name.toString() === 'node_modules' ||
          entry.name.toString() === '.git'
        ) {
          errors.push(
            issue(
              'SECURITY_RISK',
              'ERROR',
              'Package contains a forbidden dependency or repository directory.',
              relative,
            ),
          );
        } else await walk(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      if (/\.(?:exe|dll|so|dylib|bat|cmd|sh|ps1)$/i.test(relative)) {
        errors.push(
          issue(
            'SECURITY_RISK',
            'ERROR',
            'Package contains an executable file.',
            relative,
          ),
        );
      }
      if (/\.(?:js|mjs|cjs|ts|tsx|jsx)$/i.test(relative)) {
        warnings.push(
          issue(
            'UNSUPPORTED_SOURCE',
            'WARNING',
            'Package contains executable source code.',
            relative,
          ),
        );
      }
      if (/\.(?:json|css|svg|html|txt)$/i.test(relative)) {
        const raw = await fs.readFile(absolute, 'utf8').catch(() => '');
        if (
          /(?:AKIA[0-9A-Z]{16}|-----BEGIN .* PRIVATE KEY-----|password\s*[:=])/i.test(
            raw,
          )
        ) {
          errors.push(
            issue(
              'SECRET_DETECTED',
              'ERROR',
              'Package appears to contain a credential or private key.',
              relative,
            ),
          );
        }
      }
    }
  };
  await walk(root);
  return { errors, warnings };
}
