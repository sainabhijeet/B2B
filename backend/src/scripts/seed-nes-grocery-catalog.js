const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Client } = require('../../node_modules/pg');

const root = path.resolve(__dirname, '../../../..');
const seedDir = path.join(
  root,
  'exports/mobile-themes/grocery_theme_pack/database',
);

function readSeed(name) {
  return JSON.parse(fs.readFileSync(path.join(seedDir, name), 'utf8'));
}

function uuidFor(key) {
  const hex = crypto
    .createHash('md5')
    .update(`nes-grocery:${key}`)
    .digest('hex')
    .split('');
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const s = hex.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

function publicProductImage(product) {
  const slug = product.id.replace(/^prod-/, '');
  return `/storage/grocery-catalog/products/${slug}.png`;
}

function categoryImage(slug) {
  const map = {
    'grocery-staples': 'grocery.png',
    'rice-flour': 'grocery.png',
    'pulses-dal': 'grocery.png',
    'oil-ghee': 'grocery.png',
    'sugar-salt': 'grocery.png',
    'tea-coffee': 'beverages.png',
    beverages: 'beverages.png',
    'biscuits-snacks': 'snacks.png',
    dairy: 'dairy.png',
    'frozen-foods': 'vegetables.png',
    bakery: 'bakery.png',
    spices: 'grocery.png',
    'dry-fruits': 'snacks.png',
    cleaning: 'household.png',
    'home-care': 'household.png',
    'personal-care': 'personal-care.png',
    'baby-care': 'baby-care.png',
    stationery: 'household.png',
  };
  return `/storage/themes/mobile/freshcartgrocery/assets/images/categories/${map[slug] ?? 'grocery.png'}`;
}

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function hasTable(client, schema, table) {
  const res = await client.query(
    `select exists (
      select 1 from information_schema.tables
      where table_schema = $1 and table_name = $2
    ) as ok`,
    [schema, table],
  );
  return res.rows[0]?.ok === true;
}

async function main() {
  const targetSlug = (process.env.SEED_TENANT_SLUG || '').trim().toLowerCase();
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'saas_platform',
  });
  await client.connect();

  const tenantRes = await client.query(
    targetSlug
      ? `select t.id, t.slug, t.name, t.schema_name
       from tenants t
      where lower(t.slug) = $1
      order by t.created_at desc
      limit 1`
      : `select t.id, t.slug, t.name, t.schema_name
       from tenants t
       left join tenant_profiles p on p.tenant_id = t.id
      where lower(concat_ws(' ', t.name, t.slug, p.business_name, p.owner_name, p.phone)) like '%nes grocery%'
         or lower(concat_ws(' ', t.name, t.slug, p.business_name, p.owner_name, p.phone)) like '%8899665544%'
      order by t.created_at desc
      limit 1`,
    targetSlug ? [targetSlug] : [],
  );
  const tenant = tenantRes.rows[0];
  if (!tenant)
    throw new Error(
      'Nes Grocery tenant not found. Register/login tenant first.',
    );
  const schema = tenant.schema_name || `t_${tenant.id.replace(/-/g, '')}`;
  if (!(await hasTable(client, schema, 'products'))) {
    throw new Error(
      `Tenant schema ${schema}.products not found. Complete tenant onboarding first.`,
    );
  }

  const categories = readSeed('categories_seed.json');
  const subcategories = readSeed('subcategories_seed.json');
  const brands = readSeed('brands_seed.json');
  const products = readSeed('products_seed.json');

  const industry = await client.query(
    `select industry_id from industries where lower(name) = lower($1) limit 1`,
    ['FMCG & Packaged Foods'],
  );
  const industryId = industry.rows[0]?.industry_id ?? null;

  await client.query('begin');
  try {
    const categoryRows = [
      ...categories.map((c) => ({ ...c, parent_id: null, level: 0 })),
      ...subcategories.map((c) => ({
        ...c,
        parent_id: uuidFor(c.category_id),
        level: 1,
      })),
    ];

    for (const c of categoryRows) {
      await client.query(
        `insert into public.categories
          (id, tenant_id, name, slug, parent_id, industry_id, level, status, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,'active',now(),now())
         on conflict (id) do update set
          tenant_id = excluded.tenant_id,
          name = excluded.name,
          slug = excluded.slug,
          parent_id = excluded.parent_id,
          industry_id = excluded.industry_id,
          level = excluded.level,
          status = 'active',
          updated_at = now()`,
        [
          uuidFor(c.id),
          tenant.id,
          c.name,
          c.slug,
          c.parent_id,
          industryId,
          c.level,
        ],
      );
      if (await hasTable(client, schema, 'categories')) {
        await client.query(
          `insert into "${schema}".categories
            (id, tenant_id, name, slug, parent_id, industry_id, level, status, created_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,'active',now(),now())
           on conflict (id) do update set
            tenant_id = excluded.tenant_id,
            name = excluded.name,
            slug = excluded.slug,
            parent_id = excluded.parent_id,
            industry_id = excluded.industry_id,
            level = excluded.level,
            status = 'active',
            updated_at = now()`,
          [
            uuidFor(c.id),
            tenant.id,
            c.name,
            c.slug,
            c.parent_id,
            industryId,
            c.level,
          ],
        );
      }
    }

    if (await hasTable(client, schema, 'brands')) {
      for (const b of brands) {
        await client.query(
          `insert into "${schema}".brands
            (id, master_brand_id, name, slug, logo_url, description, status, created_at, updated_at)
           values ($1,null,$2,$3,$4,$5,'active',now(),now())
           on conflict (id) do update set
            name = excluded.name,
            slug = excluded.slug,
            logo_url = excluded.logo_url,
            description = excluded.description,
            status = 'active',
            updated_at = now()`,
          [
            uuidFor(b.id),
            b.name,
            b.slug,
            `/storage/themes/mobile/grocery/${b.logo_url}`,
            `${b.name} FMCG wholesale brand`,
          ],
        );
      }
    }

    for (let i = 0; i < products.length; i += 1) {
      const p = products[i];
      const productId = uuidFor(p.id);
      const variantId = uuidFor(`${p.id}:default`);
      const brandId = p.brand_id ? uuidFor(p.brand_id) : null;
      const categoryId = uuidFor(p.category_id);
      const price = number(p.wholesale_price ?? p.price);
      const mrp = number(p.mrp, price);
      const gst = number(p.gst_rate, 0);
      const stock = number(p.stock_quantity ?? p.stock, 0);
      const imageUrl = publicProductImage(p);
      const tags = JSON.stringify(
        [p.category, p.subcategory, p.brand, 'wholesale', 'grocery'].filter(
          Boolean,
        ),
      );
      await client.query(
        `insert into "${schema}".products
          (id, tenant_id, name, slug, sku, description, category_id, price, mrp, tax_rate, status,
           meta_title, meta_description, meta_keywords, cost_price, tags, brand_id, brand,
           weight, dimensions, hsn_code, barcode, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',
           $11,$12,$13,$14,$15::jsonb,$16,$17,$18,$19,$20,$21,now(),now())
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
          updated_at = now()`,
        [
          productId,
          tenant.id,
          p.name,
          p.id.replace(/^prod-/, ''),
          p.sku,
          p.description,
          categoryId,
          price,
          mrp,
          gst,
          p.name,
          p.description,
          `${p.brand}, ${p.category}, grocery wholesale`,
          Number((price * 0.88).toFixed(2)),
          tags,
          brandId,
          p.brand,
          null,
          p.specifications?.case_pack ?? null,
          p.specifications?.hsn_code ?? null,
          p.barcode,
        ],
      );

      await client.query(
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
          updated_at = now()`,
        [
          variantId,
          productId,
          `${p.sku}-CASE`,
          price,
          mrp,
          number(p.moq, 1),
          gst,
          stock,
          JSON.stringify({
            unit: p.unit,
            packSize: p.pack_size,
            subcategory: p.subcategory,
            casePack: p.specifications?.case_pack,
            storage: p.specifications?.storage,
            shelfLife: p.specifications?.shelf_life,
            barcode: p.barcode,
          }),
        ],
      );

      await client.query(
        `insert into "${schema}".product_images
          (id, product_id, variant_id, image_url, is_thumbnail, position, created_at)
         values ($1,$2,$3,$4,true,0,now())
         on conflict (id) do update set
          product_id = excluded.product_id,
          variant_id = excluded.variant_id,
          image_url = excluded.image_url,
          is_thumbnail = true,
          position = 0`,
        [uuidFor(`${p.id}:image`), productId, variantId, imageUrl],
      );

      if (await hasTable(client, schema, 'inventory')) {
        await client.query(
          `insert into "${schema}".inventory
            (id, product_id, variant_id, stock_quantity, reserved_stock, low_stock_threshold, stock_status, created_at, updated_at)
           values ($1,$2,$3,$4,0,24,$5,now(),now())
           on conflict (product_id, variant_id) do update set
            stock_quantity = excluded.stock_quantity,
            reserved_stock = 0,
            low_stock_threshold = excluded.low_stock_threshold,
            stock_status = excluded.stock_status,
            updated_at = now()`,
          [
            uuidFor(`${p.id}:inventory`),
            productId,
            variantId,
            stock,
            stock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
          ],
        );
      }

      if (await hasTable(client, schema, 'product_categories')) {
        await client.query(
          `insert into "${schema}".product_categories (product_id, category_id)
           values ($1,$2)
           on conflict do nothing`,
          [productId, categoryId],
        );
        if (p.subcategory_id) {
          await client.query(
            `insert into "${schema}".product_categories (product_id, category_id)
             values ($1,$2)
             on conflict do nothing`,
            [productId, uuidFor(p.subcategory_id)],
          );
        }
      }
    }

    await client.query(
      `update themes
          set theme_type = 'FMCG & Packaged Foods',
              theme_config_json = jsonb_set(
                coalesce(theme_config_json, '{}'::jsonb),
                '{industry}',
                to_jsonb('FMCG & Packaged Foods'::text),
                true
              )
        where lower(slug) = 'grocery'
           or lower(theme_name) like '%grocery%'`,
    );

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }

  const summary = await client.query(
    `select
      (select count(*) from public.categories where tenant_id = $1) as public_categories,
      (select count(*) from "${schema}".products where tenant_id = $1 and deleted_at is null) as products,
      (select count(*) from "${schema}".product_variants) as variants,
      (select count(*) from "${schema}".product_images) as images`,
    [tenant.id],
  );
  console.log(JSON.stringify({ tenant, schema, ...summary.rows[0] }, null, 2));
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
