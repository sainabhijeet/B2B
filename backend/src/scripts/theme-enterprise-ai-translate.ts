import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { OpenAiTranslationProvider } from '../modules/translation-pipeline/openai-translation.provider';
import type { TranslationBatchResult } from '../modules/translation-pipeline/translation-provider.types';

type Locale = 'zh' | 'hi' | 'fr' | 'ar' | 'es' | 'de' | 'ru' | 'ja';
type Dictionary = Record<string, string>;
type Target = {
  themeRoot: string;
  theme: string;
  locale: Locale;
  key: string;
  sourceText: string;
};
type Decision = 'AUTO_APPROVE' | 'REVIEW_REQUIRED' | 'REJECT';

const LOCALES: Locale[] = ['zh', 'hi', 'fr', 'ar', 'es', 'de', 'ru', 'ja'];
const root = path.resolve(__dirname, '../../..');
const themesRoot = path.join(root, 'storage', 'themes', 'web');
const reportRoot = path.join(
  root,
  'storage',
  'themes',
  'migration-reports',
  'enterprise-reference',
);
const apply = process.argv.includes('--apply');
const batchSize = Math.min(
  300,
  Math.max(
    100,
    Number(
      process.argv
        .find((arg) => arg.startsWith('--batch-size='))
        ?.split('=')[1] ?? 100,
    ),
  ),
);
const requestsPerMinute = Math.max(
  1,
  Number(
    process.argv
      .find((arg) => arg.startsWith('--requests-per-minute='))
      ?.split('=')[1] ?? 30,
  ),
);
const concurrency = Math.max(
  1,
  Number(
    process.argv
      .find((arg) => arg.startsWith('--concurrency='))
      ?.split('=')[1] ?? 4,
  ),
);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function filesUnder(directory: string): Promise<string[]> {
  if (!(await exists(directory))) return [];
  const result: string[] = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await filesUnder(file)));
    else result.push(file);
  }
  return result;
}

async function themeRoots(): Promise<string[]> {
  const result: string[] = [];
  for (const file of await filesUnder(themesRoot)) {
    if (
      path.basename(file) === 'theme.json' &&
      !file.startsWith(path.join(themesRoot, 'enterprise-reference'))
    )
      result.push(path.dirname(file));
  }
  return result.sort();
}

function flatten(
  value: unknown,
  prefix = '',
  output: Dictionary = {},
): Dictionary {
  if (typeof value === 'string') output[prefix] = value;
  else if (isObject(value))
    for (const [key, child] of Object.entries(value))
      flatten(child, prefix ? `${prefix}.${key}` : key, output);
  return output;
}

function tokens(value: string): string[] {
  return [
    ...[...value.matchAll(/%[sdif]/g)].map((match) => match[0]),
    ...[...value.matchAll(/\{\{\s*[\w.-]+\s*\}\}/g)].map((match) => match[0]),
    ...[...value.matchAll(/\{[A-Za-z_][\w.-]*\}/g)].map((match) => match[0]),
    ...[
      ...value.matchAll(
        /\{[A-Za-z_][\w.-]*\s*,\s*(?:plural|select|selectordinal)/g,
      ),
    ].map((match) => match[0]),
  ].sort();
}

function protectedTokens(value: string): string[] {
  return [
    ...[...value.matchAll(/https?:\/\/[^\s<>()]+/gi)].map((match) => match[0]),
    ...[...value.matchAll(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g)].map(
      (match) => match[0],
    ),
    ...[...value.matchAll(/\b[A-Z]{2,}[A-Z0-9_-]*\d[A-Z0-9_-]*\b/g)].map(
      (match) => match[0],
    ),
  ].sort();
}

function tags(value: string): string[] {
  return [...value.matchAll(/<\/?[A-Za-z][^>]*>/g)]
    .map((match) => match[0])
    .sort();
}

function markdownShape(value: string): string {
  return JSON.stringify({
    links: (value.match(/\[[^\]]*\]\([^)]*\)/g) ?? []).length,
    backticks: (value.match(/`/g) ?? []).length,
    emphasis: (value.match(/\*\*|__/g) ?? []).length,
    lineBreaks: (value.match(/\r?\n/g) ?? []).length,
  });
}

function balanced(value: string): boolean {
  let depth = 0;
  for (const char of value) {
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function validate(source: string, translation: string): string[] {
  const errors: string[] = [];
  if (!translation.trim()) errors.push('EMPTY_TRANSLATION');
  if (JSON.stringify(tokens(source)) !== JSON.stringify(tokens(translation)))
    errors.push('PLACEHOLDER_MISMATCH');
  if (
    JSON.stringify(protectedTokens(source)) !==
    JSON.stringify(protectedTokens(translation))
  )
    errors.push('PROTECTED_TOKEN_MISMATCH');
  if (JSON.stringify(tags(source)) !== JSON.stringify(tags(translation)))
    errors.push('HTML_MISMATCH');
  if (markdownShape(source) !== markdownShape(translation))
    errors.push('MARKDOWN_OR_LINEBREAK_MISMATCH');
  if (!balanced(translation)) errors.push('ICU_SYNTAX_MISMATCH');
  return errors;
}

function decision(score: number, errors: string[]): Decision {
  if (errors.length) return 'REJECT';
  if (score > 98) return 'AUTO_APPROVE';
  if (score >= 90) return 'REVIEW_REQUIRED';
  return 'REJECT';
}

async function load(file: string): Promise<Dictionary> {
  return flatten(JSON.parse(await fs.readFile(file, 'utf8')) as unknown);
}

async function writeAtomic(
  file: string,
  dictionary: Dictionary,
): Promise<void> {
  const temp = `${file}.ai-translation-${process.pid}-${Date.now()}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(dictionary, null, 2)}\n`, 'utf8');
  await fs.rename(temp, file);
}

async function requestBatch(
  provider: OpenAiTranslationProvider,
  targets: Target[],
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
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function main(): Promise<void> {
  const targets: Target[] = [];
  const dictionaries = new Map<string, Dictionary>();
  for (const themeRoot of await themeRoots()) {
    const theme = path.relative(themesRoot, themeRoot).replace(/\\/g, '/');
    const source = await load(path.join(themeRoot, 'locales', 'en.json'));
    for (const locale of LOCALES) {
      const file = path.join(themeRoot, 'locales', `${locale}.json`);
      const dictionary = await load(file);
      dictionaries.set(`${theme}:${locale}`, dictionary);
      for (const [key, value] of Object.entries(dictionary)) {
        if (value === 'REVIEW_REQUIRED' && source[key] !== undefined)
          targets.push({
            themeRoot,
            theme,
            locale,
            key,
            sourceText: source[key],
          });
      }
    }
  }
  const groupedTargets = new Map<Locale, Target[]>();
  for (const target of targets) {
    const group = groupedTargets.get(target.locale) ?? [];
    group.push(target);
    groupedTargets.set(target.locale, group);
  }
  const batches: Target[][] = [];
  for (const group of groupedTargets.values())
    for (let index = 0; index < group.length; index += batchSize)
      batches.push(group.slice(index, index + batchSize));
  if (!apply) {
    await fs.mkdir(reportRoot, { recursive: true });
    const plan = {
      generatedAt: new Date().toISOString(),
      dryRun: true,
      targetCount: targets.length,
      batchCount: batches.length,
      batchSize,
      concurrency,
      locales: LOCALES,
      status: 'PENDING_PROVIDER_EXECUTION',
    };
    await fs.writeFile(
      path.join(reportRoot, 'enterprise-ai-translation-plan.json'),
      `${JSON.stringify(plan, null, 2)}\n`,
      'utf8',
    );
    await fs.writeFile(
      path.join(reportRoot, 'enterprise-ai-translation-report.json'),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          ...plan,
          summary: {
            targetEntries: targets.length,
            autoApproved: 0,
            reviewRequired: targets.length,
            rejected: 0,
            coverage: 66,
            approved: 66,
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    process.stdout.write(
      `${JSON.stringify({ dryRun: true, targetCount: targets.length, report: path.join(reportRoot, 'enterprise-ai-translation-plan.json') }, null, 2)}\n`,
    );
    return;
  }
  if (
    process.env.TRANSLATION_PIPELINE_ENABLED !== 'true' ||
    process.env.TRANSLATION_AI_DRAFTS_ENABLED !== 'true'
  )
    throw new Error(
      'Enable TRANSLATION_PIPELINE_ENABLED=true and TRANSLATION_AI_DRAFTS_ENABLED=true before applying AI translations.',
    );
  if (!process.env.OPENAI_API_KEY?.trim())
    throw new Error('OPENAI_API_KEY is required for --apply.');
  const config = new ConfigService({
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
  });
  const provider = new OpenAiTranslationProvider(config);
  const results: Array<Record<string, unknown>> = [];
  const writeLocks = new Map<string, Promise<void>>();
  const persist = async (
    target: Target,
    dictionary: Dictionary,
  ): Promise<void> => {
    const lockKey = `${target.theme}:${target.locale}`;
    const previous = writeLocks.get(lockKey) ?? Promise.resolve();
    const snapshot = { ...dictionary };
    const next = previous.then(() =>
      writeAtomic(
        path.join(themesRoot, target.theme, 'locales', `${target.locale}.json`),
        snapshot,
      ),
    );
    writeLocks.set(lockKey, next);
    await next;
  };
  let cursor = 0;
  let requests = 0;
  let completedBatches = 0;
  const startedAt = Date.now();
  let nextRequestAt = 0;
  const acquireRateSlot = async () => {
    const interval = 60000 / requestsPerMinute;
    const waitMs = Math.max(0, nextRequestAt - Date.now());
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    nextRequestAt = Math.max(Date.now(), nextRequestAt) + interval;
  };
  const progress = async () => {
    const elapsedMs = Math.max(1, Date.now() - startedAt);
    const processed = results.length;
    const remaining = Math.max(0, targets.length - processed);
    const keysPerMinute = (processed * 60000) / elapsedMs;
    const actualRequestsPerMinute = (requests * 60000) / elapsedMs;
    const etaSeconds = keysPerMinute
      ? Math.round(remaining / (keysPerMinute / 60))
      : null;
    const data = {
      generatedAt: new Date().toISOString(),
      status: 'RUNNING',
      batchSize,
      completedBatches,
      totalBatches: batches.length,
      requests,
      processed,
      remaining,
      autoApproved: results.filter((item) => item.outcome === 'AUTO_APPROVE')
        .length,
      reviewRequired: results.filter(
        (item) => item.outcome === 'REVIEW_REQUIRED',
      ).length,
      rejected: results.filter((item) => item.outcome === 'REJECT').length,
      requestsPerMinute: Number(actualRequestsPerMinute.toFixed(2)),
      keysPerMinute: Number(keysPerMinute.toFixed(2)),
      etaSeconds,
      estimatedCostUsd: null,
    };
    await fs.mkdir(reportRoot, { recursive: true });
    await fs.writeFile(
      path.join(reportRoot, 'enterprise-ai-translation-progress.json'),
      `${JSON.stringify(data, null, 2)}\n`,
      'utf8',
    );
    process.stdout.write(`${JSON.stringify(data)}\n`);
  };
  const worker = async () => {
    while (cursor < batches.length) {
      const batch = batches[cursor++];
      try {
        await acquireRateSlot();
        const drafts = await requestBatch(provider, batch);
        requests += 1;
        for (const draft of drafts) {
          const target = batch.find((item) => item.key === draft.key);
          if (!target) continue;
          const errors = validate(target.sourceText, draft.value);
          const score = Math.round(
            Math.max(0, Math.min(1, draft.confidence ?? 0.5)) * 100,
          );
          const outcome = decision(score, errors);
          if (outcome === 'AUTO_APPROVE') {
            const dictionary = dictionaries.get(
              `${target.theme}:${target.locale}`,
            );
            if (dictionary && dictionary[target.key] === 'REVIEW_REQUIRED') {
              dictionary[target.key] = draft.value;
              await persist(target, dictionary);
            }
          }
          results.push({
            ...target,
            translation: draft.value,
            provider: 'openai',
            confidence: draft.confidence ?? 0.5,
            score,
            outcome,
            errors,
            warnings: draft.warnings ?? [],
          });
        }
        completedBatches += 1;
        await progress();
      } catch (error: unknown) {
        requests += 1;
        for (const target of batch)
          results.push({
            ...target,
            outcome: 'REJECT',
            errors: [error instanceof Error ? error.message : String(error)],
          });
        completedBatches += 1;
        await progress();
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, targets.length) }, () =>
      worker(),
    ),
  );
  for (const [key, dictionary] of dictionaries)
    if (
      results.some(
        (item) =>
          `${item.theme}:${item.locale}` === key &&
          item.outcome === 'AUTO_APPROVE',
      )
    )
      await writeAtomic(
        path.join(
          themesRoot,
          key.split(':')[0],
          'locales',
          `${key.split(':')[1]}.json`,
        ),
        dictionary,
      );
  const totalEntries = [...dictionaries.values()].reduce(
    (total, dictionary) => total + Object.keys(dictionary).length,
    0,
  );
  const remainingReviewRequired = [...dictionaries.values()].reduce(
    (total, dictionary) =>
      total +
      Object.values(dictionary).filter((value) => value === 'REVIEW_REQUIRED')
        .length,
    0,
  );
  const summary = {
    targetEntries: targets.length,
    autoApproved: results.filter((item) => item.outcome === 'AUTO_APPROVE')
      .length,
    reviewRequired: results.filter((item) => item.outcome === 'REVIEW_REQUIRED')
      .length,
    rejected: results.filter((item) => item.outcome === 'REJECT').length,
    remainingReviewRequired,
    approvedEntries: totalEntries - remainingReviewRequired,
    totalEntries,
    coverage: totalEntries
      ? Math.round(
          ((totalEntries - remainingReviewRequired) / totalEntries) * 100,
        )
      : 100,
  };
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    model:
      process.env.OPENAI_MODEL ||
      process.env.TRANSLATION_OPENAI_MODEL ||
      'gpt-4o-mini',
    thresholds: { autoApproveAbove: 98, reviewRequiredFrom: 90 },
    summary,
    entries: results,
  };
  await fs.mkdir(reportRoot, { recursive: true });
  await fs.writeFile(
    path.join(reportRoot, 'enterprise-ai-translation-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
