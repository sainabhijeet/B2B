import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { OpenAiTranslationProvider } from '../modules/translation-pipeline/openai-translation.provider';
import type { TranslationBatchResult } from '../modules/translation-pipeline/translation-provider.types';
import {
  TARGET_LOCALES,
  type FlattenedEntry,
  type JsonObject,
  type LocaleCode,
  discoverLocaleFiles,
  getAtPath,
  isObject,
  isQuestionMarkCorruption,
  localeFromFile,
  pathExists,
  projectRoot,
  scanLocaleFile,
  setAtPath,
  validateTranslationShape,
  writeJsonAtomic,
} from './theme-locale-integrity';

type TargetLocale = Exclude<LocaleCode, 'en'>;
type RepairTarget = {
  localeDirectory: string;
  sourceFile: string;
  targetFile: string;
  locale: TargetLocale;
  key: string;
  path: string[];
  sourceText: string;
  currentValue: string;
};
type RepairOutcome = {
  file: string;
  locale: TargetLocale;
  key: string;
  outcome: 'REPAIRED' | 'SKIPPED' | 'FAILED';
  reason?: string;
  confidence?: number;
  errors?: string[];
};

const apply = process.argv.includes('--apply');
const batchSize = Math.min(
  300,
  Math.max(
    25,
    Number(
      process.argv
        .find((arg) => arg.startsWith('--batch-size='))
        ?.split('=')[1] ?? 150,
    ),
  ),
);
const concurrency = Math.max(
  1,
  Number(
    process.argv
      .find((arg) => arg.startsWith('--concurrency='))
      ?.split('=')[1] ?? 3,
  ),
);
const requestsPerMinute = Math.max(
  1,
  Number(
    process.argv
      .find((arg) => arg.startsWith('--requests-per-minute='))
      ?.split('=')[1] ?? 24,
  ),
);
const fullReport = process.argv.includes('--full-report');
const detailLimit = Math.max(
  1,
  Number(
    process.argv
      .find((arg) => arg.startsWith('--detail-limit='))
      ?.split('=')[1] ?? 500,
  ),
);

const root = projectRoot();
const reportRoot = path.join(
  root,
  'storage',
  'themes',
  'migration-reports',
  'locale-repair',
);
const reportPath = path.join(reportRoot, 'locale-repair-report.json');

function redactSensitiveText(value: string): string {
  return value.replace(/sk-[^\s,.)]+/g, 'sk-REDACTED');
}

function isFatalProviderError(message: string): boolean {
  return (
    message.includes('invalid_api_key') ||
    message.includes('insufficient_quota') ||
    message.includes('OPENAI_API_KEY is required') ||
    message.includes('translation provider is not configured')
  );
}

async function readJsonObject(file: string): Promise<JsonObject> {
  const parsed = JSON.parse(await fs.readFile(file, 'utf8')) as unknown;
  if (!isObject(parsed))
    throw new Error(`Locale JSON root must be object: ${file}`);
  return parsed;
}

function byKey(entries: FlattenedEntry[]): Map<string, FlattenedEntry> {
  return new Map(entries.map((entry) => [entry.key, entry]));
}

async function sourceForLocaleFile(targetFile: string): Promise<string | null> {
  const file = path.join(path.dirname(targetFile), 'en.json');
  return (await pathExists(file)) ? file : null;
}

async function collectTargets(files: string[]): Promise<{
  targets: RepairTarget[];
  skipped: RepairOutcome[];
}> {
  const targets: RepairTarget[] = [];
  const skipped: RepairOutcome[] = [];
  const sourceCache = new Map<string, Map<string, FlattenedEntry>>();
  for (const file of files) {
    const locale = localeFromFile(file);
    if (locale === 'en') continue;
    const targetLocale = locale as TargetLocale;
    const sourceFile = await sourceForLocaleFile(file);
    const targetScan = await scanLocaleFile(file);
    if (targetScan.jsonError || targetScan.encoding !== 'UTF-8') {
      skipped.push({
        file,
        locale: targetLocale,
        key: '<file>',
        outcome: 'SKIPPED',
        reason: targetScan.jsonError ?? targetScan.encoding,
      });
      continue;
    }
    if (!sourceFile) {
      skipped.push({
        file,
        locale: targetLocale,
        key: '<file>',
        outcome: 'SKIPPED',
        reason: 'MISSING_EN_JSON',
      });
      continue;
    }
    let sourceEntries = sourceCache.get(sourceFile);
    if (!sourceEntries) {
      const sourceScan = await scanLocaleFile(sourceFile);
      if (sourceScan.jsonError || sourceScan.encoding !== 'UTF-8') {
        skipped.push({
          file,
          locale: targetLocale,
          key: '<file>',
          outcome: 'SKIPPED',
          reason: `INVALID_SOURCE_EN_JSON:${sourceScan.jsonError ?? sourceScan.encoding}`,
        });
        continue;
      }
      sourceEntries = byKey(sourceScan.entries);
      sourceCache.set(sourceFile, sourceEntries);
    }
    for (const entry of targetScan.entries) {
      if (!isQuestionMarkCorruption(entry.value)) continue;
      const source = sourceEntries.get(entry.key);
      if (!source) {
        skipped.push({
          file,
          locale: targetLocale,
          key: entry.key,
          outcome: 'SKIPPED',
          reason: 'SOURCE_KEY_MISSING',
        });
        continue;
      }
      targets.push({
        localeDirectory: path.dirname(file),
        sourceFile,
        targetFile: file,
        locale: targetLocale,
        key: entry.key,
        path: entry.path,
        sourceText: source.value,
        currentValue: entry.value,
      });
    }
  }
  return { targets, skipped };
}

async function requestBatch(
  provider: OpenAiTranslationProvider,
  targets: RepairTarget[],
): Promise<TranslationBatchResult[]> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await provider.translateBatch({
        sourceLanguage: 'en',
        targetLanguage: targets[0].locale,
        entries: targets.map((target) => ({
          key: target.key,
          sourceText: target.sourceText,
        })),
      });
    } catch (error: unknown) {
      lastError = error;
      if (attempt < 3)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function groupBatches(targets: RepairTarget[]): RepairTarget[][] {
  const byLocale = new Map<TargetLocale, RepairTarget[]>();
  for (const target of targets) {
    const items = byLocale.get(target.locale) ?? [];
    items.push(target);
    byLocale.set(target.locale, items);
  }
  const batches: RepairTarget[][] = [];
  for (const localeTargets of byLocale.values())
    for (let index = 0; index < localeTargets.length; index += batchSize)
      batches.push(localeTargets.slice(index, index + batchSize));
  return batches;
}

async function writeProgress(
  outcomes: RepairOutcome[],
  targetCount: number,
  requestCount: number,
  startedAt: number,
): Promise<void> {
  const elapsedMs = Math.max(1, Date.now() - startedAt);
  const repaired = outcomes.filter(
    (item) => item.outcome === 'REPAIRED',
  ).length;
  const processed = outcomes.filter(
    (item) => item.outcome !== 'SKIPPED',
  ).length;
  const remaining = Math.max(0, targetCount - processed);
  const keysPerMinute = (processed * 60000) / elapsedMs;
  const progress = {
    generatedAt: new Date().toISOString(),
    status: 'RUNNING',
    targetCount,
    processed,
    repaired,
    failed: outcomes.filter((item) => item.outcome === 'FAILED').length,
    skipped: outcomes.filter((item) => item.outcome === 'SKIPPED').length,
    remaining,
    requests: requestCount,
    requestsPerMinute: Number(((requestCount * 60000) / elapsedMs).toFixed(2)),
    keysPerMinute: Number(keysPerMinute.toFixed(2)),
    etaSeconds: keysPerMinute
      ? Math.round(remaining / (keysPerMinute / 60))
      : null,
  };
  await fs.mkdir(reportRoot, { recursive: true });
  await fs.writeFile(
    path.join(reportRoot, 'locale-repair-progress.json'),
    `${JSON.stringify(progress, null, 2)}\n`,
    'utf8',
  );
  process.stdout.write(`${JSON.stringify(progress)}\n`);
}

async function main(): Promise<void> {
  const files = (await discoverLocaleFiles(root)).filter((file) =>
    TARGET_LOCALES.includes(localeFromFile(file) as TargetLocale),
  );
  const { targets, skipped } = await collectTargets(files);
  const outcomes: RepairOutcome[] = [...skipped];
  const dictionaries = new Map<string, JsonObject>();
  if (!apply) {
    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      dryRun: true,
      scannedFiles: files.length,
      corruptedTargets: targets.length,
      skippedKeys: skipped.length,
      batchSize,
      concurrency,
      requestsPerMinute,
      targetLocales: TARGET_LOCALES,
    };
    await fs.mkdir(reportRoot, { recursive: true });
    await fs.writeFile(
      reportPath,
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    );
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  if (
    process.env.TRANSLATION_PIPELINE_ENABLED !== 'true' ||
    process.env.TRANSLATION_AI_DRAFTS_ENABLED !== 'true'
  )
    throw new Error(
      'Enable TRANSLATION_PIPELINE_ENABLED=true and TRANSLATION_AI_DRAFTS_ENABLED=true before applying locale repair.',
    );
  if (!process.env.OPENAI_API_KEY?.trim())
    throw new Error('OPENAI_API_KEY is required for --apply.');
  const provider = new OpenAiTranslationProvider(
    new ConfigService({
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model:
          process.env.OPENAI_MODEL ||
          process.env.TRANSLATION_OPENAI_MODEL ||
          'gpt-4o-mini',
        baseUrl:
          process.env.OPENAI_BASE_URL ||
          process.env.TRANSLATION_OPENAI_BASE_URL ||
          'https://api.openai.com/v1',
      },
    }),
  );
  const batches = groupBatches(targets);
  let cursor = 0;
  let requestCount = 0;
  let nextRequestAt = 0;
  let fatalError: string | null = null;
  const startedAt = Date.now();
  const acquireRateSlot = async (): Promise<void> => {
    const interval = 60000 / requestsPerMinute;
    const waitMs = Math.max(0, nextRequestAt - Date.now());
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    nextRequestAt = Math.max(Date.now(), nextRequestAt) + interval;
  };
  const loadTargetDictionary = async (file: string): Promise<JsonObject> => {
    const cached = dictionaries.get(file);
    if (cached) return cached;
    const dictionary = await readJsonObject(file);
    dictionaries.set(file, dictionary);
    return dictionary;
  };
  const worker = async (): Promise<void> => {
    while (cursor < batches.length && !fatalError) {
      const batch = batches[cursor++];
      try {
        await acquireRateSlot();
        const drafts = await requestBatch(provider, batch);
        requestCount += 1;
        for (const draft of drafts) {
          const target = batch.find((item) => item.key === draft.key);
          if (!target) continue;
          const errors = validateTranslationShape(
            target.sourceText,
            draft.value,
          );
          if (errors.length || (draft.confidence ?? 1) < 0.9) {
            outcomes.push({
              file: target.targetFile,
              locale: target.locale,
              key: target.key,
              outcome: 'FAILED',
              confidence: draft.confidence,
              errors:
                errors.length > 0
                  ? errors
                  : ['LOW_CONFIDENCE_TRANSLATION_REJECTED'],
            });
            continue;
          }
          const dictionary = await loadTargetDictionary(target.targetFile);
          const current = getAtPath(dictionary, target.path);
          if (
            typeof current === 'string' &&
            isQuestionMarkCorruption(current)
          ) {
            setAtPath(dictionary, target.path, draft.value);
            outcomes.push({
              file: target.targetFile,
              locale: target.locale,
              key: target.key,
              outcome: 'REPAIRED',
              confidence: draft.confidence,
            });
          } else {
            outcomes.push({
              file: target.targetFile,
              locale: target.locale,
              key: target.key,
              outcome: 'SKIPPED',
              reason: 'VALUE_ALREADY_VALID',
            });
          }
        }
        await writeProgress(outcomes, targets.length, requestCount, startedAt);
      } catch (error: unknown) {
        requestCount += 1;
        const message = redactSensitiveText(
          error instanceof Error ? error.message : String(error),
        );
        if (isFatalProviderError(message)) fatalError = message;
        for (const target of batch)
          outcomes.push({
            file: target.targetFile,
            locale: target.locale,
            key: target.key,
            outcome: 'FAILED',
            errors: [message],
          });
        await writeProgress(outcomes, targets.length, requestCount, startedAt);
      }
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(1, batches.length)) },
      () => worker(),
    ),
  );
  for (const [file, dictionary] of dictionaries)
    await writeJsonAtomic(file, dictionary);
  const rescannedFindings = [];
  for (const file of files) {
    const scan = await scanLocaleFile(file);
    rescannedFindings.push(
      ...scan.entries
        .filter((entry) => isQuestionMarkCorruption(entry.value))
        .map((entry) => ({ file, locale: scan.locale, key: entry.key })),
    );
    JSON.parse(await fs.readFile(file, 'utf8')) as unknown;
  }
  const relative = (file: string) =>
    path.relative(root, file).replace(/\\/g, '/');
  const relativeOutcomes = outcomes.map((item) => ({
    ...item,
    file: relative(item.file),
  }));
  const relativeRemainingFindings = rescannedFindings.map((item) => ({
    ...item,
    file: relative(item.file),
  }));
  const summary = {
    scannedFiles: files.length,
    repairedFiles: new Set(
      outcomes
        .filter((item) => item.outcome === 'REPAIRED')
        .map((item) => item.file),
    ).size,
    repairedKeys: outcomes.filter((item) => item.outcome === 'REPAIRED').length,
    skippedKeys: outcomes.filter((item) => item.outcome === 'SKIPPED').length,
    failedKeys: outcomes.filter((item) => item.outcome === 'FAILED').length,
    remainingQuestionMarkCorruption: rescannedFindings.length,
    fatalError,
    requests: requestCount,
  };
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    dryRun: false,
    summary,
    batchSize,
    concurrency,
    fullReport,
    detailLimit,
    outcomes: fullReport
      ? relativeOutcomes
      : relativeOutcomes.slice(0, detailLimit),
    outcomesTruncated: !fullReport && relativeOutcomes.length > detailLimit,
    remainingFindings: fullReport
      ? relativeRemainingFindings
      : relativeRemainingFindings.slice(0, detailLimit),
    remainingFindingsTruncated:
      !fullReport && relativeRemainingFindings.length > detailLimit,
  };
  await fs.mkdir(reportRoot, { recursive: true });
  await fs.writeFile(
    reportPath,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  process.stdout.write(
    `${JSON.stringify({ ...summary, report: reportPath }, null, 2)}\n`,
  );
  if (
    fatalError ||
    summary.failedKeys > 0 ||
    summary.remainingQuestionMarkCorruption > 0
  )
    process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
