const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sharp = require('../backend/node_modules/sharp');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'exports', 'reference-theme-audit');
const screenshots = path.join(output, 'screenshots');
const browser = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(fs.existsSync);

if (!browser) throw new Error('Chrome or Edge is required');

const references = [
  ['General references', 'Porto Demo 10', 'https://m2.portotheme.com/demo10_en/'],
  ['General references', 'Porto Demo 3', 'https://m2.portotheme.com/demo3_en/'],
  ['General references', 'Porto Demo 18', 'https://m2.portotheme.com/demo18_en/'],
  ['General references', 'Porto Demo 19', 'https://m2.portotheme.com/demo19_en/'],
  ['Electronics', 'Electricien', 'https://php.kodesolution.com/2025/electricien-php/?storefront=envato-elements'],
  ['Electronics', 'Fixpro Dark', 'https://weblayout.mnsithub.com/html/fixpro/main-html/index-dark.html'],
  ['Footwear', 'Shome Home 1', 'https://template.hasthemes.com/shome/shome/index.html'],
  ['Footwear', 'Shome Home 2', 'https://template.hasthemes.com/shome/shome/index-two.html'],
  ['Footwear', 'Ecomshop', 'https://demoxml.com/html/ecom/?storefront=envato-elements'],
  ['Textile', 'Industify', 'https://frenify.com/work/envato/frenify/html/industify/1/?storefront=envato-elements'],
  ['Textile', 'Industrie Blue', 'https://industrie.rstheme.com/html/blue-construction.html'],
  ['Textile', 'Industrie Red', 'https://industrie.rstheme.com/html/red-engineering.html'],
  ['Textile', 'Industrie Default', 'https://industrie.rstheme.com/html/index.html'],
  ['Industrial Equipment', 'Industriaz', 'https://25.lixela.com/newwp/industriaz/'],
  ['Industrial Equipment', 'Factory', 'https://world5.commonsupport.com/2017/factory/?storefront=envato-elements'],
  ['Machinery', 'Machinery', 'https://st.ourhtmldemo.com/new/Machinery/?storefront=envato-elements'],
  ['Machinery', 'Dynamic', 'http://st.ourhtmldemo.com/template/dynamic/?storefront=envato-elements'],
  ['Machinery', 'Finance', 'https://themesflat.co/html/finance/?storefront=envato-elements'],
  ['Jewelry / Diamond', 'Vemus Intro', 'https://vemus-intro.vercel.app/?storefront=envato-elements'],
  ['Jewelry / Diamond', 'Jovenca', 'https://htmlbeans.com/html/jovenca/home.html?storefront=envato-elements'],
  ['Jewelry / Diamond', 'Jowenly', 'https://wpolive.com/html/jowenly/?storefront=envato-elements'],
  ['General Commerce', 'Botanical', 'https://htmlbeans.com/html/botanical/home.html?storefront=envato-elements'],
  ['General Commerce', 'Gowala', 'https://labartisan.net/demo/gowala/index.html'],
  ['Automotive & Spare Parts', 'Yolo Motor selector', 'https://demo.yolotheme.com/#motor-html'],
  ['Automotive & Spare Parts', 'Keymoto', 'https://pro-theme.com/html/keymoto/index.html?storefront=envato-elements'],
];

function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function capture(start, end) {
  fs.mkdirSync(screenshots, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `reference-theme-browser-${process.pid}-`));
  const results = [];
  for (let index = start; index < Math.min(end, references.length); index += 1) {
    const [category, name, url] = references[index];
    const file = path.join(screenshots, `${String(index + 1).padStart(2, '0')}-${safeName(name)}.png`);
    const run = spawnSync(browser, [
      '--headless=new', '--disable-gpu', '--disable-extensions', '--hide-scrollbars',
      '--no-first-run', '--ignore-certificate-errors', '--disable-popup-blocking',
      `--user-data-dir=${profile}`, '--window-size=1440,1100',
      '--run-all-compositor-stages-before-draw', '--virtual-time-budget=10000',
      `--screenshot=${file}`, url,
    ], { encoding: 'utf8', timeout: 45000, windowsHide: true });
    let entropy = null;
    let width = null;
    let height = null;
    let status = run.status === 0 && fs.existsSync(file) ? 'captured' : 'failed';
    if (status === 'captured') {
      try {
        const image = sharp(file);
        const [metadata, stats] = await Promise.all([image.metadata(), image.stats()]);
        width = metadata.width ?? null;
        height = metadata.height ?? null;
        entropy = stats.entropy;
        if (stats.entropy < 0.25) status = 'blank';
      } catch {
        status = 'invalid-image';
      }
    }
    results.push({ index: index + 1, category, name, url, file, status, width, height, entropy });
  }
  fs.rmSync(profile, { recursive: true, force: true });
  fs.writeFileSync(path.join(output, `batch-${start}-${end}.json`), `${JSON.stringify(results, null, 2)}\n`);
  console.log(JSON.stringify({ start, end, captured: results.filter((item) => item.status === 'captured').length, results }));
}

async function makeSheet() {
  const batchFiles = fs.readdirSync(output).filter((name) => /^batch-\d+-\d+\.json$/.test(name));
  const results = batchFiles.flatMap((name) => JSON.parse(fs.readFileSync(path.join(output, name), 'utf8')))
    .sort((a, b) => a.index - b.index);
  const tileWidth = 300;
  const imageHeight = 190;
  const labelHeight = 52;
  const tileHeight = imageHeight + labelHeight;
  const columns = 5;
  const rows = Math.ceil(results.length / columns);
  const composites = [];
  for (let i = 0; i < results.length; i += 1) {
    const item = results[i];
    let image;
    if (item.status === 'captured' && fs.existsSync(item.file)) {
      image = await sharp(item.file).resize(tileWidth, imageHeight, { fit: 'cover', position: 'top' }).jpeg({ quality: 82 }).toBuffer();
    } else {
      image = await sharp({ create: { width: tileWidth, height: imageHeight, channels: 3, background: '#e5e7eb' } }).jpeg().toBuffer();
    }
    const category = String(item.category).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const name = String(item.name).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const label = Buffer.from(`<svg width="${tileWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b1220"/><text x="10" y="20" fill="#8bd3f7" font-family="Arial" font-size="11" font-weight="700">${item.index}. ${category}</text><text x="10" y="39" fill="white" font-family="Arial" font-size="13">${name} · ${item.status}</text></svg>`);
    const tile = await sharp({ create: { width: tileWidth, height: tileHeight, channels: 3, background: '#ffffff' } })
      .composite([{ input: image, top: 0, left: 0 }, { input: label, top: imageHeight, left: 0 }]).jpeg({ quality: 86 }).toBuffer();
    composites.push({ input: tile, left: (i % columns) * tileWidth, top: Math.floor(i / columns) * tileHeight });
  }
  const sheet = path.join(output, 'reference-themes-contact-sheet.jpg');
  await sharp({ create: { width: columns * tileWidth, height: rows * tileHeight, channels: 3, background: '#cbd5e1' } })
    .composite(composites).jpeg({ quality: 88 }).toFile(sheet);
  const report = { checked: results.length, captured: results.filter((item) => item.status === 'captured').length, failed: results.filter((item) => item.status !== 'captured').length, contactSheet: sheet, references: results };
  fs.writeFileSync(path.join(output, 'reference-theme-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
}

async function makeIndividuals() {
  const batchFiles = fs.readdirSync(output).filter((name) => /^batch-\d+-\d+\.json$/.test(name));
  const results = batchFiles.flatMap((name) => JSON.parse(fs.readFileSync(path.join(output, name), 'utf8')))
    .sort((a, b) => a.index - b.index);
  const destination = path.join(output, 'individual');
  fs.mkdirSync(destination, { recursive: true });
  const generated = [];
  for (const item of results) {
    if (!fs.existsSync(item.file)) continue;
    const width = 1440;
    const labelHeight = 76;
    const screenshot = await sharp(item.file).resize({ width }).jpeg({ quality: 88 }).toBuffer();
    const metadata = await sharp(screenshot).metadata();
    const category = String(item.category).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const name = String(item.name).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const url = String(item.url).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const statusColor = item.status === 'captured' ? '#86efac' : '#fbbf24';
    const label = Buffer.from(`<svg width="${width}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#07111f"/><text x="22" y="28" fill="white" font-family="Arial" font-size="20" font-weight="700">${item.index}. ${category} — ${name}</text><text x="22" y="55" fill="#a8b4c5" font-family="Arial" font-size="13">${url}</text><text x="1390" y="40" text-anchor="end" fill="${statusColor}" font-family="Arial" font-size="15" font-weight="700">${String(item.status).toUpperCase()}</text></svg>`);
    const file = path.join(destination, `${String(item.index).padStart(2, '0')}-${safeName(item.name)}.jpg`);
    await sharp({ create: { width, height: Number(metadata.height) + labelHeight, channels: 3, background: '#ffffff' } })
      .composite([{ input: label, top: 0, left: 0 }, { input: screenshot, top: labelHeight, left: 0 }])
      .jpeg({ quality: 90 }).toFile(file);
    generated.push({ ...item, labelledImage: file });
  }
  fs.writeFileSync(path.join(output, 'individual-images.json'), `${JSON.stringify(generated, null, 2)}\n`);
  console.log(JSON.stringify({ generated: generated.length, destination }));
}

const [command, first, last] = process.argv.slice(2);
if (command === 'capture') capture(Number(first), Number(last)).catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
else if (command === 'sheet') makeSheet().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
else if (command === 'individuals') makeIndividuals().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
else throw new Error('Usage: capture START END | sheet | individuals');
