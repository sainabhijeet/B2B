const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Client } = require('../../node_modules/pg');

const TARGET_TENANT_ID = '05408815-20d6-4dda-ac52-d4f9c1740e06';

const categories = {
  skincare: '20000000-0000-4000-8000-00000000002f',
  haircare: '20000000-0000-4000-8000-000000000030',
  faceCare: '20100000-0000-4000-8000-00000000002a',
  bodyCare: '20100000-0000-4000-8000-00000000002b',
  salonHaircare: '20100000-0000-4000-8000-00000000002c',
  serums: '20200000-0000-4000-8000-000000000011',
  moisturizers: '20200000-0000-4000-8000-000000000012',
};

const slugify = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const catalogGroups = [
  {
    key: 'haircare', code: 'HAR', categoryId: categories.haircare, basePrice: 249,
    items: [
      ['Root Revival Scalp Serum', '50ml', 'amber glass scalp applicator bottle'],
      ['Strength Repair Shampoo', '300ml', 'tall pearl pump bottle'],
      ['Smooth Balance Conditioner', '250ml', 'soft mauve squeeze tube'],
      ['Argan Gloss Hair Oil', '100ml', 'clear amber oil bottle with pump'],
      ['Anti-Dandruff Scalp Cleanser', '200ml', 'white pharmacy-style nozzle bottle'],
      ['Curl Definition Cream', '150ml', 'wide pastel lavender jar'],
      ['Heat Protect Mist', '120ml', 'slender blush spray bottle'],
      ['Volume Lift Dry Shampoo', '150ml', 'matte beige aerosol can'],
      ['Keratin Leave-In Cream', '100ml', 'cream airless pump bottle'],
      ['Rosemary Scalp Tonic', '100ml', 'green tinted precision nozzle bottle'],
      ['Colour Protect Shampoo', '300ml', 'deep plum pump bottle'],
      ['Split End Rescue Serum', '60ml', 'small rose-gold pump bottle'],
      ['Hydration Hair Butter', '200ml', 'ivory cosmetic jar with bronze lid'],
      ['Daily Detangle Spray', '150ml', 'frosted lilac trigger spray bottle'],
      ['Rice Water Strength Rinse', '200ml', 'translucent white flip-cap bottle'],
    ],
  },
  {
    key: 'skincare', code: 'SKN', categoryId: categories.skincare, basePrice: 229,
    items: [
      ['Gentle Gel Face Wash', '120ml', 'clear aqua pump cleanser bottle'],
      ['Vitamin C Brightening Toner', '150ml', 'amber toner bottle with gold cap'],
      ['Ceramide Barrier Cream', '50g', 'ivory cream jar with pale blue lid'],
      ['Mineral SPF 30 Lotion', '50ml', 'white sunscreen tube with apricot accent'],
      ['Niacinamide Clarifying Gel', '50g', 'frosted mint airless pump bottle'],
      ['Rose Water Face Mist', '100ml', 'transparent pink spray bottle'],
      ['Enzyme Exfoliating Cleanser', '75ml', 'coral squeeze tube'],
      ['Green Tea Clay Mask', '100g', 'sage green cosmetic jar'],
      ['Overnight Recovery Balm', '50g', 'navy glass jar with silver lid'],
      ['Micellar Cleansing Water', '200ml', 'clear bottle with blush flip cap'],
      ['Peptide Eye Cream', '20g', 'small pearl airless pump'],
      ['AHA BHA Peel', '30ml', 'dark amber dropper bottle'],
      ['Cica Calming Gel', '100g', 'translucent green gel jar'],
      ['Squalane Cleansing Oil', '150ml', 'clear golden pump bottle'],
      ['Daily Hydration Essence', '100ml', 'frosted blue glass bottle'],
    ],
  },
  {
    key: 'body-care', code: 'BDY', categoryId: categories.bodyCare, basePrice: 199,
    items: [
      ['Velvet Oud Body Mist', '100ml', 'luxury amber glass spray bottle'],
      ['Gentle Baby Lotion', '200ml', 'rounded lavender and cream pump bottle'],
      ['Shea Body Butter', '200g', 'warm beige wide cosmetic jar'],
      ['Vitamin C Body Lotion', '250ml', 'orange-accented tall pump bottle'],
      ['Coffee Body Scrub', '200g', 'brown glass jar with metal lid'],
      ['Almond Hand Cream', '75ml', 'nude squeeze tube with bronze cap'],
      ['Urea Foot Cream', '100g', 'white and teal squeeze tube'],
      ['Refreshing Shower Gel', '300ml', 'clear aqua flip-cap bottle'],
      ['Oat Milk Body Wash', '300ml', 'milky cream pump bottle'],
      ['Fresh Cotton Roll-On Deo', '50ml', 'compact white roll-on bottle'],
      ['Almond Glow Body Oil', '100ml', 'golden oil pump bottle'],
      ['Gentle Hand Wash', '300ml', 'clear blush pump bottle'],
      ['Lavender Bath Salts', '250g', 'glass jar filled with lavender bath salts'],
      ['pH Balance Intimate Wash', '150ml', 'soft pink pump bottle'],
      ['Cooling Foot Spray', '100ml', 'icy blue spray bottle'],
    ],
  },
  {
    key: 'face-care', code: 'FAC', categoryId: categories.faceCare, basePrice: 249,
    items: [
      ['Cloud Cream Cleanser', '120ml', 'minimal white cream cleanser tube'],
      ['Velvet Matte Lip Color', '4.2g', 'rose nude lipstick in metallic tube'],
      ['Matte Liquid Foundation', '30ml', 'frosted foundation bottle with black pump'],
      ['HD Compact Powder', '12g', 'open rose-gold compact with pressed powder'],
      ['Soft Cream Blush', '8g', 'small blush pink cosmetic pot'],
      ['Precision Brow Definer', '0.3g', 'slender dual-ended eyebrow pencil'],
      ['Intense Kajal Pencil', '1.2g', 'sleek black kajal pencil'],
      ['Lash Lift Mascara', '10ml', 'black mascara tube and wand'],
      ['Hydrating Makeup Primer', '30ml', 'frosted pale pink pump bottle'],
      ['Full Cover Concealer', '6ml', 'beige concealer tube with applicator cap'],
      ['Makeup Fixing Mist', '100ml', 'clear fine mist spray bottle'],
      ['Lip and Cheek Tint', '10ml', 'small berry glass tint bottle'],
      ['Melt Away Cleansing Balm', '80g', 'peach cosmetic jar with spatula'],
      ['Translucent Setting Powder', '20g', 'clear loose powder jar with black lid'],
      ['BB Cream SPF 25', '40ml', 'warm ivory squeeze tube'],
    ],
  },
  {
    key: 'salon-haircare', code: 'SAL', categoryId: categories.salonHaircare, basePrice: 399,
    items: [
      ['Bond Repair Hair Mask', '200ml', 'professional blush hair mask jar'],
      ['Keratin Smoothing Shampoo', '1L', 'large black salon pump bottle'],
      ['Professional Repair Conditioner', '1L', 'large ivory salon pump bottle'],
      ['Cream Developer 20 Volume', '1L', 'professional white developer bottle'],
      ['Dust-Free Bleach Powder', '500g', 'large salon powder tub'],
      ['Intensive Hair Spa Cream', '500g', 'wide metallic salon treatment tub'],
      ['Neutralizing Shampoo', '500ml', 'silver salon pump bottle'],
      ['Colour Protect Masque', '500g', 'deep burgundy salon mask jar'],
      ['Professional Bond Builder', '250ml', 'two-step style salon treatment bottle'],
      ['Salon Finish Hair Serum', '100ml', 'premium clear serum pump bottle'],
      ['Deep Cleanse Shampoo', '1L', 'large charcoal salon pump bottle'],
      ['Perm Neutralizer Lotion', '500ml', 'professional nozzle bottle'],
      ['Post-Colour Sealer', '250ml', 'rose metallic salon squeeze bottle'],
      ['Thermal Styling Spray', '300ml', 'tall professional spray bottle'],
      ['Scalp Detox Scrub', '300g', 'dark green salon scrub jar'],
    ],
  },
  {
    key: 'moisturizers', code: 'MOI', categoryId: categories.moisturizers, basePrice: 279,
    items: [
      ['Daily Shield SPF 50', '50ml', 'yellow-accented sunscreen tube'],
      ['Ceramide Daily Moisturizer', '100ml', 'white and blue airless pump bottle'],
      ['Hyaluronic Aqua Gel', '50g', 'transparent aqua gel jar'],
      ['Oil-Free Matte Lotion', '60ml', 'minimal frosted pump bottle'],
      ['Peptide Firming Cream', '50g', 'premium rose-gold cream jar'],
      ['Oat Calming Lotion', '100ml', 'warm cream pump bottle'],
      ['Vitamin E Nourishing Cream', '100g', 'amber jar with ivory lid'],
      ['Cica Repair Cream', '50g', 'sage green squeeze tube'],
      ['Squalane Moisture Balm', '50g', 'clear jar with pale peach balm'],
      ['Aloe Hydration Gel', '150g', 'transparent green gel tube'],
      ['Overnight Sleeping Mask', '75g', 'lavender glass jar'],
      ['Brightening Day Cream', '50g', 'pearl white jar with gold lid'],
      ['Probiotic Barrier Lotion', '100ml', 'soft lilac pump bottle'],
      ['Retinol Night Moisturizer', '50g', 'dark blue airless jar'],
      ['Cooling Gel Cream for Men', '75g', 'smoky grey gel jar'],
    ],
  },
  {
    key: 'serums', code: 'SER', categoryId: categories.serums, basePrice: 349,
    items: [
      ['Radiance Barrier Serum', '30ml', 'rose glass serum dropper bottle'],
      ['Vitamin C 15% Serum', '30ml', 'amber dropper bottle with orange accent'],
      ['Niacinamide 10% Serum', '30ml', 'clear dropper bottle with white label panel'],
      ['Hyaluronic Acid Serum', '30ml', 'aqua tinted dropper bottle'],
      ['Salicylic Acid 2% Serum', '30ml', 'smoky grey dropper bottle'],
      ['Retinol 0.3% Serum', '30ml', 'dark violet dropper bottle'],
      ['Peptide Firming Serum', '30ml', 'pearl airless serum bottle'],
      ['Alpha Arbutin Serum', '30ml', 'clear glass dropper bottle with blush accent'],
      ['Cica Calming Ampoule', '30ml', 'pale green glass ampoule bottle'],
      ['Ceramide Repair Serum', '30ml', 'milky frosted pump serum bottle'],
      ['Caffeine Eye Serum', '15ml', 'small amber eye serum dropper bottle'],
      ['Lactic Acid Resurfacing Serum', '30ml', 'coral tinted dropper bottle'],
      ['Squalane Facial Oil', '30ml', 'clear golden facial oil bottle'],
      ['Tranexamic Spot Corrector', '30ml', 'white precision pump bottle'],
      ['Probiotic Glow Serum', '30ml', 'iridescent blush dropper bottle'],
    ],
  },
];

const existingOverrides = {
  'Root Revival Scalp Serum': { slug: 'lumera-root-revival-scalp-serum-50ml', sku: 'LMP-HAR-SCL-50', image: 'product-scalp-serum.png', barcode: 'LMP890001000005', gallery: true, price: 399, mrp: 649, stock: 168 },
  'Radiance Barrier Serum': { slug: 'lumera-radiance-barrier-serum-30ml', sku: 'LMP-SER-RAD-30', image: 'product-radiance-serum.png', barcode: 'LMP890001000001', gallery: true, price: 549, mrp: 799, stock: 180 },
  'Cloud Cream Cleanser': { slug: 'lumera-cloud-cream-cleanser-120ml', sku: 'LMP-CLN-CLD-120', image: 'product-cleanser.png', barcode: 'LMP890001000002', gallery: true, price: 299, mrp: 449, stock: 240 },
  'Velvet Oud Body Mist': { slug: 'lumera-velvet-oud-body-mist-100ml', sku: 'LMP-BDY-OUD-100', image: 'product-oud-mist.png', barcode: 'LMP890001000003', gallery: true, price: 349, mrp: 599, stock: 156 },
  'Bond Repair Hair Mask': { slug: 'lumera-bond-repair-hair-mask-200ml', sku: 'LMP-HAR-MSK-200', image: 'product-repair-mask.png', barcode: 'LMP890001000004', gallery: true, price: 449, mrp: 699, stock: 132, casePack: 18 },
  'Daily Shield SPF 50': { slug: 'lumera-daily-shield-spf-50-50ml', sku: 'LMP-SKN-SPF-50', image: 'product-sun-fluid.png', barcode: 'LMP890001000006', gallery: true, price: 429, mrp: 699, stock: 216 },
  'Gentle Baby Lotion': { slug: 'lumera-gentle-baby-lotion-200ml', sku: 'LMP-BDY-BBY-200', image: 'product-baby-lotion.png', barcode: 'LMP890001000007', gallery: true, price: 249, mrp: 399, stock: 204 },
  'Velvet Matte Lip Color': { slug: 'lumera-velvet-matte-lip-color-4-2g', sku: 'LMP-LIP-VEL-42', image: 'product-velvet-lip.png', barcode: 'LMP890001000008', gallery: true, price: 299, mrp: 499, stock: 288, moq: 12, casePack: 36 },
};

const products = catalogGroups.flatMap((group) => group.items.map(([shortName, packSize, visual], index) => {
  const override = existingOverrides[shortName] || {};
  const ordinal = String(index + 1).padStart(2, '0');
  const price = override.price || group.basePrice + ((index * 47) % 260);
  const mrp = override.mrp || Math.ceil((price * 1.55) / 10) * 10 - 1;
  return {
    slug: override.slug || `lumera-${slugify(shortName)}-${slugify(packSize)}`,
    sku: override.sku || `LMP-${group.code}-${ordinal}`,
    name: `Lumera Pro ${shortName} ${packSize}`,
    description: `Retail-ready ${shortName.toLowerCase()} in a ${packSize} pack for beauty stores, salons and professional resellers. Authentic-looking packaging, consistent wholesale supply and clear trade pricing.`,
    categoryId: group.categoryId,
    price,
    mrp,
    cost: Math.round(price * 0.78),
    gst: 18,
    stock: override.stock || 120 + ((index * 19) % 180),
    moq: override.moq || 6,
    packSize,
    casePack: override.casePack || (packSize === '1L' || packSize === '500g' ? 12 : 24),
    image: override.image || `product-${group.key}-${ordinal}.png`,
    barcode: override.barcode || `LMP890${String(catalogGroups.indexOf(group) + 1).padStart(2, '0')}${ordinal}0000`,
    gallery: Boolean(override.gallery),
    visual,
  };
}));

const categoryImageFiles = new Map([
  [categories.skincare, 'category-skincare.png'],
  [categories.haircare, 'category-haircare.png'],
  [categories.faceCare, 'category-face-care.png'],
  [categories.bodyCare, 'category-body-care.png'],
  [categories.salonHaircare, 'category-salon-haircare.png'],
  [categories.serums, 'category-serums.png'],
  [categories.moisturizers, 'category-moisturizers.png'],
]);

function galleryFileNames(fileName, includeGallery = false) {
  if (!includeGallery) return [fileName];
  const extension = path.extname(fileName);
  const stem = path.basename(fileName, extension);
  return [
    fileName,
    `${stem}-angle${extension}`,
    `${stem}-lifestyle${extension}`,
  ];
}

function uuidFor(key) {
  const hex = crypto
    .createHash('md5')
    .update(`vijiya-beauty:${key}`)
    .digest('hex')
    .split('');
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function installImages(projectRoot, storageRoot) {
  const productSourceDir = path.join(
    projectRoot,
    'exports',
    'beauty-personal-care-b2b-theme',
    'catalog',
    'product-images',
  );
  const categorySourceDir = path.join(
    projectRoot,
    'exports',
    'beauty-personal-care-b2b-theme',
    'catalog',
    'category-images',
  );
  const targetDir = path.join(
    storageRoot,
    'tenant-media',
    TARGET_TENANT_ID,
    'catalog',
    'products',
  );
  const masterCategoryDir = path.join(
    storageRoot,
    'tenant-media',
    'master-categories',
    'beauty',
  );
  fs.mkdirSync(targetDir, { recursive: true });
  fs.mkdirSync(masterCategoryDir, { recursive: true });
  const productImageFiles = new Set(
    products.flatMap((product) => galleryFileNames(product.image, product.gallery)),
  );
  for (const fileName of productImageFiles) {
    const source = path.join(productSourceDir, fileName);
    if (!fs.existsSync(source)) throw new Error(`Missing product image: ${source}`);
    fs.copyFileSync(source, path.join(targetDir, fileName));
  }
  for (const fileName of categoryImageFiles.values()) {
    const source = path.join(categorySourceDir, fileName);
    if (!fs.existsSync(source)) throw new Error(`Missing category image: ${source}`);
    fs.copyFileSync(source, path.join(masterCategoryDir, fileName));
  }
}

async function main() {
  const projectRoot = path.resolve(__dirname, '../../../..');
  const storageRoot = process.env.BACKEND_STORAGE_DIR
    ? path.resolve(process.cwd(), process.env.BACKEND_STORAGE_DIR)
    : path.join(process.cwd(), 'storage');
  installImages(projectRoot, storageRoot);

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'saas_platform',
  });
  await client.connect();

  const tenantResult = await client.query(
    `select id, slug, name, schema_name
       from tenants
      where id = $1
      limit 1`,
    [process.env.SEED_TENANT_ID || TARGET_TENANT_ID],
  );
  const tenant = tenantResult.rows[0];
  if (!tenant) throw new Error('Vijiya tenant not found');
  const schema = tenant.schema_name || `t_${tenant.id.replace(/-/g, '')}`;

  const categoryCheck = await client.query(
    `select id from public.categories where id = any($1::uuid[]) and deleted_at is null`,
    [Object.values(categories)],
  );
  if (categoryCheck.rowCount !== Object.keys(categories).length) {
    throw new Error('One or more Beauty & Personal Care master categories are missing');
  }

  await client.query('begin');
  try {
    for (const [categoryId, fileName] of categoryImageFiles) {
      const imageUrl = `/storage/tenant-media/master-categories/beauty/${fileName}`;
      await client.query(
        `update public.categories
            set icon_url = $2,
                thumbnail_url = $2,
                updated_at = now()
          where id = $1`,
        [categoryId, imageUrl],
      );
    }

    const brandId = uuidFor('brand:lumera-pro');
    await client.query(
      `insert into "${schema}".brands
        (id, master_brand_id, name, slug, logo_url, description, status, created_at, updated_at)
       values ($1,null,'Lumera Pro','lumera-pro',null,$2,'active',now(),now())
       on conflict (id) do update set
        name = excluded.name,
        slug = excluded.slug,
        description = excluded.description,
        status = 'active',
        updated_at = now()`,
      [brandId, 'Professional beauty and personal-care range for salons, distributors and retail partners.'],
    );

    for (const product of products) {
      const deterministicProductId = uuidFor(`product:${product.slug}`);
      const productResult = await client.query(
        `insert into "${schema}".products
          (id, tenant_id, name, slug, sku, description, category_id, price, mrp, tax_rate, status,
           meta_title, meta_description, meta_keywords, cost_price, tags, brand_id, brand,
           weight, dimensions, hsn_code, barcode, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11,$12,$13,$14,$15::jsonb,$16,'Lumera Pro',
           $17,$18,'33049990',$19,now(),now())
         on conflict (tenant_id, slug) where deleted_at is null do update set
          name = excluded.name,
          sku = excluded.sku,
          description = excluded.description,
          category_id = excluded.category_id,
          price = excluded.price,
          mrp = excluded.mrp,
          tax_rate = excluded.tax_rate,
          status = 'active',
          meta_title = excluded.meta_title,
          meta_description = excluded.meta_description,
          meta_keywords = excluded.meta_keywords,
          cost_price = excluded.cost_price,
          tags = excluded.tags,
          brand_id = excluded.brand_id,
          brand = excluded.brand,
          weight = excluded.weight,
          dimensions = excluded.dimensions,
          hsn_code = excluded.hsn_code,
          barcode = excluded.barcode,
          deleted_at = null,
          updated_at = now()
         returning id`,
        [
          deterministicProductId,
          tenant.id,
          product.name,
          product.slug,
          product.sku,
          product.description,
          product.categoryId,
          product.price,
          product.mrp,
          product.gst,
          product.name,
          product.description,
          `Lumera Pro, beauty, personal care, wholesale, ${product.packSize}`,
          product.cost,
          JSON.stringify(['beauty', 'personal-care', 'wholesale', 'trade-ready']),
          brandId,
          Number.parseFloat(product.packSize) || null,
          `Case pack: ${product.casePack}`,
          product.barcode,
        ],
      );
      const productId = productResult.rows[0].id;
      const variantId = uuidFor(`variant:${product.slug}:default`);
      const variantResult = await client.query(
        `insert into "${schema}".product_variants
          (id, product_id, variant_sku, price, mrp, moq, gst_rate, stock_quantity, attributes_json, status, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,'active',now(),now())
         on conflict (id) do update set
          product_id = excluded.product_id,
          variant_sku = excluded.variant_sku,
          price = excluded.price,
          mrp = excluded.mrp,
          moq = excluded.moq,
          gst_rate = excluded.gst_rate,
          stock_quantity = excluded.stock_quantity,
          attributes_json = excluded.attributes_json,
          status = 'active',
          deleted_at = null,
          updated_at = now()
         returning id`,
        [
          variantId,
          productId,
          `${product.sku}-STD`,
          product.price,
          product.mrp,
          product.moq,
          product.gst,
          product.stock,
          JSON.stringify({
            unit: 'piece',
            packSize: product.packSize,
            casePack: product.casePack,
            brand: 'Lumera Pro',
            shelfLife: '24 months',
            countryOfOrigin: 'India',
          }),
        ],
      );
      const savedVariantId = variantResult.rows[0].id;

      await client.query(
        `update "${schema}".product_images
            set is_thumbnail = false
          where product_id = $1`,
        [productId],
      );
      await client.query(
        `delete from "${schema}".product_images
          where product_id = $1`,
        [productId],
      );
      const galleryFiles = galleryFileNames(product.image, product.gallery);
      for (const [position, imageFile] of galleryFiles.entries()) {
        await client.query(
          `insert into "${schema}".product_images
            (id, product_id, variant_id, image_url, is_thumbnail, position, created_at)
           values ($1,$2,$3,$4,$5,$6,now())
           on conflict (id) do update set
            product_id = excluded.product_id,
            variant_id = excluded.variant_id,
            image_url = excluded.image_url,
            is_thumbnail = excluded.is_thumbnail,
            position = excluded.position`,
          [
            position === 0
              ? uuidFor(`image:${product.slug}`)
              : uuidFor(`image:${product.slug}:${position}`),
            productId,
            savedVariantId,
            `/storage/tenant-media/${TARGET_TENANT_ID}/catalog/products/${imageFile}`,
            position === 0,
            position,
          ],
        );
      }

      await client.query(
        `insert into "${schema}".inventory
          (id, product_id, variant_id, stock_quantity, reserved_stock, low_stock_threshold, stock_status, created_at, updated_at)
         values ($1,$2,$3,$4,0,$5,'IN_STOCK',now(),now())
         on conflict (product_id, variant_id) do update set
          stock_quantity = excluded.stock_quantity,
          reserved_stock = 0,
          low_stock_threshold = excluded.low_stock_threshold,
          stock_status = 'IN_STOCK',
          updated_at = now()`,
        [uuidFor(`inventory:${product.slug}`), productId, savedVariantId, product.stock, product.casePack],
      );

      const quantityPrices = [
        { minQty: product.moq, price: product.price },
        { minQty: product.casePack, price: Number((product.price * 0.95).toFixed(2)) },
        { minQty: product.casePack * 4, price: Number((product.price * 0.9).toFixed(2)) },
      ];
      for (const tier of quantityPrices) {
        await client.query(
          `insert into "${schema}".quantity_prices
            (id, product_variant_id, min_qty, price, created_at, updated_at)
           values ($1,$2,$3,$4,now(),now())
           on conflict (product_variant_id, min_qty) do update set
            price = excluded.price,
            updated_at = now()`,
          [uuidFor(`tier:${product.slug}:${tier.minQty}`), savedVariantId, tier.minQty, tier.price],
        );
      }

      await client.query(
        `delete from "${schema}".product_categories where product_id = $1`,
        [productId],
      );
      await client.query(
        `insert into "${schema}".product_categories (product_id, category_id)
         values ($1,$2)
         on conflict do nothing`,
        [productId, product.categoryId],
      );
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }

  const summary = await client.query(
    `select
      (select count(*) from "${schema}".products where tenant_id = $1 and deleted_at is null and status = 'active') as active_products,
      (select count(*) from "${schema}".brands where status = 'active') as active_brands,
      (select count(*) from "${schema}".product_variants where deleted_at is null and status = 'active') as active_variants,
      (select count(*) from "${schema}".product_images) as product_images,
      (select count(*) from "${schema}".inventory where stock_status = 'IN_STOCK') as in_stock_rows,
      (select count(*) from "${schema}".quantity_prices) as quantity_price_tiers`,
    [tenant.id],
  );
  console.log(JSON.stringify({ tenant, schema, ...summary.rows[0] }, null, 2));
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
