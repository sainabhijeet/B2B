/* Updates only the Electronics WEB theme with original CircuitLane copy and
 * the long-form industrial commerce section journey. Jewelry and all app
 * packages are intentionally out of scope. */
const fs = require('node:fs');
const path = require('node:path');
const AdmZip = require('../backend/node_modules/adm-zip');

const root = path.resolve(__dirname, '..');
const slug = 'electronics-web-theme';
const extractedTemplate = path.join(root, 'backend', 'storage', 'themes', 'web', slug, 'templates', 'home.json');

function buildTemplate(source) {
  const byId = new Map(source.sections.map((section) => [section.id, section]));
  const update = (id, settings, variant) => {
    const section = byId.get(id);
    if (!section) throw new Error(`Missing section: ${id}`);
    return { ...section, ...(variant ? { variant } : {}), settings: { ...section.settings, ...settings } };
  };

  const header = update('header', {
    nav: ['Home', 'Categories', 'Products', 'Offers', 'About', 'Contact'],
    layoutMode: 'CircuitLane industrial commerce',
  }, 'search-led');
  const hero = update('hero', {
    eyebrow: 'CIRCUITLANE TRADE NETWORK',
    title: 'Power every workspace with smarter electronics supply.',
    subtitle: 'Build a dependable equipment stack for offices, field teams and retail operations—one clear sourcing workflow from shortlist to bulk order.',
    primaryCta: 'Explore electronics',
    primaryHref: '/category',
    secondaryCta: 'Plan a bulk order',
    secondaryHref: '/contact',
    layoutMode: 'CircuitLane industrial commerce',
  }, 'hero-split-right');
  const categories = update('categories', {
    title: 'Connected solutions for every operation',
    subtitle: 'Move from team devices to network essentials with practical collections built for business buying.',
    layoutMode: 'CircuitLane industrial commerce',
  }, 'categories-image-tiles');
  const story = update('story', {
    eyebrow: 'BUILT FOR BUSINESS BUYERS',
    title: 'A clearer route from equipment brief to rollout.',
    body: 'CircuitLane brings devices, computing and connectivity into one focused trade catalogue. Compare sample products, shape a shortlist and prepare a bulk-order conversation without losing context.\n\nThe experience is structured for procurement teams that value speed, consistency and a clean handoff from discovery to enquiry.',
    image: 'assets/images/product-02.jpg',
    imageAlt: 'AI-generated CircuitLane business laptop product visual',
    imagePosition: 'left',
    highlights: ['Business-ready collections', 'Visible sample price tiers', 'Clear minimum quantities', 'Direct bulk-order support'],
    ctaLabel: 'Discuss your requirement',
    ctaUrl: '/contact',
    layoutMode: 'CircuitLane industrial commerce',
  }, 'image-with-text-compact');
  const benefits = update('benefits', {
    eyebrow: 'THE CIRCUITLANE METHOD',
    title: 'From shortlist to supply plan',
    items: [
      { icon: '01', title: 'Discover', text: 'Navigate focused device, computing, audio and connectivity collections.' },
      { icon: '02', title: 'Compare', text: 'Review fictional sample pricing, minimum quantities and product groupings.' },
      { icon: '03', title: 'Shortlist', text: 'Bring the right equipment mix together around your team or rollout.' },
      { icon: '04', title: 'Coordinate', text: 'Move into a direct bulk-order discussion with the requirement already clear.' },
    ],
    layoutMode: 'CircuitLane industrial commerce',
  }, 'feature-list-compact');
  const products = update('products', {
    eyebrow: 'DEMO EQUIPMENT EDIT',
    title: 'Technology selected for modern teams',
    subtitle: 'Explore an original fictional assortment that demonstrates how products, pricing and procurement details can work together.',
    layoutMode: 'CircuitLane industrial commerce',
  }, 'products-marketplace');
  const testimonial = update('testimonial', {
    title: 'A buyer-centred sourcing experience',
    quote: 'The catalogue gives our fictional procurement team a fast way to compare the device mix, understand sample quantity tiers and prepare a more useful supplier conversation.',
    author: 'Operations lead — fictional demonstration feedback',
    role: 'Multi-site workplace rollout',
    layoutMode: 'CircuitLane industrial commerce',
  }, 'testimonial-carousel-compact');
  const newsletter = update('newsletter', {
    title: 'Stay connected to the next equipment edit',
    subtitle: 'Receive demonstration catalogue updates and practical sourcing ideas from CircuitLane.',
    emailPlaceholder: 'Work email address',
    buttonText: 'Join updates',
    layoutMode: 'CircuitLane industrial commerce',
  }, 'newsletter-compact');
  const promo = update('promo', {
    eyebrow: 'READY TO BUILD YOUR SHORTLIST?',
    title: 'Bring your next equipment requirement to CircuitLane.',
    subtitle: 'Share the team size, locations and product mix you are planning.',
    ctaLabel: 'Start an enquiry',
    ctaUrl: '/contact',
    layoutMode: 'CircuitLane industrial commerce',
  }, 'promo-banner-compact');
  const footer = update('footer', {
    tagline: 'A focused electronics trade experience for connected teams, operational buyers and growing workplaces. AI-generated fictional demo catalogue.',
    layoutMode: 'CircuitLane industrial commerce',
  }, 'footer-minimal');

  const faq = {
    id: 'faq',
    type: 'faq-section',
    variant: 'faq-section-compact',
    settings: {
      designId: 'ds-01-web',
      layoutMode: 'CircuitLane industrial commerce',
      density: 'compact',
      eyebrow: 'PROCUREMENT FAQ',
      title: 'Answers before you build the order',
      subtitle: 'The catalogue is a demonstration. These answers explain the intended B2B purchasing journey.',
      items: [
        { question: 'Can we prepare a mixed-product bulk requirement?', answer: 'Yes. Use the catalogue to identify the device and accessory mix, then share quantities and locations through the enquiry route.' },
        { question: 'Are the listed prices and stock live supplier commitments?', answer: 'No. This is a fictional demonstration catalogue. Prices, inventory, product claims and timelines are sample data only.' },
        { question: 'Can a rollout be planned for more than one location?', answer: 'The enquiry workflow can capture a multi-location requirement so a real distributor can later coordinate commercial and delivery details.' },
        { question: 'Where do warranty and compliance details appear?', answer: 'Verified supplier documentation should be attached to real catalogue items before purchase. The demo products intentionally make no certification claim.' },
      ],
    },
  };
  const cta = {
    id: 'trade-cta',
    type: 'cta-banner',
    variant: 'cta-banner-compact',
    settings: {
      designId: 'ds-01-web',
      layoutMode: 'CircuitLane industrial commerce',
      density: 'compact',
      title: 'One brief. One connected equipment plan.',
      subtitle: 'Turn a product shortlist into a structured bulk-order conversation.',
      buttonLabel: 'Talk to the trade desk',
      buttonHref: '/contact',
    },
  };

  return {
    ...source,
    design: 'ds-01-web',
    sections: [header, hero, categories, story, benefits, products, faq, testimonial, newsletter, cta, promo, footer],
  };
}

function updateZip(zipPath, payload) {
  if (!fs.existsSync(zipPath)) return false;
  const zip = new AdmZip(zipPath);
  if (!zip.getEntry('templates/home.json')) throw new Error(`Missing home template in ${zipPath}`);
  zip.updateFile('templates/home.json', Buffer.from(payload, 'utf8'));
  zip.writeZip(zipPath);
  return true;
}

const source = JSON.parse(fs.readFileSync(extractedTemplate, 'utf8'));
const updated = buildTemplate(source);
const payload = JSON.stringify(updated, null, 2) + '\n';
fs.writeFileSync(extractedTemplate, payload, 'utf8');

const zipPaths = [
  path.join(root, 'exports', 'industry-theme-zips-v2', `${slug}.zip`),
  path.join(root, 'storage', 'themes', 'web', slug, `${slug}.zip`),
  path.join(root, 'backend', 'storage', 'themes', 'web', slug, `${slug}.zip`),
];
const updatedZips = zipPaths.filter((zipPath) => updateZip(zipPath, payload));
console.log(JSON.stringify({ theme: slug, sectionCount: updated.sections.length, updatedZips: updatedZips.length }));
