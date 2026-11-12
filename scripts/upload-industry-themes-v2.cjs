const fs = require('node:fs');
const path = require('node:path');

require('../backend/node_modules/dotenv').config({
  path: path.resolve(__dirname, '../backend/.env'),
  quiet: true,
});

const root = path.resolve(__dirname, '..');
const packageRoot = path.join(root, 'exports/industry-theme-zips-v2');
const catalogPath = path.join(packageRoot, 'catalog.json');
const reportPath = path.join(packageRoot, 'upload-report.json');
const apiBase = `http://127.0.0.1:${process.env.PORT || '3000'}/${String(
  process.env.API_PREFIX || 'api/v1',
).replace(/^\/+|\/+$/g, '')}`;

function writeReport(report) {
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || `HTTP ${response.status}` };
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await readJson(response);
  if (!response.ok) {
    const message =
      body?.message || body?.error || `Request failed with HTTP ${response.status}`;
    const error = new Error(
      Array.isArray(message) ? message.join('; ') : String(message),
    );
    error.status = response.status;
    error.retryAfter = Number(response.headers.get('retry-after') || 0);
    throw error;
  }
  return body;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJsonWithRateLimitRetry(url, options = {}, retries = 5) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await requestJson(url, options);
    } catch (error) {
      if (error?.status !== 429 || attempt >= retries) throw error;
      const retryMs = Math.max(
        Number(error.retryAfter || 0) * 1000,
        Math.min(65_000, 15_000 * (attempt + 1)),
      );
      console.log(`Rate limit reached; retrying in ${Math.ceil(retryMs / 1000)}s...`);
      await wait(retryMs);
    }
  }
}

function assertCatalog(catalog) {
  const themes = Array.isArray(catalog?.themes) ? catalog.themes : [];
  const web = themes.filter((row) => row.platform === 'WEB');
  const mobile = themes.filter((row) => row.platform === 'MOBILE');
  const industries = new Set(themes.map((row) => row.industryId));
  const slugs = new Set(themes.map((row) => row.slug));
  if (
    themes.length !== 94 ||
    web.length !== 47 ||
    mobile.length !== 47 ||
    industries.size !== 47 ||
    slugs.size !== 94
  ) {
    throw new Error(
      `Invalid catalog: total=${themes.length}, web=${web.length}, mobile=${mobile.length}, industries=${industries.size}, slugs=${slugs.size}`,
    );
  }
  for (const row of themes) {
    const zipPath = path.join(packageRoot, row.zip);
    if (!fs.existsSync(zipPath)) throw new Error(`Missing ZIP: ${row.zip}`);
  }
  return themes;
}

function normalizedThemeList(body) {
  if (Array.isArray(body)) return body;
  return Array.isArray(body?.data) ? body.data : [];
}

function themeMatches(row, theme) {
  return (
    theme?.slug === row.slug &&
    theme?.themeName === row.themeName &&
    theme?.themeType === row.industry &&
    theme?.themeChannel === row.platform &&
    theme?.themeVersion === (row.version || '1.2.0') &&
    theme?.status === 'ACTIVE'
  );
}

async function main() {
  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Bootstrap super-admin credentials are not configured.');
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const themes = assertCatalog(catalog);

  const industries = await requestJsonWithRateLimitRetry(`${apiBase}/industries`);
  const industryById = new Map(
    (Array.isArray(industries) ? industries : []).map((row) => [row.industryId, row]),
  );
  for (const row of themes) {
    const industry = industryById.get(row.industryId);
    if (!industry) throw new Error(`Industry is missing from API: ${row.industryId}`);
    if (industry.name !== row.industry) {
      throw new Error(
        `Industry mismatch for ${row.slug}: catalog=${row.industry}, API=${industry.name}`,
      );
    }
    if (industry.status !== 'active') {
      throw new Error(`Industry is not active: ${row.industry}`);
    }
  }

  const login = await requestJsonWithRateLimitRetry(`${apiBase}/auth/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      deviceId: 'codex-industry-theme-v2-upload',
    }),
  });
  if (!login?.accessToken) throw new Error('Admin login returned no access token.');
  const auth = { authorization: `Bearer ${login.accessToken}` };

  let existing = normalizedThemeList(
    await requestJsonWithRateLimitRetry(`${apiBase}/themes?allStatuses=1`, { headers: auth }),
  );
  const bySlug = new Map(existing.map((theme) => [theme.slug, theme]));
  const incompatible = themes
    .filter((row) => bySlug.has(row.slug) && !themeMatches(row, bySlug.get(row.slug)))
    .map((row) => ({ row, theme: bySlug.get(row.slug) }));
  if (incompatible.length) {
    throw new Error(
      `Preflight found ${incompatible.length} incompatible existing slug(s): ${incompatible
        .map(({ row }) => row.slug)
        .join(', ')}`,
    );
  }

  const report = {
    startedAt: new Date().toISOString(),
    completedAt: null,
    valid: false,
    targetCount: themes.length,
    uploaded: 0,
    skipped: 0,
    failed: 0,
    results: [],
  };
  writeReport(report);

  for (let index = 0; index < themes.length; index += 1) {
    const row = themes[index];
    const known = bySlug.get(row.slug);
    if (known) {
      report.skipped += 1;
      report.results.push({
        slug: row.slug,
        industryId: row.industryId,
        industry: row.industry,
        platform: row.platform,
        themeId: known.id,
        status: 'skipped-existing',
      });
      console.log(`[${index + 1}/${themes.length}] SKIP ${row.slug}`);
      continue;
    }

    const zipPath = path.join(packageRoot, row.zip);
    const form = new FormData();
    form.append(
      'file',
      new Blob([fs.readFileSync(zipPath)], { type: 'application/zip' }),
      path.basename(zipPath),
    );
    form.append('themeName', row.themeName);
    form.append('themeType', row.industry);
    form.append('platform', row.platform === 'WEB' ? 'web' : 'mobile');
    form.append('version', row.version || '1.2.0');
    form.append('slug', row.slug);
    form.append('status', 'ACTIVE');

    try {
      const body = await requestJsonWithRateLimitRetry(`${apiBase}/themes/upload`, {
        method: 'POST',
        headers: auth,
        body: form,
      });
      const saved = body?.data;
      if (!themeMatches(row, saved)) {
        throw new Error(`Upload response metadata mismatch for ${row.slug}`);
      }
      bySlug.set(row.slug, saved);
      report.uploaded += 1;
      report.results.push({
        slug: row.slug,
        industryId: row.industryId,
        industry: row.industry,
        platform: row.platform,
        themeId: saved.id,
        status: 'uploaded',
      });
      console.log(`[${index + 1}/${themes.length}] OK ${row.slug}`);
    } catch (error) {
      // A connection may close after the server commits. Re-read before marking it failed.
      existing = normalizedThemeList(
        await requestJsonWithRateLimitRetry(`${apiBase}/themes?allStatuses=1`, { headers: auth }),
      );
      const recovered = existing.find((theme) => theme.slug === row.slug);
      if (recovered && themeMatches(row, recovered)) {
        bySlug.set(row.slug, recovered);
        report.uploaded += 1;
        report.results.push({
          slug: row.slug,
          industryId: row.industryId,
          industry: row.industry,
          platform: row.platform,
          themeId: recovered.id,
          status: 'uploaded-recovered',
        });
        console.log(`[${index + 1}/${themes.length}] OK ${row.slug} (recovered)`);
        continue;
      }
      report.failed += 1;
      report.results.push({
        slug: row.slug,
        industryId: row.industryId,
        industry: row.industry,
        platform: row.platform,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      writeReport(report);
      throw error;
    } finally {
      writeReport(report);
    }
  }

  const finalThemes = normalizedThemeList(
    await requestJsonWithRateLimitRetry(`${apiBase}/themes?allStatuses=1`, { headers: auth }),
  );
  const finalBySlug = new Map(finalThemes.map((theme) => [theme.slug, theme]));
  const invalid = themes.filter((row) => !themeMatches(row, finalBySlug.get(row.slug)));
  report.completedAt = new Date().toISOString();
  report.valid = invalid.length === 0 && report.failed === 0;
  report.verifiedCount = themes.length - invalid.length;
  report.invalidSlugs = invalid.map((row) => row.slug);
  writeReport(report);
  if (!report.valid) {
    throw new Error(`Final verification failed for ${invalid.length} theme(s).`);
  }
  console.log(
    JSON.stringify({
      valid: true,
      uploaded: report.uploaded,
      skipped: report.skipped,
      verified: report.verifiedCount,
      report: reportPath,
    }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
