/*
 * Deterministic design directions for the 47 industry theme pairs.
 *
 * These profiles are intentionally structural: they drive header, hero,
 * category, product, PLP, PDP, footer, responsive and section-order choices.
 * Colour is deliberately not part of the identity signature.
 */

const directions = [
  'Circuit editorial showroom', 'Footwear lookbook atelier', 'Textile swatch journal',
  'Factory control catalogue', 'Machine specification desk', 'Jewellery gallery salon',
  'Merchant marketplace', 'Workshop parts counter', 'Fast-moving shelf planner',
  'Clinical formulary', 'Diagnostics equipment lab', 'Beauty routine studio',
  'Seasonal field ledger', 'Construction project yard', 'Coatings sample wall',
  'Materials technical library', 'Polymer resin exchange', 'Packaging dieline studio',
  'Print room catalogue', 'Furniture room planner', 'Interior moodboard',
  'Kitchen demonstration counter', 'Electrical circuit index', 'Climate systems console',
  'Flow engineering matrix', 'Hardware pegboard', 'Safety compliance station',
  'Warehouse dispatch board', 'Office replenishment desk', 'Network rack configurator',
  'Home technology showroom', 'Mill maintenance logbook', 'Processing line planner',
  'Tooling blueprint archive', 'Solar project estimator', 'Power continuity dashboard',
  'Fluid application guide', 'Port stores manifest', 'Aviation MRO checklist',
  'Rail component timetable', 'Aerospace precision dossier', 'Scientific bench catalogue',
  'Veterinary care shelf', 'Playful merchandise bazaar', 'Performance training club',
  'Hospitality service book', 'Metals trading terminal',
];

const headerModes = ['search-led', 'centered-nav', 'split-utility', 'catalog-rail', 'minimal-mark', 'trade-desk', 'editorial', 'compact-stack'];
const heroModes = ['split-right', 'full-bleed', 'editorial-left', 'catalog-panel', 'stacked-center', 'asymmetric', 'spec-board', 'mosaic'];
const categoryModes = ['image-tiles', 'round-icons', 'horizontal-rail', 'masonry', 'numbered-list', 'sidebar-index', 'split-cards', 'compact-chips'];
const productModes = ['minimal', 'image-first', 'marketplace', 'horizontal', 'editorial', 'quick-add', 'bulk-table', 'spec-card'];
const footerModes = ['minimal', 'commerce-columns', 'brand-story', 'marketplace', 'trade-directory', 'newsletter-led', 'service-desk'];
const plpModes = ['sidebar-grid', 'top-filter-dense', 'editorial-three', 'visual-four', 'quick-order', 'specification-list', 'catalog-matrix'];
const pdpModes = ['gallery-left', 'gallery-right', 'story-scroll', 'sticky-buy', 'technical-tabs', 'compact-order', 'full-gallery'];
const mobileModes = ['grid', 'list', 'fast_order', 'story', 'catalog', 'quick_reorder', 'visual', 'spec_sheet'];
const orderPatterns = [
  ['hero-banner','category-grid','product-grid','image-with-text','feature-list','testimonial-carousel','newsletter'],
  ['promo-banner','hero-banner','product-grid','category-grid','feature-list','image-with-text','newsletter','testimonial-carousel'],
  ['hero-banner','image-with-text','category-grid','testimonial-carousel','product-grid','newsletter','feature-list'],
  ['category-grid','hero-banner','promo-banner','product-grid','feature-list','newsletter','image-with-text'],
  ['hero-banner','feature-list','product-grid','image-with-text','category-grid','newsletter','testimonial-carousel'],
  ['promo-banner','category-grid','hero-banner','product-grid','testimonial-carousel','image-with-text','newsletter'],
  ['hero-banner','product-grid','feature-list','category-grid','image-with-text','testimonial-carousel','newsletter'],
  ['category-grid','product-grid','hero-banner','image-with-text','newsletter','feature-list','testimonial-carousel'],
  ['hero-banner','testimonial-carousel','category-grid','image-with-text','product-grid','feature-list','newsletter'],
  ['promo-banner','hero-banner','image-with-text','product-grid','category-grid','newsletter','feature-list'],
  ['hero-banner','category-grid','feature-list','newsletter','product-grid','image-with-text','testimonial-carousel'],
  ['product-grid','hero-banner','category-grid','promo-banner','image-with-text','feature-list','newsletter'],
];

function createDesign(order, industry, mobile) {
  const i = order - 1;
  const typography = mobile
    ? ['Poppins, Arial, sans-serif', 'Poppins, Arial, sans-serif']
    : ['Roboto, Arial, sans-serif', 'Roboto, Arial, sans-serif'];
  // Co-prime offsets make the complete composition signature unique even when
  // an individual component mode is reused by another industry.
  const design = {
    id: `ds-${String(order).padStart(2, '0')}${mobile ? '-app' : '-web'}`,
    direction: `${directions[i]}${mobile ? ' / pocket workflow' : ''}`,
    industry,
    channel: mobile ? 'mobile' : 'web',
    headerIdentity: `header-${String(order).padStart(2, '0')}${mobile ? '-app' : '-web'}`,
    footerIdentity: `footer-${String(order).padStart(2, '0')}${mobile ? '-app' : '-web'}`,
    headerStructure: `shell-${(i % 6) + 1}-composition-${(Math.floor(i / 6) % 8) + 1}`,
    footerStructure: `shell-${(i % 7) + 1}-composition-${(Math.floor(i / 7) % 7) + 1}`,
    header: headerModes[(i * 3 + (mobile ? 2 : 0)) % headerModes.length],
    hero: heroModes[(i * 5 + (mobile ? 1 : 0)) % heroModes.length],
    category: categoryModes[(i * 7 + (mobile ? 3 : 0)) % categoryModes.length],
    product: productModes[(i * 5 + 2 + (mobile ? 1 : 0)) % productModes.length],
    footer: footerModes[(i * 3 + (mobile ? 1 : 0)) % footerModes.length],
    plp: plpModes[(i * 5 + 1) % plpModes.length],
    pdp: pdpModes[(i * 4 + 2) % pdpModes.length],
    mobileLayout: mobileModes[(i * 3 + 1) % mobileModes.length],
    sectionOrder: orderPatterns[i % orderPatterns.length],
    headingFont: typography[0],
    bodyFont: typography[1],
    radius: [0, 4, 8, 12, 18, 26][i % 6],
    gap: [12, 16, 20, 24, 30, 36][(i * 5) % 6],
    density: ['compact', 'balanced', 'airy'][i % 3],
    imageRatio: ['1 / 1', '4 / 5', '3 / 2', '16 / 10', '5 / 4'][i % 5],
    columns: mobile ? [1, 2, 2, 1][i % 4] : [3, 4, 5, 3, 4, 6][i % 6],
  };

  // Footwear follows the approved clean wholesale-lookbook reference: a
  // compact commerce header, warm split campaign, visual category rail and
  // retail-ready product cards. Copy and artwork remain StrideFoundry-owned.
  if (!mobile && industry === 'Footwear') {
    return {
      ...design,
      direction: 'Footwear wholesale lookbook',
      header: 'catalog-rail',
      hero: 'asymmetric',
      category: 'image-tiles',
      product: 'image-first',
      footer: 'commerce-columns',
      plp: 'sidebar-grid',
      pdp: 'gallery-left',
      sectionOrder: ['hero-banner', 'category-grid', 'product-grid', 'feature-list', 'image-with-text', 'testimonial-carousel', 'newsletter'],
      radius: 10,
      gap: 18,
      density: 'balanced',
      imageRatio: '1 / 1',
      columns: 4,
    };
  }

  // Agriculture storefronts are operational buying tools. The generated
  // permutation previously assigned a logo-only header and a stacked hero,
  // which hid search/navigation and pushed the product below the first fold.
  // Keep the unique design id, while giving this vertical an intentional
  // search-first, quick-order composition.
  if (!mobile && industry === 'Agriculture, Seeds & Agri-inputs') {
    return {
      ...design,
      direction: 'Seasonal field trade desk',
      header: 'trade-desk',
      hero: 'split-right',
      category: 'horizontal-rail',
      product: 'bulk-table',
      footer: 'trade-directory',
      plp: 'quick-order',
      pdp: 'technical-tabs',
      sectionOrder: ['hero-banner', 'category-grid', 'feature-list', 'product-grid', 'promo-banner', 'image-with-text', 'testimonial-carousel', 'newsletter'],
      headingFont: 'Roboto, Arial, sans-serif',
      bodyFont: 'Roboto, Arial, sans-serif',
      radius: 8,
      gap: 24,
      density: 'balanced',
      imageRatio: '3 / 2',
      columns: 3,
    };
  }

  // Industrial equipment needs to read like an operations tool, not another
  // soft editorial storefront. Keep the shared hero footprint used by the web
  // collection, while giving PlantWorks its own control-room composition.
  if (!mobile && industry === 'Industrial Equipment') {
    return {
      ...design,
      direction: 'Industrial procurement control room',
      header: 'plant-ops',
      hero: 'control-deck',
      category: 'operating-zones',
      product: 'spec-card',
      footer: 'service-desk',
      plp: 'specification-list',
      pdp: 'technical-tabs',
      sectionOrder: ['hero-banner', 'category-grid', 'promo-banner', 'product-grid', 'feature-list', 'image-with-text', 'testimonial-carousel', 'newsletter'],
      headingFont: 'Roboto, Arial, sans-serif',
      bodyFont: 'Roboto, Arial, sans-serif',
      radius: 4,
      gap: 18,
      density: 'compact',
      imageRatio: '4 / 3',
      columns: 4,
    };
  }

  return design;
}

function applyDesign(template, page, design) {
  const sections = template.sections.map((section) => {
    const next = { ...section, settings: { ...(section.settings || {}) } };
    const type = String(next.type || '').toLowerCase();
    if (type === 'header') next.variant = design.header;
    else if (type === 'hero-banner') next.variant = `hero-${design.hero}`;
    else if (type === 'category-grid') next.variant = `categories-${design.category}`;
    else if (type === 'product-grid' || type === 'related-products') next.variant = `products-${design.product}`;
    else if (type === 'footer') next.variant = `footer-${design.footer}`;
    else if (type === 'filter-sidebar') next.variant = `filters-${design.plp}`;
    else if (type === 'product-gallery') next.variant = `gallery-${design.pdp}`;
    else if (type === 'product-info') next.variant = `info-${design.pdp}`;
    else next.variant = `${type}-${design.density}`;
    next.settings.designId = design.id;
    next.settings.layoutMode = page === 'category' ? design.plp : page === 'product' ? design.pdp : design.direction;
    next.settings.density = design.density;
    if (type === 'product-grid' || type === 'related-products') {
      next.settings.cardStyle = design.product;
      next.settings.columns = design.columns;
    }
    if (type === 'category-grid') next.settings.categoryStyle = design.category;
    return next;
  });

  if (page !== 'home') return { ...template, design: design.id, sections };
  const rank = new Map(design.sectionOrder.map((type, index) => [type, index + 1]));
  sections.sort((a, b) => {
    if (a.type === 'header') return -1;
    if (b.type === 'header') return 1;
    if (a.type === 'footer') return 1;
    if (b.type === 'footer') return -1;
    return (rank.get(a.type) ?? 99) - (rank.get(b.type) ?? 99);
  });
  return { ...template, design: design.id, sections };
}

/**
 * Forty-eight possible structural pairs (6 shells x 8 compositions) give all
 * 47 industries a genuinely distinct header. Footers use a separate 7 x 7
 * matrix. The channel suffix keeps Web and App identities independent too.
 */
function premiumHeaderFooterCss(design) {
  const scope = `body[data-theme-layout="${design.id}"]`;
  const match = design.id.match(/^ds-(\d+)/u);
  const order = Number(match?.[1] || 1);
  const index = Math.max(0, order - 1);
  const headerShell = index % 6;
  const headerComposition = Math.floor(index / 6) % 8;
  const footerShell = index % 7;
  const footerComposition = Math.floor(index / 7) % 7;
  const identityRadius = 12 + (index % 6) * 4;

  const headerShellCss = [
    `${scope} .storefront-header{padding:12px 18px 0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important}${scope} .storefront-header>div:first-child{max-width:var(--theme-max);margin-inline:auto;border:1px solid color-mix(in srgb,var(--theme-primary) 18%,transparent);border-radius:${identityRadius + 10}px;background:color-mix(in srgb,#fff 90%,var(--theme-surface));box-shadow:0 18px 55px rgba(15,23,42,.10);backdrop-filter:blur(20px)}${scope} .storefront-header>div:last-child{max-width:calc(var(--theme-max) - 54px);margin:8px auto 0;border:1px solid var(--premium-line)!important;border-radius:999px;background:#fff!important;box-shadow:0 12px 32px rgba(15,23,42,.07);overflow:hidden}`,
    `${scope} .storefront-header{border-bottom:4px solid var(--theme-primary)!important;background:var(--premium-deep)!important;box-shadow:0 16px 46px rgba(2,6,23,.22)!important}${scope} .storefront-header-main>a:first-child span{color:#fff!important}${scope} .storefront-header-main svg{stroke:#fff}${scope} .storefront-header>div:last-child{border-color:rgba(255,255,255,.12)!important;background:color-mix(in srgb,var(--premium-deep) 92%,var(--theme-primary))!important}${scope} .storefront-header-nav a{color:rgba(255,255,255,.78)!important}${scope} .storefront-header-nav a:hover{color:#fff!important}`,
    `${scope} .storefront-header{border:0!important;background:linear-gradient(90deg,var(--theme-primary) 0 18%,#fff 18% 100%)!important;box-shadow:0 15px 42px rgba(15,23,42,.10)!important}${scope} .storefront-header:before{display:block;height:5px;background:linear-gradient(90deg,var(--theme-secondary),var(--theme-primary),var(--theme-secondary));content:""}${scope} .storefront-header-main>a:first-child{padding:10px 16px;border-radius:${identityRadius}px;background:#fff;box-shadow:0 10px 30px color-mix(in srgb,var(--theme-primary) 25%,transparent)}${scope} .storefront-header>div:last-child{border-top:1px solid color-mix(in srgb,var(--theme-primary) 16%,transparent)!important;background:color-mix(in srgb,var(--theme-surface) 52%,#fff)!important}`,
    `${scope} .storefront-header{border:0!important;background:#fff!important;box-shadow:none!important}${scope} .storefront-header>div:first-child{border-inline:1px solid var(--premium-line);max-width:var(--theme-max);margin-inline:auto}${scope} .storefront-header-main>a:first-child img{border-radius:0!important;box-shadow:none!important}${scope} .storefront-header>div:last-child{max-width:var(--theme-max);margin-inline:auto;border-block:1px solid var(--premium-line)!important;background:#fff!important}${scope} .storefront-header-nav a{font-family:${design.headingFont};letter-spacing:.12em!important}`,
    `${scope} .storefront-header{padding:8px 14px!important;border:0!important;background:color-mix(in srgb,var(--theme-surface) 70%,#fff)!important;box-shadow:0 14px 42px rgba(15,23,42,.08)!important}${scope} .storefront-header>div:first-child{max-width:var(--theme-max);margin-inline:auto;border:2px solid var(--theme-text);background:#fff}${scope} .storefront-header>div:last-child{max-width:var(--theme-max);margin-inline:auto;border:2px solid var(--theme-text)!important;border-top:0!important;background:#fff!important}${scope} .storefront-header-nav a:after{position:absolute;right:-12px;width:3px;height:3px;border-radius:50%;background:var(--theme-primary);content:""}${scope} .storefront-header-nav a:last-child:after{display:none}`,
    `${scope} .storefront-header{border:0!important;background:linear-gradient(135deg,color-mix(in srgb,var(--theme-primary) 11%,#fff),#fff 52%,color-mix(in srgb,var(--theme-secondary) 13%,#fff))!important;box-shadow:0 12px 38px rgba(15,23,42,.08)!important}${scope} .storefront-header-main{border-bottom:1px dashed color-mix(in srgb,var(--theme-primary) 30%,transparent)}${scope} .storefront-header>div:last-child{background:transparent!important}${scope} .storefront-header-nav a{border-radius:999px;padding-inline:14px!important}${scope} .storefront-header-nav a:hover{background:color-mix(in srgb,var(--theme-primary) 9%,#fff)}`,
  ][headerShell];

  const headerCompositionCss = [
    `${scope} .storefront-header-main{display:grid!important;grid-template-columns:minmax(320px,.95fr) minmax(280px,2.05fr) auto;align-items:center}${scope} .storefront-header-main>a:first-child{max-width:330px!important}${scope} .storefront-header-main>a:first-child>span:last-child{max-width:270px!important}${scope} .storefront-header-nav{justify-content:center!important}`,
    `${scope} .storefront-header-main{display:flex!important;flex-wrap:wrap;justify-content:center!important}${scope} .storefront-header-main>a:first-child{order:1;margin-inline:auto}${scope} .storefront-header-main>div:last-child{order:2}${scope} .storefront-header-search{order:3!important;flex-basis:100%!important}${scope} .storefront-header-search form{max-width:920px;margin-inline:auto}${scope} .storefront-header-nav{justify-content:center!important}`,
    `${scope} .storefront-header-main{display:grid!important;grid-template-columns:minmax(420px,1.7fr) minmax(210px,.72fr) auto}${scope} .storefront-header-search{order:1}${scope} .storefront-header-main>a:first-child{order:2}${scope} .storefront-header-main>div:last-child{order:3}${scope} .storefront-header-nav{justify-content:flex-start!important}`,
    `${scope} .storefront-header-main{display:grid!important;grid-template-columns:minmax(280px,1fr) auto minmax(280px,1fr)}${scope} .storefront-header-search{order:1}${scope} .storefront-header-main>a:first-child{order:2;justify-self:center;text-align:center}${scope} .storefront-header-main>div:last-child{order:3;justify-self:end}${scope} .storefront-header-nav{justify-content:space-evenly!important}`,
    `${scope} .storefront-header-main{display:grid!important;grid-template-columns:minmax(260px,.72fr) minmax(520px,2fr) auto}${scope} .storefront-header-main>a:first-child{align-self:stretch;border-right:1px solid var(--premium-line);padding-right:24px}${scope} .storefront-header-nav{justify-content:flex-end!important}`,
    `${scope} .storefront-header-main{display:flex!important;flex-wrap:wrap}${scope} .storefront-header-main>a:first-child{order:1}${scope} .storefront-header-main>div:last-child{order:2;margin-left:auto}${scope} .storefront-header-search{order:3!important;flex:1 0 100%!important}${scope} .storefront-header-search form{max-width:none}${scope} .storefront-header-nav{justify-content:flex-start!important}`,
    `${scope} .storefront-header-main{display:grid!important;grid-template-columns:250px minmax(0,1fr) auto}${scope} .storefront-header-search form{border-radius:8px!important}${scope} .storefront-header-nav{justify-content:flex-start!important;padding-left:max(32px,calc((100vw - var(--theme-max))/2 + 18px))!important}`,
    `${scope} .storefront-header-main{display:grid!important;grid-template-columns:minmax(250px,1fr) minmax(320px,.75fr) minmax(250px,1fr)}${scope} .storefront-header-main>a:first-child{justify-self:start}${scope} .storefront-header-search{justify-self:center;width:100%;max-width:520px}${scope} .storefront-header-main>div:last-child{justify-self:end}${scope} .storefront-header-nav{justify-content:center!important;letter-spacing:.08em}`,
  ][headerComposition];

  const footerShellCss = [
    `${scope} .storefront-footer{background:var(--premium-deep)!important;border-top:6px solid var(--theme-primary)!important}`,
    `${scope} .storefront-footer{background:linear-gradient(135deg,var(--premium-deep),color-mix(in srgb,var(--theme-primary) 48%,#07111f))!important;border:0!important}${scope} .storefront-footer:before{display:block;height:1px;background:linear-gradient(90deg,transparent,var(--theme-secondary),transparent);content:""}`,
    `${scope} .storefront-footer{background:color-mix(in srgb,var(--theme-surface) 72%,#fff)!important;color:var(--theme-text)!important;border-top:1px solid var(--premium-line)!important}${scope} .storefront-footer p,${scope} .storefront-footer a,${scope} .storefront-footer span{color:color-mix(in srgb,var(--theme-text) 74%,transparent)!important}${scope} .storefront-footer h2{color:var(--theme-text)!important}${scope} .storefront-footer-bottom{border-color:var(--premium-line)!important}`,
    `${scope} .storefront-footer{position:relative;background:#050b16!important;border:0!important;overflow:hidden}${scope} .storefront-footer:before{position:absolute;inset:-180px -80px auto auto;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--theme-primary) 42%,transparent),transparent 68%);content:""}`,
    `${scope} .storefront-footer{background:color-mix(in srgb,var(--premium-deep) 88%,var(--theme-primary))!important;border-top:12px double color-mix(in srgb,var(--theme-secondary) 70%,#fff)!important}`,
    `${scope} .storefront-footer{background:linear-gradient(90deg,color-mix(in srgb,var(--theme-primary) 72%,#07111f) 0 34%,var(--premium-deep) 34% 100%)!important;border:0!important}`,
    `${scope} .storefront-footer{background:#020617!important;border:1px solid color-mix(in srgb,var(--theme-primary) 45%,transparent)!important;box-shadow:inset 0 18px 80px color-mix(in srgb,var(--theme-primary) 12%,transparent)}`,
  ][footerShell];

  const footerCompositionCss = [
    `${scope} .storefront-footer-inner{max-width:var(--theme-max)!important}${scope} .storefront-footer-directory{gap:clamp(26px,4vw,64px)!important}`,
    `${scope} .storefront-footer-brand{text-align:center}${scope} .storefront-footer-brand>a{justify-content:center}${scope} .storefront-footer-brand>p{margin-inline:auto}${scope} .storefront-footer-directory{padding-top:28px;border-top:1px solid rgba(255,255,255,.14)}`,
    `${scope} .storefront-footer-brand{padding:30px;border:1px solid rgba(255,255,255,.16);border-radius:${identityRadius}px;background:rgba(255,255,255,.055);backdrop-filter:blur(12px)}${scope} .storefront-footer-directory>div{border-left:1px solid rgba(255,255,255,.12);padding-left:20px}`,
    `${scope} .storefront-footer-directory>div{padding:20px;border:1px solid rgba(255,255,255,.12);border-radius:${identityRadius}px;background:rgba(255,255,255,.04)}${scope} .storefront-footer-directory h2{display:inline-flex;border-bottom:2px solid var(--theme-primary);padding-bottom:8px}`,
    `${scope} .storefront-footer-inner{max-width:min(1480px,calc(100% - 32px))!important}${scope} .storefront-footer-directory>div:nth-child(even){padding-top:28px}${scope} .storefront-footer-bottom{background:rgba(255,255,255,.04);padding:22px!important}`,
    `${scope} .storefront-footer-brand{position:relative;padding-left:24px;border-left:5px solid var(--theme-primary)}${scope} .storefront-footer-directory h2{letter-spacing:.24em!important}${scope} .storefront-footer-directory li+li{border-top:1px dotted rgba(255,255,255,.12)}`,
    `${scope} .storefront-footer-bottom{margin-inline:calc(50% - 50vw);padding-inline:max(24px,calc((100vw - var(--theme-max))/2))!important;background:color-mix(in srgb,var(--theme-primary) 18%,transparent)}${scope} .storefront-footer-directory{grid-template-columns:repeat(2,minmax(0,1fr))!important}`,
  ][footerComposition];

  return `
/* ${design.headerIdentity}: ${design.headerStructure} */
${headerShellCss}
${headerCompositionCss}
/* ${design.footerIdentity}: ${design.footerStructure} */
${footerShellCss}
${footerCompositionCss}
@media(max-width:1100px){${scope} .storefront-header{padding:0!important;border-radius:0!important}${scope} .storefront-header>div:first-child{max-width:none;margin:0;border-width:0 0 1px;border-radius:0}${scope} .storefront-header-main{display:flex!important;min-height:76px!important;flex-wrap:nowrap!important;gap:12px!important}${scope} .storefront-header-main>a:first-child{order:1!important;min-width:0!important;max-width:230px!important;margin:0!important;padding:0!important;border:0!important}${scope} .storefront-header-search{order:2!important;min-width:0!important;flex:1 1 auto!important}${scope} .storefront-header-main>div:last-child{order:3!important;margin-left:auto!important}${scope} .storefront-footer{background:var(--premium-deep)!important;color:#fff!important}${scope} .storefront-footer p,${scope} .storefront-footer a,${scope} .storefront-footer span{color:#cbd5e1!important}${scope} .storefront-footer h2{color:#fff!important}}
@media(max-width:767px){${scope} .storefront-header-main{min-height:70px!important}${scope} .storefront-header-main>a:first-child{max-width:230px!important}${scope} .storefront-header-main>a:first-child>span:last-child>span:first-child{font-size:18px!important}${scope} .storefront-header>div:last-child{margin:0;border:0!important;border-radius:0}${scope} .storefront-footer-directory{grid-template-columns:repeat(2,minmax(0,1fr))!important}${scope} .storefront-footer-brand{padding:0 0 0 18px!important;border-width:0 0 0 4px!important;border-radius:0!important;background:transparent!important;text-align:left!important}${scope} .storefront-footer-brand>a{justify-content:flex-start!important}${scope} .storefront-footer-brand>p{margin-inline:0!important}}
`;
}

/**
 * Shared premium-commerce finish for the generated industry collection.
 *
 * The structural modes above still make every vertical distinct; this layer
 * raises the common production quality (type rhythm, image scale, depth,
 * whitespace, interaction and responsive behaviour) without cloning the
 * bespoke Aurelia/Jewelry art direction.
 */
function premiumCatalogCss(design) {
  const scope = `body[data-theme-layout="${design.id}"]`;
  return `
/* premium-catalog-v1: shared PLP structure across industry storefronts */
${scope} .storefront-category-page{padding-bottom:110px!important;background:color-mix(in srgb,var(--theme-surface) 34%,#f7faf9)!important}
${scope} .storefront-category-page>div{max-width:1404px!important;padding-top:24px!important}
${scope} .category-breadcrumb{min-height:34px;color:color-mix(in srgb,var(--theme-text) 52%,transparent)!important;font-family:monospace;font-size:10px!important;letter-spacing:.1em;text-transform:uppercase}
${scope} .category-browse-intro{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 210px;align-items:end;min-height:260px;margin-top:18px;padding:46px 52px;overflow:hidden;background:var(--premium-deep);color:#fff;isolation:isolate}
${scope} .category-browse-intro:before{position:absolute;right:-6%;bottom:-72px;z-index:-1;width:44%;height:118px;background:linear-gradient(90deg,var(--theme-primary),var(--theme-secondary));clip-path:polygon(10% 0,100% 0,88% 100%,0 100%);content:"";transform:rotate(-5deg)}
${scope} .category-browse-intro:after{position:absolute;right:18%;top:-85%;z-index:-2;width:410px;height:410px;border:1px solid color-mix(in srgb,var(--theme-primary) 34%,transparent);border-radius:50%;content:""}
${scope} .category-browse-eyebrow{margin-bottom:16px;color:color-mix(in srgb,var(--theme-primary) 52%,#fff);font-family:monospace;font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase}
${scope} .category-browse-intro h1{max-width:16ch;margin:0;color:#fff;font-size:clamp(2.6rem,3.6vw,4.15rem);font-weight:900;line-height:.92;letter-spacing:-.055em;text-transform:uppercase}
${scope} .category-browse-description{max-width:66ch;margin-top:20px;color:rgba(255,255,255,.64);font-size:14px;line-height:1.7}
${scope} .category-browse-stat{display:flex;min-height:150px;flex-direction:column;justify-content:flex-end;padding-left:30px;border-left:1px solid rgba(255,255,255,.18)}
${scope} .category-browse-stat span,${scope} .category-browse-stat small{color:rgba(255,255,255,.52);font-family:monospace;font-size:9px;letter-spacing:.16em;text-transform:uppercase}
${scope} .category-browse-stat strong{margin-block:8px;color:#fff;font-size:68px;font-weight:900;line-height:.8;letter-spacing:-.07em}
${scope} .storefront-category-page>div>.category-catalog-layout{grid-template-columns:300px minmax(0,1fr)!important;align-items:start;gap:24px!important;margin-top:24px!important}
${scope} .category-filter-panel{position:sticky!important;top:154px!important;padding:24px!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:0!important;background:var(--premium-deep)!important;color:#fff!important;box-shadow:0 24px 60px rgba(7,16,22,.18)!important}
${scope} .category-filter-disclosure>summary{display:flex;cursor:pointer;list-style:none;align-items:center;justify-content:space-between;gap:14px}
${scope} .category-filter-disclosure>summary::-webkit-details-marker{display:none}
${scope} .category-filter-heading{display:flex;flex:1;align-items:center;gap:12px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,.12)}
${scope} .category-filter-heading>span{display:flex;width:30px;height:30px;align-items:center;justify-content:center;background:var(--theme-primary);color:var(--theme-primary-contrast);font-family:monospace;font-size:9px;font-weight:900}
${scope} .category-filter-heading h2{color:#fff!important;font-size:15px!important}
${scope} .category-filter-toggle{display:none;width:30px;height:30px;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.18);color:color-mix(in srgb,var(--theme-primary) 52%,#fff);font-size:20px;line-height:1;transition:transform .25s ease}
${scope} .category-filter-disclosure[open] .category-filter-toggle{transform:rotate(45deg)}
${scope} .category-filter-form{margin-top:20px!important}
${scope} .category-filter-form>div,${scope} .category-filter-form>fieldset{border-color:rgba(255,255,255,.11)!important}
${scope} .category-filter-form label,${scope} .category-filter-form h3,${scope} .category-filter-form legend{color:rgba(255,255,255,.64)!important;font-size:10px!important;font-weight:800!important;letter-spacing:.1em!important}
${scope} .category-filter-form input[type="search"],${scope} .category-filter-form input[type="number"],${scope} .category-filter-form input[list]{height:42px;border:1px solid rgba(255,255,255,.15)!important;border-radius:0!important;background:#071016!important;color:#fff!important;font-size:12px!important;letter-spacing:0!important}
${scope} .category-filter-links a{border-radius:0!important;padding:9px 10px!important;color:rgba(255,255,255,.64)!important;font-size:12px!important;letter-spacing:0!important}
${scope} .category-filter-links a:hover{background:rgba(255,255,255,.06)!important;color:#fff!important}
${scope} .category-filter-links a.is-active{padding-left:14px!important;background:color-mix(in srgb,var(--theme-primary) 18%,transparent)!important;color:color-mix(in srgb,var(--theme-primary) 52%,#fff)!important;box-shadow:inset 2px 0 0 var(--theme-primary)}
${scope} .category-filter-form button[type="submit"]{min-height:44px;border-radius:0!important;background:var(--theme-primary)!important;color:var(--theme-primary-contrast)!important;font-size:10px!important;font-weight:900!important;letter-spacing:.12em;text-transform:uppercase}
${scope} .category-results-toolbar{min-height:88px;padding:18px 22px!important;border:1px solid var(--premium-line)!important;border-left:4px solid var(--theme-primary)!important;border-radius:0!important;background:#fff!important;box-shadow:0 15px 38px rgba(7,16,22,.07)!important}
${scope} .category-results-toolbar h1{color:var(--theme-text)!important;font-size:24px!important;font-weight:900!important;letter-spacing:-.035em}
${scope} .category-results-toolbar p{margin-top:4px;color:var(--theme-muted)!important;font-family:monospace;font-size:10px!important;letter-spacing:.08em;text-transform:uppercase}
${scope} .category-results-toolbar select{min-width:174px;height:40px;border-color:var(--premium-line)!important;border-radius:0!important;background:var(--premium-paper)!important;color:var(--theme-text)!important;font-size:12px!important}
${scope} .category-product-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:18px!important;margin-top:20px!important}
${scope} .storefront-category-page .product-card{border:1px solid var(--premium-line)!important;border-radius:0!important;background:#fff!important;box-shadow:none!important}
${scope} .storefront-category-page .product-card-body{background:#fff!important}
${scope} .storefront-category-page .product-card-body h3{color:var(--theme-text)!important}
${scope} .storefront-category-page .product-card-body p{color:var(--theme-primary)!important}
@media(min-width:901px){${scope} .category-filter-disclosure:not([open])>.category-filter-form{display:block!important}}
@media(max-width:900px){${scope} .category-browse-intro{grid-template-columns:1fr 150px;padding:38px 30px}${scope} .storefront-category-page>div>.category-catalog-layout{grid-template-columns:1fr!important}${scope} .category-filter-panel{position:static!important}${scope} .category-filter-toggle{display:flex}${scope} .category-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:600px){${scope} .storefront-category-page>div{padding-inline:14px!important}${scope} .category-browse-intro{grid-template-columns:1fr;min-height:0;padding:34px 24px}${scope} .category-browse-intro h1{font-size:2.35rem}${scope} .category-browse-stat{min-height:auto;margin-top:30px;padding:20px 0 0;border-top:1px solid rgba(255,255,255,.18);border-left:0}${scope} .category-browse-stat strong{font-size:48px}${scope} .category-filter-panel{padding:18px 20px!important}${scope} .category-filter-heading{padding-bottom:0;border-bottom:0}${scope} .category-filter-disclosure[open] .category-filter-form{padding-top:18px;border-top:1px solid rgba(255,255,255,.12)}${scope} .category-results-toolbar form{width:100%;justify-content:space-between}${scope} .category-product-grid{gap:10px!important}${scope} .storefront-category-page .product-card-body{padding:13px!important}}
`;
}

function circuitLaneIndustrialCss(design) {
  if (design.id !== 'ds-01-web') return '';
  const scope = 'body[data-theme-layout="ds-01-web"]';
  return `
/* circuitlane-industrial-v1: original industrial-commerce direction */
${scope}{--circuit-ink:#071016;--circuit-panel:#0d171f;--circuit-soft:#e9f0ef;--circuit-accent:var(--theme-primary);--circuit-accent-2:var(--theme-secondary);--circuit-line:rgba(255,255,255,.14);background:#f4f7f6!important;color:#071016!important;font-family:Arial,Helvetica,sans-serif!important}
${scope} h1,${scope} h2,${scope} h3{font-family:Arial,Helvetica,sans-serif!important}
${scope} .storefront-header{position:sticky!important;top:0!important;z-index:100!important;padding:0!important;border:0!important;border-bottom:1px solid rgba(130,255,233,.13)!important;background:linear-gradient(135deg,rgba(4,12,17,.965),rgba(9,25,31,.95))!important;box-shadow:0 14px 44px rgba(0,0,0,.16)!important;backdrop-filter:blur(22px) saturate(140%)!important;transition:background .3s ease,box-shadow .3s ease}
${scope} .storefront-header:before{position:absolute;inset:0 0 auto;height:1px;background:linear-gradient(90deg,transparent,rgba(104,240,214,.48),transparent);content:"";pointer-events:none}
${scope} .storefront-header.is-scrolled{background:linear-gradient(135deg,rgba(3,10,15,.99),rgba(7,21,27,.985))!important;box-shadow:0 20px 58px rgba(0,0,0,.3)!important}
${scope} .storefront-header>div:first-child{max-width:1480px!important;margin-inline:auto!important;padding:10px 20px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
${scope} .storefront-header-main{display:grid!important;grid-template-columns:minmax(270px,.72fr) minmax(360px,1.15fr) auto!important;min-height:74px!important;padding:0!important;border:0!important;gap:clamp(18px,2.4vw,38px)!important}
${scope} .storefront-header-main>a:first-child{max-width:320px!important;padding:0!important;background:transparent!important;box-shadow:none!important}
${scope} .storefront-header-main>a:first-child img{height:48px!important;width:48px!important;border:1px solid rgba(126,255,232,.28);border-radius:15px!important;background:linear-gradient(145deg,#fff,#dff8f2);box-shadow:0 10px 28px rgba(0,0,0,.24),0 0 0 5px rgba(28,224,192,.055)!important;transition:transform .3s ease,box-shadow .3s ease}
${scope} .storefront-header-main>a:first-child:hover img{transform:translateY(-2px) rotate(-2deg);box-shadow:0 14px 32px rgba(0,0,0,.28),0 0 0 6px rgba(28,224,192,.09)!important}
${scope} .storefront-header-main>a:first-child>span:last-child span:first-child{color:#fff!important;font-size:21px!important;font-weight:850!important;letter-spacing:-.035em}
${scope} .storefront-header-main>a:first-child>span:last-child span:last-child{margin-top:6px!important;color:rgba(166,232,221,.6)!important;font-family:monospace;font-size:9px!important;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
${scope} .storefront-header-search{justify-self:stretch;width:100%!important;max-width:560px}
${scope} .storefront-header-search form{border:0!important;background:transparent!important;box-shadow:none!important}
${scope} .storefront-header-search form>div{height:48px!important;border:1px solid rgba(154,231,218,.18)!important;border-radius:16px!important;background:rgba(255,255,255,.065)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.045),0 10px 30px rgba(0,0,0,.12)!important;transition:border-color .25s ease,background .25s ease,box-shadow .25s ease}
${scope} .storefront-header-search form>div:focus-within{border-color:rgba(28,224,192,.62)!important;background:rgba(255,255,255,.095)!important;box-shadow:0 0 0 4px rgba(28,224,192,.08),0 14px 34px rgba(0,0,0,.18)!important}
${scope} .storefront-header-search input{color:#fff!important}
${scope} .storefront-header-search input::placeholder{color:rgba(255,255,255,.45)!important}
${scope} .storefront-header-search label{display:none!important}
${scope} .storefront-header-search button{width:40px!important;height:40px!important;margin:3px 4px 3px 0;border:1px solid rgba(255,255,255,.18);border-radius:12px!important;background:linear-gradient(145deg,var(--circuit-accent),var(--circuit-accent-2))!important;color:var(--theme-primary-contrast)!important;box-shadow:0 7px 18px color-mix(in srgb,var(--circuit-accent) 20%,transparent);transition:transform .2s ease,box-shadow .2s ease}
${scope} .storefront-header-search button:hover{transform:scale(1.04);box-shadow:0 9px 24px rgba(28,224,192,.3)}
${scope} .storefront-header-search button svg{height:20px!important;width:20px!important}
${scope} .storefront-header-main>div:last-child{gap:8px!important}
${scope} .storefront-header-main>div:last-child>a:not(.industrial-header-cta),${scope} .storefront-header-main>div:last-child>div>button{min-height:46px;padding:0 11px!important;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.045);color:#fff!important;transition:border-color .25s ease,background .25s ease,transform .25s ease}
${scope} .storefront-header-main>div:last-child>a:not(.industrial-header-cta):hover,${scope} .storefront-header-main>div:last-child>div>button:hover{border-color:rgba(28,224,192,.35);background:rgba(28,224,192,.08);color:#fff!important;transform:translateY(-1px)}
${scope} .storefront-header-main>div:last-child svg{stroke:currentColor!important}
${scope} .storefront-header-main>div:last-child>a span,${scope} .storefront-header-main>div:last-child>div>button span{color:inherit!important}
${scope} .storefront-header-main>div:last-child>a .text-slate-500,${scope} .storefront-header-main>div:last-child>div>button .text-slate-500{color:rgba(189,215,211,.58)!important}
${scope} .storefront-search-form-mobile>div{height:46px!important;border:1px solid rgba(154,231,218,.18)!important;border-radius:14px!important;background:rgba(255,255,255,.07)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)!important}
${scope} .storefront-search-form-mobile input{color:#fff!important}
${scope} .storefront-search-form-mobile input::placeholder{color:rgba(255,255,255,.42)!important}
${scope} .storefront-search-form-mobile button{width:40px!important;height:38px!important;margin:3px 4px 3px 0;border-radius:11px!important;background:var(--circuit-accent)!important;color:#05100e!important}
${scope} .industrial-mobile-cart>div>button{display:flex!important;width:44px;height:44px;align-items:center;justify-content:center;padding:0!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:13px!important;background:rgba(255,255,255,.055)!important;color:#fff!important}
${scope} .industrial-mobile-cart>div>button svg{stroke:currentColor!important}
${scope} .industrial-header-cta{position:relative;align-items:center;gap:16px;min-height:46px;padding:0 18px;border:1px solid color-mix(in srgb,var(--circuit-accent) 58%,#fff);border-radius:14px;background:linear-gradient(135deg,var(--circuit-accent),var(--circuit-accent-2));color:var(--theme-primary-contrast)!important;box-shadow:0 10px 24px color-mix(in srgb,var(--circuit-accent) 15%,transparent);font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;overflow:hidden;transition:transform .25s ease,box-shadow .25s ease,filter .25s ease}
${scope} .industrial-header-cta:after{position:absolute;inset:0;background:linear-gradient(110deg,transparent 25%,rgba(255,255,255,.35) 48%,transparent 70%);content:"";transform:translateX(-130%);transition:transform .55s ease}
${scope} .industrial-header-cta:hover{color:#06110f!important;filter:saturate(115%);transform:translateY(-2px);box-shadow:0 14px 32px rgba(28,224,192,.26)}
${scope} .industrial-header-cta:hover:after{transform:translateX(130%)}
${scope} .industrial-header-cta span{position:relative;z-index:1}
${scope} .industrial-commerce-trigger{height:46px;gap:10px;padding:0 13px 0 8px;border:1px solid rgba(151,231,217,.17);border-radius:14px;background:rgba(255,255,255,.055);color:#fff;font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;transition:border-color .25s ease,background .25s ease,transform .25s ease}
${scope} .industrial-commerce-trigger:hover,${scope} .industrial-commerce-menu[open]>.industrial-commerce-trigger{border-color:rgba(28,224,192,.42);background:rgba(28,224,192,.09);transform:translateY(-1px)}
${scope} .industrial-commerce-trigger-icon{display:flex;width:30px;height:30px;align-items:center;justify-content:center;border-radius:9px;background:rgba(28,224,192,.14);color:var(--circuit-accent)!important}
${scope} .industrial-commerce-trigger-icon svg{width:17px!important;height:17px!important;stroke:currentColor!important}
${scope} .industrial-commerce-trigger>svg{width:12px!important;height:12px!important;color:rgba(255,255,255,.52);transition:transform .25s ease}
${scope} .industrial-commerce-menu[open]>.industrial-commerce-trigger>svg{transform:rotate(180deg)}
${scope} .industrial-commerce-panel{width:330px;margin-top:12px;padding:10px;border:1px solid rgba(141,231,215,.18);border-radius:20px;background:linear-gradient(145deg,rgba(7,18,24,.99),rgba(11,30,36,.99));box-shadow:0 28px 70px rgba(0,0,0,.38);color:#fff;overflow:visible}
${scope} .industrial-commerce-panel:before{position:absolute;right:26px;top:-6px;width:12px;height:12px;border-left:1px solid rgba(141,231,215,.18);border-top:1px solid rgba(141,231,215,.18);background:#091a20;content:"";transform:rotate(45deg)}
${scope} .industrial-commerce-panel-heading{display:flex;flex-direction:column;padding:13px 14px 14px}
${scope} .industrial-commerce-panel-heading>span{color:var(--circuit-accent)!important;font-family:monospace;font-size:10px;font-weight:900;letter-spacing:.17em;text-transform:uppercase}
${scope} .industrial-commerce-panel-heading>small{margin-top:5px;color:rgba(218,237,234,.48);font-size:11px}
${scope} .industrial-commerce-panel-links{overflow:visible;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.035)}
${scope} .industrial-commerce-panel-links>a,${scope} .industrial-commerce-panel-links>div>button:first-child{position:relative!important;display:flex!important;width:100%;min-height:64px!important;align-items:center;gap:12px!important;margin:0!important;padding:10px 14px!important;border:0!important;border-bottom:1px solid rgba(255,255,255,.075)!important;border-radius:0!important;background:transparent!important;color:#fff!important;text-align:left;transform:none!important;transition:background .2s ease,padding .2s ease!important}
${scope} .industrial-commerce-panel-links>a:first-child{border-radius:13px 13px 0 0!important}
${scope} .industrial-commerce-panel-links>div:last-child>button:first-child{border-bottom:0!important;border-radius:0 0 13px 13px!important}
${scope} .industrial-commerce-panel-links>a:last-child{border-bottom:0!important;border-radius:0 0 13px 13px!important}
${scope} .industrial-commerce-panel-links>a:hover,${scope} .industrial-commerce-panel-links>div>button:first-child:hover{padding-left:18px!important;background:rgba(28,224,192,.075)!important}
${scope} .industrial-commerce-panel-links>a>span:first-child,${scope} .industrial-commerce-panel-links>div>button:first-child>span:first-child{display:flex;width:34px!important;height:34px!important;flex:none;align-items:center;justify-content:center;border-radius:10px;background:rgba(28,224,192,.1);color:var(--circuit-accent)!important}
${scope} .industrial-commerce-panel-links>a svg,${scope} .industrial-commerce-panel-links>div>button:first-child svg{width:20px!important;height:20px!important;stroke:currentColor!important}
${scope} .industrial-commerce-panel-links>a>span:last-child{display:inline!important;color:#fff!important;font-size:12px!important;font-weight:800!important}
${scope} .industrial-commerce-panel-links>a:last-child>span:last-child{display:flex!important}
${scope} .industrial-commerce-panel-links>div>button:first-child>span:last-child{display:flex!important;color:#fff!important}
${scope} .industrial-commerce-account>span:nth-child(2){display:flex!important;flex:1}
${scope} .industrial-commerce-account strong{color:#fff;font-size:12px;font-weight:800}
${scope} .industrial-commerce-account small,${scope} .industrial-commerce-panel-links>div>button:first-child>span:last-child>span:last-child{margin-top:4px!important;color:rgba(218,237,234,.48)!important;font-size:9px!important;font-weight:600!important}
${scope} .industrial-commerce-account>span:last-child{margin-left:auto;color:var(--circuit-accent)!important;font-size:13px!important}
${scope} .industrial-commerce-panel-links>a:not(.industrial-commerce-account):after,${scope} .industrial-commerce-panel-links>div>button:first-child:after{margin-left:auto;color:var(--circuit-accent);font-size:13px;content:"↗"}
${scope} .storefront-header>div:last-child{max-width:none!important;margin:0!important;border:0!important;border-top:1px solid rgba(125,216,201,.1)!important;border-radius:0!important;background:rgba(2,9,13,.5)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.018)!important;overflow:visible!important}
${scope} .storefront-header-nav{height:46px!important;max-width:1440px!important;justify-content:flex-start!important;gap:8px!important;padding:0 18px!important;overflow:visible!important}
${scope} .storefront-header-nav>a,${scope} .storefront-header-nav summary{min-height:34px;margin:auto 0;padding:0 14px!important;border-radius:10px;color:rgba(215,233,230,.68)!important;font-size:9px!important;font-weight:800!important;letter-spacing:.14em!important;text-transform:uppercase;transition:background .2s ease,color .2s ease}
${scope} .storefront-header-nav>a:hover,${scope} .storefront-header-nav summary:hover{background:rgba(28,224,192,.075);color:#fff!important}
${scope} .storefront-header-nav>a>span:last-child{inset-inline:14px!important;bottom:0!important;height:2px!important;border-radius:2px;background:var(--circuit-accent)!important}
${scope} .industrial-nav-menu summary{height:34px}
${scope} .industrial-nav-panel{left:0!important;width:380px!important;transform:none!important;grid-template-columns:1fr!important;gap:0!important;padding:10px!important;border-top:2px solid var(--circuit-accent)!important}
${scope} .industrial-nav-card{display:grid!important;grid-template-columns:42px 1fr auto;align-items:center;min-height:58px;padding:10px 14px;border:0;border-bottom:1px solid rgba(255,255,255,.10);color:#fff!important;font-size:12px!important;font-weight:700!important;letter-spacing:0!important;text-transform:none!important;transition:background .2s ease,border .2s ease,padding .2s ease}
${scope} .industrial-nav-card:last-child{border-bottom:0}
${scope} .industrial-nav-card:hover{border-color:rgba(28,224,192,.45);background:rgba(28,224,192,.08)}
${scope} .industrial-nav-card:hover{padding-left:18px}
${scope} .industrial-nav-number{color:var(--circuit-accent)!important;font-family:monospace;font-size:10px!important}
${scope}>aside[role="note"]{position:relative!important;z-index:10!important;top:auto!important;border-color:rgba(28,224,192,.28)!important;background:#101d22!important;color:rgba(255,255,255,.74)!important;box-shadow:none!important}
${scope} .theme-section-root{overflow:hidden;background:#f4f7f6}
${scope} .theme-section-root img.object-cover{object-fit:contain!important;object-position:center!important}
${scope} .theme-section-root[data-section-variant="hero-split-right"]{padding:0!important;background:#071016}
${scope} .theme-section-root[data-section-variant="hero-split-right"]>section{position:relative;max-width:none!important;min-height:clamp(590px,70vh,740px);border:0!important;border-radius:0!important;background:#071016!important;box-shadow:none!important;isolation:isolate}
${scope} .theme-section-root[data-section-variant="hero-split-right"]>section:before{position:absolute;inset:0!important;z-index:0!important;width:auto!important;height:auto!important;border-radius:0!important;background:linear-gradient(90deg,rgba(4,10,14,.98) 0%,rgba(4,10,14,.86) 45%,rgba(4,10,14,.28) 100%)!important;content:""}
${scope} .theme-section-root[data-section-variant="hero-split-right"]>section:after{position:absolute;right:-8vw!important;bottom:8%!important;z-index:1!important;width:52vw!important;height:82px!important;border:0!important;border-radius:0!important;background:linear-gradient(90deg,var(--circuit-accent),rgba(28,224,192,.12))!important;clip-path:polygon(8% 0,100% 0,92% 100%,0 100%);content:"";opacity:.94;transform:rotate(-7deg)}
${scope} .theme-section-root[data-section-variant="hero-split-right"]>section>div{position:relative;z-index:2;display:grid!important;grid-template-columns:minmax(0,.9fr) minmax(420px,1.1fr)!important;min-height:clamp(590px,70vh,740px)!important;max-width:1404px;margin-inline:auto;padding:clamp(58px,6vw,96px) 18px!important;gap:clamp(44px,7vw,110px)!important}
${scope} .theme-section-root[data-section-variant="hero-split-right"]>section>div:before{position:absolute;left:18px;bottom:32px;color:rgba(255,255,255,.11);font-family:monospace;font-size:11px;letter-spacing:.24em;content:"SUPPLY / CONNECT / SCALE"}
${scope} .theme-section-root[data-section-variant="hero-split-right"]>section>div>div:first-child{max-width:690px!important}
${scope} .theme-section-root[data-section-variant="hero-split-right"] p:first-child{margin-bottom:24px!important;padding:0 0 0 42px!important;border:0!important;border-radius:0!important;background:transparent!important;color:var(--circuit-accent)!important;font-family:monospace;font-size:10px!important;font-weight:800;letter-spacing:.22em!important}
${scope} .theme-section-root[data-section-variant="hero-split-right"] p:first-child:before{position:absolute;left:0;top:50%;width:28px;height:2px;background:var(--circuit-accent);content:""}
${scope} .theme-section-root[data-section-variant="hero-split-right"] h1{max-width:15ch!important;color:#fff!important;font-size:clamp(2.35rem,3.15vw,3.5rem)!important;font-weight:900!important;line-height:.96!important;letter-spacing:-.045em!important;text-transform:uppercase}
${scope} .theme-section-root[data-section-variant="hero-split-right"] h1+p{max-width:54ch!important;margin-top:30px!important;color:rgba(255,255,255,.68)!important;font-size:16px!important;line-height:1.7!important}
${scope} .theme-section-root[data-section-variant="hero-split-right"] a{border-radius:0!important;text-transform:uppercase;letter-spacing:.1em}
${scope} .theme-section-root[data-section-variant="hero-split-right"] a:first-child{background:var(--circuit-accent)!important;color:#06110f!important;box-shadow:none!important}
${scope} .theme-section-root[data-section-variant="hero-split-right"] a:nth-child(2){border-color:rgba(255,255,255,.34)!important;color:#fff!important}
${scope} .theme-section-root[data-section-variant="hero-split-right"]>section>div>div:last-child{position:relative;z-index:0;display:flex;height:clamp(420px,36vw,540px);align-self:center;align-items:center;justify-content:center;padding:clamp(14px,2.2vw,30px);overflow:hidden;background:radial-gradient(circle at 60% 38%,#f8fbfd 0,#dceaf2 72%,#cbdde6 100%);box-shadow:0 0 0 1px rgba(255,255,255,.14)}
${scope} .theme-section-root[data-section-variant="hero-split-right"] img{position:relative!important;inset:auto!important;width:100%!important;height:100%!important;padding:0!important;border:0!important;border-radius:0!important;object-fit:contain!important;object-position:center!important;filter:saturate(.82) contrast(1.04);box-shadow:none!important;transform:none!important}
${scope} .theme-section-root[data-section-variant^="categories-"]{background:#fff}
${scope} .theme-section-root[data-section-variant^="categories-"]>section{max-width:1404px!important;padding:100px 18px 112px!important;background:#fff!important}
${scope} .theme-section-root[data-section-variant^="categories-"]>section>div>h2,${scope} .theme-section-root[data-section-variant^="products-"]>section>h2{font-size:clamp(1.85rem,2.45vw,2.75rem)!important;font-weight:900!important;line-height:1!important;letter-spacing:-.04em!important;text-transform:uppercase}
${scope} .theme-section-root[data-section-variant^="categories-"] h2+p,${scope} .theme-section-root[data-section-variant^="products-"] h2+p{max-width:62ch;margin-top:18px!important;font-size:15px!important}
${scope} .theme-section-root[data-section-variant^="categories-"] section>div>div:last-child{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:1px!important;margin-top:48px!important;background:#cfd9d7;counter-reset:circuit-category}
${scope} .category-card{counter-increment:circuit-category;border:0!important;border-radius:0!important;background:#fff!important;box-shadow:none!important}
${scope} .category-card>a:first-child{height:260px!important;background:linear-gradient(145deg,#f9fbfb,#e4eceb)!important}
${scope} .category-card img{box-sizing:border-box!important;padding:14px!important;object-fit:contain!important;object-position:center!important;transform:none!important}
${scope} .category-card:hover img{transform:none!important}
${scope} .category-card>div{position:relative;min-height:190px;padding:26px!important;border-top:3px solid transparent;transition:border-color .25s ease,background .25s ease}
${scope} .category-card>div:before{display:block;margin-bottom:18px;color:#859592;font-family:monospace;font-size:10px;letter-spacing:.18em;content:"SYSTEM 0" counter(circuit-category)}
${scope} .category-card:hover>div{border-color:var(--circuit-accent);background:#f1f8f6}
${scope} .theme-section-root[data-section-variant^="categories-"] .category-card h2{font-size:17px!important;font-weight:850!important;line-height:1.2!important;letter-spacing:-.018em!important;text-transform:none!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"]{background:var(--circuit-accent)!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"]>section{padding:68px 18px!important;border:0!important;background:transparent!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"] h2{font-size:clamp(1.85rem,2.4vw,2.75rem)!important;font-weight:900!important;line-height:1!important;letter-spacing:-.035em;text-transform:uppercase}
${scope} .theme-section-root[data-section-variant^="feature-list-"] ul{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:1px!important;background:rgba(5,16,14,.28)}
${scope} .theme-section-root[data-section-variant^="feature-list-"] li{min-height:230px;border:0!important;border-radius:0!important;background:var(--circuit-accent)!important;box-shadow:none!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"] li p:first-child{border:1px solid rgba(5,16,14,.35)!important;border-radius:0!important;background:transparent!important;color:#07120f!important}
${scope} .theme-section-root[data-section-variant^="products-"]{background:#071016!important}
${scope} .theme-section-root[data-section-variant^="products-"]>section{max-width:1404px!important;padding:110px 18px 124px!important;background:transparent!important}
${scope} .theme-section-root[data-section-variant^="products-"] h2{max-width:13ch;color:#fff!important}
${scope} .theme-section-root[data-section-variant^="products-"] h2+p{color:rgba(255,255,255,.58)!important}
${scope} .theme-section-root[data-section-variant^="products-"]>section>div:last-child{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:18px!important;margin-top:52px!important}
${scope} .product-card{border:1px solid rgba(255,255,255,.12)!important;border-radius:0!important;background:#0d171f!important;box-shadow:none!important}
${scope} .product-card:hover{border-color:rgba(28,224,192,.55)!important;transform:translateY(-8px)!important;box-shadow:0 26px 70px rgba(0,0,0,.3)!important}
${scope} .product-card-media{aspect-ratio:4/3!important;background:linear-gradient(145deg,#f8fbfb,#e2eae9)!important}
${scope} .product-card-media img{box-sizing:border-box!important;padding:clamp(10px,1.5vw,18px)!important;object-fit:contain!important;object-position:center!important;transform:none!important}
${scope} .product-card:hover .product-card-media img{transform:none!important}
${scope} .product-card-body{padding:22px!important;color:#fff!important}
${scope} .product-card-body h3{color:#fff!important;font-size:16px!important;font-weight:800!important}
${scope} .product-card-body p{color:var(--circuit-accent)!important;font-weight:800!important}
${scope} .product-card-meta,${scope} .product-card-description,${scope} .product-card-features,${scope} .product-card-mrp,${scope} .product-card-fulfilment{color:rgba(218,237,234,.62)!important}
${scope} .product-card-features{color:rgba(255,255,255,.78)!important}
${scope} .product-card-purchase{border-color:rgba(255,255,255,.12)!important}
${scope} .storefront-category-page .product-card-meta,${scope} .storefront-category-page .product-card-description,${scope} .storefront-category-page .product-card-mrp,${scope} .storefront-category-page .product-card-fulfilment{color:#687875!important}
${scope} .storefront-category-page .product-card-features{color:#253532!important}
${scope} .storefront-category-page .product-card-purchase{border-color:#d7e0de!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"]{background:#e9f0ef!important;color:#071016!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"]>section{max-width:1404px!important;padding:112px 18px!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"]>section>div{grid-template-columns:minmax(0,1.14fr) minmax(320px,.86fr);gap:clamp(50px,8vw,128px)!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"] img{height:clamp(390px,50vw,620px)!important;min-height:0!important;padding:clamp(14px,2vw,24px)!important;border-radius:0!important;background:linear-gradient(145deg,#f9fbfb,#dce7e5)!important;object-fit:contain!important;object-position:center!important;box-shadow:22px 22px 0 var(--circuit-accent)!important}
${scope} .pdp-gallery-stage img,${scope} .pdp-gallery img{object-fit:contain!important;object-position:center!important;transform:none!important}
${scope} .storefront-cart-page img{object-fit:contain!important;object-position:center!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"] h1{color:#071016!important;font-size:clamp(2rem,2.7vw,3rem)!important;font-weight:900!important;line-height:1!important;letter-spacing:-.04em;text-transform:uppercase}
${scope} .theme-section-root[data-section-variant^="image-with-text-"] p,${scope} .theme-section-root[data-section-variant^="image-with-text-"] li{color:#52625f!important}
${scope} .theme-editorial-cta{padding:14px 20px;background:#071016;color:#fff!important;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
${scope} .theme-section-root[data-section-variant^="faq-section-"]{background:#fff}
${scope} .theme-section-root[data-section-variant^="faq-section-"]>section{max-width:1404px!important;padding:112px 18px!important}
${scope} .theme-section-root[data-section-variant^="faq-section-"] h2{font-size:clamp(2rem,2.7vw,3rem)!important;font-weight:900!important;line-height:1!important;letter-spacing:-.04em;text-transform:uppercase}
${scope} .theme-section-root[data-section-variant^="faq-section-"] details{border-color:#cbd7d4!important}
${scope} .theme-section-root[data-section-variant^="faq-section-"] summary{font-size:16px!important}
${scope} .theme-section-root[data-section-variant^="testimonial-"]{background:#0d171f!important}
${scope} .theme-section-root[data-section-variant^="testimonial-"]>section{max-width:1404px!important;padding:112px 18px!important;background:transparent!important;color:#fff}
${scope} .theme-section-root[data-section-variant^="testimonial-"] h2{color:var(--circuit-accent)!important;font-family:monospace!important;font-size:11px!important;letter-spacing:.18em;text-transform:uppercase}
${scope} .theme-section-root[data-section-variant^="testimonial-"] .theme-testimonial-copy>p:first-child{max-width:38ch!important;color:#fff!important;font-size:clamp(1.5rem,2.15vw,2.5rem)!important;font-weight:800!important;line-height:1.2!important}
${scope} .theme-section-root[data-section-variant^="testimonial-"] p{color:rgba(255,255,255,.68)!important}
${scope} .theme-section-root[data-section-variant^="newsletter-"]{background:#0d171f!important}
${scope} .theme-section-root[data-section-variant^="newsletter-"]>section{max-width:1404px!important;margin:0 auto!important;padding:84px 18px!important;border:0!important;border-top:1px solid rgba(255,255,255,.13)!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
${scope} .theme-section-root[data-section-variant^="newsletter-"] h3{font-size:clamp(1.7rem,2.25vw,2.6rem)!important;font-weight:900!important;letter-spacing:-.035em;text-transform:uppercase}
${scope} .theme-section-root[data-section-variant^="newsletter-"] input,${scope} .theme-section-root[data-section-variant^="newsletter-"] button{border-radius:0!important}
${scope} .theme-section-root[data-section-variant^="cta-banner-"]>section{max-width:none!important;padding:42px 18px!important;background:#e9f0ef!important;color:#071016!important}
${scope} .theme-section-root[data-section-variant^="cta-banner-"]>section>div{max-width:1404px}
${scope} .theme-section-root[data-section-variant^="cta-banner-"] h2{font-size:clamp(1.5rem,2vw,2.35rem)!important;font-weight:900!important;letter-spacing:-.03em;text-transform:uppercase}
${scope} .theme-section-root[data-section-variant^="cta-banner-"] a{border-radius:0!important;background:#071016!important;color:#fff!important;text-transform:uppercase;letter-spacing:.09em}
${scope} .theme-section-root[data-section-variant^="promo-banner-"]>section{max-width:none!important;margin:0!important;padding:26px 18px!important;border:0!important;border-radius:0!important;background:var(--circuit-accent)!important;color:#06110f!important;box-shadow:none!important}
${scope} .theme-section-root[data-section-variant^="promo-banner-"]>section>div{max-width:1404px}
${scope} .theme-section-root[data-section-variant^="promo-banner-"] a{border-radius:0!important;background:#071016!important;color:#fff!important}
${scope} .storefront-category-page{padding-bottom:110px!important;background:#f2f6f5!important}
${scope} .storefront-category-page>div{max-width:1404px!important;padding-top:24px!important}
${scope} .category-breadcrumb{min-height:34px;color:#71817e!important;font-family:monospace;font-size:10px!important;letter-spacing:.1em;text-transform:uppercase}
${scope} .category-breadcrumb a:hover{color:#087e6e!important}
${scope} .category-browse-intro{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 210px;align-items:end;min-height:260px;margin-top:18px;padding:46px 52px;overflow:hidden;background:#071016;color:#fff;isolation:isolate}
${scope} .category-browse-intro:before{position:absolute;right:-6%;bottom:-72px;z-index:-1;width:44%;height:118px;background:linear-gradient(90deg,var(--circuit-accent),#0f8f7e);clip-path:polygon(10% 0,100% 0,88% 100%,0 100%);content:"";transform:rotate(-5deg)}
${scope} .category-browse-intro:after{position:absolute;right:18%;top:-85%;z-index:-2;width:410px;height:410px;border:1px solid rgba(28,224,192,.16);border-radius:50%;content:""}
${scope} .category-browse-eyebrow{margin-bottom:16px;color:var(--circuit-accent);font-family:monospace;font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase}
${scope} .category-browse-intro h1{max-width:18ch;margin:0;color:#fff;font-size:clamp(2.1rem,2.8vw,3.2rem);font-weight:900;line-height:1;letter-spacing:-.04em;text-transform:uppercase}
${scope} .category-browse-description{max-width:66ch;margin-top:20px;color:rgba(255,255,255,.62);font-size:14px;line-height:1.7}
${scope} .category-browse-stat{position:relative;display:flex;min-height:150px;flex-direction:column;justify-content:flex-end;padding-left:30px;border-left:1px solid rgba(255,255,255,.18)}
${scope} .category-browse-stat span,${scope} .category-browse-stat small{color:rgba(255,255,255,.5);font-family:monospace;font-size:9px;letter-spacing:.16em;text-transform:uppercase}
${scope} .category-browse-stat strong{margin-block:8px;color:#fff;font-size:52px;font-weight:900;line-height:.9;letter-spacing:-.05em}
${scope} .storefront-category-page[data-plp-layout="top-filter-dense"]>div>.category-catalog-layout{grid-template-columns:300px minmax(0,1fr)!important;align-items:start;gap:24px!important;margin-top:24px!important}
${scope} .category-filter-panel{position:sticky!important;top:154px!important;padding:24px!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:0!important;background:#0d171f!important;color:#fff!important;box-shadow:0 24px 60px rgba(7,16,22,.18)!important}
${scope} .category-filter-disclosure>summary{display:flex;cursor:pointer;list-style:none;align-items:center;justify-content:space-between;gap:14px}
${scope} .category-filter-disclosure>summary::-webkit-details-marker{display:none}
${scope} .category-filter-heading{display:flex;align-items:center;gap:12px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,.12)}
${scope} .category-filter-disclosure>summary .category-filter-heading{flex:1}
${scope} .category-filter-heading>span{display:flex;width:30px;height:30px;align-items:center;justify-content:center;background:var(--circuit-accent);color:#071016;font-family:monospace;font-size:9px;font-weight:900}
${scope} .category-filter-heading h2{color:#fff!important;font-size:15px!important;letter-spacing:-.01em}
${scope} .category-filter-toggle{display:none;width:30px;height:30px;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.18);color:var(--circuit-accent);font-size:20px;line-height:1;transition:transform .25s ease}
${scope} .category-filter-disclosure[open] .category-filter-toggle{transform:rotate(45deg)}
${scope} .category-filter-form{margin-top:20px!important}
${scope} .category-filter-form>div,${scope} .category-filter-form>fieldset{border-color:rgba(255,255,255,.11)!important}
${scope} .category-filter-form label,${scope} .category-filter-form h3,${scope} .category-filter-form legend{color:rgba(255,255,255,.64)!important;font-size:10px!important;font-weight:800!important;letter-spacing:.1em!important}
${scope} .category-filter-form input[type="search"],${scope} .category-filter-form input[type="number"],${scope} .category-filter-form input[list]{height:42px;border:1px solid rgba(255,255,255,.15)!important;border-radius:0!important;background:#071016!important;color:#fff!important;font-size:12px!important;letter-spacing:0!important}
${scope} .category-filter-form input::placeholder{color:rgba(255,255,255,.35)}
${scope} .category-filter-form input[type="checkbox"]{width:15px;height:15px;border-radius:0;accent-color:var(--circuit-accent)}
${scope} .category-filter-links a{position:relative;border-radius:0!important;padding:9px 10px!important;color:rgba(255,255,255,.62)!important;font-size:12px!important;letter-spacing:0!important;transition:padding .2s ease,background .2s ease,color .2s ease}
${scope} .category-filter-links a:hover{padding-left:14px!important;background:rgba(255,255,255,.06)!important;color:#fff!important}
${scope} .category-filter-links a.is-active{padding-left:14px!important;background:rgba(28,224,192,.12)!important;color:var(--circuit-accent)!important;box-shadow:inset 2px 0 0 var(--circuit-accent)}
${scope} .category-filter-form button[type="submit"]{min-height:44px;border-radius:0!important;background:var(--circuit-accent)!important;color:#071016!important;font-size:10px!important;font-weight:900!important;letter-spacing:.12em;text-transform:uppercase}
${scope} .category-filter-form>a{color:rgba(255,255,255,.52)!important}
${scope} .category-results-toolbar{min-height:88px;padding:18px 22px!important;border:1px solid #d7e0de!important;border-left:4px solid var(--circuit-accent)!important;border-radius:0!important;background:#fff!important;box-shadow:0 15px 38px rgba(7,16,22,.07)!important}
${scope} .category-results-toolbar h1{color:#071016!important;font-size:24px!important;font-weight:900!important;letter-spacing:-.035em}
${scope} .category-results-toolbar p{margin-top:4px;color:#7a8986!important;font-family:monospace;font-size:10px!important;letter-spacing:.08em;text-transform:uppercase}
${scope} .category-results-toolbar form label{color:#657471!important;font-family:monospace;font-size:9px!important;letter-spacing:.1em;text-transform:uppercase}
${scope} .category-results-toolbar select{min-width:174px;height:40px;border-color:#cbd7d4!important;border-radius:0!important;background:#f6f9f8!important;color:#071016!important;font-size:12px!important}
${scope} .storefront-product-page h1{font-size:clamp(2rem,2.7vw,2.8rem)!important;line-height:1.08!important;letter-spacing:-.035em!important}
${scope} .storefront-about-page h1{max-width:18ch;font-size:clamp(2.35rem,3.2vw,3.35rem)!important;line-height:1.06!important;letter-spacing:-.04em!important}
${scope} .category-product-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:18px!important;margin-top:20px!important}
${scope} .storefront-category-page .product-card{border:1px solid #d7e0de!important;border-radius:0!important;background:#fff!important;box-shadow:none!important}
${scope} .storefront-category-page .product-card:hover{border-color:#8fc8bf!important;box-shadow:0 22px 54px rgba(7,16,22,.13)!important}
${scope} .storefront-category-page .product-card-body{background:#fff!important}
${scope} .storefront-category-page .product-card-body h3{color:#071016!important}
${scope} .storefront-category-page .product-card-body p{color:#087e6e!important}
${scope} .storefront-footer{position:relative;border:0!important;background:#050b0f!important;overflow:hidden}
${scope} .storefront-footer:before{position:absolute;right:-7vw;top:46px;color:rgba(255,255,255,.025);font-size:clamp(7rem,19vw,21rem);font-weight:900;line-height:.7;letter-spacing:-.08em;content:"CIRCUIT"}
${scope} .storefront-footer-inner{position:relative;z-index:1;max-width:1404px!important;padding-block:80px 28px!important}
${scope} .storefront-footer-brand{padding:0!important;border:0!important;border-radius:0!important;background:transparent!important}
${scope} .storefront-footer-brand h2,${scope} .storefront-footer-brand a{color:#fff!important}
${scope} .storefront-footer-directory{padding-top:48px;border-top:1px solid rgba(255,255,255,.14)}
${scope} .storefront-footer-directory h2{color:var(--circuit-accent)!important;font-family:monospace!important}
${scope} .storefront-footer-bottom{border-color:rgba(255,255,255,.14)!important}
${scope}.storefront-motion-ready .storefront-header{animation:circuit-header-in .68s cubic-bezier(.2,.8,.2,1) both}
${scope}.storefront-motion-ready .storefront-header-main>a:first-child img{animation:circuit-logo-breathe 4.8s 1s ease-in-out infinite}
${scope}.storefront-motion-ready .theme-section-root.is-motion-pending:not(.is-motion-visible){opacity:0;transform:translateY(48px)}
${scope}.storefront-motion-ready .theme-section-root{transition:opacity .82s ease,transform .82s cubic-bezier(.2,.75,.25,1)}
${scope}.storefront-motion-ready .theme-section-root.is-motion-visible{opacity:1;transform:none}
${scope}.storefront-motion-ready .theme-section-root.is-motion-visible .category-card,${scope}.storefront-motion-ready .theme-section-root.is-motion-visible .product-card,${scope}.storefront-motion-ready .theme-section-root.is-motion-visible li,${scope}.storefront-motion-ready .theme-section-root.is-motion-visible details{animation:circuit-card-in .76s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--reveal-index,0)*65ms)}
${scope}.storefront-motion-ready .theme-section-root.is-motion-visible[data-section-variant^="categories-"] h2,${scope}.storefront-motion-ready .theme-section-root.is-motion-visible[data-section-variant^="products-"] h2,${scope}.storefront-motion-ready .theme-section-root.is-motion-visible[data-section-variant^="image-with-text-"] h1,${scope}.storefront-motion-ready .theme-section-root.is-motion-visible[data-section-variant^="faq-section-"] h2{animation:circuit-copy-in .78s .08s cubic-bezier(.16,1,.3,1) both}
${scope}.storefront-motion-ready .theme-section-root.is-motion-visible[data-section-variant^="categories-"] h2+p,${scope}.storefront-motion-ready .theme-section-root.is-motion-visible[data-section-variant^="products-"] h2+p{animation:circuit-copy-in .78s .18s cubic-bezier(.16,1,.3,1) both}
${scope}.storefront-motion-ready .theme-section-root[data-section-variant="hero-split-right"] p:first-child{animation:circuit-label-in .65s .06s both}
${scope}.storefront-motion-ready .theme-section-root[data-section-variant="hero-split-right"] h1{animation:circuit-hero-in .92s .14s cubic-bezier(.16,1,.3,1) both}
${scope}.storefront-motion-ready .theme-section-root[data-section-variant="hero-split-right"] h1+p{animation:circuit-hero-in .88s .3s cubic-bezier(.16,1,.3,1) both}
${scope}.storefront-motion-ready .theme-section-root[data-section-variant="hero-split-right"] a{animation:circuit-hero-in .84s .44s cubic-bezier(.16,1,.3,1) both}
${scope}.storefront-motion-ready .theme-section-root[data-section-variant="hero-split-right"]>section>div>div:last-child{animation:circuit-visual-in 1.05s .18s cubic-bezier(.16,1,.3,1) both}
${scope}.storefront-motion-ready .theme-section-root[data-section-variant="hero-split-right"]>section>div>div:last-child:before{position:absolute;inset:-42%;z-index:0;background:conic-gradient(from 90deg,transparent,rgba(28,224,192,.24),transparent 34%);content:"";animation:circuit-orbit 13s linear infinite}
${scope}.storefront-motion-ready .theme-section-root[data-section-variant="hero-split-right"] img{z-index:1;animation:circuit-device-float 6s 1.35s ease-in-out infinite}
${scope}.storefront-motion-ready .theme-section-root[data-section-variant="hero-split-right"]>section:after{background-size:180% 100%!important;animation:circuit-stripe-glow 5.6s ease-in-out infinite}
${scope} .theme-section-root[data-section-variant="hero-split-right"] a:first-child{position:relative;overflow:hidden}
${scope} .theme-section-root[data-section-variant="hero-split-right"] a:first-child:after{position:absolute;inset:-35% auto -35% -55%;width:34%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.58),transparent);content:"";transform:skewX(-18deg);animation:circuit-cta-shine 4.2s 1.3s ease-in-out infinite}
${scope} .category-card,${scope} .product-card{position:relative;overflow:hidden}
${scope} .category-card img,${scope} .product-card-media img{transition:translate .45s cubic-bezier(.2,.8,.2,1),filter .45s ease!important}
${scope} .category-card:hover img,${scope} .product-card:hover .product-card-media img{translate:0 -7px;filter:saturate(.9) contrast(1.05) drop-shadow(0 16px 18px rgba(7,16,22,.16))!important}
${scope} .product-card:after{position:absolute;right:0;bottom:0;left:0;height:3px;background:linear-gradient(90deg,var(--circuit-accent),var(--circuit-accent-2));content:"";transform:scaleX(0);transform-origin:left;transition:transform .42s cubic-bezier(.2,.8,.2,1)}
${scope} .product-card:hover:after{transform:scaleX(1)}
${scope} .theme-section-root[data-section-variant^="image-with-text-"] img{transition:translate .55s ease,filter .55s ease!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"] img:hover{translate:0 -8px;filter:saturate(.92) drop-shadow(0 22px 25px rgba(7,16,22,.14))}
${scope}.storefront-motion-ready .category-browse-intro{animation:circuit-page-in .8s cubic-bezier(.16,1,.3,1) both}
${scope}.storefront-motion-ready .category-filter-panel{animation:circuit-panel-left .72s .12s cubic-bezier(.16,1,.3,1) both}
${scope}.storefront-motion-ready .category-results-toolbar{animation:circuit-copy-in .72s .18s cubic-bezier(.16,1,.3,1) both}
${scope}.storefront-motion-ready .category-product-grid .product-card{animation:circuit-card-in .72s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(.2s + var(--reveal-index,0)*55ms)}
${scope}.storefront-motion-ready .storefront-product-page .pdp-gallery-stage{animation:circuit-panel-left .85s .08s cubic-bezier(.16,1,.3,1) both}
${scope}.storefront-motion-ready .storefront-product-page .pdp-product-summary{animation:circuit-visual-in .85s .18s cubic-bezier(.16,1,.3,1) both}
${scope}.storefront-motion-ready .storefront-search-page>div,${scope}.storefront-motion-ready .storefront-about-page>section{animation:circuit-page-in .8s cubic-bezier(.16,1,.3,1) both}
${scope}.storefront-motion-ready .storefront-footer-inner{animation:circuit-footer-in .85s cubic-bezier(.16,1,.3,1) both}
@keyframes circuit-header-in{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:none}}
@keyframes circuit-logo-breathe{0%,100%{filter:saturate(.9);box-shadow:0 8px 26px rgba(28,224,192,.12)}50%{filter:saturate(1.12);box-shadow:0 10px 34px rgba(28,224,192,.28)}}
@keyframes circuit-card-in{from{opacity:0;transform:translateY(30px) scale(.975)}to{opacity:1;transform:none}}
@keyframes circuit-copy-in{from{opacity:0;transform:translateY(26px);filter:blur(5px)}to{opacity:1;transform:none;filter:none}}
@keyframes circuit-label-in{from{opacity:0;transform:translateX(-24px);letter-spacing:.32em}to{opacity:1;transform:none}}
@keyframes circuit-hero-in{from{opacity:0;transform:translateY(38px);filter:blur(7px)}to{opacity:1;transform:none;filter:none}}
@keyframes circuit-visual-in{from{opacity:0;transform:translateX(46px) scale(.97);clip-path:inset(0 0 0 18%)}to{opacity:1;transform:none;clip-path:inset(0)}}
@keyframes circuit-panel-left{from{opacity:0;transform:translateX(-34px)}to{opacity:1;transform:none}}
@keyframes circuit-page-in{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
@keyframes circuit-footer-in{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:none}}
@keyframes circuit-device-float{0%,100%{translate:0 0}50%{translate:0 -9px}}
@keyframes circuit-orbit{to{transform:rotate(1turn)}}
@keyframes circuit-stripe-glow{0%,100%{opacity:.72;background-position:0 0}50%{opacity:1;background-position:100% 0}}
@keyframes circuit-cta-shine{0%,68%{left:-55%;opacity:0}76%{opacity:1}100%{left:135%;opacity:0}}
@media(max-width:1100px){${scope} .storefront-header-main{grid-template-columns:minmax(230px,.85fr) minmax(240px,1fr) auto!important}${scope} .theme-section-root[data-section-variant^="categories-"] section>div>div:last-child{grid-template-columns:repeat(2,minmax(0,1fr))!important}${scope} .theme-section-root[data-section-variant^="feature-list-"] ul{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(min-width:901px){${scope} .category-filter-disclosure:not([open])>.category-filter-form{display:block!important}}
@media(max-width:900px){${scope} .category-browse-intro{grid-template-columns:1fr 150px;padding:38px 30px}${scope} .category-browse-intro h1{font-size:clamp(2.3rem,6vw,3.5rem)}${scope} .storefront-category-page[data-plp-layout="top-filter-dense"]>div>.category-catalog-layout{grid-template-columns:1fr!important}${scope} .category-filter-panel{position:static!important}${scope} .category-filter-toggle{display:flex}${scope} .category-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:767px){${scope} .storefront-header>div:first-child{padding:8px 14px 10px!important}${scope} .storefront-header-main{display:flex!important;min-height:64px!important;padding:0!important}${scope} .storefront-header-main>a:first-child img{height:42px!important;width:42px!important;border-radius:13px!important}${scope} .storefront-header-main>a:first-child>span:last-child span:first-child{font-size:18px!important}${scope} .storefront-header-main details summary{border-color:rgba(255,255,255,.15)!important;border-radius:13px!important;background:rgba(255,255,255,.055);color:#fff!important}${scope} .storefront-header-search{display:block!important;width:100%!important}${scope} .storefront-header-search form>div{border-radius:14px!important}${scope} .theme-section-root[data-section-variant="hero-split-right"]>section{min-height:0}${scope} .theme-section-root[data-section-variant="hero-split-right"]>section>div{grid-template-columns:1fr!important;min-height:0!important;padding:42px 18px 38px!important;gap:38px!important}${scope} .theme-section-root[data-section-variant="hero-split-right"] h1{max-width:13ch!important;font-size:clamp(2.3rem,9.5vw,3.15rem)!important;line-height:.92!important}${scope} .theme-section-root[data-section-variant="hero-split-right"]>section>div>div:last-child{height:320px}${scope} .theme-section-root[data-section-variant="hero-split-right"]>section:after{height:44px!important;bottom:17%!important}${scope} .theme-section-root[data-section-variant^="categories-"]>section,${scope} .theme-section-root[data-section-variant^="products-"]>section,${scope} .theme-section-root[data-section-variant^="image-with-text-"]>section,${scope} .theme-section-root[data-section-variant^="faq-section-"]>section{padding:72px 14px!important}${scope} .theme-section-root[data-section-variant^="categories-"] section>div>div:last-child,${scope} .theme-section-root[data-section-variant^="products-"]>section>div:last-child{grid-template-columns:1fr!important}${scope} .theme-section-root[data-section-variant^="feature-list-"] ul{grid-template-columns:1fr!important}${scope} .theme-section-root[data-section-variant^="image-with-text-"]>section>div{grid-template-columns:1fr!important}${scope} .theme-section-root[data-section-variant^="image-with-text-"] img{min-height:390px!important;box-shadow:12px 12px 0 var(--circuit-accent)!important}}
@media(max-width:600px){${scope} .storefront-category-page>div{padding-inline:14px!important}${scope} .category-browse-intro{grid-template-columns:1fr;min-height:0;padding:34px 24px}${scope} .category-browse-intro h1{font-size:2.35rem}${scope} .category-browse-stat{min-height:auto;margin-top:30px;padding:20px 0 0;border-top:1px solid rgba(255,255,255,.18);border-left:0}${scope} .category-browse-stat strong{font-size:48px}${scope} .category-filter-panel{padding:18px 20px!important}${scope} .category-filter-heading{padding-bottom:0;border-bottom:0}${scope} .category-filter-toggle{display:flex}${scope} .category-filter-disclosure[open] .category-filter-form{padding-top:18px;border-top:1px solid rgba(255,255,255,.12)}${scope} .category-results-toolbar{align-items:flex-start!important}${scope} .category-results-toolbar form{width:100%;justify-content:space-between}${scope} .category-product-grid{gap:10px!important}${scope} .storefront-category-page .product-card-body{padding:13px!important}${scope} .storefront-category-page .product-card-body h3{font-size:13px!important}}
@media(max-width:900px){${scope} .category-browse-intro h1{font-size:clamp(2rem,5vw,2.7rem)!important}}
@media(max-width:767px){${scope} .theme-section-root[data-section-variant="hero-split-right"] h1{max-width:15ch!important;font-size:clamp(2rem,8.2vw,2.55rem)!important;line-height:1!important;letter-spacing:-.035em!important}${scope} .storefront-about-page h1{font-size:clamp(2.15rem,9vw,2.65rem)!important}${scope} .storefront-product-page h1{font-size:clamp(1.9rem,8vw,2.35rem)!important}}
@media(max-width:600px){${scope} .category-browse-intro h1{font-size:2rem!important}${scope} .category-browse-stat strong{font-size:44px!important}}
@media(prefers-reduced-motion:reduce){${scope}.storefront-motion-ready .theme-section-root{opacity:1!important;transform:none!important}${scope} *,${scope} *:before,${scope} *:after{animation:none!important;scroll-behavior:auto!important;transition-duration:.01ms!important}${scope} img{translate:none!important}}
`;
}

function plantWorksControlRoomCss(design) {
  if (design.id !== 'ds-04-web') return '';
  const scope = 'body[data-theme-layout="ds-04-web"]';
  return `
/* plantworks-control-room-v3: the complete palette is derived from the tenant's registration colours */
${scope}{--pw-orange:var(--theme-primary);--pw-accent-2:var(--theme-secondary);--pw-ink:color-mix(in srgb,var(--pw-accent-2) 44%,#12282b);--pw-panel:color-mix(in srgb,var(--pw-accent-2) 30%,#294448);--pw-steel:color-mix(in srgb,var(--pw-orange) 12%,#e8eeeb);--pw-paper:color-mix(in srgb,var(--pw-orange) 6%,#fffdf8);--pw-mint:color-mix(in srgb,var(--pw-orange) 20%,var(--pw-paper));--pw-line:color-mix(in srgb,var(--pw-orange) 20%,#c7d2cd);--pw-muted:color-mix(in srgb,var(--pw-accent-2) 25%,#71817d);--pw-card:color-mix(in srgb,var(--pw-orange) 3%,#fffdf8);--pw-soft:color-mix(in srgb,var(--pw-orange) 10%,#eef3ef);--pw-shadow:color-mix(in srgb,var(--pw-orange) 14%,#dce5e1);background:var(--pw-paper)!important;color:var(--pw-ink)!important}
${scope} .storefront-header{--header-primary:var(--theme-primary)!important;--header-secondary:var(--theme-secondary)!important;--header-soft:var(--pw-soft)!important;padding:0!important;border:0!important;background:var(--pw-orange)!important;box-shadow:0 14px 36px color-mix(in srgb,var(--pw-ink) 12%,transparent)!important;backdrop-filter:none!important}
${scope} .storefront-header>.plantworks-status-rail.plantworks-status-rail{width:100%!important;max-width:none!important;height:34px;margin:0!important;border:0!important;border-bottom:1px solid color-mix(in srgb,var(--theme-primary-contrast) 22%,transparent)!important;background:var(--pw-orange)!important;color:var(--theme-primary-contrast)!important}
${scope} .plantworks-status-rail-inner{display:grid;grid-template-columns:1fr auto 1fr;width:min(100%,1440px);height:100%;align-items:center;gap:24px;margin-inline:auto;padding-inline:24px;font-family:monospace;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
${scope} .plantworks-status-kicker{justify-self:start}
${scope} .plantworks-status-note{display:flex;align-items:center;gap:10px;white-space:nowrap}
${scope} .plantworks-status-note i{width:7px;height:7px;border:2px solid var(--theme-primary-contrast);border-radius:50%;background:var(--theme-primary-contrast);box-shadow:0 0 0 3px color-mix(in srgb,var(--theme-primary-contrast) 18%,transparent)}
${scope} .plantworks-status-note b{font-weight:900;opacity:.45}
${scope} .plantworks-status-link{justify-self:end;color:var(--theme-primary-contrast)!important;text-decoration:none}
${scope} .storefront-header>div:not(.plantworks-status-rail):not(.plantworks-nav-shell){width:min(100%,1440px)!important;max-width:1440px!important;margin-inline:auto!important;padding-inline:24px!important;border:0!important;background:var(--pw-orange)!important;box-shadow:none!important}
${scope} .storefront-header-main{display:grid!important;grid-template-columns:minmax(250px,.72fr) minmax(420px,1.45fr) auto!important;min-height:82px!important;gap:clamp(20px,3vw,48px)!important;padding:12px 0!important;border:0!important}
${scope} .plantworks-brand-lockup{max-width:320px!important;padding:0!important;background:transparent!important;box-shadow:none!important}
${scope} .plantworks-brand-mark{position:relative;display:grid!important;width:54px!important;height:54px!important;flex:none;place-items:center;border:2px solid var(--pw-ink);border-radius:2px!important;background:var(--pw-ink)!important;color:#fff!important;box-shadow:6px 6px 0 var(--pw-orange)!important;overflow:hidden}
${scope} .plantworks-brand-mark strong{font-family:Arial,sans-serif;font-size:18px;font-weight:900;letter-spacing:-.06em}
${scope} .plantworks-brand-mark i{position:absolute;right:5px;bottom:5px;width:8px;height:8px;background:var(--pw-orange);clip-path:polygon(0 0,100% 0,100% 100%)}
${scope} .plantworks-brand-lockup>span:last-child{max-width:210px!important}
${scope} .plantworks-brand-lockup>span:last-child>span:first-child{color:var(--theme-primary-contrast)!important;font-size:21px!important;font-weight:900!important;letter-spacing:-.04em}
${scope} .plantworks-brand-lockup>span:last-child>span:last-child{margin-top:5px!important;color:color-mix(in srgb,var(--theme-primary-contrast) 72%,transparent)!important;font-family:monospace!important;font-size:9px!important;font-weight:800!important;letter-spacing:.16em;text-transform:uppercase}
${scope} .storefront-header-search{width:100%!important;max-width:700px;justify-self:center}
${scope} .storefront-header-search form{border:0!important;background:transparent!important;box-shadow:none!important}
${scope} .storefront-header-search form>div{height:50px!important;border:2px solid var(--pw-panel)!important;border-radius:2px!important;background:var(--pw-card)!important;box-shadow:5px 5px 0 var(--pw-line)!important}
${scope} .storefront-header-search input{color:var(--pw-ink)!important;font-family:monospace!important;font-size:12px!important;font-weight:700!important}
${scope} .storefront-header-search input::placeholder{color:var(--pw-muted)!important}
${scope} .storefront-header-search label{border-color:var(--pw-ink)!important;color:var(--pw-ink)!important;font-family:monospace!important;font-size:10px!important;letter-spacing:.04em;text-transform:uppercase}
${scope} .storefront-header-search button{width:56px!important;border-radius:0!important;background:var(--pw-orange)!important;color:var(--theme-primary-contrast)!important}
${scope} .storefront-header-search button svg{width:21px!important;height:21px!important;stroke-width:2.5}
${scope} .plantworks-utilities{gap:8px!important}
${scope} .plantworks-utilities>a:not(.plantworks-rfq),${scope} .plantworks-utilities>div>button{min-height:48px;padding:0 10px!important;border:1px solid var(--pw-line)!important;border-radius:2px!important;background:var(--pw-card)!important;color:var(--pw-ink)!important;box-shadow:none!important}
${scope} .plantworks-utilities>a:not(.plantworks-rfq):hover,${scope} .plantworks-utilities>div>button:hover{border-color:color-mix(in srgb,var(--pw-orange) 42%,var(--pw-line))!important;background:var(--pw-soft)!important;transform:translateY(-2px)}
${scope} .plantworks-utilities .text-slate-500{color:var(--pw-muted)!important}
${scope} .plantworks-rfq{min-height:48px;align-items:center;gap:18px;padding:0 17px;border:2px solid var(--pw-ink);border-radius:2px;background:var(--pw-ink);color:#fff!important;font-family:monospace;font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;box-shadow:5px 5px 0 var(--pw-orange);transition:translate .2s ease,box-shadow .2s ease}
${scope} .plantworks-rfq:hover{translate:-2px -2px;box-shadow:7px 7px 0 var(--pw-orange)}
${scope} .plantworks-nav-shell{border:0!important;border-top:1px solid color-mix(in srgb,var(--theme-primary-contrast) 22%,transparent)!important;background:var(--pw-orange)!important}
${scope} .plantworks-nav{position:relative;height:48px!important;max-width:1440px!important;justify-content:flex-start!important;gap:0!important;padding:0 24px 0 150px!important;background:var(--pw-orange)!important}
${scope} .plantworks-nav:before{position:absolute;left:24px;top:0;display:flex;height:48px;align-items:center;color:var(--theme-primary-contrast);content:"CATALOG //";font-family:monospace;font-size:10px;font-weight:900;letter-spacing:.15em}
${scope} .plantworks-nav>a,${scope} .plantworks-nav>details>summary{min-height:48px;padding:0 20px!important;border-inline:1px solid color-mix(in srgb,var(--theme-primary-contrast) 14%,transparent);color:color-mix(in srgb,var(--theme-primary-contrast) 78%,transparent)!important;font-family:monospace!important;font-size:10px!important;font-weight:800!important;letter-spacing:.11em!important;text-transform:uppercase}
${scope} .plantworks-nav>a:hover,${scope} .plantworks-nav>details>summary:hover{background:color-mix(in srgb,var(--theme-primary-contrast) 12%,transparent);color:var(--theme-primary-contrast)!important}
${scope} .plantworks-nav>.storefront-category-menu>a{min-height:48px;padding:0 20px!important;border-inline:1px solid color-mix(in srgb,var(--theme-primary-contrast) 14%,transparent);color:color-mix(in srgb,var(--theme-primary-contrast) 78%,transparent)!important;font-family:monospace!important;font-size:10px!important;font-weight:800!important;letter-spacing:.11em!important;text-transform:uppercase}
${scope} .plantworks-nav>.storefront-category-menu>a[data-active="true"]{color:var(--theme-primary-contrast)!important}
${scope} .plantworks-nav>.storefront-category-menu:hover>a,${scope} .plantworks-nav>.storefront-category-menu:focus-within>a{background:color-mix(in srgb,var(--theme-primary-contrast) 12%,transparent);color:var(--theme-primary-contrast)!important}
${scope} .plantworks-nav>.storefront-category-menu>a>span:last-child{height:3px!important;border-radius:0!important;background:var(--theme-primary-contrast)!important}
${scope} .plantworks-nav>a>span:last-child{height:3px!important;border-radius:0!important;background:var(--theme-primary-contrast)!important}
${scope} .theme-section-root[data-section-variant="hero-control-deck"]{padding:0!important;background:var(--pw-ink)!important}
${scope} .theme-section-root[data-section-variant="hero-control-deck"]>section{position:relative;width:100%!important;max-width:none!important;margin:0!important;border:0!important;border-radius:0!important;background:var(--pw-ink)!important;box-shadow:none!important;overflow:hidden}
${scope} .theme-section-root[data-section-variant="hero-control-deck"]>section:before{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:44px 44px;content:"";mask-image:linear-gradient(90deg,#000,transparent 78%)}
${scope} .theme-section-root[data-section-variant="hero-control-deck"]>section:after{position:absolute;inset:0 0 auto;height:5px;background:repeating-linear-gradient(90deg,var(--pw-orange) 0 44px,var(--pw-ink) 44px 58px);content:""}
${scope} .theme-section-root[data-section-variant="hero-control-deck"]>section>div{position:relative;display:grid!important;grid-template-columns:minmax(360px,.9fr) minmax(480px,1.1fr)!important;width:min(100%,var(--theme-max))!important;min-height:560px!important;align-items:center!important;gap:clamp(34px,5vw,72px)!important;margin-inline:auto!important;padding:40px clamp(24px,4.5vw,68px)!important;text-align:left}
${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-content{display:flex!important;max-width:620px!important;align-items:flex-start!important}
${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-eyebrow{margin:0 0 18px!important;padding:8px 11px!important;border:1px solid var(--pw-orange)!important;border-radius:0!important;background:color-mix(in srgb,var(--pw-orange) 14%,transparent)!important;color:color-mix(in srgb,var(--pw-orange) 58%,#fff)!important;font-family:monospace!important;font-size:10px!important;font-weight:900!important;letter-spacing:.16em!important}
${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-title{max-width:13ch!important;margin:0!important;color:#fffdf8!important;font-size:clamp(2.7rem,4.4vw,4.45rem)!important;font-weight:800!important;line-height:.94!important;letter-spacing:-.055em!important}
${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-description{max-width:58ch!important;margin-top:22px!important;color:color-mix(in srgb,var(--pw-orange) 10%,#dce8e4)!important;font-size:15px!important;line-height:1.72!important}
${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-actions{margin-top:30px!important;gap:12px!important}
${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-actions a{min-height:48px!important;border-radius:2px!important;padding:14px 20px!important;font-family:monospace!important;font-size:10px!important;font-weight:900!important;letter-spacing:.09em;text-transform:uppercase}
${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-primary-cta{background:var(--pw-orange)!important;color:var(--theme-primary-contrast)!important;box-shadow:5px 5px 0 rgba(255,255,255,.16)!important}
${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-secondary-cta{border-color:rgba(255,253,248,.32)!important;color:#fffdf8!important}
${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-media{position:relative;height:520px!important;padding:16px;border:1px solid color-mix(in srgb,var(--pw-orange) 28%,transparent);background:var(--pw-panel);box-shadow:16px 16px 0 color-mix(in srgb,var(--pw-orange) 58%,transparent)}
${scope} .theme-section-root[data-section-variant="hero-control-deck"] img{width:100%!important;height:100%!important;border:0!important;border-radius:0!important;object-fit:cover;box-shadow:none!important;filter:saturate(.88) contrast(1.05);transition:filter .35s ease,transform .55s ease}
${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-media:hover img{filter:saturate(1) contrast(1.02);transform:scale(1.018)}
${scope} .theme-section-root[data-section-variant="categories-operating-zones"]{background:var(--pw-steel)}
${scope} .theme-section-root[data-section-variant="categories-operating-zones"]>section{max-width:var(--theme-max)!important;padding:72px 24px!important}
${scope} .theme-section-root[data-section-variant="categories-operating-zones"] section>div>div:last-child{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:1px!important;margin-top:30px;background:var(--pw-line);border:1px solid var(--pw-line)}
${scope} .theme-section-root[data-section-variant="categories-operating-zones"] .category-card{border:0!important;border-radius:0!important;background:var(--pw-card)!important;box-shadow:none!important}
${scope} .theme-section-root[data-section-variant="categories-operating-zones"] .category-card>a:first-child{height:210px!important;border:0!important}
${scope} .theme-section-root[data-section-variant="categories-operating-zones"] .category-card>div{position:relative;min-height:150px!important;padding:22px 20px 20px 62px!important}
${scope} .theme-section-root[data-section-variant="categories-operating-zones"] .category-card>div:before{position:absolute;top:23px;left:18px;color:var(--pw-orange);content:"0" counter(pw-zone);font-family:monospace;font-size:20px;font-weight:900}
${scope} .theme-section-root[data-section-variant="categories-operating-zones"] section>div>div:last-child{counter-reset:pw-zone}
${scope} .theme-section-root[data-section-variant="categories-operating-zones"] .category-card{counter-increment:pw-zone}
${scope} .theme-section-root[data-section-variant="categories-operating-zones"] .category-card h2{font-size:17px!important;font-weight:900!important}
${scope} .theme-section-root[data-section-variant="categories-operating-zones"] .category-card p{color:var(--pw-muted)!important;font-size:12px!important}
${scope} .theme-section-root[data-section-variant="categories-operating-zones"] .category-card>div>a:last-child{color:var(--pw-ink)!important;font-family:monospace;font-size:9px!important;font-weight:900!important;letter-spacing:.1em;text-transform:uppercase}
${scope} .theme-section-root[data-section-variant="promo-banner-compact"]>section{max-width:var(--theme-max)!important;margin-block:0!important;border:0!important;border-radius:0!important;background:var(--pw-orange)!important;color:var(--theme-primary-contrast)!important;box-shadow:none!important}
${scope} .theme-section-root[data-section-variant="products-spec-card"]>section{max-width:var(--theme-max)!important;padding:76px 24px!important}
${scope} .theme-section-root[data-section-variant="products-spec-card"]>section>div:last-child{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:16px!important}
${scope} .product-card[data-card-variant="spec-card"]{position:relative;border:1px solid var(--pw-line)!important;border-radius:2px!important;background:var(--pw-card)!important;box-shadow:5px 5px 0 var(--pw-shadow)!important;transition:translate .25s ease,box-shadow .25s ease!important}
${scope} .product-card[data-card-variant="spec-card"]:before{position:absolute;inset:0 0 auto;z-index:3;height:5px;background:var(--pw-orange);content:""}
${scope} .product-card[data-card-variant="spec-card"]:hover{translate:-3px -3px;box-shadow:9px 9px 0 color-mix(in srgb,var(--pw-orange) 18%,var(--pw-shadow))!important}
${scope} .product-card[data-card-variant="spec-card"] .product-card-media{aspect-ratio:4/3!important;border-bottom:1px solid var(--pw-line);background:var(--pw-soft)!important}
${scope} .product-card[data-card-variant="spec-card"] .product-card-body{padding:17px!important}
${scope} .product-card[data-card-variant="spec-card"] .product-card-title{font-size:15px!important;font-weight:900!important}
${scope} .product-card[data-card-variant="spec-card"] .product-card-view{color:var(--pw-orange)!important;font-family:monospace;font-weight:900!important;letter-spacing:.08em;text-transform:uppercase}
${scope} .theme-section-root[data-section-variant^="feature-list-"]>section{border-block:1px solid var(--pw-line);background:var(--pw-steel)!important}
${scope} .storefront-footer[data-footer-variant="service-desk"]{border-top:6px solid var(--pw-accent-2)!important;background:var(--pw-orange)!important;color:var(--theme-primary-contrast)!important}
${scope} .storefront-footer[data-footer-variant="service-desk"] :is(h1,h2,h3,h4,p,a,span,li){color:var(--theme-primary-contrast)!important}
${scope} .storefront-footer[data-footer-variant="service-desk"] :is(.storefront-footer-directory,.storefront-footer-bottom){border-color:color-mix(in srgb,var(--theme-primary-contrast) 22%,transparent)!important}
@media(max-width:1180px){${scope} .plantworks-status-note{display:none}${scope} .plantworks-status-rail-inner{grid-template-columns:1fr auto}${scope} .storefront-header-main{grid-template-columns:minmax(230px,.65fr) minmax(360px,1.35fr) auto!important}${scope} .theme-section-root[data-section-variant="categories-operating-zones"] section>div>div:last-child,${scope} .theme-section-root[data-section-variant="products-spec-card"]>section>div:last-child{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:900px){${scope} .theme-section-root[data-section-variant="hero-control-deck"]>section>div{grid-template-columns:1fr minmax(320px,.8fr)!important;padding:42px 28px!important}${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-title{font-size:clamp(2.4rem,5.5vw,3.3rem)!important}${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-media{height:450px!important}}
@media(max-width:767px){${scope} .plantworks-status-rail{height:30px}${scope} .plantworks-status-rail-inner{padding-inline:14px;font-size:8px}${scope} .plantworks-status-link{display:none}${scope} .storefront-header>div:not(.plantworks-status-rail):not(.plantworks-nav-shell){padding-inline:14px!important}${scope} .storefront-header-main{display:flex!important;min-height:66px!important;padding:9px 0!important}${scope} .plantworks-brand-lockup{max-width:215px!important}${scope} .plantworks-brand-mark{width:44px!important;height:44px!important;box-shadow:4px 4px 0 var(--pw-orange)!important}${scope} .plantworks-brand-lockup>span:last-child{max-width:150px!important}${scope} .plantworks-brand-lockup>span:last-child>span:first-child{font-size:18px!important}${scope} .plantworks-utilities>a:not(.plantworks-rfq){display:none!important}${scope} .plantworks-utilities>a:not(.plantworks-rfq),${scope} .plantworks-utilities>div>button{min-height:44px}${scope} .storefront-header-search form>div{height:46px!important;box-shadow:3px 3px 0 var(--pw-line)!important}${scope} .theme-section-root[data-section-variant="hero-control-deck"]>section>div{grid-template-columns:1fr!important;min-height:0!important;gap:34px!important;padding:42px 18px 38px!important}${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-content{width:100%!important;min-width:0!important;overflow:hidden}${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-title{max-width:100%!important;font-size:clamp(2.15rem,9vw,2.85rem)!important;overflow-wrap:anywhere}${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-description{max-width:100%!important;overflow-wrap:anywhere}${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-actions{width:100%!important}${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-actions a{flex:1 1 145px!important}${scope} .theme-section-root[data-section-variant="hero-control-deck"] .theme-hero-media{height:min(92vw,420px)!important;padding:10px;box-shadow:9px 9px 0 color-mix(in srgb,var(--pw-orange) 58%,transparent)}${scope} .theme-section-root[data-section-variant="categories-operating-zones"]>section,${scope} .theme-section-root[data-section-variant="products-spec-card"]>section{padding:52px 14px!important}${scope} .theme-section-root[data-section-variant="categories-operating-zones"] section>div>div:last-child,${scope} .theme-section-root[data-section-variant="products-spec-card"]>section>div:last-child{grid-template-columns:1fr!important}${scope} .theme-section-root[data-section-variant="categories-operating-zones"] .category-card>div{min-height:132px!important}}
@media(max-width:767px){${scope} .storefront-header>.plantworks-status-rail.plantworks-status-rail{height:30px!important}}
@media(prefers-reduced-motion:reduce){${scope} *,${scope} *:before,${scope} *:after{scroll-behavior:auto!important;transition-duration:.01ms!important}}
`;
}

/**
 * Keep every web storefront on the same restrained type and spacing rhythm as
 * the approved Jewellery / Diamond (Aurelia) storefront. This intentionally
 * changes scale only: each industry's composition, colour, borders, imagery
 * and motion remain controlled by its own design rules above.
 */
function jewelryWebScaleCss(design) {
  const scope = `body[data-theme-layout="${design.id}"]`;
  return `
/* jewelry-web-scale-v1: shared web typography and padding reference */
${scope}{--theme-gap:16px;font-size:16px!important;line-height:1.55}
${scope} .storefront-header{padding-block:0!important}
${scope} .storefront-header>div:first-child{padding-inline:clamp(16px,2.2vw,32px)!important}
${scope} .storefront-header-main{min-height:88px!important;gap:24px!important;padding-block:12px!important}
${scope} .storefront-header-main>a:first-child{padding-block:0!important}
${scope} .storefront-header-main>a:first-child>span:last-child>span:first-child{font-size:20px!important;line-height:1.05!important}
${scope} .storefront-header-main>a:first-child>span:last-child>span:last-child{font-size:10px!important;line-height:1.35!important}
${scope} .storefront-header-search form>div{height:52px!important}
${scope} .storefront-header-search input{padding-inline:20px!important;font-size:13px!important}
${scope} .storefront-header-nav{height:54px!important;gap:clamp(18px,2.2vw,36px)!important;padding-inline:32px!important}
${scope} .storefront-header-nav>a,${scope} .storefront-header-nav>details>summary{padding-inline:12px!important;font-size:12px!important;line-height:1.2!important}
${scope} .theme-section-root[data-section-variant^="hero-"]{padding:clamp(18px,2.5vw,36px) 0 0!important}
${scope} .theme-section-root[data-section-variant^="hero-"]>section{width:100%!important;max-width:none!important;margin-inline:0!important;border-radius:0!important}
${scope} .theme-section-root[data-section-variant^="hero-"]>section>div{width:min(100%,var(--theme-max))!important;min-height:560px!important;gap:clamp(32px,4.5vw,68px)!important;margin-inline:auto!important;padding:clamp(42px,5vw,72px)!important}
${scope} .theme-section-root[data-section-variant^="hero-"] .theme-hero-content{display:flex!important;min-width:0!important;max-width:680px!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important}
${scope} .theme-section-root[data-section-variant^="hero-"] .theme-hero-eyebrow{width:max-content!important;max-width:100%!important;margin:0 0 14px!important;padding:7px 11px!important;font-size:10px!important;line-height:1.35!important}
${scope} .theme-section-root[data-section-variant^="hero-"] .theme-hero-title{max-width:15ch!important;margin:0!important;font-size:clamp(2.6rem,3.8vw,3.85rem)!important;line-height:.99!important;letter-spacing:-.045em!important;text-wrap:balance!important}
${scope} .theme-section-root[data-section-variant^="hero-"] .theme-hero-description{max-width:54ch!important;margin-top:20px!important;font-size:clamp(15px,1.1vw,16px)!important;line-height:1.68!important;text-wrap:pretty!important}
${scope} .theme-section-root[data-section-variant^="hero-"] .theme-hero-actions{display:flex!important;align-items:center!important;gap:12px!important;margin-top:28px!important}
${scope} .theme-section-root[data-section-variant^="hero-"] .theme-hero-actions a{min-height:46px!important;padding:13px 22px!important;font-size:11px!important;line-height:1.2!important}
${scope} .theme-section-root[data-section-variant^="categories-"]>section,${scope} .theme-section-root[data-section-variant^="products-"]>section{padding-block:64px!important;padding-inline:clamp(20px,3vw,42px)!important}
${scope} .theme-section-root[data-section-variant^="categories-"] h2,${scope} .theme-section-root[data-section-variant^="products-"] h2{font-size:clamp(1.75rem,2.5vw,2.5rem)!important;line-height:1.08!important;letter-spacing:-.035em!important}
${scope} .theme-section-root[data-section-variant^="categories-"] h2+p,${scope} .theme-section-root[data-section-variant^="products-"] h2+p{margin-top:10px!important;font-size:14px!important;line-height:1.7!important}
${scope} .category-card>div{padding:20px!important}
${scope} .category-card h2{font-size:17px!important;line-height:1.3!important}
${scope} .category-card>div>a:last-child{font-size:10px!important}
${scope} .product-card-body{padding:18px!important}
${scope} .product-card h3{font-size:16px!important;line-height:1.35!important}
${scope} .product-card-body>p,${scope} .product-card-body li{font-size:12px!important;line-height:1.55!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"]>section{padding:80px clamp(22px,4vw,54px)!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"]>section>div{gap:clamp(36px,6vw,84px)!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"] h1{font-size:clamp(2rem,3.2vw,3.25rem)!important;line-height:1.06!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"] p,${scope} .theme-section-root[data-section-variant^="image-with-text-"] li{font-size:15px!important;line-height:1.75!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"]>section,${scope} .theme-section-root[data-section-variant^="testimonial-"]>section{padding-block:64px!important;padding-inline:clamp(20px,3vw,42px)!important}
${scope} .theme-section-root[data-section-variant^="testimonial-"] .theme-testimonial-copy>p:first-child{font-size:clamp(1.5rem,2.4vw,2.35rem)!important;line-height:1.32!important}
${scope} .theme-section-root[data-section-variant^="newsletter-"]>section,${scope} .theme-section-root[data-section-variant^="promo-banner-"]>section{margin-block:24px!important;padding:32px!important}
${scope} .storefront-category-page{padding-bottom:80px!important}
${scope} .storefront-category-page>div{padding-top:24px!important}
${scope} .category-browse-intro{min-height:230px!important;padding:40px 44px!important}
${scope} .category-browse-intro h1{font-size:clamp(2.25rem,3vw,3rem)!important;line-height:1!important}
${scope} .category-browse-description{margin-top:16px!important;font-size:14px!important;line-height:1.7!important}
${scope} .category-results-toolbar{min-height:80px!important;padding:16px 20px!important}
${scope} .category-results-toolbar h1{font-size:22px!important;line-height:1.2!important}
${scope} .category-filter-panel{padding:24px!important}
${scope} .storefront-product-page{padding-bottom:64px!important}
${scope} .storefront-product-page>div{padding-top:28px!important}
${scope} .storefront-product-page h1{font-size:clamp(2rem,2.7vw,2.5rem)!important;line-height:1.08!important}
${scope} .storefront-search-page>section>div,${scope} .storefront-search-page>div{padding-block:48px!important}
${scope} .storefront-search-page h1{font-size:clamp(2rem,2.7vw,2.5rem)!important;line-height:1.1!important}
${scope} .storefront-about-page>section>div{padding-block:64px!important}
${scope} .storefront-about-page h1{font-size:clamp(2.25rem,3.2vw,3rem)!important;line-height:1.06!important}
${scope} .storefront-cart-page,${scope} .storefront-checkout-page{padding-block:48px!important}
${scope} .storefront-cart-page section,${scope} .storefront-checkout-page section,${scope} .storefront-checkout-page form{padding:24px!important}
${scope} .storefront-footer-inner{padding-inline:24px!important}
${scope} .storefront-footer-inner>div{padding-block:48px!important}
${scope} .storefront-footer-brand>a>span:last-child>span:first-child{font-size:18px!important;line-height:1.2!important}
${scope} .storefront-footer-brand>a>span:last-child>span:last-child{font-size:12px!important}
${scope} .storefront-footer-brand>p{margin-top:20px!important;font-size:14px!important;line-height:1.6!important}
${scope} .storefront-footer-directory{gap:clamp(26px,4vw,64px)!important}
${scope} .storefront-footer-directory h2{font-size:12px!important;line-height:1.4!important}
${scope} .storefront-footer-directory ul{margin-top:16px!important}
${scope} .storefront-footer-directory a{padding-block:4px!important;font-size:14px!important;line-height:1.5!important}
${scope} .storefront-footer-bottom{margin-top:40px!important;padding-top:24px!important;font-size:12px!important}
@media(max-width:1100px){${scope} .storefront-header-main{min-height:76px!important;gap:12px!important}${scope} .theme-section-root[data-section-variant^="hero-"]>section>div{padding:48px!important}${scope} .theme-section-root[data-section-variant^="hero-"] .theme-hero-title{font-size:clamp(2.45rem,5.2vw,3.4rem)!important}}
@media(max-width:767px){${scope}{font-size:15px!important}${scope} .storefront-header>div:first-child{padding-inline:14px!important}${scope} .storefront-header-main{min-height:72px!important;padding-block:8px!important}${scope} .storefront-header-main>a:first-child>span:last-child>span:first-child{font-size:18px!important}${scope} .storefront-header-search form>div{height:48px!important}${scope} .theme-section-root[data-section-variant^="hero-"]{padding:14px 0 0!important}${scope} .theme-section-root[data-section-variant^="hero-"]>section{border-radius:0!important}${scope} .theme-section-root[data-section-variant^="hero-"]>section>div{min-height:0!important;gap:30px!important;padding:40px 22px!important}${scope} .theme-section-root[data-section-variant^="hero-"] .theme-hero-title{max-width:16ch!important;font-size:clamp(2.1rem,9vw,2.7rem)!important;line-height:1.02!important}${scope} .theme-section-root[data-section-variant^="hero-"] .theme-hero-description{margin-top:17px!important;font-size:14px!important;line-height:1.65!important}${scope} .theme-section-root[data-section-variant^="hero-"] .theme-hero-actions{width:100%!important;margin-top:24px!important}${scope} .theme-section-root[data-section-variant^="hero-"] .theme-hero-actions a{flex:1 1 150px!important;justify-content:center!important;text-align:center!important}${scope} .theme-section-root[data-section-variant^="categories-"]>section,${scope} .theme-section-root[data-section-variant^="products-"]>section{padding-block:48px!important;padding-inline:16px!important}${scope} .theme-section-root[data-section-variant^="categories-"] h2,${scope} .theme-section-root[data-section-variant^="products-"] h2{font-size:1.85rem!important}${scope} .category-card>div{padding:16px!important}${scope} .product-card-body{padding:14px!important}${scope} .product-card h3{font-size:14px!important}${scope} .theme-section-root[data-section-variant^="image-with-text-"]>section{padding:56px 20px!important}${scope} .theme-section-root[data-section-variant^="image-with-text-"] h1{font-size:2rem!important}${scope} .theme-section-root[data-section-variant^="feature-list-"]>section,${scope} .theme-section-root[data-section-variant^="testimonial-"]>section{padding-block:48px!important;padding-inline:16px!important}${scope} .theme-section-root[data-section-variant^="newsletter-"]>section,${scope} .theme-section-root[data-section-variant^="promo-banner-"]>section{padding:24px 18px!important}${scope} .category-browse-intro{padding:32px 22px!important}${scope} .category-browse-intro h1{font-size:2rem!important}${scope} .category-filter-panel{padding:18px 20px!important}${scope} .storefront-category-page .product-card-body{padding:14px!important}${scope} .storefront-product-page h1{font-size:clamp(1.8rem,8vw,2.2rem)!important}${scope} .storefront-search-page>section>div,${scope} .storefront-search-page>div,${scope} .storefront-about-page>section>div{padding-block:40px!important}${scope} .storefront-cart-page,${scope} .storefront-checkout-page{padding-block:40px!important}${scope} .storefront-cart-page section,${scope} .storefront-checkout-page section,${scope} .storefront-checkout-page form{padding:18px!important}${scope} .storefront-footer-inner{padding-inline:16px!important}${scope} .storefront-footer-inner>div{padding-block:44px!important}${scope} .storefront-footer-directory{gap:28px 20px!important}}
`;
}

function strideFoundryReferenceCss(design) {
  if (design.id !== 'ds-02-web') return '';
  const scope = `body[data-theme-layout="${design.id}"]`;
  return `
/* stridefoundry-reference-v1: original implementation inspired by the supplied wholesale footwear layout */
${scope}{--premium-paper:#fffaf4;--premium-soft:color-mix(in srgb,var(--theme-primary) 7%,#fff);--premium-deep:#241815;background:#fffdf9!important}
${scope} .storefront-header{--header-primary:var(--theme-primary)!important;--header-secondary:var(--theme-secondary)!important;border:0!important;border-bottom:1px solid #eadfd7!important;background:rgba(255,252,247,.97)!important;box-shadow:0 10px 34px rgba(61,36,25,.07)!important;backdrop-filter:blur(18px)!important}
${scope} .storefront-header-main>a:first-child>span:first-child{background:linear-gradient(135deg,var(--theme-secondary),var(--theme-primary))!important;box-shadow:0 8px 24px color-mix(in srgb,var(--theme-primary) 20%,transparent)!important}
${scope} .storefront-header-main>a:first-child img{border-radius:12px!important;background:#fff7ee!important;box-shadow:none!important}
${scope} .storefront-header-main>a:first-child>span:last-child>span:first-child{color:#281a16!important;font-size:21px!important;font-weight:850!important;letter-spacing:-.035em!important}
${scope} .storefront-header-main>a:first-child>span:last-child>span:last-child{color:#9a6d59!important;font-size:9px!important;font-weight:750!important;letter-spacing:.13em!important;text-transform:uppercase}
${scope} .storefront-header-search form>div{height:44px!important;border:1px solid #e6d8ce!important;border-radius:8px!important;background:#fff!important;box-shadow:0 7px 22px rgba(70,39,25,.05)!important}
${scope} .storefront-header-search input{font-size:12px!important}
${scope} .storefront-header-search button{width:52px!important;border-radius:0 8px 8px 0!important;background:var(--theme-primary)!important}
${scope} .storefront-header-nav{height:72px!important;justify-content:center!important;gap:clamp(12px,1.45vw,24px)!important;padding-inline:16px!important;background:transparent!important}
${scope} .storefront-header-nav>a,${scope} .storefront-header-nav>details>summary{padding-inline:7px!important;color:#47352e!important;font-size:10px!important;font-weight:800!important;letter-spacing:.035em!important}
${scope} .storefront-header-nav>a:hover,${scope} .storefront-header-nav>details>summary:hover{color:var(--theme-primary)!important}
${scope} .footwear-bulk-enquiry{min-height:40px;align-items:center;justify-content:center;border-radius:7px;background:var(--theme-primary);padding:0 17px;color:var(--theme-primary-contrast);font-size:10px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 9px 22px color-mix(in srgb,var(--theme-primary) 18%,transparent);transition:transform .2s ease,box-shadow .2s ease}
${scope} .footwear-bulk-enquiry:hover{transform:translateY(-2px);box-shadow:0 13px 28px rgba(139,46,46,.24)}
@media(min-width:1024px){${scope} .storefront-header{display:grid!important;grid-template-columns:minmax(235px,285px) minmax(420px,1fr) auto;grid-template-areas:"brand nav tools" "search search search"}${scope} .storefront-header>div:first-child,${scope} .storefront-header-main{display:contents!important}${scope} .storefront-header-main>a:first-child{grid-area:brand;align-self:center;max-width:285px!important;padding:14px 0 14px 30px!important}${scope} .storefront-header-main>.storefront-header-search{grid-area:search;width:min(720px,calc(100vw - 60px))!important;max-width:720px!important;padding:0 0 12px 30px!important}${scope} .storefront-header-main>div:last-child{grid-area:tools;align-self:center;margin:0!important;padding-right:30px!important;gap:12px!important}${scope} .storefront-header>div:last-child{grid-area:nav;align-self:stretch;margin:0!important;border:0!important;background:transparent!important}${scope} .storefront-header-main>div:last-child>a:not(.footwear-bulk-enquiry) span[class*="text-"]{font-size:10px!important}}
${scope} .theme-section-root[data-section-variant^="promo-banner-"]{display:none!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]{padding:0 24px 14px!important;background:#fffdf9!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section{max-width:1380px!important;border:1px solid #ead9cc!important;border-radius:12px!important;background:linear-gradient(105deg,#fff9f1 0 49%,#f2dfcf 49% 100%)!important;box-shadow:0 24px 66px rgba(83,48,32,.1)!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section:before{inset:auto auto -140px 31%!important;width:420px!important;height:420px!important;background:#f8ede4!important;clip-path:polygon(0 48%,100% 0,75% 100%,18% 100%)!important;border-radius:0!important;opacity:.94}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section:after{right:9%!important;bottom:-34%!important;width:460px!important;height:460px!important;border:0!important;background:rgba(255,255,255,.42)!important;clip-path:polygon(42% 0,100% 18%,82% 100%,0 76%)!important;border-radius:0!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div{grid-template-columns:minmax(330px,.78fr) minmax(480px,1.22fr)!important;min-height:485px!important;gap:24px!important;padding:48px 56px!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div>div:first-child{max-width:510px!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] h1{max-width:12ch!important;color:#351b18!important;font-size:clamp(2.55rem,3.45vw,3.45rem)!important;font-weight:850!important;line-height:.98!important;letter-spacing:-.05em!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] h1+p{max-width:46ch!important;margin-top:18px!important;color:#725f55!important;font-size:14px!important;line-height:1.65!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] a{min-height:44px!important;border-radius:6px!important;padding:12px 20px!important;font-size:10px!important;letter-spacing:.07em!important;text-transform:uppercase}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] a:first-child{background:var(--theme-primary)!important;box-shadow:0 10px 25px color-mix(in srgb,var(--theme-primary) 20%,transparent)!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] a:last-child{border-color:#bfa99b!important;background:rgba(255,255,255,.54)!important;color:#35231d!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div>div:last-child{position:relative;z-index:2;align-self:stretch;display:flex;align-items:center;justify-content:center;overflow:visible}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] img{height:405px!important;width:min(100%,660px)!important;border:0!important;border-radius:0!important;background:transparent!important;object-fit:contain!important;mix-blend-mode:multiply;filter:saturate(.92) contrast(1.02);box-shadow:none!important;transform:rotate(-3deg)!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] img:hover{transform:rotate(-1deg) translateY(-5px)!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"]{background:#fffdf9!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"]>section{max-width:1380px!important;padding:14px 24px 42px!important;background:#fff!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"]>section>div>h2,${scope} .theme-section-root[data-section-variant="categories-image-tiles"]>section>div>p{display:none!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"] section>div>div:last-child{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;margin-top:0!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"] .category-card{border:1px solid #eadfd7!important;border-radius:7px!important;background:#fbf5ef!important;box-shadow:none!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"] .category-card:hover{border-color:#cda992!important;box-shadow:0 14px 30px rgba(75,43,29,.11)!important;transform:translateY(-4px)!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"] .category-card>a:first-child{display:block!important;height:142px!important;border:0!important;background:linear-gradient(145deg,#f4e6d9,#fff)!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"] .category-card img{object-fit:contain!important;padding:8px!important;mix-blend-mode:multiply}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"] .category-card>div{padding:11px 12px 13px!important;text-align:center}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"] .category-card h2{font-size:13px!important;font-weight:800!important;line-height:1.25!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"] .category-card p,${scope} .theme-section-root[data-section-variant="categories-image-tiles"] .category-card>div>a:last-child{display:none!important}
${scope} .theme-section-root[data-section-variant="products-image-first"]{background:#f8f1ea!important}
${scope} .theme-section-root[data-section-variant="products-image-first"]>section{max-width:1380px!important;padding-block:72px!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] .product-card{border-color:#ead9cc!important;border-radius:9px!important;box-shadow:0 10px 30px rgba(72,42,28,.07)!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] .product-card-media{background:#fffaf5!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] .product-card-media img{object-fit:contain!important;mix-blend-mode:multiply}
${scope} .theme-section-root[data-section-variant="feature-list-"]>section{max-width:1380px!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"]{background:#2a1b17!important}
${scope} .storefront-footer{border-top:5px solid var(--theme-secondary)!important;background:#241815!important}
${scope} .storefront-footer:before{background:linear-gradient(90deg,transparent,var(--theme-secondary),transparent)!important}
${scope} .storefront-footer-directory h2{color:#e7a678!important}
@media(max-width:1023px){${scope} .storefront-header{display:block!important}${scope} .storefront-header>div:first-child{display:block!important;padding-inline:16px!important}${scope} .storefront-header-main{display:flex!important;min-height:72px!important;padding-block:9px!important}${scope} .storefront-header-main>a:first-child{padding:0!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div{grid-template-columns:minmax(0,.9fr) minmax(340px,1.1fr)!important;padding:44px 38px!important}${scope} .theme-section-root[data-section-variant="categories-image-tiles"] section>div>div:last-child{grid-template-columns:repeat(4,minmax(150px,1fr))!important;overflow-x:auto!important}}
@media(max-width:767px){${scope} .theme-section-root[data-section-variant="hero-asymmetric"]{padding:12px 12px 8px!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section{background:linear-gradient(180deg,#fff9f1 0 54%,#f2dfcf 54% 100%)!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div{grid-template-columns:1fr!important;gap:24px!important;padding:36px 22px 24px!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"] h1{font-size:clamp(2.15rem,10vw,2.75rem)!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"] img{height:280px!important;transform:rotate(-2deg)!important}${scope} .theme-section-root[data-section-variant="categories-image-tiles"]>section{padding:10px 14px 34px!important}${scope} .theme-section-root[data-section-variant="categories-image-tiles"] section>div>div:last-child{grid-template-columns:repeat(4,150px)!important;gap:10px!important}${scope} .theme-section-root[data-section-variant="categories-image-tiles"] .category-card>a:first-child{height:112px!important}${scope} .theme-section-root[data-section-variant="products-image-first"]>section{padding-block:52px!important}}
`;
}

function strideFoundryPremiumRefinementCss(design) {
  if (design.id !== 'ds-02-web') return '';
  const scope = `body[data-theme-layout="${design.id}"]`;
  return `
/* stridefoundry-premium-v2: jewellery-grade editorial depth for the footwear storefront */
${scope}{--stride-wine:#762b27;--stride-wine-deep:#291714;--stride-clay:#c96f45;--stride-ivory:#fffaf3;--stride-blush:#f4e5da;--stride-line:#e8d5c7;background:#fffaf4!important}
${scope} .storefront-header{background:linear-gradient(120deg,rgba(255,253,249,.985),rgba(249,239,231,.97))!important;box-shadow:0 14px 46px rgba(73,39,25,.09)!important}
${scope} .storefront-header-main>a:first-child>span:last-child>span:first-child{font-size:22px!important}
${scope} .storefront-header-search form>div{border-color:#ddc9bb!important;box-shadow:0 10px 30px rgba(84,48,31,.075)!important}
${scope} .storefront-header-nav>a,${scope} .storefront-header-nav>details>summary{position:relative}
${scope} .storefront-header-nav>a:after,${scope} .storefront-header-nav>details>summary:after{position:absolute;right:7px;bottom:15px;left:7px;height:1px;content:"";background:var(--theme-primary);transform:scaleX(0);transform-origin:right;transition:transform .25s ease}
${scope} .storefront-header-nav>a:hover:after,${scope} .storefront-header-nav>details>summary:hover:after{transform:scaleX(1);transform-origin:left}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]{padding-top:22px!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section{overflow:hidden!important;border-color:#e1cabb!important;border-radius:20px!important;background:linear-gradient(108deg,#fffaf3 0 50%,#f0d8c6 50% 100%)!important;box-shadow:0 34px 90px rgba(74,39,25,.14)!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div{min-height:520px!important;padding:58px 68px!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] h1{font-size:clamp(2.7rem,3.55vw,3.65rem)!important;line-height:.97!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] h1:before{display:block;width:44px;height:3px;margin-bottom:22px;border-radius:99px;content:"";background:linear-gradient(90deg,var(--theme-primary),var(--theme-secondary))}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div>div:last-child:before{position:absolute;inset:12% 7% 8% 10%;z-index:-1;border:1px solid rgba(118,43,39,.16);border-radius:48% 52% 47% 53%/53% 43% 57% 47%;content:"";background:rgba(255,255,255,.35);transform:rotate(-7deg)}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div>div:last-child:after{position:absolute;right:9%;bottom:8%;width:74px;height:74px;border:1px solid rgba(118,43,39,.22);border-radius:50%;content:"";box-shadow:inset 0 0 0 9px rgba(255,255,255,.28)}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] img{height:400px!important;width:min(92%,620px)!important;padding:18px!important;border:1px solid rgba(255,255,255,.8)!important;border-radius:22px!important;background:rgba(255,255,255,.56)!important;mix-blend-mode:normal!important;box-shadow:0 26px 54px rgba(74,39,25,.16)!important;transform:rotate(-2deg)!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] img:hover{transform:rotate(0) translateY(-7px)!important;box-shadow:0 34px 66px rgba(74,39,25,.2)!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"]{position:relative;z-index:4}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"]>section{margin-top:-28px!important;padding:16px 22px 32px!important;border:1px solid rgba(224,202,187,.8)!important;border-radius:16px!important;background:rgba(255,253,249,.94)!important;box-shadow:0 20px 52px rgba(76,42,27,.105)!important;backdrop-filter:blur(14px)}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"] .category-card{overflow:hidden;border-radius:12px!important;background:linear-gradient(145deg,#fbf3ec,#fffdf9)!important;box-shadow:0 8px 24px rgba(83,47,30,.055)!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"] .category-card>a:first-child{height:152px!important;background:radial-gradient(circle at 50% 44%,#fff 0 28%,#f5e8dd 100%)!important}
${scope} .theme-section-root[data-section-variant="products-image-first"]{background:linear-gradient(135deg,#f7ede5 0%,#fffaf4 54%,#f3e5da 100%)!important}
${scope} .theme-section-root[data-section-variant="products-image-first"]>section{max-width:1320px!important;padding:78px 30px 88px!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] h2{max-width:12ch!important;font-size:clamp(2.15rem,3vw,3.15rem)!important;font-weight:850!important;line-height:1!important;letter-spacing:-.045em!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] h2:after{display:block;width:58px;height:3px;margin-top:18px;border-radius:99px;content:"";background:linear-gradient(90deg,var(--theme-primary),var(--theme-secondary))}
${scope} .theme-section-root[data-section-variant="products-image-first"]>section>p{max-width:620px!important;margin-top:16px!important;color:#79675e!important;line-height:1.7!important}
${scope} .theme-section-root[data-section-variant="products-image-first"]>section>div:last-child{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:18px!important;margin-top:30px!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] .product-card{overflow:hidden;border:1px solid rgba(218,193,176,.82)!important;border-radius:18px!important;background:#fffdf9!important;box-shadow:0 14px 38px rgba(69,37,23,.085)!important;transition:transform .3s ease,border-color .3s ease,box-shadow .3s ease!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] .product-card:hover{border-color:#c89b80!important;box-shadow:0 26px 58px rgba(69,37,23,.14)!important;transform:translateY(-7px)!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] .product-card-media{aspect-ratio:1.08/1!important;background:radial-gradient(circle at 50% 43%,#fff 0 30%,#f3e7de 100%)!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] .product-card-media img{padding:12px!important;transition:transform .55s cubic-bezier(.16,1,.3,1)!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] .product-card:hover .product-card-media img{transform:scale(1.045)!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] .product-card-body{gap:8px!important;padding:16px 16px 18px!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] .product-card h3{font-size:15px!important;line-height:1.32!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] .product-card-description{font-size:11px!important;line-height:1.55!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] .product-card-purchase{padding-top:10px!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] .product-card-view{margin-top:10px!important;font-size:10px!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"]{border:0!important;background:linear-gradient(180deg,#fffdf9,#fff8f1)!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"]>section{max-width:1260px!important;padding:84px 30px!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"] h2{font-size:clamp(2rem,2.7vw,2.8rem)!important;font-weight:850!important;letter-spacing:-.04em!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"] ul{gap:20px!important;margin-top:36px!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"] li{position:relative;overflow:hidden;min-height:218px;padding:32px!important;border-color:#ead8cc!important;border-radius:18px!important;background:linear-gradient(145deg,#fff,#fff9f3)!important;box-shadow:0 18px 44px rgba(73,40,25,.08)!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"] li:after{position:absolute;right:-32px;bottom:-42px;width:112px;height:112px;border:18px solid rgba(201,111,69,.075);border-radius:50%;content:""}
${scope} .theme-section-root[data-section-variant^="feature-list-"] li>p:first-child{border-radius:50%!important;background:color-mix(in srgb,var(--theme-primary) 12%,#fff)!important;color:var(--theme-primary)!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"] li h3{font-size:17px!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"]{position:relative;overflow:hidden;background:linear-gradient(125deg,#251512 0%,#38201b 58%,#4a2721 100%)!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"]:before{position:absolute;top:-170px;right:-90px;width:460px;height:460px;border:1px solid rgba(217,138,89,.16);border-radius:50%;content:"";box-shadow:inset 0 0 0 65px rgba(217,138,89,.035)}
${scope} .theme-section-root[data-section-variant^="image-with-text-"]>section{max-width:1260px!important;padding:96px 34px!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"]>section>div{gap:clamp(60px,8vw,112px)!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"] img{min-height:470px!important;padding:14px!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:22px!important;background:#f5ece5!important;object-fit:contain!important;box-shadow:18px 20px 0 rgba(160,66,49,.58),0 36px 70px rgba(0,0,0,.3)!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"] h1{max-width:12ch!important;font-size:clamp(2.45rem,3.8vw,3.8rem)!important;font-weight:780!important;line-height:1!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"] p{max-width:48ch!important}
${scope} .theme-section-root[data-section-variant^="testimonial-"]{background:#fffaf4!important}
${scope} .theme-section-root[data-section-variant^="testimonial-"]>section{max-width:1120px!important;padding:82px 30px!important}
${scope} .theme-section-root[data-section-variant^="testimonial-"]>section>div{position:relative;padding:58px clamp(30px,6vw,88px)!important;border:1px solid #ead7ca;border-radius:24px;background:linear-gradient(145deg,#fff,#f8ede4);box-shadow:0 24px 60px rgba(69,37,23,.09)}
${scope} .theme-section-root[data-section-variant^="testimonial-"]>section>div:before{display:block;margin-bottom:12px;content:"\\201C";color:#c96f45;font-size:82px;font-weight:800;line-height:.55}
${scope} .theme-section-root[data-section-variant^="testimonial-"] .theme-testimonial-title{color:var(--theme-primary)!important;font-size:11px!important;font-weight:850!important;letter-spacing:.17em!important;text-transform:uppercase}
${scope} .theme-section-root[data-section-variant^="testimonial-"] .theme-testimonial-copy>p:first-child{max-width:820px;margin-inline:auto;color:#321e19!important;font-size:clamp(1.65rem,2.6vw,2.55rem)!important;font-weight:720!important;line-height:1.24!important;letter-spacing:-.035em!important}
${scope} .theme-section-root[data-section-variant^="newsletter-"]{padding:0 24px 34px!important;background:#fffaf4!important}
${scope} .theme-section-root[data-section-variant^="newsletter-"]>section{position:relative;overflow:hidden;max-width:1260px!important;padding:54px 30px!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:22px!important;background:linear-gradient(115deg,#291714,#672923 66%,#8b3a2d)!important;box-shadow:0 28px 70px rgba(68,34,24,.2)!important}
${scope} .theme-section-root[data-section-variant^="newsletter-"]>section:after{position:absolute;right:-70px;bottom:-105px;width:270px;height:270px;border:1px solid rgba(255,255,255,.15);border-radius:50%;content:"";box-shadow:inset 0 0 0 45px rgba(255,255,255,.035)}
${scope} .theme-section-root[data-section-variant^="newsletter-"] h3{font-size:clamp(1.9rem,2.8vw,2.8rem)!important;letter-spacing:-.04em!important}
${scope} .theme-section-root[data-section-variant^="newsletter-"] form{position:relative;z-index:1;max-width:520px!important;padding:6px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.08)}
${scope} .theme-section-root[data-section-variant^="newsletter-"] input{border:0!important;background:transparent!important;color:#fff!important;outline:none!important}
${scope} .theme-section-root[data-section-variant^="newsletter-"] button{border-radius:8px!important;background:#fff7ee!important;color:#351c17!important;font-weight:800!important}
${scope} .storefront-footer{border-top-width:0!important;background:linear-gradient(135deg,#211310,#2d1915)!important}
${scope} .storefront-footer-inner>div{padding-block:62px!important}
${scope} .storefront-footer-bottom{border-color:rgba(255,255,255,.11)!important}
${scope}.storefront-motion-ready .theme-section-root.is-motion-visible[data-section-variant="hero-asymmetric"]>section{animation:stride-premium-rise .8s cubic-bezier(.16,1,.3,1) both}
${scope}.storefront-motion-ready .theme-section-root.is-motion-visible[data-section-variant="products-image-first"] .product-card{animation:stride-premium-rise .72s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--reveal-index,0)*65ms)}
@keyframes stride-premium-rise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:1279px){${scope} .theme-section-root[data-section-variant="products-image-first"]>section>div:last-child{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
@media(max-width:1023px){${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div{min-height:470px!important;padding:46px 38px!important}${scope} .theme-section-root[data-section-variant="products-image-first"]>section>div:last-child{grid-template-columns:repeat(2,minmax(0,1fr))!important}${scope} .theme-section-root[data-section-variant^="image-with-text-"] img{min-height:400px!important}}
@media(max-width:767px){${scope} .theme-section-root[data-section-variant="hero-asymmetric"]{padding-top:12px!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section{border-radius:16px!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div{padding:38px 22px 28px!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"] h1{font-size:clamp(2.15rem,10vw,2.8rem)!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"] img{height:270px!important;padding:10px!important;border-radius:16px!important}${scope} .theme-section-root[data-section-variant="categories-image-tiles"]>section{margin-top:-12px!important;border-radius:14px!important}${scope} .theme-section-root[data-section-variant="products-image-first"]>section{padding:58px 14px 64px!important}${scope} .theme-section-root[data-section-variant="products-image-first"]>section>div:last-child{grid-template-columns:1fr!important;gap:18px!important}${scope} .theme-section-root[data-section-variant^="feature-list-"]>section{padding:58px 16px!important}${scope} .theme-section-root[data-section-variant^="image-with-text-"]>section{padding:66px 20px 74px!important}${scope} .theme-section-root[data-section-variant^="image-with-text-"] img{min-height:320px!important;box-shadow:10px 12px 0 rgba(160,66,49,.58)!important}${scope} .theme-section-root[data-section-variant^="image-with-text-"] h1{font-size:2.25rem!important}${scope} .theme-section-root[data-section-variant^="testimonial-"]>section{padding:52px 14px!important}${scope} .theme-section-root[data-section-variant^="testimonial-"]>section>div{padding:42px 22px!important}${scope} .theme-section-root[data-section-variant^="newsletter-"]{padding:0 12px 24px!important}${scope} .theme-section-root[data-section-variant^="newsletter-"]>section{padding:42px 18px!important}${scope} .theme-section-root[data-section-variant^="newsletter-"] form{flex-direction:column!important}${scope} .theme-section-root[data-section-variant^="newsletter-"] input,${scope} .theme-section-root[data-section-variant^="newsletter-"] button{width:100%!important}}
@media(prefers-reduced-motion:reduce){${scope} .theme-section-root,${scope} .product-card,${scope} img{animation:none!important;transition:none!important}}
`;
}

function strideFoundryLuxuryRedesignCss(design) {
  if (design.id !== 'ds-02-web') return '';
  const scope = `body[data-theme-layout="${design.id}"]`;
  return `
/* stridefoundry-luxury-v3: espresso editorial footwear house */
${scope}{--stride-ink:#1c1412;--stride-espresso:#211512;--stride-cognac:#b95e35;--stride-sand:#d8ad86;--stride-cream:#f7f1e9;--stride-paper:#fffdf9;background:#f7f1e9!important;color:#241916!important}
${scope} .storefront-header{z-index:100!important;overflow:visible!important;border:0!important;border-bottom:1px solid rgba(216,173,134,.25)!important;background:linear-gradient(110deg,#17100e,#241713 58%,#18110f)!important;box-shadow:0 16px 45px rgba(27,15,11,.22)!important}
${scope} .storefront-header-main>a:first-child>span:first-child{background:linear-gradient(145deg,#d38355,#8f3925)!important;box-shadow:0 8px 24px rgba(0,0,0,.28)!important}
${scope} .storefront-header-main>a:first-child>span:last-child>span:first-child{color:#fffaf4!important;font-size:20px!important;font-weight:820!important;letter-spacing:-.035em!important}
${scope} .storefront-header-main>a:first-child>span:last-child>span:last-child{color:#d8ad86!important;font-size:9px!important;letter-spacing:.19em!important}
${scope} .storefront-header-search form>div{height:46px!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:999px!important;background:rgba(255,255,255,.075)!important;box-shadow:inset 0 1px rgba(255,255,255,.06),0 10px 24px rgba(0,0,0,.13)!important}
${scope} .storefront-header-search input{color:#fff!important}
${scope} .storefront-header-search input::placeholder{color:rgba(255,255,255,.52)!important}
${scope} .storefront-header-search select{border-color:rgba(255,255,255,.12)!important;background:#211512!important;color:#f9eee5!important}
${scope} .storefront-header-search button{width:47px!important;border-radius:50%!important;background:linear-gradient(145deg,#c76c40,#9a4029)!important;box-shadow:0 6px 18px rgba(185,94,53,.3)!important}
${scope} .storefront-search-form-footwear>div{height:48px!important;align-items:center!important;overflow:visible!important;border:1px solid rgba(230,190,158,.24)!important;border-radius:999px!important;background:linear-gradient(110deg,rgba(255,255,255,.095),rgba(255,255,255,.045))!important;padding:4px 5px 4px 2px!important;box-shadow:inset 0 1px rgba(255,255,255,.07),0 10px 28px rgba(0,0,0,.18)!important;transition:border-color .25s ease,box-shadow .25s ease,background .25s ease!important}
${scope} .storefront-search-form-footwear>div:focus-within{border-color:rgba(216,135,89,.78)!important;background:rgba(255,255,255,.11)!important;box-shadow:0 0 0 4px rgba(185,94,53,.12),0 12px 30px rgba(0,0,0,.2)!important}
${scope} .storefront-search-form-footwear input{height:40px!important;padding:0 14px 0 17px!important;background:transparent!important;color:#fffaf4!important;font-size:11px!important;font-weight:600!important;letter-spacing:.01em!important}
${scope} .storefront-search-form-footwear input::placeholder{color:rgba(255,250,244,.5)!important}
${scope} .storefront-search-form-footwear input::-webkit-search-cancel-button{filter:invert(1);opacity:.5}
${scope} .storefront-search-form-footwear button{width:38px!important;height:38px!important;flex:none!important;border-radius:50%!important;background:linear-gradient(145deg,#d0784c,#a4442d)!important;color:#fff!important;box-shadow:0 7px 18px rgba(185,94,53,.32)!important;transition:transform .2s ease,box-shadow .2s ease!important}
${scope} .storefront-search-form-footwear button:hover{transform:translateY(-1px) scale(1.03);box-shadow:0 10px 22px rgba(185,94,53,.4)!important}
${scope} .storefront-search-form-footwear button svg{width:18px!important;height:18px!important}
${scope} .storefront-header-nav{height:88px!important;justify-content:center!important;gap:clamp(12px,1.3vw,23px)!important;padding:0 12px!important;background:transparent!important}
${scope} .storefront-header-nav>a,${scope} .storefront-header-nav>details>summary{padding-inline:4px!important;color:rgba(255,250,244,.76)!important;font-size:11px!important;font-weight:780!important;letter-spacing:.065em!important;text-transform:uppercase}
${scope} .storefront-header-nav>a:hover,${scope} .storefront-header-nav>details>summary:hover{color:#fff!important}
${scope} .storefront-header-nav>a:after,${scope} .storefront-header-nav>details>summary:after{bottom:25px!important;background:#d88759!important}
${scope} .footwear-bulk-enquiry{min-height:44px;border:1px solid #c96c43;border-radius:999px!important;background:linear-gradient(145deg,#c66a40,#963b28)!important;padding:0 19px!important;color:#fff!important;box-shadow:0 10px 28px rgba(185,94,53,.27)!important}
${scope} .industrial-commerce-trigger{height:44px;gap:9px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(255,255,255,.07);padding:0 15px;color:#fff;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;transition:border-color .25s ease,background .25s ease}
${scope} .industrial-commerce-trigger:hover{border-color:rgba(216,135,89,.72);background:rgba(255,255,255,.11)}
${scope} .industrial-commerce-trigger-icon{display:grid;width:25px;height:25px;place-items:center;border-radius:50%;background:#b95e35}
${scope} .industrial-commerce-trigger svg{width:15px;height:15px}
${scope} .industrial-commerce-panel{z-index:120!important;top:calc(100% + 14px)!important;width:338px;overflow:hidden;border:1px solid rgba(216,173,134,.3);border-radius:20px;background:rgba(31,20,17,.98);box-shadow:0 28px 70px rgba(0,0,0,.38);backdrop-filter:blur(18px)}
${scope} .industrial-commerce-panel:before{position:absolute;top:-7px;right:28px;width:14px;height:14px;border-top:1px solid rgba(216,173,134,.3);border-left:1px solid rgba(216,173,134,.3);content:"";background:#1f1411;transform:rotate(45deg)}
${scope} .industrial-commerce-panel-heading{display:flex;flex-direction:column;padding:22px 22px 16px;border-bottom:1px solid rgba(255,255,255,.09)}
${scope} .industrial-commerce-panel-heading>span{color:#d88759;font-size:10px;font-weight:850;letter-spacing:.15em;text-transform:uppercase}
${scope} .industrial-commerce-panel-heading>small{margin-top:5px;color:rgba(255,255,255,.48);font-size:11px}
${scope} .industrial-commerce-panel-links{display:grid;padding:10px}
${scope} .industrial-commerce-panel-links>a,${scope} .industrial-commerce-panel-links>button{display:flex!important;min-height:62px!important;align-items:center!important;gap:12px!important;border:0!important;border-radius:13px!important;padding:10px 12px!important;color:#fff!important;text-decoration:none!important}
${scope} .industrial-commerce-panel-links>a:hover,${scope} .industrial-commerce-panel-links>button:hover{background:rgba(255,255,255,.07)!important}
${scope} .industrial-commerce-panel-links small{color:rgba(255,255,255,.46)!important}
@media(min-width:1180px){${scope} .storefront-header{display:grid!important;grid-template-columns:minmax(230px,1fr) auto minmax(230px,1fr);grid-template-rows:84px 66px;grid-template-areas:"brand nav tools" "search search search";align-items:center;min-height:150px;padding-inline:max(20px,calc((100vw - 1500px)/2))}${scope} .storefront-header>div:first-child,${scope} .storefront-header-main{display:contents!important}${scope} .storefront-header-main>a:first-child{grid-area:brand;align-self:center;justify-self:start;padding:0!important}${scope} .storefront-header-main>.storefront-header-search{grid-area:search;align-self:start;justify-self:center;width:min(680px,calc(100vw - 48px))!important;padding:5px 0 13px!important}${scope} .storefront-header-main>div:last-child{grid-area:tools;align-self:center;justify-self:end;margin:0!important;padding:0!important;gap:10px!important}${scope} .storefront-header>div:last-child{grid-area:nav;align-self:stretch;justify-self:center;margin:0!important;border:0!important;background:transparent!important}${scope} .storefront-header-nav{height:84px!important;justify-content:center!important}${scope} .storefront-search-form-footwear>div{border-color:rgba(216,173,134,.42)!important;background:linear-gradient(110deg,#fffdf9,#f4e8dd)!important;box-shadow:0 13px 34px rgba(0,0,0,.24)!important}${scope} .storefront-search-form-footwear>div:focus-within{border-color:#d88759!important;background:#fffdf9!important;box-shadow:0 0 0 4px rgba(185,94,53,.15),0 16px 38px rgba(0,0,0,.26)!important}${scope} .storefront-search-form-footwear input{color:#2b1a16!important;font-size:12px!important}${scope} .storefront-search-form-footwear input::placeholder{color:#8b756b!important}}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]{padding:24px 0 58px!important;background:#f7f1e9!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section{isolation:isolate;width:100%!important;max-width:none!important;overflow:hidden!important;border:0!important;border-radius:0!important;background:radial-gradient(circle at 76% 24%,rgba(192,106,65,.24),transparent 27%),linear-gradient(118deg,#1b1210 0%,#2a1915 55%,#43241c 100%)!important;box-shadow:0 24px 68px rgba(40,20,14,.2)!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section:before{inset:auto auto -215px -80px!important;width:510px!important;height:510px!important;border:1px solid rgba(216,173,134,.14)!important;border-radius:50%!important;background:transparent!important;clip-path:none!important;box-shadow:inset 0 0 0 72px rgba(216,173,134,.025)}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section:after{top:-180px!important;right:-80px!important;bottom:auto!important;width:520px!important;height:520px!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:50%!important;background:transparent!important;clip-path:none!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div{width:min(100%,1450px)!important;grid-template-columns:minmax(360px,.86fr) minmax(550px,1.14fr)!important;min-height:520px!important;gap:52px!important;margin-inline:auto!important;padding:44px 64px 42px!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] .theme-hero-content{max-width:600px!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] .theme-hero-title{max-width:13.5ch!important;margin:0!important;color:#fffaf4!important;font-size:clamp(2.7rem,3.3vw,3.65rem)!important;font-weight:760!important;line-height:.96!important;letter-spacing:-.05em!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] .theme-hero-title:before{display:none!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] .theme-hero-description{max-width:50ch!important;margin-top:20px!important;color:rgba(255,247,239,.72)!important;font-size:15px!important;line-height:1.68!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] .theme-hero-eyebrow{display:inline-flex!important;width:auto!important;align-items:center;gap:11px;margin:0 0 15px!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;color:#f0a878!important;font-size:10px!important;font-weight:900!important;line-height:1.4!important;letter-spacing:.16em!important;text-shadow:0 1px 18px rgba(240,168,120,.18)!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] .theme-hero-eyebrow:before{display:block!important;width:34px;height:2px;flex:none;content:"";background:linear-gradient(90deg,#d36f43,#f0b087)}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] .theme-hero-actions{margin-top:26px!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] .theme-hero-actions a{min-height:46px!important;border-radius:999px!important;padding:13px 22px!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] .theme-hero-actions a:first-child{background:linear-gradient(145deg,#ce7348,#a1432d)!important;box-shadow:0 12px 30px rgba(185,94,53,.32)!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] .theme-hero-actions a:last-child{border-color:rgba(255,255,255,.22)!important;background:rgba(255,255,255,.055)!important;color:#fffaf4!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div>div:last-child{position:relative;z-index:2;height:440px;align-self:center;overflow:visible!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div>div:last-child:before{inset:20px 2% 20px 20%!important;z-index:-1;border:1px solid rgba(216,173,134,.2)!important;border-radius:240px 240px 28px 28px!important;background:linear-gradient(155deg,rgba(255,255,255,.08),rgba(255,255,255,.015))!important;transform:none!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div>div:last-child:after{right:2%!important;bottom:12px!important;width:112px!important;height:112px!important;border-color:rgba(216,173,134,.3)!important;box-shadow:inset 0 0 0 16px rgba(216,173,134,.045)!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] img.aurelia-hero-main-image{position:absolute;top:0;right:2%;width:72%!important;height:415px!important;margin:0!important;padding:20px!important;border:1px solid rgba(255,255,255,.24)!important;border-radius:205px 205px 22px 22px!important;background:linear-gradient(145deg,#f7f2ed,#e9e4df)!important;object-fit:contain!important;object-position:center!important;mix-blend-mode:normal!important;filter:saturate(.84) contrast(1.02)!important;box-shadow:0 28px 62px rgba(0,0,0,.33)!important;transform:none!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] img.aurelia-hero-main-image:hover{transform:translateY(-6px)!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] img.aurelia-hero-accent{position:absolute!important;bottom:16px!important;left:2%!important;z-index:5!important;width:160px!important;height:160px!important;margin:0!important;padding:10px!important;border:1px solid rgba(255,255,255,.4)!important;border-radius:18px!important;background:linear-gradient(145deg,#fffaf5,#e8dfd8)!important;object-fit:contain!important;object-position:center!important;mix-blend-mode:normal!important;filter:saturate(.92) contrast(1.02)!important;box-shadow:0 22px 48px rgba(0,0,0,.4)!important;transform:rotate(-3deg)!important;transition:transform .45s cubic-bezier(.16,1,.3,1)!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] img.aurelia-hero-accent:hover{transform:rotate(0) translateY(-7px)!important}
${scope} .theme-section-root[data-section-variant="hero-asymmetric"] .aurelia-hero-index{position:absolute;right:8%;bottom:-7px;z-index:5;color:#e0b08d;font-size:9px;font-weight:800;letter-spacing:.18em}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"]{padding:0 24px 38px!important;background:#f7f1e9!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"]>section{max-width:1280px!important;margin-top:-34px!important;padding:24px!important;border-color:rgba(117,75,55,.18)!important;border-radius:24px!important;background:rgba(255,253,249,.97)!important;box-shadow:0 28px 70px rgba(54,29,20,.14)!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"] section>div>div:last-child{gap:16px!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"] .category-card{border:0!important;border-radius:16px!important;background:#f3ebe4!important;box-shadow:none!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"] .category-card>a:first-child{height:164px!important;background:linear-gradient(145deg,#eadbcf,#fffaf4)!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"] .category-card>div{padding:15px 14px 17px!important}
${scope} .theme-section-root[data-section-variant="categories-image-tiles"] .category-card h2{font-size:12px!important;letter-spacing:.025em!important}
${scope} .theme-section-root[data-section-variant="products-image-first"]{padding-top:32px!important;background:#f7f1e9!important}
${scope} .theme-section-root[data-section-variant="products-image-first"]>section{padding-top:92px!important;padding-bottom:112px!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] h2{max-width:560px!important;font-size:clamp(2.25rem,2.8vw,3rem)!important;line-height:1.02!important}
${scope} .theme-section-root[data-section-variant="products-image-first"]>section>p{max-width:680px!important;margin-top:18px!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] .product-card{border-color:rgba(97,57,40,.15)!important;border-radius:20px!important;background:#fffdf9!important;box-shadow:0 16px 46px rgba(47,25,18,.09)!important}
${scope} .theme-section-root[data-section-variant="products-image-first"] .product-card-media{background:linear-gradient(145deg,#eee2d8,#fffaf5)!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"]{background:#fffdf9!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"] li{border-color:rgba(120,72,50,.15)!important;background:#f8f2ec!important;box-shadow:none!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"] li:hover{box-shadow:0 22px 55px rgba(47,25,18,.11)!important;transform:translateY(-6px)}
${scope} .theme-section-root[data-section-variant^="image-with-text-"]{background:linear-gradient(120deg,#18100e,#2d1915 58%,#48251c)!important}
${scope} .theme-section-root[data-section-variant^="testimonial-"]{background:#f1e6dc!important}
${scope} .theme-section-root[data-section-variant^="newsletter-"]{background:#f7f1e9!important}
${scope} .storefront-footer{background:#17100e!important}
@media(max-width:1179px){${scope} .storefront-header{display:block!important}${scope} .storefront-header>div:first-child{display:block!important;padding-inline:18px!important}${scope} .storefront-header-main{display:flex!important;min-height:76px!important;padding-block:10px!important}${scope} .storefront-header-main>.storefront-header-search{display:flex!important}${scope} .storefront-header>div:last-child{display:none!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div{grid-template-columns:minmax(320px,.9fr) minmax(430px,1.1fr)!important;padding:46px 42px!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"] .theme-hero-title{font-size:clamp(2.45rem,4.6vw,3.35rem)!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"] img.aurelia-hero-accent{width:150px!important;height:150px!important}}
@media(max-width:767px){${scope} .storefront-header-main>.storefront-header-search{display:none!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"]{padding:12px 0 42px!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section{border-radius:0!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div{grid-template-columns:1fr!important;gap:32px!important;padding:38px 22px 28px!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"] h1{font-size:clamp(2.35rem,11vw,3.2rem)!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"]>section>div>div:last-child{height:350px}${scope} .theme-section-root[data-section-variant="hero-asymmetric"] img.aurelia-hero-main-image{right:0;width:86%!important;height:330px!important;padding:14px!important;border-radius:165px 165px 18px 18px!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"] img.aurelia-hero-accent{bottom:10px!important;left:0!important;width:116px!important;height:116px!important;padding:8px!important}${scope} .theme-section-root[data-section-variant="hero-asymmetric"] .aurelia-hero-index{right:4%;bottom:-4px}${scope} .theme-section-root[data-section-variant="categories-image-tiles"]{padding:0 12px 28px!important}${scope} .theme-section-root[data-section-variant="categories-image-tiles"]>section{margin-top:-24px!important;padding:14px!important}${scope} .theme-section-root[data-section-variant="categories-image-tiles"] .category-card>a:first-child{height:120px!important}${scope} .theme-section-root[data-section-variant="products-image-first"]{padding-top:18px!important}}
@media(prefers-reduced-motion:reduce){${scope} .aurelia-hero-main-image,${scope} .aurelia-hero-accent{transition:none!important}}
`;
}

function premiumCss(design, palette, mobile) {
  const scope = `body[data-theme-layout="${design.id}"]`;
  const compact = design.density === 'compact';
  const airy = design.density === 'airy';
  const heroColumns = design.hero === 'stacked-center'
    ? 'minmax(0,1fr)'
    : design.hero === 'mosaic'
      ? 'minmax(320px,.78fr) minmax(440px,1.22fr)'
      : design.hero === 'asymmetric'
        ? 'minmax(420px,1.08fr) minmax(340px,.92fr)'
        : 'minmax(360px,.94fr) minmax(420px,1.06fr)';
  const heroAlign = design.hero === 'stacked-center' ? 'center' : 'left';
  const heroImageHeight = mobile ? '330px' : airy ? '560px' : compact ? '460px' : '520px';
  const sectionSpace = mobile ? '58px' : airy ? '112px' : compact ? '74px' : '92px';
  return `
/* premium-commerce-v1: elevated shared finish, unique layout modes preserved */
${scope}{--premium-paper:color-mix(in srgb,var(--theme-surface) 38%,#fff);--premium-soft:color-mix(in srgb,var(--theme-primary) 7%,#fff);--premium-deep:color-mix(in srgb,var(--theme-text) 90%,#020617);--premium-line:color-mix(in srgb,var(--theme-text) 10%,transparent);--premium-shadow:0 24px 70px rgba(15,23,42,.12);--premium-card-shadow:0 12px 34px rgba(15,23,42,.09);background:linear-gradient(180deg,var(--premium-paper) 0%,#fff 34%,color-mix(in srgb,var(--theme-surface) 52%,#fff) 100%);font-feature-settings:"kern","liga";line-height:1.55;-webkit-font-smoothing:antialiased}
${scope} h1,${scope} h2,${scope} h3{font-family:${design.headingFont};text-wrap:balance}
${scope} p{ text-wrap:pretty }
${scope} .storefront-header{border:0!important;border-bottom:1px solid var(--premium-line)!important;background:color-mix(in srgb,#fff 92%,var(--theme-surface))!important;box-shadow:0 10px 40px rgba(15,23,42,.055)!important;backdrop-filter:blur(18px)}
${scope} .storefront-header-main{max-width:1440px;margin-inline:auto;min-height:88px!important;padding-block:12px!important}
${scope} .storefront-header-main>a:first-child{min-width:220px;max-width:310px}
${scope} .storefront-header-main>a:first-child>span:last-child{max-width:240px!important}
${scope} .storefront-header-main>a:first-child img{box-shadow:0 8px 24px color-mix(in srgb,var(--theme-primary) 24%,transparent)}
${scope} .storefront-header-search form{border-color:var(--premium-line)!important;background:#fff!important;box-shadow:0 8px 26px rgba(15,23,42,.05)}
${scope} .storefront-header-nav{height:54px!important;gap:clamp(18px,2.2vw,36px)!important}
${scope} .storefront-header-nav a{font-size:11px!important;letter-spacing:.035em;text-transform:uppercase}
${scope} .theme-section-root{isolation:isolate}
${scope} .theme-section-root>section{width:100%;max-width:var(--theme-max);margin-inline:auto}
${scope} .theme-section-root[data-section-variant="hero-${design.hero}"]{padding:clamp(20px,3vw,42px) 24px 0}
${scope} .theme-section-root[data-section-variant="hero-${design.hero}"]>section{position:relative;overflow:hidden;max-width:var(--theme-max);border:1px solid color-mix(in srgb,var(--theme-primary) 15%,transparent);border-radius:max(22px,calc(var(--theme-radius) + 16px));background:linear-gradient(135deg,color-mix(in srgb,var(--theme-surface) 74%,#fff),color-mix(in srgb,var(--theme-secondary) 15%,#fff))!important;box-shadow:var(--premium-shadow)}
${scope} .theme-section-root[data-section-variant="hero-${design.hero}"]>section:before{position:absolute;inset:-35% auto auto -8%;z-index:-1;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--theme-secondary) 25%,transparent),transparent 68%);content:""}
${scope} .theme-section-root[data-section-variant="hero-${design.hero}"]>section:after{position:absolute;right:-90px;bottom:-140px;z-index:-1;width:360px;height:360px;border:1px solid color-mix(in srgb,var(--theme-primary) 18%,transparent);border-radius:50%;content:""}
${scope} .theme-section-root[data-section-variant="hero-${design.hero}"]>section>div{display:grid!important;grid-template-columns:${heroColumns}!important;min-height:${mobile ? '500px' : '590px'};align-items:center!important;gap:clamp(36px,5vw,78px)!important;padding:clamp(38px,6vw,86px)!important;text-align:${heroAlign}}
${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] .theme-hero-content{position:relative;z-index:2;display:flex;min-width:0;max-width:${design.hero === 'stacked-center' ? '820px' : '680px'};flex-direction:column;align-items:${heroAlign === 'center' ? 'center' : 'flex-start'};justify-content:center;${design.hero === 'stacked-center' ? 'margin-inline:auto;' : ''}}
${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] .theme-hero-eyebrow{display:inline-flex;width:max-content;max-width:100%;align-items:center;gap:9px;margin:0 0 14px;padding:7px 11px;border:1px solid color-mix(in srgb,var(--theme-primary) 24%,transparent);border-radius:999px;background:color-mix(in srgb,#fff 66%,transparent);font-size:10px!important;font-weight:800;line-height:1.35;letter-spacing:.17em!important}
${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] .theme-hero-title{max-width:15ch!important;margin:0;font-size:clamp(2.65rem,4vw,4.15rem)!important;font-weight:${design.headingFont.includes('serif') ? '500' : '760'}!important;line-height:.98!important;letter-spacing:-.05em!important;text-wrap:balance}
${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] .theme-hero-description{max-width:54ch;margin-top:20px!important;padding:0;border:0;background:transparent;font-size:clamp(15px,1.15vw,17px)!important;font-weight:400;line-height:1.68;letter-spacing:0!important;text-wrap:pretty}
${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] .theme-hero-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:28px!important}
${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] .theme-hero-actions a{min-height:46px;border-radius:999px!important;padding:13px 22px!important;font-size:11px!important;font-weight:800!important;line-height:1.2;letter-spacing:.035em;box-shadow:none;transition:transform .25s ease,box-shadow .25s ease}
${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] .theme-hero-actions a:first-child{box-shadow:0 12px 28px color-mix(in srgb,var(--theme-primary) 30%,transparent)}
${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] .theme-hero-actions a:hover{transform:translateY(-2px)}
${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] img{height:${heroImageHeight}!important;width:100%!important;border:1px solid rgba(255,255,255,.65);border-radius:max(18px,calc(var(--theme-radius) + 12px))!important;object-fit:cover;box-shadow:0 28px 65px rgba(15,23,42,.22)!important;transform:${design.hero === 'asymmetric' ? 'rotate(1.2deg)' : 'none'};transition:transform .6s cubic-bezier(.2,.8,.2,1)}
${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] img:hover{transform:${design.hero === 'asymmetric' ? 'rotate(0)' : 'scale(1.015)'}}
${scope} .theme-section-root[data-section-variant^="categories-"]>section,${scope} .theme-section-root[data-section-variant^="products-"]>section{padding-block:${sectionSpace}!important;padding-inline:clamp(20px,3vw,42px)!important}
${scope} .theme-section-root[data-section-variant^="categories-"] h2,${scope} .theme-section-root[data-section-variant^="products-"] h2{font-size:clamp(2rem,3.4vw,3.5rem)!important;font-weight:${design.headingFont.includes('serif') ? '500' : '750'}!important;line-height:1.02;letter-spacing:-.04em}
${scope} .theme-section-root[data-section-variant^="categories-"] h2+p,${scope} .theme-section-root[data-section-variant^="products-"] h2+p{max-width:62ch;margin-top:12px!important;font-size:15px!important;line-height:1.75}
${scope} .category-card{position:relative;border-color:var(--premium-line)!important;border-radius:max(16px,calc(var(--theme-radius) + 10px))!important;background:#fff!important;box-shadow:var(--premium-card-shadow)!important;transform:translateZ(0)}
${scope} .category-card>a:first-child{height:clamp(210px,20vw,290px)!important;border:0!important}
${scope} .category-card img{transition:transform .7s cubic-bezier(.2,.8,.2,1)!important}
${scope} .category-card:hover img{transform:scale(1.055)!important}
${scope} .category-card>div{padding:24px!important}
${scope} .category-card h2{font-size:19px!important;letter-spacing:-.02em}
${scope} .category-card>div>a:last-child{font-size:11px!important;font-weight:800!important;letter-spacing:.09em;text-transform:uppercase}
${scope} .product-card{border-color:var(--premium-line)!important;border-radius:max(16px,calc(var(--theme-radius) + 10px))!important;background:#fff!important;box-shadow:var(--premium-card-shadow)!important;transition:transform .35s ease,box-shadow .35s ease!important}
${scope} .product-card:hover{transform:translateY(-8px)!important;box-shadow:0 24px 56px rgba(15,23,42,.16)!important}
${scope} .product-card-media{aspect-ratio:var(--theme-card-ratio)!important;background:var(--premium-soft)}
${scope} .product-card-media img{transition:transform .65s cubic-bezier(.2,.8,.2,1)!important}
${scope} .product-card:hover .product-card-media img{transform:scale(1.045)!important}
${scope} .product-card-body{padding:${compact ? '16px' : '22px'}!important}
${scope} .product-card h3{font-size:${compact ? '15px' : '17px'};line-height:1.35;letter-spacing:-.015em}
${scope} .theme-section-root[data-section-variant^="image-with-text-"]{background:var(--premium-deep);color:#fff}
${scope} .theme-section-root[data-section-variant^="image-with-text-"]>section{max-width:var(--theme-max)!important;padding:${sectionSpace} clamp(22px,4vw,54px)!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"]>section>div{gap:clamp(42px,7vw,96px)!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"] img{min-height:${mobile ? '320px' : '520px'}!important;border:0!important;border-radius:max(18px,calc(var(--theme-radius) + 12px))!important;box-shadow:24px 28px 0 color-mix(in srgb,var(--theme-primary) 42%,transparent)!important}
${scope} .theme-section-root[data-section-variant^="image-with-text-"] h1{color:#fff!important;font-size:clamp(2.25rem,4vw,4.25rem)!important;font-weight:${design.headingFont.includes('serif') ? '500' : '740'};line-height:1.02;letter-spacing:-.045em}
${scope} .theme-section-root[data-section-variant^="image-with-text-"] p,${scope} .theme-section-root[data-section-variant^="image-with-text-"] li{color:rgba(255,255,255,.72)!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"]>section{padding-block:${sectionSpace}!important}
${scope} .theme-section-root[data-section-variant^="feature-list-"] li{border:1px solid var(--premium-line)!important;border-radius:max(14px,calc(var(--theme-radius) + 8px))!important;background:#fff!important;box-shadow:0 10px 30px rgba(15,23,42,.07)!important}
${scope} .theme-section-root[data-section-variant^="testimonial-"]>section{padding-block:${sectionSpace}!important;background:linear-gradient(135deg,var(--premium-soft),#fff)!important}
${scope} .theme-section-root[data-section-variant^="testimonial-"] .theme-testimonial-copy>p:first-child{max-width:34ch;margin-inline:auto;font-family:${design.headingFont};font-size:clamp(1.6rem,3vw,3rem)!important;font-weight:${design.headingFont.includes('serif') ? '500' : '650'}!important;line-height:1.28;letter-spacing:-.025em}
${scope} .theme-section-root[data-section-variant^="newsletter-"]>section,${scope} .theme-section-root[data-section-variant^="promo-banner-"]>section{max-width:var(--theme-max)!important;margin-block:28px!important;border:1px solid var(--premium-line);border-radius:max(18px,calc(var(--theme-radius) + 12px));box-shadow:var(--premium-card-shadow)}
${scope} .storefront-footer{border:0!important;background:var(--premium-deep)!important}
${scope} .storefront-footer-inner{max-width:var(--theme-max)!important}
${scope} .storefront-footer-brand img{border-radius:max(10px,var(--theme-radius))!important}
${scope} .storefront-footer-directory h2{color:color-mix(in srgb,var(--theme-secondary) 72%,#fff)!important;letter-spacing:.18em!important}
${scope} .storefront-cart-page section,${scope} .storefront-checkout-page section,${scope} .storefront-checkout-page form{border-color:var(--premium-line)!important;background:#fff!important;box-shadow:var(--premium-card-shadow)!important}
${premiumHeaderFooterCss(design)}
${premiumCatalogCss(design)}
@media(max-width:1024px){${scope} .storefront-header-main>a:first-child{min-width:0;max-width:230px}${scope} .theme-section-root[data-section-variant="hero-${design.hero}"]>section>div{grid-template-columns:minmax(0,1fr) minmax(320px,.8fr)!important;padding:48px!important}${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] .theme-hero-title{font-size:clamp(2.45rem,5.4vw,3.55rem)!important}}
@media(max-width:767px){${scope} .storefront-header-main{min-height:72px!important}${scope} .storefront-header-main>a:first-child{max-width:230px}${scope} .theme-section-root[data-section-variant="hero-${design.hero}"]{padding:14px 12px 0}${scope} .theme-section-root[data-section-variant="hero-${design.hero}"]>section{border-radius:20px}${scope} .theme-section-root[data-section-variant="hero-${design.hero}"]>section>div{grid-template-columns:1fr!important;min-height:0;gap:34px!important;padding:42px 24px!important;text-align:left}${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] .theme-hero-content{max-width:100%;align-items:flex-start}${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] .theme-hero-title{max-width:16ch!important;font-size:clamp(2.1rem,9vw,2.7rem)!important}${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] .theme-hero-description{margin-top:17px!important;font-size:14px!important;line-height:1.65}${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] .theme-hero-actions{width:100%;margin-top:24px!important}${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] .theme-hero-actions a{flex:1 1 150px;justify-content:center;text-align:center}${scope} .theme-section-root[data-section-variant="hero-${design.hero}"] img{height:min(92vw,420px)!important}${scope} .theme-section-root[data-section-variant^="categories-"]>section,${scope} .theme-section-root[data-section-variant^="products-"]>section{padding-block:58px!important;padding-inline:16px!important}${scope} .theme-section-root[data-section-variant^="categories-"] h2,${scope} .theme-section-root[data-section-variant^="products-"] h2{font-size:2.2rem!important}${scope} .category-card>a:first-child{height:190px!important}${scope} .theme-section-root[data-section-variant^="image-with-text-"]>section{padding:64px 20px!important}${scope} .theme-section-root[data-section-variant^="image-with-text-"] img{min-height:340px!important;box-shadow:12px 14px 0 color-mix(in srgb,var(--theme-primary) 42%,transparent)!important}}
@media(prefers-reduced-motion:reduce){${scope} *,${scope} *:before,${scope} *:after{scroll-behavior:auto!important;transition-duration:.01ms!important}}
`;
}

function themeCss(design, palette, mobile) {
  const max = mobile ? '520px' : `${1180 + (Number(design.id.slice(3,5)) % 4) * 80}px`;
  const themeFont = mobile ? 'Poppins, Arial, sans-serif' : 'Roboto, Arial, sans-serif';
  const enforcedFontScope = `body${`[data-theme-layout="${design.id}"]`.repeat(6)}`;
  const webHeaderScope = `body[data-theme-layout="${design.id}"]`;
  const heroDirection = design.hero === 'split-right' ? 'row' : design.hero === 'asymmetric' ? 'row-reverse' : 'column';
  const productCols = mobile ? Math.min(2, design.columns) : design.columns;
  return `/* ${design.id}: ${design.direction} */
:root{--theme-primary:${palette.primary};--theme-secondary:${palette.secondary};--theme-surface:${palette.surface};--theme-text:${palette.ink};--theme-muted:${palette.muted};--theme-border:color-mix(in srgb,${palette.primary} 18%,transparent);--theme-primary-contrast:#fff;--theme-radius:${design.radius}px;--theme-gap:${design.gap}px;--theme-max:${max};--theme-card-ratio:${design.imageRatio};}
body[data-theme-layout="${design.id}"]{margin:0;background:color-mix(in srgb,var(--theme-surface) 82%,white);color:var(--theme-text);font-family:${design.bodyFont};}
body[data-theme-layout="${design.id}"] h1,body[data-theme-layout="${design.id}"] h2,body[data-theme-layout="${design.id}"] h3{font-family:${design.headingFont};}
.storefront-header[data-header-variant="${design.header}"]{border-radius:${design.header === 'minimal-mark' ? '0 0 28px 28px' : '0'};box-shadow:${design.header === 'editorial' ? 'none' : '0 8px 26px rgba(15,23,42,.08)'};}
.storefront-header[data-header-variant="centered-nav"] .storefront-header-main{justify-content:center;flex-wrap:wrap}.storefront-header[data-header-variant="centered-nav"] .storefront-header-search{order:3;flex-basis:100%}
.storefront-header[data-header-variant="minimal-mark"] .storefront-header-search,.storefront-header[data-header-variant="minimal-mark"] .storefront-header-nav{display:none!important}
.storefront-header[data-header-variant="editorial"] .storefront-header-search{display:none!important}.storefront-header[data-header-variant="editorial"] .storefront-header-main{justify-content:space-between}
.storefront-header[data-header-variant="compact-stack"] .storefront-header-main{min-height:64px;padding-block:6px}.storefront-header[data-header-variant="compact-stack"] .storefront-header-nav{height:42px}
.storefront-header[data-header-variant="trade-desk"]{border-top:5px solid var(--theme-primary)}.storefront-header[data-header-variant="catalog-rail"] .storefront-header-nav{justify-content:flex-start}
.theme-section-root{position:relative}.theme-section-root>section{max-width:var(--theme-max);margin-inline:auto}
.theme-section-root[data-section-variant="hero-${design.hero}"]>section>div{display:flex;flex-direction:${heroDirection};gap:calc(var(--theme-gap)*1.4);align-items:${design.hero === 'full-bleed' ? 'end' : 'center'}}
.theme-section-root[data-section-variant="hero-${design.hero}"] h1{font-size:clamp(2.25rem,6vw,${4 + (design.radius % 3)}rem);letter-spacing:-.045em}
.theme-section-root[data-section-variant="categories-${design.category}"] section>div>div:last-child{display:grid;grid-template-columns:repeat(${mobile ? 2 : Math.max(2, Math.min(5, productCols - 1))},minmax(0,1fr));gap:var(--theme-gap)}
.theme-section-root[data-section-variant="categories-round-icons"] article{border-radius:999px;text-align:center;aspect-ratio:1}.theme-section-root[data-section-variant="categories-horizontal-rail"] section>div>div:last-child{display:flex;overflow:auto}.theme-section-root[data-section-variant="categories-horizontal-rail"] article{min-width:240px}.theme-section-root[data-section-variant="categories-numbered-list"] article{border-radius:0;border-width:0 0 1px;box-shadow:none}.theme-section-root[data-section-variant="categories-compact-chips"] article{border-radius:999px}.theme-section-root[data-section-variant="categories-compact-chips"] article>a{display:none}
.theme-section-root[data-section-variant="products-${design.product}"]>section>div:last-child{grid-template-columns:repeat(${productCols},minmax(0,1fr));gap:var(--theme-gap)}
.product-card[data-card-variant="${design.product}"]{border-radius:${design.radius}px}.product-card[data-card-variant="horizontal"]>a{flex-direction:row}.product-card[data-card-variant="horizontal"] .product-card-media{width:42%;flex:none}.product-card[data-card-variant="bulk-table"]{border-radius:0;box-shadow:none;border-width:0 0 1px}.product-card[data-card-variant="bulk-table"]>a{display:grid;grid-template-columns:132px minmax(0,1fr)}.product-card[data-card-variant="bulk-table"] .product-card-media{aspect-ratio:1;width:132px}.product-card[data-card-variant="editorial"]{border:0;box-shadow:none;background:transparent!important}.product-card[data-card-variant="image-first"] .product-card-body{padding-top:24px}.product-card[data-card-variant="marketplace"] .product-card-body{padding:10px}
.theme-section-root[data-section-variant^="gallery-${design.pdp}"] img{border-radius:${design.radius}px}.theme-section-root[data-section-variant="gallery-full-gallery"] section{max-width:none}.theme-section-root[data-section-variant="info-sticky-buy"]{position:sticky;top:10rem;align-self:start}
.storefront-category-page[data-plp-layout="${design.plp}"] aside{border-radius:${design.radius}px}.storefront-category-page[data-plp-layout="top-filter-dense"]>div>div{grid-template-columns:1fr!important}.storefront-category-page[data-plp-layout="top-filter-dense"] aside{position:static!important}.storefront-category-page[data-plp-layout="editorial-three"] section>div.grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}.storefront-category-page[data-plp-layout="specification-list"] section>div.grid,.storefront-category-page[data-plp-layout="quick-order"] section>div.grid{grid-template-columns:1fr!important}.storefront-category-page[data-plp-layout="catalog-matrix"]>div>div{grid-template-columns:190px minmax(0,1fr)!important}
.storefront-product-page[data-pdp-layout="${design.pdp}"]>div>.grid{gap:${design.gap}px}.storefront-product-page[data-pdp-layout="gallery-right"]>div>.grid{direction:rtl}.storefront-product-page[data-pdp-layout="gallery-right"]>div>.grid>*{direction:ltr}.storefront-product-page[data-pdp-layout="full-gallery"]>div>.grid,.storefront-product-page[data-pdp-layout="story-scroll"]>div>.grid{grid-template-columns:1fr!important}.storefront-product-page[data-pdp-layout="sticky-buy"]>div>.grid>aside{position:sticky;top:11rem;align-self:start}.storefront-product-page[data-pdp-layout="technical-tabs"] section{border-radius:0!important}.storefront-product-page[data-pdp-layout="compact-order"]>div{max-width:1050px}
.storefront-cart-page section,.storefront-checkout-page section,.storefront-checkout-page form{border-radius:${design.radius}px!important}.storefront-cart-page>div,.storefront-checkout-page{gap:${design.gap}px}.storefront-cart-page article{${design.product === 'bulk-table' ? 'border-radius:0!important;box-shadow:none!important' : ''}}.storefront-checkout-page{${design.pdp === 'compact-order' ? 'max-width:900px!important' : design.pdp === 'full-gallery' ? 'max-width:1280px!important' : ''}}
.storefront-footer[data-footer-variant="${design.footer}"]{background:${design.footer === 'brand-story' ? palette.primary : '#0b1220'}}.storefront-footer[data-footer-variant="minimal"]{background:var(--theme-text)}.storefront-footer[data-footer-variant="brand-story"] .storefront-footer-inner{text-align:center}.storefront-footer[data-footer-variant="marketplace"] .storefront-footer-inner{max-width:var(--theme-max)}.storefront-footer[data-footer-variant="trade-directory"]{border-top:8px solid var(--theme-primary);background:#07130c}.storefront-footer[data-footer-variant="newsletter-led"] .storefront-footer-inner{border-top:6px solid var(--theme-secondary)}.storefront-footer[data-footer-variant="service-desk"]{background:color-mix(in srgb,var(--theme-primary) 24%,#08111f)}
${!mobile && design.industry === 'Agriculture, Seeds & Agri-inputs' ? `.theme-section-root[data-section-variant="hero-split-right"]>section{max-width:var(--theme-max);padding-block:48px}.theme-section-root[data-section-variant="hero-split-right"]>section>div{display:grid;grid-template-columns:minmax(0,.92fr) minmax(420px,1.08fr);min-height:430px}.theme-section-root[data-section-variant="hero-split-right"] h1{max-width:14ch;font-size:clamp(2.75rem,4.5vw,4.75rem);line-height:.96}.theme-section-root[data-section-variant="hero-split-right"] img{height:430px;border-radius:8px;box-shadow:16px 18px 0 color-mix(in srgb,var(--theme-primary) 18%,transparent)}.theme-section-root[data-section-variant="categories-horizontal-rail"] section{padding-block:30px}.theme-section-root[data-section-variant="products-bulk-table"]>section>div:last-child{grid-template-columns:repeat(2,minmax(0,1fr))}.storefront-header[data-header-variant="trade-desk"] .storefront-header-main{min-height:82px}.storefront-header[data-header-variant="trade-desk"] .storefront-header-nav{height:48px;justify-content:flex-start}` : ''}
${premiumCss(design, palette, mobile)}
@media(max-width:767px){.theme-section-root[data-section-variant^="hero-"]>section>div{display:grid;grid-template-columns:1fr}.theme-section-root[data-section-variant^="categories-"] section>div>div:last-child,.theme-section-root[data-section-variant^="products-"]>section>div:last-child{grid-template-columns:repeat(2,minmax(0,1fr))}.theme-section-root[data-section-variant="products-horizontal"]>section>div:last-child,.theme-section-root[data-section-variant="products-bulk-table"]>section>div:last-child{grid-template-columns:1fr}.theme-section-root>section{padding-inline:14px}.storefront-header[data-header-variant="minimal-mark"] .storefront-header-search{display:flex!important}}
${circuitLaneIndustrialCss(design)}
${!mobile ? jewelryWebScaleCss(design) : ''}
${!mobile ? strideFoundryReferenceCss(design) : ''}
${!mobile ? strideFoundryPremiumRefinementCss(design) : ''}
${!mobile ? strideFoundryLuxuryRedesignCss(design) : ''}
${!mobile ? `/* web-header-readability-v1: final minimum readable type scale for every web theme */
${webHeaderScope} .storefront-header-nav>a,${webHeaderScope} .storefront-header-nav>details>summary{font-size:12px!important;line-height:1.25!important}
${webHeaderScope} .storefront-header-nav>a:after{display:none!important;content:none!important}
${webHeaderScope} .industrial-commerce-trigger,${webHeaderScope} .industrial-header-cta,${webHeaderScope} .footwear-bulk-enquiry{font-size:12px!important;line-height:1.2!important}
${webHeaderScope} .storefront-header-search input{font-size:13px!important}
${webHeaderScope} .storefront-header-main>div:last-child>a span.text-xs{font-size:12px!important;line-height:1.25!important}
/* web-category-menu-v1: keep the shared category flyout visible above page content in every web theme */
${webHeaderScope} .storefront-header,${webHeaderScope} .storefront-header>div:last-child,${webHeaderScope} .storefront-header-nav{overflow:visible!important}
${webHeaderScope} .storefront-category-menu{position:relative!important}
${webHeaderScope} .storefront-category-panel{color:#0f172a!important;text-align:left!important;text-transform:none!important;letter-spacing:normal!important}
${webHeaderScope} .storefront-category-panel a{min-height:0!important;color:#0f172a!important;font-family:var(--font-storefront-roboto),Roboto,Arial,sans-serif!important;letter-spacing:normal!important;text-transform:none!important}
${webHeaderScope} .storefront-category-panel .storefront-category-view-all{color:var(--header-primary)!important}
${webHeaderScope} .storefront-category-panel-link:hover{color:#0f172a!important}
${webHeaderScope} .storefront-category-panel-grid{grid-template-columns:minmax(0,1fr)!important}
${webHeaderScope} .storefront-category-panel-link{width:100%!important}
/* web-category-card-refinement-v1: readable category labels and balanced card footers across every web theme */
${webHeaderScope} .category-card>div{min-height:60px!important;padding:17px 16px!important}
${webHeaderScope} .category-card h2{margin:0!important;font-size:16px!important;font-weight:800!important;line-height:1.35!important;letter-spacing:-.012em!important;text-wrap:balance}
${webHeaderScope} .category-card p{font-size:13px!important;line-height:1.55!important}
${webHeaderScope} .category-card>div>a:last-child{font-size:11px!important;line-height:1.35!important}
/* web-product-card-compact-v1: consistent compact product presentation across every web theme */
${webHeaderScope} .theme-section-root[data-section-variant^="products-"]:not([data-section-variant="products-horizontal"]):not([data-section-variant="products-bulk-table"])>section>div:last-child{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:18px!important}
${webHeaderScope} .product-card:not([data-card-variant="horizontal"]):not([data-card-variant="bulk-table"]) .product-card-media{aspect-ratio:1.12/1!important}
${webHeaderScope} .product-card-body{gap:8px!important;padding:16px!important}
${webHeaderScope} .product-card-title{font-size:15px!important;line-height:1.32!important}
${webHeaderScope} .product-card-description{font-size:11px!important;line-height:1.55!important}
${webHeaderScope} .product-card-purchase{padding-top:10px!important}
${webHeaderScope} .product-card-price{font-size:17px!important}
${webHeaderScope} .product-card-view{margin-top:10px!important;font-size:10px!important}
@media(max-width:1279px){${webHeaderScope} .theme-section-root[data-section-variant^="products-"]:not([data-section-variant="products-horizontal"]):not([data-section-variant="products-bulk-table"])>section>div:last-child{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
@media(max-width:767px){${webHeaderScope} .theme-section-root[data-section-variant^="products-"]:not([data-section-variant="products-horizontal"]):not([data-section-variant="products-bulk-table"])>section>div:last-child{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}${webHeaderScope} .product-card-body{padding:13px!important}${webHeaderScope} .product-card-title{font-size:14px!important}}` : ''}
${!mobile ? plantWorksControlRoomCss(design) : ''}
${enforcedFontScope},${enforcedFontScope} *{font-family:${themeFont}!important}
`;
}

module.exports = { createDesign, applyDesign, themeCss, directions };
