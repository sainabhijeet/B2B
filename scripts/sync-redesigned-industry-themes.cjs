/* Synchronize the validated v2 release into the local upload and backend stores. */
const fs = require('node:fs');
const path = require('node:path');
const AdmZip = require('../backend/node_modules/adm-zip');

const root = path.resolve(__dirname, '..');
const release = path.join(root, 'exports/industry-theme-zips-v2');
const catalog = JSON.parse(fs.readFileSync(path.join(release, 'catalog.json'), 'utf8'));
let copied = 0;
let extracted = 0;

for (const theme of catalog.themes) {
  const source = path.join(release, theme.zip);
  if (!fs.existsSync(source)) throw new Error(`Missing release ZIP: ${source}`);
  const channel = theme.platform === 'WEB' ? 'web' : 'mobile';

  const uploadDirectory = path.join(root, 'storage/themes', channel, theme.slug);
  if (fs.existsSync(uploadDirectory)) {
    fs.copyFileSync(source, path.join(uploadDirectory, `${theme.slug}.zip`));
    copied += 1;
  }

  const extractedDirectory = path.join(root, 'backend/storage/themes', channel, theme.slug);
  if (fs.existsSync(extractedDirectory)) {
    new AdmZip(source).extractAllTo(extractedDirectory, true);
    extracted += 1;
  }
}

if (copied !== 94 || extracted !== 94) {
  throw new Error(`Expected 94 local copies and extracts; copied=${copied}, extracted=${extracted}`);
}
console.log(JSON.stringify({ valid: true, copied, extracted, release }));
