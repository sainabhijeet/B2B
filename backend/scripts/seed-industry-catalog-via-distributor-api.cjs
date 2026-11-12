const fs = require('node:fs');
const path = require('node:path');

const tenantId = process.argv[2];
if (!tenantId) {
  throw new Error('Usage: node scripts/seed-industry-catalog-via-distributor-api.cjs <tenant-id>');
}

function readEnv(file) {
  const out = {};
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = readEnv(path.resolve(__dirname, '..', '.env'));
const prefix = String(env.API_PREFIX || 'api/v1').replace(/^\/+|\/+$/gu, '');
const baseUrl = `http://127.0.0.1:${env.PORT || '3000'}/${prefix}`;
const themeAssetBase = '/storage/themes/web/general-commerce-web-theme/assets/images';
const themeAssetDir = path.resolve(
  __dirname,
  '..',
  'storage',
  'themes',
  'web',
  'general-commerce-web-theme',
  'assets',
  'images',
);

async function request(route, { method = 'GET', token, body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    const message = payload && typeof payload === 'object'
      ? payload.message || payload.error || JSON.stringify(payload)
      : String(payload || response.statusText);
    throw new Error(`${method} ${route} failed (${response.status}): ${message}`);
  }
  return payload;
}

async function authenticate() {
  if (!env.BOOTSTRAP_SUPER_ADMIN_EMAIL || !env.BOOTSTRAP_SUPER_ADMIN_PASSWORD) {
    throw new Error('Bootstrap super-admin credentials are missing from backend/.env.');
  }
  const admin = await request('/auth/admin/login', {
    method: 'POST',
    body: {
      email: env.BOOTSTRAP_SUPER_ADMIN_EMAIL,
      password: env.BOOTSTRAP_SUPER_ADMIN_PASSWORD,
      deviceId: `industry-catalog-seed-${tenantId.slice(0, 8)}`,
    },
  });
  const handoff = await request('/auth/admin/tenant-handoff', {
    method: 'POST',
    token: admin.accessToken,
    body: {
      tenantId,
      deviceId: `industry-catalog-owner-${tenantId.slice(0, 8)}`,
    },
  });
  return handoff.accessToken;
}

const categories = [
  {
    name: 'Home Storage & Organization',
    slug: 'ridego-home-storage-organization',
    description: 'Storage boxes, organizers and practical home-utility products for retail and institutional buyers.',
    image: 'product-01.jpg',
    sortOrder: 10,
  },
  {
    name: 'Office & Stationery',
    slug: 'ridego-office-stationery',
    description: 'Desk organization, stationery kits and workplace essentials for offices, schools and resellers.',
    image: 'product-02.jpg',
    sortOrder: 20,
  },
  {
    name: 'Travel & Personal Utility',
    slug: 'ridego-travel-personal-utility',
    description: 'Compact reusable travel accessories and personal-utility sets for modern retail catalogs.',
    image: 'product-03.jpg',
    sortOrder: 30,
  },
  {
    name: 'Lighting & Hardware',
    slug: 'ridego-lighting-hardware',
    description: 'Useful lighting products and household hand-tool kits with B2B quantity pricing.',
    image: 'product-04.jpg',
    sortOrder: 40,
  },
  {
    name: 'Celebration Gift Hampers',
    slug: 'ridego-celebration-gift-hampers',
    description: 'Presentation-ready celebration hampers for employee rewards, events and festive corporate orders.',
    image: 'product-06.jpg',
    sortOrder: 50,
  },
];

const brands = [
  {
    name: 'RideGo Home',
    slug: 'ridego-home',
    description: 'RideGo private-label home organization and everyday utility range.',
  },
  {
    name: 'RideGo Workspace',
    slug: 'ridego-workspace',
    description: 'Office, stationery and lighting products selected for business buyers.',
  },
  {
    name: 'RideGo Utility',
    slug: 'ridego-utility',
    description: 'Travel accessories and practical household hardware for wholesale supply.',
  },
  {
    name: 'RideGo Select',
    slug: 'ridego-select',
    description: 'Curated gifting and seasonal merchandise for bulk orders.',
  },
];

const products = [
  {
    name: 'RideGo Clear Storage Box 25 L with Locking Lid',
    slug: 'ridego-clear-storage-box-25l-locking-lid',
    sku: 'RG-HOME-SB25',
    categorySlug: 'ridego-home-storage-organization',
    brandSlug: 'ridego-home',
    price: 499,
    mrp: 699,
    costPrice: 310,
    gstRate: 18,
    stock: 120,
    lowStockThreshold: 18,
    moq: 6,
    image: 'product-01.jpg',
    attributes: { packSize: '1 piece', unit: 'piece', capacity: '25 L', color: 'Clear / Grey', material: 'Polypropylene', hsn: '3924' },
    tiers: [{ minQty: 24, price: 459 }, { minQty: 60, price: 429 }],
    description: 'Clear 25-litre multipurpose storage box with a grey locking lid and side clips. Suitable for household organization, office records, utility rooms and reseller shelves. Selling unit: one box. GST classification reference: HSN 3924.',
    tags: ['storage box', 'home organization', '25 litre', 'locking lid', 'HSN 3924'],
  },
  {
    name: 'RideGo 12-Piece Office Desk Organizer Kit',
    slug: 'ridego-12-piece-office-desk-organizer-kit',
    sku: 'RG-WORK-OD12',
    categorySlug: 'ridego-office-stationery',
    brandSlug: 'ridego-workspace',
    price: 1299,
    mrp: 1699,
    costPrice: 840,
    gstRate: 18,
    stock: 80,
    lowStockThreshold: 12,
    moq: 4,
    image: 'product-02.jpg',
    attributes: { packSize: '12-piece set', unit: 'set', color: 'Black', use: 'Office / Study', hsn: '8304/8305 mixed set' },
    tiers: [{ minQty: 12, price: 1199 }, { minQty: 30, price: 1099 }],
    description: 'Coordinated twelve-piece desktop organization set including document trays, file holders, notebook, stapler, tape dispenser, pen cup and small stationery accessories. Packed as one retail-ready set for offices, schools and gifting programs.',
    tags: ['office stationery', 'desk organizer', 'office kit', 'business supplies'],
  },
  {
    name: 'RideGo 8-Piece Leakproof Travel Bottle Set 100 ml',
    slug: 'ridego-8-piece-leakproof-travel-bottle-set-100ml',
    sku: 'RG-UTIL-TB08',
    categorySlug: 'ridego-travel-personal-utility',
    brandSlug: 'ridego-utility',
    price: 349,
    mrp: 499,
    costPrice: 195,
    gstRate: 18,
    stock: 200,
    lowStockThreshold: 30,
    moq: 12,
    image: 'product-03.jpg',
    attributes: { packSize: '8-piece set', unit: 'set', capacity: 'Up to 100 ml each', color: 'Clear / Sage', hsn: '3924' },
    tiers: [{ minQty: 48, price: 319 }, { minQty: 120, price: 289 }],
    description: 'Reusable travel container set with assorted flip-cap, screw-cap, spray and pump bottles, two cream jars, funnel and carry pouch. Designed for toiletries and personal-care liquids. GST classification reference: HSN 3924.',
    tags: ['travel bottles', 'toiletry containers', 'reusable bottles', 'HSN 3924'],
  },
  {
    name: 'RideGo 10 W Foldable LED Desk Lamp',
    slug: 'ridego-10w-foldable-led-desk-lamp',
    sku: 'RG-WORK-DL10',
    categorySlug: 'ridego-lighting-hardware',
    brandSlug: 'ridego-workspace',
    price: 899,
    mrp: 1299,
    costPrice: 620,
    gstRate: 18,
    stock: 75,
    lowStockThreshold: 10,
    moq: 5,
    image: 'product-04.jpg',
    attributes: { packSize: '1 piece', unit: 'piece', power: '10 W', color: 'White', fitting: 'Integrated LED', hsn: '9405' },
    tiers: [{ minQty: 20, price: 849 }, { minQty: 50, price: 799 }],
    description: 'Space-saving foldable LED desk lamp with an adjustable arm, broad light bar and stable circular base. Suitable for study desks, office workstations and bedside use. GST classification reference: HSN 9405.',
    tags: ['LED desk lamp', 'foldable lamp', 'workspace lighting', 'HSN 9405'],
  },
  {
    name: 'RideGo 46-Piece Household Hand Tool Kit',
    slug: 'ridego-46-piece-household-hand-tool-kit',
    sku: 'RG-UTIL-TK46',
    categorySlug: 'ridego-lighting-hardware',
    brandSlug: 'ridego-utility',
    price: 1799,
    mrp: 2499,
    costPrice: 1250,
    gstRate: 18,
    stock: 60,
    lowStockThreshold: 9,
    moq: 3,
    image: 'product-05.jpg',
    attributes: { packSize: '46-piece set', unit: 'set', color: 'Black / Yellow', case: 'Hard carry case', hsn: '8206' },
    tiers: [{ minQty: 12, price: 1699 }, { minQty: 30, price: 1599 }],
    description: 'Compact household tool kit in a molded carry case with hammer, pliers, adjustable wrench, screwdrivers, hex keys, measuring tape, utility knife, sockets and common fastener accessories. GST classification reference: HSN 8206.',
    tags: ['hand tool kit', 'household tools', '46 piece', 'HSN 8206'],
  },
  {
    name: 'RideGo Premium Celebration Gift Hamper',
    slug: 'ridego-premium-celebration-gift-hamper',
    sku: 'RG-SELECT-GH01',
    categorySlug: 'ridego-celebration-gift-hampers',
    brandSlug: 'ridego-select',
    price: 1999,
    mrp: 2799,
    costPrice: 1350,
    gstRate: 18,
    stock: 45,
    lowStockThreshold: 8,
    moq: 5,
    image: 'product-06.jpg',
    attributes: { packSize: '1 hamper', unit: 'hamper', packaging: 'Wicker basket with gift wrap', assortment: 'Mixed celebration selection', taxTreatment: 'Mixed supply' },
    tiers: [{ minQty: 10, price: 1899 }, { minQty: 25, price: 1799 }],
    description: 'Presentation-ready celebration hamper with an assorted premium selection, decorative basket and gift-ready packaging. Contents can be customized for employee rewards, festive events and client gifting. Taxed as a mixed supply at the highest applicable catalog rate; final invoice classification should be confirmed against the selected contents.',
    tags: ['gift hamper', 'corporate gifting', 'celebration hamper', 'mixed supply'],
  },
];

async function listAll(route, limit = 200) {
  const separator = route.includes('?') ? '&' : '?';
  const response = await request(`${route}${separator}page=1&limit=${limit}`, { token: ownerToken });
  return Array.isArray(response.data) ? response.data : [];
}

let ownerToken;

async function main() {
  ownerToken = await authenticate();
  const theme = await request('/themes/storefront/current', {
    headers: { 'x-tenant-id': tenantId },
  });
  const industry = theme?.data?.branding?.industryName || theme?.data?.industry?.name || '';
  if (String(industry).trim().toLowerCase() !== 'general commerce') {
    throw new Error(`Tenant industry is "${industry || 'unknown'}"; this importer is scoped to General Commerce.`);
  }

  const categoryRows = await listAll('/categories');
  const categoryBySlug = new Map(categoryRows.map((row) => [String(row.slug).toLowerCase(), row]));
  for (const category of categories) {
    if (categoryBySlug.has(category.slug)) continue;
    const imageUrl = `${themeAssetBase}/${category.image}`;
    const created = await request('/categories', {
      method: 'POST',
      token: ownerToken,
      body: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        status: 'active',
        sortOrder: category.sortOrder,
        iconUrl: imageUrl,
        thumbnailUrl: imageUrl,
        bannerUrl: imageUrl,
        showInApp: true,
        showInWebsite: true,
        showInMenu: true,
      },
    });
    categoryBySlug.set(category.slug, created.data);
  }

  const brandResponse = await request('/brands?includeInactive=1', { token: ownerToken });
  const brandBySlug = new Map((brandResponse.data || []).map((row) => [String(row.slug).toLowerCase(), row]));
  for (const brand of brands) {
    const existing = brandBySlug.get(brand.slug);
    if (existing?.type === 'tenant' || existing?.masterBrandId === null) continue;
    const created = await request('/brands', {
      method: 'POST',
      token: ownerToken,
      body: { ...brand, status: 'active' },
    });
    brandBySlug.set(brand.slug, { ...created.data, type: 'tenant' });
  }

  const productResponse = await request('/products?page=1&limit=100', { token: ownerToken });
  const productBySku = new Map((productResponse.data || []).map((row) => [String(row.sku).toUpperCase(), row]));
  const result = [];

  for (const definition of products) {
    const category = categoryBySlug.get(definition.categorySlug);
    const brand = brandBySlug.get(definition.brandSlug);
    if (!category?.id || !brand?.id) {
      throw new Error(`Category or brand lookup failed for ${definition.sku}.`);
    }

    let product = productBySku.get(definition.sku);
    const baseBody = {
      name: definition.name,
      slug: definition.slug,
      sku: definition.sku,
      description: definition.description,
      categoryId: category.id,
      price: definition.price.toFixed(2),
      mrp: definition.mrp.toFixed(2),
      taxRate: definition.gstRate.toFixed(2),
      costPrice: definition.costPrice.toFixed(2),
      brandId: brand.id,
      metaTitle: `${definition.name} | RideGo`,
      metaDescription: definition.description.slice(0, 300),
      metaKeywords: definition.tags.join(', '),
      tags: definition.tags,
    };

    if (!product) {
      const created = await request('/products', {
        method: 'POST',
        token: ownerToken,
        body: { ...baseBody, status: 'draft' },
      });
      product = created.data;
      productBySku.set(definition.sku, product);
    }

    let detail = await request(`/products/${product.id}`, { token: ownerToken });
    let variant = (detail.data.variants || []).find((row) => row.variantSku === `${definition.sku}-STD`);
    if (!variant) {
      const createdVariant = await request(`/products/${product.id}/variants`, {
        method: 'POST',
        token: ownerToken,
        body: {
          variantSku: `${definition.sku}-STD`,
          price: definition.price.toFixed(2),
          mrp: definition.mrp.toFixed(2),
          stockQuantity: definition.stock,
          attributesJson: definition.attributes,
          status: 'active',
          moq: definition.moq,
          gstRate: definition.gstRate.toFixed(2),
        },
      });
      variant = createdVariant.data;
    }

    const imageUrl = `${themeAssetBase}/${definition.image}`;
    if (!(detail.data.images || []).some((row) => row.imageUrl === imageUrl)) {
      const imageFile = path.join(themeAssetDir, definition.image);
      const imageSizeMb = Number((fs.statSync(imageFile).size / 1024 / 1024).toFixed(4));
      await request(`/products/${product.id}/images`, {
        method: 'POST',
        token: ownerToken,
        body: {
          variantId: variant.id,
          imageUrl,
          isThumbnail: true,
          position: 0,
          imageSizeMb,
        },
      });
    }

    await request('/inventory', {
      method: 'POST',
      token: ownerToken,
      body: {
        productId: product.id,
        variantId: variant.id,
        stockQuantity: definition.stock,
        lowStockThreshold: definition.lowStockThreshold,
      },
    });

    for (const tier of definition.tiers) {
      await request('/catalog/pricing/quantity-prices', {
        method: 'POST',
        token: ownerToken,
        body: {
          productVariantId: variant.id,
          minQty: tier.minQty,
          price: tier.price.toFixed(2),
        },
      });
    }

    await request(`/products/${product.id}`, {
      method: 'PATCH',
      token: ownerToken,
      body: { ...baseBody, status: 'active' },
    });

    detail = await request(`/products/${product.id}`, { token: ownerToken });
    result.push({
      id: product.id,
      sku: definition.sku,
      name: definition.name,
      category: category.name,
      brand: brand.name,
      price: definition.price,
      mrp: definition.mrp,
      gstRate: definition.gstRate,
      stock: definition.stock,
      moq: definition.moq,
      variants: detail.data.variants.length,
      images: detail.data.images.length,
    });
  }

  // This catalog is meant to be visible on both the public website and the
  // mobile app before customer sign-in. Keep guest access enabled and expose
  // the configured B2B prices/quantity tiers through the normal distributor
  // setting instead of bypassing storefront visibility rules.
  const appConfig = await request('/distributor/app-config', {
    method: 'PUT',
    token: ownerToken,
    body: {
      allowGuestAccess: true,
      showPricesToGuest: true,
      allowGuestCart: true,
    },
  });

  const finalProducts = await request('/products?page=1&limit=100', { token: ownerToken });
  const storefront = await request('/storefront/products?page=1&limit=100', {
    headers: {
      'x-tenant-id': tenantId,
      'x-storefront-host': 'ridgo.localhost:5175',
    },
  });
  console.log(JSON.stringify({
    success: true,
    tenantId,
    industry,
    categoriesCreatedOrMatched: categories.length,
    brandsCreatedOrMatched: brands.length,
    products: result,
    distributorProductTotal: finalProducts.meta?.total ?? finalProducts.data?.length ?? 0,
    storefrontProductTotal: storefront.data?.meta?.total ?? storefront.data?.items?.length ?? 0,
    guestCatalogSettings: appConfig.data,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
