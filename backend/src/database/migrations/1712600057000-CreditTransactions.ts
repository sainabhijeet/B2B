import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Append-only B2B credit ledger in `public` (next to `customers`).
 * `customers.credit_balance` remains the cached outstanding; all movements go through rows here.
 */
export class CreditTransactions1712600057000 implements MigrationInterface {
  name = 'CreditTransactions1712600057000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "credit_transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "type" varchar(32) NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "reference_type" varchar(64) NOT NULL,
        "reference_id" uuid NULL,
        "balance_after" numeric(14,2) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_by" uuid NULL,
        CONSTRAINT "PK_credit_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_credit_transactions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_credit_transactions_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_credit_transactions_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_credit_tx_dedupe"
      ON "credit_transactions" ("tenant_id", "customer_id", "reference_type", "reference_id", "type")
      WHERE "reference_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_credit_transactions_tenant_customer_created"
      ON "credit_transactions" ("tenant_id", "customer_id", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "credit_transactions"`);
  }
}
