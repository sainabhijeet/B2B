import 'dotenv/config';
import * as path from 'node:path';
import {
  discoverLocaleFiles,
  localeFindings,
  projectRoot,
  scanLocaleFile,
} from './theme-locale-integrity';

const fullOutput = process.argv.includes('--full');
const maxFindings = Math.max(
  1,
  Number(
    process.argv
      .find((arg) => arg.startsWith('--max-findings='))
      ?.split('=')[1] ?? 200,
  ),
);

async function main(): Promise<void> {
  const root = projectRoot();
  const files = await discoverLocaleFiles(root);
  const findings = [];
  for (const file of files) {
    const scan = await scanLocaleFile(file);
    findings.push(...localeFindings(scan));
  }
  const relativeFindings = findings.map((finding) => ({
    ...finding,
    file: path.relative(root, finding.file).replace(/\\/g, '/'),
  }));
  const byReason = relativeFindings.reduce<Record<string, number>>(
    (accumulator, finding) => {
      accumulator[finding.reason] = (accumulator[finding.reason] ?? 0) + 1;
      return accumulator;
    },
    {},
  );
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scannedFiles: files.length,
    summary: {
      failed: findings.length > 0,
      findingCount: findings.length,
      corruptedFiles: new Set(findings.map((finding) => finding.file)).size,
      byReason,
    },
    findings: fullOutput
      ? relativeFindings
      : relativeFindings.slice(0, maxFindings),
    truncated: !fullOutput && relativeFindings.length > maxFindings,
    fullOutputHint:
      'Run npm run themes:localization:ci -- --full for all findings.',
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (findings.length > 0) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
