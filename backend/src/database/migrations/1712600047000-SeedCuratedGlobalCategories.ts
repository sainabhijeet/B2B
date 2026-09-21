import { MigrationInterface, QueryRunner } from 'typeorm';

/** Fixed UUID tail (12 hex) for seeded global categories — `down()` removes only this range. */
function categoryUuid(seq: number): string {
  const h = seq.toString(16).padStart(12, '0');
  return `20000000-0000-4000-8000-${h}`;
}

/**
 * Platform-wide default categories (`tenant_id` NULL) for distributor onboarding / templates.
 * Skips when slug already exists for a global row. Links `industry_id` by industry `name`.
 */
export class SeedCuratedGlobalCategories1712600047000 implements MigrationInterface {
  name = 'SeedCuratedGlobalCategories1712600047000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: { seq: number; name: string; slug: string; industry: string }[] = [
      { seq: 1, name: 'Mobile Phones', slug: 'mobile-phones', industry: 'Electronics' },
      { seq: 2, name: 'Laptops & Desktops', slug: 'laptops-desktops', industry: 'Electronics' },
      { seq: 3, name: 'Tablets', slug: 'tablets', industry: 'Electronics' },
      { seq: 4, name: 'Wearables', slug: 'wearables', industry: 'Electronics' },
      { seq: 5, name: 'Audio & Headphones', slug: 'audio-headphones', industry: 'Electronics' },
      { seq: 6, name: 'TV & Displays', slug: 'tv-displays', industry: 'Electronics' },
      { seq: 7, name: 'Cameras & Accessories', slug: 'cameras-accessories', industry: 'Electronics' },
      { seq: 8, name: 'PC Components', slug: 'pc-components', industry: 'Electronics' },
      { seq: 9, name: 'Networking Equipment', slug: 'networking-equipment', industry: 'Electronics' },
      { seq: 10, name: 'Storage & Memory', slug: 'storage-memory', industry: 'Electronics' },
      { seq: 11, name: 'Sports Footwear', slug: 'sports-footwear', industry: 'Footwear' },
      { seq: 12, name: 'Formal Footwear', slug: 'formal-footwear', industry: 'Footwear' },
      { seq: 13, name: 'Casual Footwear', slug: 'casual-footwear', industry: 'Footwear' },
      { seq: 14, name: 'Safety Footwear', slug: 'safety-footwear', industry: 'Footwear' },
      { seq: 15, name: 'Yarn & Fiber', slug: 'yarn-fiber', industry: 'Textile' },
      { seq: 16, name: 'Fabrics & Rolls', slug: 'fabrics-rolls', industry: 'Textile' },
      { seq: 17, name: 'Garment Supply', slug: 'garment-supply', industry: 'Textile' },
      { seq: 18, name: 'Home Textiles', slug: 'home-textiles', industry: 'Textile' },
      { seq: 19, name: 'Material Handling', slug: 'material-handling', industry: 'Industrial Equipment' },
      { seq: 20, name: 'Compressors & Air Systems', slug: 'compressors-air-systems', industry: 'Industrial Equipment' },
      { seq: 21, name: 'Generators & Power', slug: 'generators-power', industry: 'Industrial Equipment' },
      { seq: 22, name: 'Welding Equipment', slug: 'welding-equipment', industry: 'Industrial Equipment' },
      { seq: 23, name: 'CNC & Machine Tools', slug: 'cnc-machine-tools', industry: 'Machinery' },
      { seq: 24, name: 'Industrial Automation', slug: 'industrial-automation', industry: 'Machinery' },
      { seq: 25, name: 'Bearings & Power Transmission', slug: 'bearings-power-transmission', industry: 'Machinery' },
      { seq: 26, name: 'Gold Jewelry', slug: 'gold-jewelry', industry: 'Jewelry / Diamond' },
      { seq: 27, name: 'Diamond Studded', slug: 'diamond-studded', industry: 'Jewelry / Diamond' },
      { seq: 28, name: 'Silver Jewelry', slug: 'silver-jewelry', industry: 'Jewelry / Diamond' },
      { seq: 29, name: 'Watches', slug: 'watches', industry: 'Jewelry / Diamond' },
      { seq: 30, name: 'Mixed Assortment', slug: 'mixed-assortment', industry: 'General Commerce' },
      { seq: 31, name: 'Private Label Goods', slug: 'private-label-goods', industry: 'General Commerce' },
      { seq: 32, name: 'Corporate Gifts', slug: 'corporate-gifts', industry: 'General Commerce' },
      { seq: 33, name: 'Promotional Merchandise', slug: 'promotional-merchandise', industry: 'General Commerce' },
      { seq: 34, name: 'Seasonal Goods', slug: 'seasonal-goods', industry: 'General Commerce' },
      { seq: 35, name: 'Two-Wheeler Parts', slug: 'two-wheeler-parts', industry: 'Automotive & Spare Parts' },
      { seq: 36, name: 'Four-Wheeler Parts', slug: 'four-wheeler-parts', industry: 'Automotive & Spare Parts' },
      { seq: 37, name: 'Automotive Batteries', slug: 'automotive-batteries', industry: 'Automotive & Spare Parts' },
      { seq: 38, name: 'Tyres & Rubber Trade', slug: 'tyres-rubber-trade', industry: 'Automotive & Spare Parts' },
      { seq: 39, name: 'Staples & Pulses', slug: 'staples-pulses', industry: 'FMCG & Packaged Foods' },
      { seq: 40, name: 'Edible Oils', slug: 'edible-oils', industry: 'FMCG & Packaged Foods' },
      { seq: 41, name: 'Beverages', slug: 'beverages', industry: 'FMCG & Packaged Foods' },
      { seq: 42, name: 'Snacks & Packaged Foods', slug: 'snacks-packaged-foods', industry: 'FMCG & Packaged Foods' },
      { seq: 43, name: 'OTC & Wellness', slug: 'otc-wellness', industry: 'Pharmaceuticals & Healthcare' },
      { seq: 44, name: 'Hospital Supplies', slug: 'hospital-supplies', industry: 'Pharmaceuticals & Healthcare' },
      { seq: 45, name: 'Imaging Equipment', slug: 'imaging-equipment', industry: 'Medical Devices & Diagnostics' },
      { seq: 46, name: 'Patient Monitoring', slug: 'patient-monitoring', industry: 'Medical Devices & Diagnostics' },
      { seq: 47, name: 'Skincare', slug: 'skincare', industry: 'Beauty & Personal Care' },
      { seq: 48, name: 'Haircare', slug: 'haircare', industry: 'Beauty & Personal Care' },
      { seq: 49, name: 'Seeds', slug: 'seeds', industry: 'Agriculture, Seeds & Agri-inputs' },
      { seq: 50, name: 'Fertilizers', slug: 'fertilizers', industry: 'Agriculture, Seeds & Agri-inputs' },
      { seq: 51, name: 'Crop Protection', slug: 'crop-protection', industry: 'Agriculture, Seeds & Agri-inputs' },
      { seq: 52, name: 'Cement & Binders', slug: 'cement-binders', industry: 'Construction & Building Materials' },
      { seq: 53, name: 'Steel & Reinforcement', slug: 'steel-reinforcement', industry: 'Construction & Building Materials' },
      { seq: 54, name: 'Roofing & Sheets', slug: 'roofing-sheets', industry: 'Construction & Building Materials' },
      { seq: 55, name: 'Decorative Paints', slug: 'decorative-paints', industry: 'Paints, Coatings & Adhesives' },
      { seq: 56, name: 'Industrial Coatings', slug: 'industrial-coatings', industry: 'Paints, Coatings & Adhesives' },
      { seq: 57, name: 'Industrial Solvents', slug: 'industrial-solvents', industry: 'Chemicals & Specialty Materials' },
      { seq: 58, name: 'Acids & Alkalis', slug: 'acids-alkalis', industry: 'Chemicals & Specialty Materials' },
      { seq: 59, name: 'Polymer Resins', slug: 'polymer-resins', industry: 'Plastics & Polymers' },
      { seq: 60, name: 'Masterbatch', slug: 'masterbatch', industry: 'Plastics & Polymers' },
      { seq: 61, name: 'Corrugated Packaging', slug: 'corrugated-packaging', industry: 'Paper & Packaging' },
      { seq: 62, name: 'Flexible Packaging Films', slug: 'flexible-packaging-films', industry: 'Paper & Packaging' },
      { seq: 63, name: 'Labels & Stickers', slug: 'labels-stickers', industry: 'Paper & Packaging' },
      { seq: 64, name: 'Commercial Printing', slug: 'commercial-printing', industry: 'Printing & Stationery' },
      { seq: 65, name: 'Copier & Paper Supplies', slug: 'copier-paper-supplies', industry: 'Printing & Stationery' },
      { seq: 66, name: 'Office Furniture', slug: 'office-furniture', industry: 'Furniture & Wood Products' },
      { seq: 67, name: 'Plywood & Boards', slug: 'plywood-boards', industry: 'Furniture & Wood Products' },
      { seq: 68, name: 'Curtains & Blinds', slug: 'curtains-blinds', industry: 'Home Decor & Furnishings' },
      { seq: 69, name: 'Cookware', slug: 'cookware', industry: 'Kitchenware & Cookware' },
      { seq: 70, name: 'Tableware', slug: 'tableware', industry: 'Kitchenware & Cookware' },
      { seq: 71, name: 'Cables & Wires', slug: 'cables-wires', industry: 'Electrical & Lighting' },
      { seq: 72, name: 'Switchgear & Distribution', slug: 'switchgear-distribution', industry: 'Electrical & Lighting' },
      { seq: 73, name: 'LED Lighting', slug: 'led-lighting', industry: 'Electrical & Lighting' },
      { seq: 74, name: 'Air Conditioning Units', slug: 'air-conditioning-units', industry: 'HVAC & Refrigeration' },
      { seq: 75, name: 'Industrial Valves', slug: 'industrial-valves', industry: 'Pumps, Valves & Pipe Fittings' },
      { seq: 76, name: 'Pipe & Fittings', slug: 'pipe-fittings', industry: 'Pumps, Valves & Pipe Fittings' },
      { seq: 77, name: 'Power Tools', slug: 'power-tools', industry: 'Tools & Hardware' },
      { seq: 78, name: 'Hand Tools', slug: 'hand-tools', industry: 'Tools & Hardware' },
      { seq: 79, name: 'Head & Face Protection', slug: 'head-face-protection', industry: 'Industrial Safety & PPE' },
      { seq: 80, name: 'Hand Protection', slug: 'hand-protection', industry: 'Industrial Safety & PPE' },
      { seq: 81, name: 'Pallets & Crates', slug: 'pallets-crates', industry: 'Logistics, Warehousing & 3PL' },
      { seq: 82, name: 'Filing & Storage', slug: 'filing-storage', industry: 'Office Supplies & B2B Stationery' },
      { seq: 83, name: 'Servers & Racks', slug: 'servers-racks', industry: 'IT Hardware & Networking Distribution' },
      { seq: 84, name: 'Monitors & Peripherals', slug: 'monitors-peripherals', industry: 'IT Hardware & Networking Distribution' },
      { seq: 85, name: 'White Goods', slug: 'white-goods', industry: 'Consumer Appliances & Home Tech' },
      { seq: 86, name: 'Small Kitchen Appliances', slug: 'small-kitchen-appliances', industry: 'Consumer Appliances & Home Tech' },
      { seq: 87, name: 'Spinning Mill Supplies', slug: 'spinning-mill-supplies', industry: 'Textile Machinery & Mill Supplies' },
      { seq: 88, name: 'Fillers & Sealers', slug: 'fillers-sealers', industry: 'Food Processing & Packaging Machinery' },
      { seq: 89, name: 'Moulds & Dies', slug: 'moulds-dies', industry: 'Plastic Moulding & Dies' },
      { seq: 90, name: 'Solar Modules', slug: 'solar-modules', industry: 'Renewable Energy & Solar' },
      { seq: 91, name: 'UPS & Industrial Batteries', slug: 'ups-industrial-batteries', industry: 'Batteries & Power Systems' },
      { seq: 92, name: 'Lubricants Trade', slug: 'lubricants-trade', industry: 'Oil, Lubricants & Industrial Fluids' },
      { seq: 93, name: 'Marine Stores', slug: 'marine-stores', industry: 'Marine & Port Supplies' },
      { seq: 94, name: 'Ground Support Consumables', slug: 'ground-support-consumables', industry: 'Aviation & MRO Consumables' },
      { seq: 95, name: 'Rail Industrial Parts', slug: 'rail-industrial-parts', industry: 'Railway & Industrial OEM Supplies' },
      { seq: 96, name: 'Industrial Components (Defence Channel)', slug: 'defence-industrial-components', industry: 'Defence & Aerospace Industrial Supply' },
      { seq: 97, name: 'Lab Glassware', slug: 'lab-glassware', industry: 'Laboratory & Scientific Equipment' },
      { seq: 98, name: 'Pet Food & Accessories', slug: 'pet-food-accessories', industry: 'Pet Care & Veterinary Distribution' },
      { seq: 99, name: 'Sports Equipment', slug: 'sports-equipment', industry: 'Sports & Fitness Equipment' },
      { seq: 100, name: 'HoReCa Disposables', slug: 'horeca-disposables', industry: 'Hospitality & Restaurant Supplies' },
    ];

    for (const r of rows) {
      const id = categoryUuid(r.seq);
      await queryRunner.query(
        `INSERT INTO "categories" ("id", "tenant_id", "name", "slug", "parent_id", "industry_id", "level", "status", "created_at", "updated_at")
         SELECT $1::uuid, NULL, $2::varchar, $3::varchar, NULL, ind."industry_id", 1, 'active', now(), now()
         FROM "industries" ind
         WHERE lower(trim(ind."name")) = lower(trim($4::varchar))
           AND NOT EXISTS (
             SELECT 1 FROM "categories" c
             WHERE c."tenant_id" IS NULL
               AND lower(trim(c."slug")) = lower(trim($3::varchar))
               AND c."deleted_at" IS NULL
           )
         LIMIT 1`,
        [id, r.name, r.slug, r.industry],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const ids: string[] = [];
    for (let seq = 1; seq <= 100; seq++) {
      ids.push(categoryUuid(seq));
    }
    await queryRunner.query(
      `DELETE FROM "categories" WHERE "id" IN (${ids.map((_, i) => `$${i + 1}::uuid`).join(', ')})`,
      ids,
    );
  }
}
