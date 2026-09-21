import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndustriesTable1712600026000 implements MigrationInterface {
  name = 'AddIndustriesTable1712600026000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "industries" (
        "industry_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "icon" character varying(64) NOT NULL DEFAULT 'Box',
        "status" character varying(16) NOT NULL DEFAULT 'active',
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_industries" PRIMARY KEY ("industry_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_industries_status_order" ON "industries" ("status", "display_order")`,
    );

    const rows: [string, string, string, string, string, number][] = [
      [
        '10000000-0000-4000-8000-000000000001',
        'Electronics',
        'Mobile, consumer electronics, IT hardware distributors.',
        'Cpu',
        'active',
        1,
      ],
      [
        '10000000-0000-4000-8000-000000000002',
        'Footwear',
        'Shoe and footwear manufacturers and distributors.',
        'Footprints',
        'active',
        2,
      ],
      [
        '10000000-0000-4000-8000-000000000003',
        'Textile',
        'Fabrics, apparel supply, and textile wholesale.',
        'Shirt',
        'active',
        3,
      ],
      [
        '10000000-0000-4000-8000-000000000004',
        'Industrial Equipment',
        'Heavy tools, industrial supply, and B2B equipment.',
        'Factory',
        'active',
        4,
      ],
      [
        '10000000-0000-4000-8000-000000000005',
        'Machinery',
        'Machinery parts, CNC, and industrial machines.',
        'Cog',
        'active',
        5,
      ],
      [
        '10000000-0000-4000-8000-000000000006',
        'Jewelry / Diamond',
        'Fine jewelry, diamonds, and precious goods.',
        'Gem',
        'active',
        6,
      ],
      [
        '10000000-0000-4000-8000-000000000007',
        'General Commerce',
        'Mixed catalog — default for broad distributors.',
        'Store',
        'active',
        7,
      ],
    ];

    for (const [id, name, description, icon, status, displayOrder] of rows) {
      await queryRunner.query(
        `INSERT INTO "industries" ("industry_id", "name", "description", "icon", "status", "display_order")
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, name, description, icon, status, displayOrder],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "industries"`);
  }
}
