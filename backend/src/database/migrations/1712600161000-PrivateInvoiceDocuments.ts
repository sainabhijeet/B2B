import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PrivateInvoiceDocuments1712600161000 implements MigrationInterface {
  name = 'PrivateInvoiceDocuments1712600161000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.patch(queryRunner, 'public', true);
    const schemas: Array<{ schema_name: string }> = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const row of schemas) await this.patch(queryRunner, row.schema_name, true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.patch(queryRunner, 'public', false);
    const schemas: Array<{ schema_name: string }> = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const row of schemas) await this.patch(queryRunner, row.schema_name, false);
  }

  private async patch(queryRunner: QueryRunner, schema: string, add: boolean): Promise<void> {
    const q = `"${schema.replace(/"/g, '""')}"`;
    const exists: Array<{ value: number }> = await queryRunner.query(
      `SELECT 1 AS value FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'invoices'`,
      [schema],
    );
    if (!exists.length) return;
    await queryRunner.query(
      add
        ? `ALTER TABLE ${q}."invoices" ADD COLUMN IF NOT EXISTS "document_reference" text NULL`
        : `ALTER TABLE ${q}."invoices" DROP COLUMN IF EXISTS "document_reference"`,
    );
  }
}
