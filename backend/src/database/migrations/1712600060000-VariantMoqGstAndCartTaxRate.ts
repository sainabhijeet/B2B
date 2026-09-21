import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tenant catalog: `product_variants.moq`, `product_variants.gst_rate`, `cart_items.tax_rate`.
 */
export class VariantMoqGstAndCartTaxRate1712600060000 implements MigrationInterface {
  name = 'VariantMoqGstAndCartTaxRate1712600060000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const regPv: { reg: string | null }[] = await queryRunner.query(`SELECT to_regclass('public.product_variants') AS reg`);
    if (regPv[0]?.reg) {
      await queryRunner.query(`
        ALTER TABLE "product_variants"
        ADD COLUMN IF NOT EXISTS "moq" integer NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "gst_rate" numeric(5,2) NULL
      `);
    }
    const regCi: { reg: string | null }[] = await queryRunner.query(`SELECT to_regclass('public.cart_items') AS reg`);
    if (regCi[0]?.reg) {
      await queryRunner.query(`
        ALTER TABLE "cart_items"
        ADD COLUMN IF NOT EXISTS "tax_rate" numeric(5,2) NULL
      `);
    }

    const rows: { schema_name: string }[] = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const { schema_name: schema } of rows) {
      const qSch = `"${schema.replace(/"/g, '""')}"`;
      for (const qt of ['product_variants', 'cart_items'] as const) {
        const exists: { n: string }[] = await queryRunner.query(
          `SELECT 1 AS n FROM information_schema.tables
           WHERE table_schema = $1 AND table_name = $2`,
          [schema, qt],
        );
        if (!exists.length) continue;
        if (qt === 'product_variants') {
          await queryRunner.query(`
            ALTER TABLE ${qSch}."product_variants"
            ADD COLUMN IF NOT EXISTS "moq" integer NOT NULL DEFAULT 1,
            ADD COLUMN IF NOT EXISTS "gst_rate" numeric(5,2) NULL
          `);
        } else {
          await queryRunner.query(`
            ALTER TABLE ${qSch}."cart_items"
            ADD COLUMN IF NOT EXISTS "tax_rate" numeric(5,2) NULL
          `);
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rows: { schema_name: string }[] = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const { schema_name: schema } of rows) {
      const qSch = `"${schema.replace(/"/g, '""')}"`;
      for (const qt of ['product_variants', 'cart_items'] as const) {
        const exists: { n: string }[] = await queryRunner.query(
          `SELECT 1 AS n FROM information_schema.tables
           WHERE table_schema = $1 AND table_name = $2`,
          [schema, qt],
        );
        if (!exists.length) continue;
        if (qt === 'product_variants') {
          await queryRunner.query(`ALTER TABLE ${qSch}."product_variants" DROP COLUMN IF EXISTS "gst_rate"`);
          await queryRunner.query(`ALTER TABLE ${qSch}."product_variants" DROP COLUMN IF EXISTS "moq"`);
        } else {
          await queryRunner.query(`ALTER TABLE ${qSch}."cart_items" DROP COLUMN IF EXISTS "tax_rate"`);
        }
      }
    }
    const regPv: { reg: string | null }[] = await queryRunner.query(`SELECT to_regclass('public.product_variants') AS reg`);
    if (regPv[0]?.reg) {
      await queryRunner.query(`ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "gst_rate"`);
      await queryRunner.query(`ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "moq"`);
    }
    const regCi: { reg: string | null }[] = await queryRunner.query(`SELECT to_regclass('public.cart_items') AS reg`);
    if (regCi[0]?.reg) {
      await queryRunner.query(`ALTER TABLE "cart_items" DROP COLUMN IF EXISTS "tax_rate"`);
    }
  }
}
