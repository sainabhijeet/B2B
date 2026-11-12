/*
 * Applies the shared premium-commerce CSS layer to every generated industry
 * theme. Jewelry / Diamond remains excluded by default and can be explicitly
 * included for shared, cross-theme presentation updates:
 *
 *   node scripts/apply-premium-industry-themes.cjs
 *   node scripts/apply-premium-industry-themes.cjs --apply
 *   node scripts/apply-premium-industry-themes.cjs --apply --include-jewelry
 *
 * It updates the extracted backend themes (used by live preview) and every
 * matching distributable ZIP without rebuilding or replacing theme content.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const AdmZip = require('../backend/node_modules/adm-zip');
const designs = require('./industry-theme-designs.cjs');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'exports', 'industry-theme-zips-v2', 'catalog.json');
const reportPath = path.join(root, 'exports', 'premium-theme-upgrade-2026-10-26.json');
const apply = process.argv.includes('--apply');
const includeJewelry = process.argv.includes('--include-jewelry');
const marker = 'premium-commerce-v1';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function withIdentity(manifest, design) {
  return {
    ...manifest,
    designSystem: {
      ...(manifest.designSystem || {}),
      headerIdentity: design.headerIdentity,
      headerStructure: design.headerStructure,
      footerIdentity: design.footerIdentity,
      footerStructure: design.footerStructure,
    },
  };
}

function replaceZipTheme(file, css, design) {
  const zip = new AdmZip(file);
  const findEntry = normalizedName => zip.getEntries().find(
    candidate => candidate.entryName.replace(/\\/g, '/') === normalizedName,
  );
  const entry = findEntry('assets/css/theme.css');
  if (!entry) throw new Error(`Missing assets/css/theme.css in ${file}`);
  const manifestEntry = findEntry('theme.json');
  if (!manifestEntry) throw new Error(`Missing theme.json in ${file}`);
  const manifest = withIdentity(JSON.parse(manifestEntry.getData().toString('utf8')), design);
  zip.updateFile(entry.entryName, Buffer.from(css, 'utf8'));
  zip.updateFile(manifestEntry.entryName, Buffer.from(JSON.stringify(manifest, null, 2) + '\n', 'utf8'));
  zip.writeZip(file);
}

function main() {
  const catalog = readJson(catalogPath);
  const isJewelry = row => row.industryOrder === 6 || row.industry === 'Jewelry / Diamond';
  const skipped = includeJewelry ? [] : catalog.themes.filter(isJewelry);
  const selected = includeJewelry ? catalog.themes : catalog.themes.filter(row => !isJewelry(row));
  if (catalog.industryCount !== 47 || catalog.themes.length !== 94) {
    throw new Error('Expected the complete 47-industry / 94-theme catalog');
  }
  const expectedSelected = includeJewelry ? 94 : 92;
  const expectedSkipped = includeJewelry ? 0 : 2;
  if (selected.length !== expectedSelected || skipped.length !== expectedSkipped) {
    throw new Error(`Safety check failed: selected=${selected.length}, skipped=${skipped.length}`);
  }

  const results = [];
  for (const row of selected) {
    const mobile = row.platform === 'MOBILE';
    const channel = mobile ? 'mobile' : 'web';
    const extracted = path.join(root, 'backend', 'storage', 'themes', channel, row.slug);
    const manifestFile = path.join(extracted, 'theme.json');
    const cssFile = path.join(extracted, 'assets', 'css', 'theme.css');
    const colorsFile = path.join(extracted, 'tokens', 'colors.json');
    if (!fs.existsSync(cssFile) || !fs.existsSync(colorsFile)) {
      throw new Error(`Missing extracted theme files for ${row.slug}`);
    }

    const colors = readJson(colorsFile);
    const palette = {
      primary: colors.primary,
      secondary: colors.secondary,
      surface: colors.surface,
      ink: colors.ink,
      muted: colors.muted,
    };
    const design = designs.createDesign(row.industryOrder, row.industry, mobile);
    const css = designs.themeCss(design, palette, mobile);
    if (!css.includes(marker)) throw new Error(`Premium marker missing for ${row.slug}`);

    const zipFiles = [
      path.join(root, 'exports', 'industry-theme-zips-v2', row.zip),
      path.join(root, 'storage', 'themes', channel, row.slug, `${row.slug}.zip`),
      path.join(extracted, `${row.slug}.zip`),
    ].filter(file => fs.existsSync(file));

    if (!zipFiles.length) throw new Error(`No distributable ZIP found for ${row.slug}`);
    if (apply) {
      fs.writeFileSync(cssFile, css, 'utf8');
      fs.writeFileSync(manifestFile, JSON.stringify(withIdentity(readJson(manifestFile), design), null, 2) + '\n');
      zipFiles.forEach(file => replaceZipTheme(file, css, design));
    }
    results.push({
      industryOrder: row.industryOrder,
      industry: row.industry,
      platform: row.platform,
      slug: row.slug,
      designId: design.id,
      headerIdentity: design.headerIdentity,
      headerStructure: design.headerStructure,
      footerIdentity: design.footerIdentity,
      footerStructure: design.footerStructure,
      premiumLayer: marker,
      cssBytes: Buffer.byteLength(css),
      cssSha256: sha256(css),
      extractedCss: path.relative(root, cssFile).replace(/\\/g, '/'),
      zipFiles: zipFiles.map(file => path.relative(root, file).replace(/\\/g, '/')),
    });
  }

  const uniqueHeaders = new Set(results.map(row => row.headerIdentity));
  const uniqueFooters = new Set(results.map(row => row.footerIdentity));
  const uniqueWebHeaderStructures = new Set(results.filter(row => row.platform === 'WEB').map(row => row.headerStructure));
  const uniqueAppHeaderStructures = new Set(results.filter(row => row.platform === 'MOBILE').map(row => row.headerStructure));
  const uniqueWebFooterStructures = new Set(results.filter(row => row.platform === 'WEB').map(row => row.footerStructure));
  const uniqueAppFooterStructures = new Set(results.filter(row => row.platform === 'MOBILE').map(row => row.footerStructure));
  if (uniqueHeaders.size !== expectedSelected || uniqueFooters.size !== expectedSelected) {
    throw new Error(`Identity collision: headers=${uniqueHeaders.size}, footers=${uniqueFooters.size}`);
  }
  const expectedChannelStructures = includeJewelry ? 47 : 46;
  if ([uniqueWebHeaderStructures, uniqueAppHeaderStructures, uniqueWebFooterStructures, uniqueAppFooterStructures].some(set => set.size !== expectedChannelStructures)) {
    throw new Error(`Structural collision: webHeaders=${uniqueWebHeaderStructures.size}, appHeaders=${uniqueAppHeaderStructures.size}, webFooters=${uniqueWebFooterStructures.size}, appFooters=${uniqueAppFooterStructures.size}`);
  }

  if (apply) {
    const upgradedCatalog = {
      ...catalog,
      themes: catalog.themes.map(row => {
        if (!includeJewelry && isJewelry(row)) return row;
        const design = designs.createDesign(row.industryOrder, row.industry, row.platform === 'MOBILE');
        return {
          ...row,
          designSystem: {
            ...(row.designSystem || {}),
            headerIdentity: design.headerIdentity,
            headerStructure: design.headerStructure,
            footerIdentity: design.footerIdentity,
            footerStructure: design.footerStructure,
          },
        };
      }),
    };
    fs.writeFileSync(catalogPath, JSON.stringify(upgradedCatalog, null, 2) + '\n');
  }

  const report = {
    applied: apply,
    premiumLayer: marker,
    industryCount: new Set(results.map(row => row.industry)).size,
    themeCount: results.length,
    webThemes: results.filter(row => row.platform === 'WEB').length,
    appThemes: results.filter(row => row.platform === 'MOBILE').length,
    uniqueHeaderIdentities: uniqueHeaders.size,
    uniqueFooterIdentities: uniqueFooters.size,
    uniqueWebHeaderStructures: uniqueWebHeaderStructures.size,
    uniqueAppHeaderStructures: uniqueAppHeaderStructures.size,
    uniqueWebFooterStructures: uniqueWebFooterStructures.size,
    uniqueAppFooterStructures: uniqueAppFooterStructures.size,
    skipped: skipped.map(({ industryOrder, industry, platform, slug }) => ({ industryOrder, industry, platform, slug })),
    results,
  };
  if (apply) fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    industryCount: report.industryCount,
    themeCount: report.themeCount,
    webThemes: report.webThemes,
    appThemes: report.appThemes,
    skippedThemes: report.skipped.length,
    uniqueHeaderIdentities: report.uniqueHeaderIdentities,
    uniqueFooterIdentities: report.uniqueFooterIdentities,
    uniqueWebHeaderStructures: report.uniqueWebHeaderStructures,
    uniqueAppHeaderStructures: report.uniqueAppHeaderStructures,
    uniqueWebFooterStructures: report.uniqueWebFooterStructures,
    uniqueAppFooterStructures: report.uniqueAppFooterStructures,
    zipCopies: results.reduce((sum, row) => sum + row.zipFiles.length, 0),
    report: apply ? path.relative(root, reportPath).replace(/\\/g, '/') : null,
  }));
}

main();
