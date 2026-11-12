import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a nullable private storage object pointer for customer payment proofs.
 * Applies to public order_payments when present and all provisioned tenant schemas.
 */
export class AddOrderPaymentProofStorageObject1712600179000 implements MigrationInterface {
  name = 'AddOrderPaymentProofStorageObject1712600179000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnAndIndex(queryRunner, 'public');

    const rows: { schema_name: string }[] = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const { schema_name: schema } of rows) {
      await this.addColumnAndIndex(queryRunner, schema);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rows: { schema_name: string }[] = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const { schema_name: schema } of rows) {
      await this.dropColumnAndIndex(queryRunner, schema);
    }

    await this.dropColumnAndIndex(queryRunner, 'public');
  }

  private async addColumnAndIndex(
    queryRunner: QueryRunner,
    schema: string,
  ): Promise<void> {
    if (!(await this.tableExists(queryRunner, schema, 'order_payments')))
      return;

    const qSchema = this.quoteIdent(schema);
    await queryRunner.query(`
      ALTER TABLE ${qSchema}."order_payments"
      ADD COLUMN IF NOT EXISTS "payment_proof_storage_object_id" uuid NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_order_payments_payment_proof_storage_object_id"
      ON ${qSchema}."order_payments" ("payment_proof_storage_object_id")
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_order_payments_payment_proof_storage_object_id'
            AND conrelid = '${schema.replace(/'/g, "''")}.order_payments'::regclass
        ) THEN
          ALTER TABLE ${qSchema}."order_payments"
          ADD CONSTRAINT "FK_order_payments_payment_proof_storage_object_id"
          FOREIGN KEY ("payment_proof_storage_object_id") REFERENCES public."storage_objects"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  private async dropColumnAndIndex(
    queryRunner: QueryRunner,
    schema: string,
  ): Promise<void> {
    if (!(await this.tableExists(queryRunner, schema, 'order_payments')))
      return;

    const qSchema = this.quoteIdent(schema);
    await queryRunner.query(`
      ALTER TABLE ${qSchema}."order_payments"
      DROP CONSTRAINT IF EXISTS "FK_order_payments_payment_proof_storage_object_id"
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS ${qSchema}."IDX_order_payments_payment_proof_storage_object_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE ${qSchema}."order_payments"
      DROP COLUMN IF EXISTS "payment_proof_storage_object_id"
    `);
  }

  private async tableExists(
    queryRunner: QueryRunner,
    schema: string,
    table: string,
  ): Promise<boolean> {
    const rows: { n: string }[] = await queryRunner.query(
      `SELECT 1 AS n FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = $2`,
      [schema, table],
    );
    return rows.length > 0;
  }

  private quoteIdent(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }
}
