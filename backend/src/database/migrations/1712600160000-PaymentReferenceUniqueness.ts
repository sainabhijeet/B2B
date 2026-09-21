import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentReferenceUniqueness1712600160000 implements MigrationInterface {
  name = 'PaymentReferenceUniqueness1712600160000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_payments_tenant_transaction_reference_unique"
      ON public."payments" ("tenant_id", "transaction_reference")
      WHERE "transaction_reference" IS NOT NULL
    `);
    await this.addOrderPaymentIndex(queryRunner, 'public');
    const schemas: Array<{ schema_name: string }> = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const row of schemas) {
      await this.addOrderPaymentIndex(queryRunner, row.schema_name);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS public."idx_payments_tenant_transaction_reference_unique"`,
    );
    await this.dropOrderPaymentIndex(queryRunner, 'public');
    const schemas: Array<{ schema_name: string }> = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const row of schemas) {
      await this.dropOrderPaymentIndex(queryRunner, row.schema_name);
    }
  }

  private async addOrderPaymentIndex(queryRunner: QueryRunner, schema: string): Promise<void> {
    const q = `"${schema.replace(/"/g, '""')}"`;
    const exists: Array<{ value: number }> = await queryRunner.query(
      `SELECT 1 AS value FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'order_payments'`,
      [schema],
    );
    if (!exists.length) return;
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_order_payments_tenant_utr_unique"
      ON ${q}."order_payments" ("tenant_id", "utr_number")
      WHERE "utr_number" IS NOT NULL
    `);
  }

  private async dropOrderPaymentIndex(queryRunner: QueryRunner, schema: string): Promise<void> {
    const q = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.query(
      `DROP INDEX IF EXISTS ${q}."idx_order_payments_tenant_utr_unique"`,
    );
  }
}
