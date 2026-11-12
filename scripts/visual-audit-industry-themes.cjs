/* Render every packaged design side by side and reject blank/duplicate previews. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const sharp = require('../backend/node_modules/sharp');

const root = path.resolve(__dirname, '..');
const release = path.join(root, 'exports/industry-theme-zips-v2');
const browserCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
const browser = browserCandidates.find(fs.existsSync);
if (!browser) throw new Error('Chrome or Edge is required for the visual audit');
const catalog = JSON.parse(fs.readFileSync(path.join(release, 'catalog.json'), 'utf8'));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'industry-theme-visual-audit-'));
const profile = path.join(temp, 'browser-profile');
const results = [];

async function run() {
  for (const theme of catalog.themes) {
    const channel = theme.platform === 'WEB' ? 'web' : 'mobile';
    const html = path.join(root, 'backend/storage/themes', channel, theme.slug, 'preview/index.html');
    if (!fs.existsSync(html)) throw new Error(`Missing preview: ${html}`);
    const png = path.join(temp, `${theme.designId}.png`);
    const width = theme.platform === 'WEB' ? 1440 : 430;
    const height = theme.platform === 'WEB' ? 1000 : 900;
    const process = spawnSync(browser, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
      `--user-data-dir=${profile}`, `--window-size=${width},${height}`,
      `--screenshot=${png}`, pathToFileURL(html).href,
    ], { encoding: 'utf8', timeout: 30000, windowsHide: true });
    if (process.status !== 0 || !fs.existsSync(png)) {
      throw new Error(`${theme.slug}: browser render failed (${process.status}) ${process.stderr || process.stdout}`);
    }
    const image = sharp(png);
    const stats = await image.stats();
    const pixelHash = crypto.createHash('sha256').update(await image.raw().toBuffer()).digest('hex');
    results.push({ ...theme, png, entropy: stats.entropy, pixelHash });
  }

  const duplicates = results.filter((item, index) => results.findIndex((other) => other.pixelHash === item.pixelHash) !== index);
  const blank = results.filter((item) => item.entropy < 0.8);
  if (duplicates.length || blank.length) throw new Error(`Visual audit failed: duplicates=${duplicates.length}, blank=${blank.length}`);

  const tileWidth = 240;
  const tileHeight = 190;
  const columns = 6;
  const rows = Math.ceil(results.length / columns);
  const composites = [];
  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    const screenshot = await sharp(item.png).resize(tileWidth, tileHeight - 30, { fit: 'cover', position: 'top' }).jpeg({ quality: 78 }).toBuffer();
    const label = Buffer.from(`<svg width="${tileWidth}" height="30" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b1220"/><text x="8" y="19" fill="white" font-family="Arial" font-size="10">${item.designId} · ${String(item.industry).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text></svg>`);
    const tile = await sharp({ create: { width: tileWidth, height: tileHeight, channels: 3, background: '#ffffff' } })
      .composite([{ input: screenshot, top: 0, left: 0 }, { input: label, top: tileHeight - 30, left: 0 }]).jpeg({ quality: 82 }).toBuffer();
    composites.push({ input: tile, left: (i % columns) * tileWidth, top: Math.floor(i / columns) * tileHeight });
  }
  const sheet = path.join(release, 'design-contact-sheet.jpg');
  await sharp({ create: { width: columns * tileWidth, height: rows * tileHeight, channels: 3, background: '#dfe4e8' } })
    .composite(composites).jpeg({ quality: 84 }).toFile(sheet);
  const report = {
    valid: true,
    checked: results.length,
    uniqueRenderedFrames: new Set(results.map((item) => item.pixelHash)).size,
    blankFrames: blank.length,
    contactSheet: path.basename(sheet),
    minimumEntropy: Math.min(...results.map((item) => item.entropy)),
    themes: results.map(({ industry, platform, slug, designId, designDirection, entropy, pixelHash }) => ({ industry, platform, slug, designId, designDirection, entropy, pixelHash })),
  };
  fs.writeFileSync(path.join(release, 'visual-audit-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ valid: true, checked: report.checked, uniqueRenderedFrames: report.uniqueRenderedFrames, blankFrames: 0, sheet }));
}

run().finally(() => fs.rmSync(temp, { recursive: true, force: true })).catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
