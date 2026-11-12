/* Reproducible local packaging of individually generated, cached product photos.
 * prepare never generates images; package refuses missing or reused photos.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const AdmZip = require('../backend/node_modules/adm-zip');
const sharp = require('../backend/node_modules/sharp');
const content = require('./industry-theme-v2-content.cjs');
const designs = require('./industry-theme-designs.cjs');
const root = path.resolve(__dirname, '..');
const base = path.join(root, 'exports/industry-theme-zips-v1.1');
const output = path.join(root, 'exports/industry-theme-zips-v2');
const assetRoot = path.join(root, 'assets/industry-theme-v2');
const jobFile = path.join(assetRoot, 'image-prompts.json');
const writeJson = (p, data) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n'); };
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const xml = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function entryJson(zip, name) {
  const entry = zip.getEntries().find(e => e.entryName.replace(/\\/g, '/') === name);
  if (!entry) throw new Error(`Missing ${name}`);
  return JSON.parse(entry.getData().toString('utf8'));
}
function plans() {
  return readJson(path.join(base, 'catalog.json')).themes.map(row => {
    const zip = new AdmZip(path.join(base, row.zip));
    const old = entryJson(zip, 'demo-data/catalog.json');
    const spec = content[row.industryOrder - 1];
    if (!spec) throw new Error(`No content: ${row.industry}`);
    const mobile = row.platform === 'MOBILE';
    const brand = spec[mobile ? 1 : 0];
    const names = mobile ? spec[2].split('|') : old.products.map(p => p.name);
    if (names.length !== 6) throw new Error(`Expected six products: ${brand}`);
    const categories = old.categories.map((c, i) => ({
      ...c, id: `${row.slug}-category-${i + 1}`, name: `${brand} ${c.name}`,
      description: mobile ? `Pick ${c.name.toLowerCase()} for your ${row.industry.toLowerCase()} replenishment list with ${brand}.`
        : `Explore ${brand}'s ${c.name.toLowerCase()} selection for ${row.industry.toLowerCase()} buyers. Compare sample packs before planning a trade order.`,
    }));
    const products = old.products.map((p, i) => {
      const category = mobile ? categories[[0,1,2,3,0,1][i]] : categories.find(c => c.slug === p.category);
      const name = `${brand} ${names[i]}`;
      const price = mobile ? Math.max(50, Math.round(p.price * [0.84,1.12,0.93,1.08,0.76,1.18][i])) : p.price;
      const moq = price >= 10000 ? 1 : (mobile ? [2,4,3,6,5,8][i] : p.moq);
      return { ...p, id: `${row.slug}-product-${i + 1}`, name, slug: slug(name),
        sku: `${mobile ? 'APP' : 'WEB'}-${String(row.industryOrder).padStart(2,'0')}-${i + 1}`,
        brand, category: category.slug, categoryId: category.id, categoryName: category.name,
        description: mobile
          ? `${names[i]} for your ${row.industry.toLowerCase()} replenishment list. ${brand} groups this item with ${category.name.replace(brand + ' ', '').toLowerCase()} so mobile buyers can review pack quantities and plan repeat orders. Fictional demo item; confirm the actual specification with the supplier.`
          : `${names[i]} from ${brand}'s ${category.name.replace(brand + ' ', '').toLowerCase()} assortment. ${spec[3]} Review the sample price breaks and minimum order before adding this item to a sourcing shortlist. Fictional catalog item; no certification or performance claim is implied.`,
        price, priceLabel: `INR ${price.toLocaleString('en-IN')}`, moq,
        stock: (mobile ? 38 : 65) + row.industryOrder * 3 + i * 11,
        compareAtPrice: Math.round(price * 1.18),
        image: `assets/images/product-${String(i + 1).padStart(2,'0')}.jpg`,
        imageAlt: `AI-generated demo product photograph: ${name}`,
        imageDisclosure: 'AI-generated fictional catalog illustration; not a verified supplier photograph.',
        bulkPrices: [1,5,10].map((factor, j) => ({minQuantity: moq * factor, unitPrice: Math.round(price * [1,0.95,0.9][j])})),
      };
    });
    categories.forEach((c, i) => { c.image = (products.find(p => p.category === c.slug) || products[i]).image; });
    return { row, zip, old, spec, brand, mobile, names, categories, products };
  });
}
function prepare() {
  const jobs = [];
  for (const p of plans()) {
    p.products.forEach((product, i) => {
      const id = `${p.row.slug}--${String(i + 1).padStart(2,'0')}`;
      jobs.push({ id, industry: p.row.industry, channel: p.row.platform, product: product.name,
        file: path.join(assetRoot, 'photos', `${id}.png`),
        prompt: `Use case: product-mockup. Asset type: ${p.row.industry} ${p.mobile ? 'App' : 'Web'} Theme product card photograph. Primary subject: ${p.names[i]}. Show a physically plausible generic unbranded version used in ${p.row.industry.toLowerCase()}. Photorealistic commercial catalog photography, accurate materials and recognizable silhouette, complete object or coherent product pack visible, generous crop-safe margins. ${p.mobile ? 'Warm ivory studio setting, slightly elevated three-quarter viewpoint, soft natural side light.' : 'Cool neutral studio setting, eye-level three-quarter viewpoint, large softbox lighting.'} Product fills about 65 percent of a square image. No text, logos, watermark, people, brand marks or false certification badges. Fictional product for a demo catalog, not an instruction diagram. For chemical/medical goods use blank generic packaging, no efficacy claims.`,
      });
    });
  }
  if (jobs.length !== 564 || new Set(jobs.map(j => j.product)).size !== 564) throw new Error('Product names must be unique across all 94 packages');
  fs.mkdirSync(path.join(assetRoot, 'photos'), {recursive:true});
  writeJson(jobFile, jobs);
  console.log(JSON.stringify({jobs:jobs.length,prompts:jobFile,output}));
}
async function saveImage(id, source) {
  const job = readJson(jobFile).find(j => j.id === id);
  if (!job) throw new Error('Unknown image job');
  const image = fs.readFileSync(source);
  const metadata = await sharp(image).metadata();
  if (!metadata.width || metadata.width < 512 || !metadata.height || metadata.height < 512) throw new Error('Image is too small');
  if (!fs.existsSync(job.file)) fs.copyFileSync(source, job.file);
  console.log(JSON.stringify({saved:id,bytes:image.length}));
}
function status() {
  const jobs = readJson(jobFile);
  const done = jobs.filter(j => fs.existsSync(j.file));
  console.log(JSON.stringify({total:jobs.length,done:done.length,remaining:jobs.length-done.length}));
}
async function packageAll(onlySlug) {
  const jobs = readJson(jobFile);
  const selectedPlans = plans().filter(p => !onlySlug || p.row.slug === onlySlug);
  if (!selectedPlans.length) throw new Error('Unknown theme slug');
  const selectedJobs = jobs.filter(j => !onlySlug || j.id.startsWith(onlySlug + '--'));
  const destination = onlySlug ? path.join(assetRoot, 'qa-packages') : output;
  const missing = selectedJobs.filter(j => !fs.existsSync(j.file));
  if (missing.length) throw new Error(`${missing.length} photos still missing; refusing to publish placeholder packages`);
  const sourceHashes = new Set();
  const photoHashes = new Set();
  const packages = [];
  const manifestReport = [];
  for (const p of selectedPlans) {
    const {row,products,categories,brand,mobile,spec} = p;
    const design = designs.createDesign(row.industryOrder, row.industry, mobile);
    const zip = new AdmZip();
    const imageBuffers = [];
    for (let i=0;i<6;i++) {
      const id = `${row.slug}--${String(i+1).padStart(2,'0')}`;
      const job = jobs.find(j => j.id === id);
      const bytes = fs.readFileSync(job.file);
      const sourceHash = hash(bytes);
      if (sourceHashes.has(sourceHash)) throw new Error(`Duplicate source photo ${id}`);
      sourceHashes.add(sourceHash);
      const jpeg = await sharp(bytes).resize({width:1000,height:1000,fit:'inside',withoutEnlargement:true}).jpeg({quality:85,mozjpeg:true}).toBuffer();
      const pixelHash = hash(await sharp(jpeg).raw().toBuffer());
      if (photoHashes.has(pixelHash)) throw new Error(`Duplicate decoded image ${id}`);
      photoHashes.add(pixelHash);
      zip.addFile(products[i].image, jpeg);
      imageBuffers.push(jpeg);
      manifestReport.push({id,product:products[i].name,source:job.file,sha256:sourceHash,pixelSha256:pixelHash});
    }
    const oldManifest = entryJson(p.zip,'theme.json');
    // Keep the established v1 section contract: a major version change also
    // switches backend schema validation, independently of this asset refresh.
    const manifest = {...oldManifest, version:'1.3.0', description:`${brand}: ${spec[3]} ${mobile ? 'An app-first replenishment assortment.' : 'A desktop sourcing assortment.'} ${design.direction} design direction with unique responsive composition and AI-generated demo photography.`,
      designSystem:{id:design.id,direction:design.direction,header:design.header,headerIdentity:design.headerIdentity,headerStructure:design.headerStructure,hero:design.hero,categories:design.category,productCards:design.product,productListing:design.plp,productDetail:design.pdp,footer:design.footer,footerIdentity:design.footerIdentity,footerStructure:design.footerStructure,density:design.density,responsiveStrategy:mobile?design.mobileLayout:`${design.plp}-to-mobile-drawer`},
      preview:{desktop:products[0].image,tablet:products[0].image,mobile:products[0].image}};
    if (manifest.mobile) manifest.mobile={...manifest.mobile,base_layout:design.mobileLayout,card_style:design.product,spacing:design.density,design_id:design.id,banner_image:products[0].image,category_image:categories[0].image};
    const oldBrand = entryJson(p.zip,'templates/home.json').sections[0].settings.logoText;
    const substitutions = new Map([[oldBrand,brand]]);
    p.old.products.forEach((old,i)=>{substitutions.set(old.name,products[i].name);substitutions.set(old.image,products[i].image);});
    p.old.categories.forEach((old,i)=>{substitutions.set(old.name,categories[i].name);substitutions.set(old.image,categories[i].image);});
    substitutions.set('assets/images/hero.svg',products[0].image);
    substitutions.set('assets/images/detail.svg',products[4].image);
    const replace = value => typeof value === 'string' ? (substitutions.get(value) || value)
      : Array.isArray(value) ? value.map(replace)
      : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replace(v)])) : value;
    const title = mobile ? `${brand}: your ${row.industry.toLowerCase()} restock list` : `${brand}: ${spec[3]}`;
    const subtitle = mobile ? `Browse ${p.names[0].toLowerCase()}, ${p.names[1].toLowerCase()} and a dedicated ${row.industry.toLowerCase()} mobile assortment.`
      : `Source ${p.names[0].toLowerCase()}, ${p.names[1].toLowerCase()} and more from this ${row.industry.toLowerCase()} trade collection.`;
    const templates = {};
    for (const page of ['home','category','product']) {
      const template = replace(entryJson(p.zip,`templates/${page}.json`));
      for (const section of template.sections) {
        const s=section.settings;
        if(section.type==='header') {
          s.logoText=brand;s.logoImageUrl='assets/images/logo.svg';
          if(!mobile && row.industry==='Footwear') s.nav=['Home','Categories','Products','New Arrivals','Offers','About','Contact'];
          if(!mobile && row.industry==='Industrial Equipment') s.nav=['Home','Categories','Offers','Bulk Orders','About','Contact'];
        }
        if(section.type==='hero-banner') {
          const isFootwearWeb=!mobile && row.industry==='Footwear';
          const isIndustrialWeb=!mobile && row.industry==='Industrial Equipment';
          s.title=page==='home'?(isFootwearWeb?'Wholesale footwear, curated for modern retail.':isIndustrialWeb?'Production-ready equipment. Procured with control.':title):`${brand} / ${row.industry}`;
          s.subtitle=isFootwearWeb?'Build a versatile buying range across formal, sport, safety and everyday footwear for your customers.':isIndustrialWeb?'Compare essential workshop equipment, operating specifications and trade quantities from one controlled sourcing desk.':subtitle;
          s.image=isFootwearWeb?products[1].image:products[0].image;
          if(isFootwearWeb){s.eyebrow='CURATED WHOLESALE FOOTWEAR / NEW SEASON 2027';s.accentImage=products[0].image;s.accentImageAlt=products[0].name;s.primaryCta='Shop collections';s.secondaryCta='Book a buying consultation';s.secondaryHref='/contact';}
          if(isIndustrialWeb){s.eyebrow='PLANT FLOOR PROCUREMENT / EQUIPMENT CATALOG';s.primaryCta='Browse equipment';s.primaryHref='/category';s.secondaryCta='Request sourcing quote';s.secondaryHref='/contact';}
          // Generic channel labels add no customer value and should never be
          // rendered as hero content in either web or app theme packages.
          if(!isFootwearWeb && !isIndustrialWeb) delete s.eyebrow;
        }
        if(section.type==='category-grid') {const industrialWeb=!mobile&&row.industry==='Industrial Equipment';s.title=!mobile&&row.industry==='Footwear'?'Shop by footwear category':industrialWeb?'Source by operating zone':`${brand} collections`;s.subtitle=!mobile&&row.industry==='Footwear'?'A focused range for every retail footwear aisle.':industrialWeb?'Four focused equipment groups for plant, workshop and maintenance procurement.':`Choose your next ${row.industry.toLowerCase()} order by collection.`;s.categories=categories;s.images=categories.map(c=>c.image);s.labels=categories.map(c=>c.name);}
        if(['product-grid','related-products'].includes(section.type)) {s.title=!mobile&&row.industry==='Footwear'?'The StrideFoundry edit':mobile?`${brand} restock picks`:`${brand} trade selection`;s.subtitle=!mobile&&row.industry==='Footwear'?'Six essential footwear profiles, selected for a balanced retail floor.':subtitle;s.products=products;s.images=products.map(x=>x.image);s.labels=products.map(x=>x.name);s.prices=products.map(x=>x.priceLabel);}
        if(section.type==='product-gallery') {s.title=products[0].name;s.images=[products[0].image];}
        if(section.type==='product-info') Object.assign(s,{title:products[0].name,subtitle:products[0].description,description:products[0].description,price:products[0].priceLabel,sku:products[0].sku,stock:products[0].stock,moq:products[0].moq,product:products[0]});
        if(section.type==='promo-banner') {s.title=`${brand} ${mobile?'restock':'trade'} savings`;s.subtitle=`Sample quantity breaks for ${p.names[2].toLowerCase()} and the ${row.industry.toLowerCase()} catalog. Demo offers only.`;}
        if(section.type==='image-with-text') {const footwearWeb=!mobile&&row.industry==='Footwear';s.eyebrow=footwearWeb?'THE STRIDEFOUNDRY EDIT':s.eyebrow;s.title=footwearWeb?'A sharper footwear assortment, built around real retail needs.':mobile?`Your ${brand} buying list, wherever work takes you`:`Build your next ${row.industry.toLowerCase()} assortment with ${brand}`;s.body=footwearWeb?'From polished workday pairs to performance-led weekend styles, build a focused range with a consistent point of view.':spec[3]+' '+subtitle;s.image=products[4].image;}
        if(section.type==='feature-list') {s.eyebrow=!mobile&&row.industry==='Footwear'?'BUILT FOR TRADE':s.eyebrow;s.title=!mobile&&row.industry==='Footwear'?'A considered way to build your footwear range':`Buying with ${brand}`;s.items=[{icon:'01',title:categories[0].name,text:`Start with ${p.names[0].toLowerCase()} and compare the ${brand} sample pack details.`},{icon:'02',title:`${brand} quantity breaks`,text:`Review MOQ and bulk tiers for ${p.names[1].toLowerCase()} before planning an order.`},{icon:'03',title:mobile?`${brand} repeat orders`:`${brand} sourcing lists`,text:subtitle}];}
        if(section.type==='testimonial-carousel') {s.title=`${brand} sample buyer story`;s.quote=`Our demo ${row.industry.toLowerCase()} buying team can compare ${p.names[0].toLowerCase()} and ${p.names[2].toLowerCase()} in one ${mobile?'restock list':'sourcing catalog'}.`;s.author=`Fictional ${brand} buyer — demo feedback`;}
        if(section.type==='newsletter') {s.title=!mobile&&row.industry==='Footwear'?'The StrideFoundry buying note':`Follow ${brand} arrivals`;s.subtitle=!mobile&&row.industry==='Footwear'?'New silhouettes, curated category updates and trade-ready collection notes.':`Sample updates about ${p.names[3].toLowerCase()} and ${categories[0].name.toLowerCase()}.`;s.buttonText=!mobile&&row.industry==='Footwear'?'Join the list':s.buttonText;}
        if(section.type==='filter-sidebar') {s.title=`Find ${brand} supplies`;s.message=`Explore ${categories.map(c=>c.name).join(', ')}.`;}
        if(section.type==='cta-banner') {s.title=`Plan your ${brand} order`;s.subtitle=`Review quantities for ${p.names[0].toLowerCase()} with this ${row.industry.toLowerCase()} preview.`;}
        if(section.type==='faq-section') {s.title=`About the ${brand} demo catalog`;s.items=[{question:`How are ${brand} pack quantities shown?`,answer:`${products[0].name} has a sample MOQ of ${products[0].moq}. Each item has its own fictional stock and quantity breaks.`},{question:`Are ${brand} images supplier photographs?`,answer:`These ${row.industry.toLowerCase()} images are AI-generated examples. Names, pricing and availability are fictional preview data.`}];}
        if(section.type==='footer') {s.logoText=brand;s.tagline=subtitle+' AI-generated demo catalog.';}
      }
      templates[page]=designs.applyDesign(template,page,design);
    }
    for(const entry of p.zip.getEntries()) {
      const name=entry.entryName.replace(/\\/g,'/');
      if(entry.isDirectory||name.startsWith('assets/images/')||name.startsWith('templates/')||name.startsWith('demo-data/')||name.startsWith('locales/')||name==='assets/css/theme.css'||name==='tokens/typography.json'||['theme.json','README.txt'].includes(name)) continue;
      zip.addFile(name,entry.getData());
    }
    const themeFont = mobile ? 'Poppins, Arial, sans-serif' : 'Roboto, Arial, sans-serif';
    zip.addFile('tokens/typography.json', Buffer.from(JSON.stringify({family:{heading:themeFont,body:themeFont},scale:'responsive'}, null, 2) + '\n'));
    const oldColors = entryJson(p.zip,'tokens/colors.json');
    const palette = {primary:oldColors.primary,secondary:oldColors.secondary,surface:oldColors.surface,ink:oldColors.ink,muted:oldColors.muted};
    zip.addFile('assets/css/theme.css',Buffer.from(designs.themeCss(design,palette,mobile)));
    const logoColor=`hsl(${(row.industryOrder*137+(mobile?43:0))%360},55%,32%)`;
    const initials=brand.replace(/([a-z])([A-Z])/g,'$1 $2').split(' ').map(s=>s[0]).join('');
    zip.addFile('assets/images/logo.svg',Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160" viewBox="0 0 320 160"><rect width="320" height="160" rx="24" fill="${logoColor}"/><text x="160" y="74" text-anchor="middle" fill="white" font-family="Arial" font-size="44" font-weight="700">${xml(initials)}</text><text x="160" y="122" text-anchor="middle" fill="white" font-family="Arial" font-size="24">${xml(brand)}</text></svg>`));
    const demo={...p.old,themeName:row.themeName,version:'1.3.0',designSystem:manifest.designSystem,store:{name:brand,industry:row.industry,tagline:subtitle,email:`hello@${slug(brand)}.example`,logo:'assets/images/logo.svg'},categories,products,
      offers:[{title:`${brand} quantity rewards`,description:`Compare the sample bulk tiers in ${brand}'s ${row.industry.toLowerCase()} range.`,demoOnly:true}],
      testimonials:templates.home.sections.filter(s=>s.type==='testimonial-carousel').map(s=>({...s.settings,demoOnly:true})),
      disclaimer:'Fictional demo catalog with AI-generated product images. No actual supplier, stock, certification or price is represented.'};
    const addJson=(name,data)=>zip.addFile(name,Buffer.from(JSON.stringify(data,null,2)+'\n'));
    addJson('theme.json',manifest);addJson('demo-data/catalog.json',demo);
    Object.entries(templates).forEach(([page,value])=>addJson(`templates/${page}.json`,value));
    // Literal-content translation convention used by the original packages.
    const locale={};const collect=v=>{if(typeof v==='string'&&!v.startsWith('assets/'))locale[v]=v;else if(Array.isArray(v))v.forEach(collect);else if(v&&typeof v==='object')Object.values(v).forEach(collect);};
    collect(templates);collect(manifest.name);collect(manifest.description);addJson('locales/en.json',locale);
    zip.addFile('README.txt',Buffer.from(`${row.themeName} v1.3.0 (unique layout collection)\nDemo brand: ${brand}\nChannel: ${row.platform}\nDesign direction: ${design.direction}\nHeader: ${design.header}; hero: ${design.hero}; categories: ${design.category}; product cards: ${design.product}; PLP: ${design.plp}; PDP: ${design.pdp}; footer: ${design.footer}.\nSix individually AI-generated product photographs, distinct Web/App assortments, four collections.\nFictional preview data only. Live tenant catalog takes priority outside explicit preview mode.\nExtract and open preview/index.html for an offline reference preview.\n`));
    const names=new Set(zip.getEntries().map(e=>e.entryName));
    const verify=v=>{if(typeof v==='string'&&v.startsWith('assets/')&&!names.has(v))throw new Error(`Missing asset: ${row.slug}/${v}`);else if(Array.isArray(v))v.forEach(verify);else if(v&&typeof v==='object')Object.values(v).forEach(verify);};
    verify(manifest);verify(templates);verify(demo);
    // Offline reference preview; application Live Preview still uses templates.
    const cards=products.map(product=>`<article><img src="../${product.image}" alt="${xml(product.imageAlt)}"/><div><small>${xml(product.categoryName)}</small><h3>${xml(product.name)}</h3><strong>${xml(product.priceLabel)}</strong><p>MOQ ${product.moq} &middot; Demo stock ${product.stock}</p><details><summary>Product details</summary><p>${xml(product.description)}</p></details></div></article>`).join('');
    const previewColumns=mobile?Math.min(2,design.columns):Math.min(6,design.columns);
    const previewHero=mobile||['full-bleed','stacked-center','mosaic'].includes(design.hero)?'1fr':'1fr 1fr';
    const previewHeader=['centered-nav','editorial'].includes(design.header)?'column':'row';
    zip.addFile('preview/index.html',Buffer.from(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${xml(brand)} demo preview</title><style>*{box-sizing:border-box}body{margin:0;background:${palette.surface};color:${palette.ink};font:16px/1.6 ${design.bodyFont}}main{max-width:${mobile?'520':'1320'}px;margin:auto;padding:${design.gap}px}header{display:flex;flex-direction:${previewHeader};align-items:center;justify-content:space-between;gap:12px;border-${design.header==='trade-desk'?'top:5px solid':'bottom:1px solid'} ${palette.primary};padding:16px}header img{width:130px;height:65px;object-fit:contain}.hero{display:grid;grid-template-columns:${previewHero};gap:${design.gap*2}px;align-items:center;margin:40px 0}.hero img{width:100%;aspect-ratio:${design.imageRatio};object-fit:cover;border-radius:${design.radius}px}h1,h2,h3{font-family:${design.headingFont}}h1{font-size:${mobile?'32':40+(row.industryOrder%4)*4}px;line-height:1.05;letter-spacing:-1px}.tag{color:${palette.primary};font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:2px}.categories{display:${design.category==='horizontal-rail'?'flex':'grid'};grid-template-columns:repeat(${Math.min(4,previewColumns)},1fr);gap:10px;overflow:auto;margin:24px 0}.categories span{padding:10px 14px;background:white;border-radius:${design.category==='round-icons'||design.category==='compact-chips'?'999':design.radius+'px'};border:1px solid ${palette.primary}33;white-space:nowrap}.grid{display:grid;grid-template-columns:repeat(${previewColumns},minmax(0,1fr));gap:${design.gap}px}article{display:${design.product==='horizontal'?'flex':'block'};background:white;border:${design.product==='editorial'?'0':'1px solid #d9dfdc'};border-radius:${design.radius}px;overflow:hidden;box-shadow:${design.product==='marketplace'?'0 8px 24px #0f172a18':'none'}}article img{width:${design.product==='horizontal'?'42%':'100%'};aspect-ratio:${design.imageRatio};object-fit:cover}article div{padding:${design.density==='compact'?10:18}px}h3{font-size:16px;line-height:1.3;margin:8px 0}small,article p,footer{color:${palette.muted}}details{font-size:12px}footer{padding:32px 0;font-size:12px}@media(max-width:700px){header{flex-direction:row}.hero{grid-template-columns:1fr}.grid{grid-template-columns:${design.product==='horizontal'||design.product==='bulk-table'?'1fr':'repeat(2,minmax(0,1fr))'}}main{padding:14px}h1{font-size:32px}}</style></head><body data-design="${design.id}"><main><header><img src="../assets/images/logo.svg" alt="${xml(brand)}"><span>${xml(design.direction)} &middot; ${mobile?'APP':'WEB'}</span></header><section class="hero"><div><p class="tag">${xml(row.industry)}</p><h1>${xml(title)}</h1><p>${xml(subtitle)}</p><a href="#catalog">Explore demo catalog &rarr;</a></div><img src="../${products[0].image}" alt="${xml(products[0].imageAlt)}"></section><div class="categories">${categories.map(c=>`<span>${xml(c.name)}</span>`).join('')}</div><h2 id="catalog">${xml(brand)} selections</h2><section class="grid">${cards}</section><footer>${xml(demo.disclaimer)}</footer></main></body></html>`));
    const file=path.join(destination,row.zip);fs.mkdirSync(path.dirname(file),{recursive:true});zip.writeZip(file);
    if(fs.statSync(file).size>50*1024*1024)throw new Error(`Upload limit exceeded: ${file}`);
    packages.push({...row,version:'1.3.0',designId:design.id,designDirection:design.direction,designSystem:manifest.designSystem,demoBrand:brand,photos:6,valid:true});
  }
  const report={valid:true,checked:packages.length,web:packages.filter(p=>p.platform==='WEB').length,app:packages.filter(p=>p.platform==='MOBILE').length,uniqueProductNames:selectedJobs.length,uniqueSourcePhotos:sourceHashes.size,uniqueDecodedPhotos:photoHashes.size,missingAssets:0,results:packages};
  if (onlySlug) {writeJson(path.join(destination,onlySlug+'-validation.json'),report);console.log(JSON.stringify({qa:true,...report,results:undefined,output:destination}));return;}
  writeJson(path.join(output,'catalog.json'),{industryCount:47,totalThemeCount:94,themes:packages});
  writeJson(path.join(output,'validation-report.json'),report);
  writeJson(path.join(output,'design-inventory.json'),{generatedAt:new Date().toISOString(),acceptance:{uniqueDesignIds:new Set(packages.map(p=>p.designId)).size,uniqueDirections:new Set(packages.map(p=>p.designDirection)).size,webThemes:packages.filter(p=>p.platform==='WEB').length,mobileThemes:packages.filter(p=>p.platform==='MOBILE').length},themes:packages.map(({industryOrder,industry,platform,slug,designId,designDirection,designSystem})=>({industryOrder,industry,platform,slug,designId,designDirection,...designSystem}))});
  writeJson(path.join(assetRoot,'image-provenance.json'),manifestReport);
  const bundle=new AdmZip();bundle.addLocalFolder(path.join(output,'web'),'web');bundle.addLocalFolder(path.join(output,'app'),'app');bundle.addLocalFile(path.join(output,'catalog.json'));bundle.addLocalFile(path.join(output,'validation-report.json'));bundle.addLocalFile(path.join(output,'design-inventory.json'));bundle.writeZip(path.join(output,'all-47-industry-web-app-themes.zip'));
  console.log(JSON.stringify({...report,results:undefined,output}));
}
(async()=>{const [cmd,...args]=process.argv.slice(2);if(cmd==='prepare')prepare();else if(cmd==='save-image')await saveImage(...args);else if(cmd==='status')status();else if(cmd==='package')await packageAll(...args);else throw new Error('Usage: prepare | save-image ID SOURCE | status | package [QA_THEME_SLUG]');})().catch(e=>{console.error(e.message);process.exitCode=1;});
