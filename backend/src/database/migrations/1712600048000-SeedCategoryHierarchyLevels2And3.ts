import { MigrationInterface, QueryRunner } from 'typeorm';

function categoryUuidL2(seq: number): string {
  return `20100000-0000-4000-8000-${seq.toString(16).padStart(12, '0')}`;
}

function categoryUuidL3(seq: number): string {
  return `20200000-0000-4000-8000-${seq.toString(16).padStart(12, '0')}`;
}

/**
 * Adds global (`tenant_id` NULL) subcategories (level 2) under existing root slugs from
 * `SeedCuratedGlobalCategories1712600047000`, then grandchildren (level 3) under selected level-2 slugs.
 * Skips rows when slug already exists for a global category.
 */
export class SeedCategoryHierarchyLevels2And31712600048000 implements MigrationInterface {
  name = 'SeedCategoryHierarchyLevels2And31712600048000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const level2: { seq: number; name: string; slug: string; parentSlug: string }[] = [
      { seq: 1, name: 'Smartphones B2B', slug: 'smartphones-b2b', parentSlug: 'mobile-phones' },
      { seq: 2, name: 'Feature Phones Trade', slug: 'feature-phones-trade', parentSlug: 'mobile-phones' },
      { seq: 3, name: 'Mobile Accessories Trade', slug: 'mobile-accessories-trade', parentSlug: 'mobile-phones' },
      { seq: 4, name: 'Notebooks Trade', slug: 'notebooks-trade', parentSlug: 'laptops-desktops' },
      { seq: 5, name: 'Desktops & AIO Trade', slug: 'desktops-aio-trade', parentSlug: 'laptops-desktops' },
      { seq: 6, name: 'Laptop Spares Trade', slug: 'laptop-spares-trade', parentSlug: 'laptops-desktops' },
      { seq: 7, name: 'Android Tablets Trade', slug: 'android-tablets-trade', parentSlug: 'tablets' },
      { seq: 8, name: 'Enterprise Tablets', slug: 'enterprise-tablets', parentSlug: 'tablets' },
      { seq: 9, name: 'Smartwatches Trade', slug: 'smartwatches-trade', parentSlug: 'wearables' },
      { seq: 10, name: 'Fitness Bands Trade', slug: 'fitness-bands-trade', parentSlug: 'wearables' },
      { seq: 11, name: 'TWS Trade', slug: 'tws-trade', parentSlug: 'audio-headphones' },
      { seq: 12, name: 'Wired Audio Trade', slug: 'wired-audio-trade', parentSlug: 'audio-headphones' },
      { seq: 13, name: 'LED & Smart TVs Trade', slug: 'led-smart-tvs-trade', parentSlug: 'tv-displays' },
      { seq: 14, name: 'DSLR & Mirrorless Trade', slug: 'dslr-mirrorless-trade', parentSlug: 'cameras-accessories' },
      { seq: 15, name: 'Action Cameras Trade', slug: 'action-cameras-trade', parentSlug: 'cameras-accessories' },
      { seq: 16, name: 'RAM & Memory Trade', slug: 'ram-memory-trade', parentSlug: 'pc-components' },
      { seq: 17, name: 'Motherboards & GPUs Trade', slug: 'motherboards-gpus-trade', parentSlug: 'pc-components' },
      { seq: 18, name: 'Enterprise Switches', slug: 'enterprise-switches-trade', parentSlug: 'networking-equipment' },
      { seq: 19, name: 'Routers & Firewalls Trade', slug: 'routers-firewalls-trade', parentSlug: 'networking-equipment' },
      { seq: 20, name: 'SSD & HDD Trade', slug: 'ssd-hdd-trade', parentSlug: 'storage-memory' },
      { seq: 21, name: 'Flash & SD Trade', slug: 'flash-sd-trade', parentSlug: 'storage-memory' },
      { seq: 22, name: 'Soft Drinks Trade', slug: 'soft-drinks-trade', parentSlug: 'beverages' },
      { seq: 23, name: 'Juices Trade', slug: 'juices-trade', parentSlug: 'beverages' },
      { seq: 24, name: 'Tea & Coffee Trade', slug: 'tea-coffee-trade', parentSlug: 'beverages' },
      { seq: 25, name: 'Rice Trade', slug: 'rice-trade', parentSlug: 'staples-pulses' },
      { seq: 26, name: 'Pulses Bulk Trade', slug: 'pulses-bulk-trade', parentSlug: 'staples-pulses' },
      { seq: 27, name: 'Edible Oil Retail Packs', slug: 'edible-oil-retail-packs', parentSlug: 'edible-oils' },
      { seq: 28, name: 'Edible Oil Bulk', slug: 'edible-oil-bulk', parentSlug: 'edible-oils' },
      { seq: 29, name: 'Namkeen & Savouries', slug: 'namkeen-savouries-trade', parentSlug: 'snacks-packaged-foods' },
      { seq: 30, name: 'Biscuits & Cookies Trade', slug: 'biscuits-cookies-trade', parentSlug: 'snacks-packaged-foods' },
      { seq: 31, name: 'Two-Wheeler Engine Parts', slug: 'two-wheeler-engine-parts', parentSlug: 'two-wheeler-parts' },
      { seq: 32, name: 'Two-Wheeler Electrical', slug: 'two-wheeler-electrical', parentSlug: 'two-wheeler-parts' },
      { seq: 33, name: 'Four-Wheeler Filters', slug: 'four-wheeler-filters', parentSlug: 'four-wheeler-parts' },
      { seq: 34, name: 'Four-Wheeler Braking', slug: 'four-wheeler-braking', parentSlug: 'four-wheeler-parts' },
      { seq: 35, name: 'OPC Cement Trade', slug: 'opc-cement-trade', parentSlug: 'cement-binders' },
      { seq: 36, name: 'PPC Cement Trade', slug: 'ppc-cement-trade', parentSlug: 'cement-binders' },
      { seq: 37, name: 'TMT & Bars Trade', slug: 'tmt-bars-trade', parentSlug: 'steel-reinforcement' },
      { seq: 38, name: 'Structural Steel Trade', slug: 'structural-steel-trade', parentSlug: 'steel-reinforcement' },
      { seq: 39, name: 'Interior Emulsions Trade', slug: 'interior-emulsions-trade', parentSlug: 'decorative-paints' },
      { seq: 40, name: 'Exterior Emulsions Trade', slug: 'exterior-emulsions-trade', parentSlug: 'decorative-paints' },
      { seq: 41, name: 'Protective Coatings Trade', slug: 'protective-coatings-trade', parentSlug: 'industrial-coatings' },
      { seq: 42, name: 'Face Care Trade', slug: 'face-care-trade', parentSlug: 'skincare' },
      { seq: 43, name: 'Body Care Trade', slug: 'body-care-trade', parentSlug: 'skincare' },
      { seq: 44, name: 'Salon Haircare Trade', slug: 'salon-haircare-trade', parentSlug: 'haircare' },
      { seq: 45, name: 'Hybrid Seeds Trade', slug: 'hybrid-seeds-trade', parentSlug: 'seeds' },
      { seq: 46, name: 'Vegetable Seeds Trade', slug: 'vegetable-seeds-trade', parentSlug: 'seeds' },
      { seq: 47, name: 'Herbicides Trade', slug: 'herbicides-trade', parentSlug: 'crop-protection' },
      { seq: 48, name: 'Insecticides Trade', slug: 'insecticides-trade', parentSlug: 'crop-protection' },
      { seq: 49, name: 'NPK & Fertilizer Blends', slug: 'npk-fertilizer-blends', parentSlug: 'fertilizers' },
      { seq: 50, name: 'Organic Fertilizers Trade', slug: 'organic-fertilizers-trade', parentSlug: 'fertilizers' },
      { seq: 51, name: 'Corrugated Boxes Stock', slug: 'corrugated-boxes-stock', parentSlug: 'corrugated-packaging' },
      { seq: 52, name: 'Packaging Tapes Trade', slug: 'packaging-tapes-trade', parentSlug: 'corrugated-packaging' },
      { seq: 53, name: 'BOPP Films Trade', slug: 'bopp-films-trade', parentSlug: 'flexible-packaging-films' },
      { seq: 54, name: 'LDPE Rolls Trade', slug: 'ldpe-rolls-trade', parentSlug: 'flexible-packaging-films' },
      { seq: 55, name: 'Welding Rods & Wire', slug: 'welding-rods-wire', parentSlug: 'welding-equipment' },
      { seq: 56, name: 'Welding Machines Trade', slug: 'welding-machines-trade', parentSlug: 'welding-equipment' },
      { seq: 57, name: 'CNC Cutting Tools', slug: 'cnc-cutting-tools', parentSlug: 'cnc-machine-tools' },
      { seq: 58, name: 'PLC & HMI Trade', slug: 'plc-hmi-trade', parentSlug: 'industrial-automation' },
      { seq: 59, name: 'Gold Chains Trade', slug: 'gold-chains-trade', parentSlug: 'gold-jewelry' },
      { seq: 60, name: 'Gold Rings Trade', slug: 'gold-rings-trade', parentSlug: 'gold-jewelry' },
      { seq: 61, name: 'Tech Corporate Gifts', slug: 'tech-corporate-gifts', parentSlug: 'corporate-gifts' },
      { seq: 62, name: 'Drinkware Corporate Gifts', slug: 'drinkware-corporate-gifts', parentSlug: 'corporate-gifts' },
      { seq: 63, name: 'LED Downlights Trade', slug: 'led-downlights-trade', parentSlug: 'led-lighting' },
      { seq: 64, name: 'Street Lighting Trade', slug: 'street-lighting-trade', parentSlug: 'led-lighting' },
      { seq: 65, name: 'Saws Trade', slug: 'saws-trade', parentSlug: 'hand-tools' },
      { seq: 66, name: 'Measuring Tools Trade', slug: 'measuring-tools-trade', parentSlug: 'hand-tools' },
      { seq: 67, name: 'Drills Trade', slug: 'drills-trade', parentSlug: 'power-tools' },
      { seq: 68, name: 'Grinders Trade', slug: 'grinders-trade', parentSlug: 'power-tools' },
      { seq: 69, name: 'Cold & Allergy OTC', slug: 'cold-allergy-otc', parentSlug: 'otc-wellness' },
      { seq: 70, name: 'Vitamins Trade', slug: 'vitamins-trade', parentSlug: 'otc-wellness' },
    ];

    const level3: { seq: number; name: string; slug: string; parentSlug: string }[] = [
      { seq: 1, name: 'Android Phones Bulk', slug: 'android-phones-bulk', parentSlug: 'smartphones-b2b' },
      { seq: 2, name: 'Refurbished Phones Lots', slug: 'refurbished-phones-lots', parentSlug: 'smartphones-b2b' },
      { seq: 3, name: 'Cases & Covers Trade', slug: 'cases-covers-trade', parentSlug: 'mobile-accessories-trade' },
      { seq: 4, name: 'Chargers & Cables Trade', slug: 'chargers-cables-trade', parentSlug: 'mobile-accessories-trade' },
      { seq: 5, name: 'Business Notebooks Bulk', slug: 'business-notebooks-bulk', parentSlug: 'notebooks-trade' },
      { seq: 6, name: 'Gaming Notebooks Bulk', slug: 'gaming-notebooks-bulk', parentSlug: 'notebooks-trade' },
      { seq: 7, name: 'Cola Bulk', slug: 'cola-bulk', parentSlug: 'soft-drinks-trade' },
      { seq: 8, name: 'Energy Drinks Bulk', slug: 'energy-drinks-bulk', parentSlug: 'soft-drinks-trade' },
      { seq: 9, name: 'Basmati Rice Bulk', slug: 'basmati-rice-bulk', parentSlug: 'rice-trade' },
      { seq: 10, name: 'Non-Basmati Rice Bulk', slug: 'non-basmati-rice-bulk', parentSlug: 'rice-trade' },
      { seq: 11, name: 'MIG Wire Trade', slug: 'mig-wire-trade', parentSlug: 'welding-rods-wire' },
      { seq: 12, name: 'TIG Rods Trade', slug: 'tig-rods-trade', parentSlug: 'welding-rods-wire' },
      { seq: 13, name: 'Endmills & Inserts', slug: 'endmills-inserts-trade', parentSlug: 'cnc-cutting-tools' },
      { seq: 14, name: 'Tool Holders Trade', slug: 'tool-holders-trade', parentSlug: 'cnc-cutting-tools' },
      { seq: 15, name: 'Interior Premium Trade', slug: 'interior-premium-trade', parentSlug: 'interior-emulsions-trade' },
      { seq: 16, name: 'Interior Economy Trade', slug: 'interior-economy-trade', parentSlug: 'interior-emulsions-trade' },
      { seq: 17, name: 'Serums Trade', slug: 'serums-trade', parentSlug: 'face-care-trade' },
      { seq: 18, name: 'Moisturizers Trade', slug: 'moisturizers-trade', parentSlug: 'face-care-trade' },
      { seq: 19, name: 'Herbicide Selective Trade', slug: 'herbicide-selective-trade', parentSlug: 'herbicides-trade' },
      { seq: 20, name: 'Herbicide Non-Selective Trade', slug: 'herbicide-non-selective-trade', parentSlug: 'herbicides-trade' },
      { seq: 21, name: 'Gold 22K Trade', slug: 'gold-22k-trade', parentSlug: 'gold-chains-trade' },
      { seq: 22, name: 'Gold 18K Trade', slug: 'gold-18k-trade', parentSlug: 'gold-chains-trade' },
      { seq: 23, name: 'USB Peripherals Trade', slug: 'usb-peripherals-trade', parentSlug: 'tech-corporate-gifts' },
      { seq: 24, name: 'Power Banks Gift Trade', slug: 'power-banks-gift-trade', parentSlug: 'tech-corporate-gifts' },
      { seq: 25, name: 'Panel Downlights', slug: 'panel-downlights-trade', parentSlug: 'led-downlights-trade' },
      { seq: 26, name: 'COB Downlights', slug: 'cob-downlights-trade', parentSlug: 'led-downlights-trade' },
    ];

    const insertChild = async (
      id: string,
      name: string,
      slug: string,
      parentSlug: string,
      level: number,
    ): Promise<void> => {
      await queryRunner.query(
        `INSERT INTO "categories" ("id", "tenant_id", "name", "slug", "parent_id", "industry_id", "level", "status", "created_at", "updated_at")
         SELECT $1::uuid, NULL, $2::varchar, $3::varchar, p."id", p."industry_id", $5::smallint, 'active', now(), now()
         FROM "categories" p
         WHERE p."tenant_id" IS NULL
           AND lower(trim(p."slug")) = lower(trim($4::varchar))
           AND p."deleted_at" IS NULL
           AND p."level" = $6::smallint
           AND NOT EXISTS (
             SELECT 1 FROM "categories" c
             WHERE c."tenant_id" IS NULL
               AND lower(trim(c."slug")) = lower(trim($3::varchar))
               AND c."deleted_at" IS NULL
           )
         LIMIT 1`,
        [id, name, slug, parentSlug, level, level === 2 ? 1 : 2],
      );
    };

    for (const r of level2) {
      await insertChild(categoryUuidL2(r.seq), r.name, r.slug, r.parentSlug, 2);
    }
    for (const r of level3) {
      await insertChild(categoryUuidL3(r.seq), r.name, r.slug, r.parentSlug, 3);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const l3: string[] = [];
    for (let s = 1; s <= 26; s++) {
      l3.push(categoryUuidL3(s));
    }
    const l2: string[] = [];
    for (let s = 1; s <= 70; s++) {
      l2.push(categoryUuidL2(s));
    }
    await queryRunner.query(
      `DELETE FROM "categories" WHERE "id" IN (${l3.map((_, i) => `$${i + 1}::uuid`).join(', ')})`,
      l3,
    );
    await queryRunner.query(
      `DELETE FROM "categories" WHERE "id" IN (${l2.map((_, i) => `$${i + 1}::uuid`).join(', ')})`,
      l2,
    );
  }
}
