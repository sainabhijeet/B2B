import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 1) Normalize legacy opening rows (first version used `ADJUSTMENT_DEBIT` + `OPENING_BALANCE` ref).
 * 2) Backfill a synthetic `OPENING_BALANCE` ledger line for customers with **no** ledger rows yet
 *    and positive `credit_balance` (pre-ledger deployments).
 */
export class CreditLedgerOpeningNormalizeAndBackfill1712600058000 implements MigrationInterface {
  name = 'CreditLedgerOpeningNormalizeAndBackfill1712600058000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "credit_transactions"
      SET "type" = 'OPENING_BALANCE'
      WHERE "reference_type" = 'OPENING_BALANCE'
        AND "type" = 'ADJUSTMENT_DEBIT'
    `);

    await queryRunner.query(`
      INSERT INTO "credit_transactions" (
        "tenant_id",
        "customer_id",
        "type",
        "amount",
        "reference_type",
        "reference_id",
        "balance_after",
        "created_at",
        "created_by"
      )
      SELECT
        c."tenant_id",
        c."id",
        'OPENING_BALANCE',
        c."credit_balance",
        'OPENING_BALANCE',
        c."id",
        c."credit_balance",
        now(),
        NULL
      FROM "customers" c
      WHERE c."deleted_at" IS NULL
        AND c."credit_balance"::numeric > 0
        AND NOT EXISTS (SELECT 1 FROM "credit_transactions" t WHERE t."customer_id" = c."id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "credit_transactions" t
      USING "customers" c
      WHERE t."customer_id" = c."id"
        AND t."type" = 'OPENING_BALANCE'
        AND t."reference_type" = 'OPENING_BALANCE'
        AND t."reference_id" = c."id"
        AND t."amount" = c."credit_balance"
        AND t."created_by" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "credit_transactions" x
          WHERE x."customer_id" = c."id" AND x."id" <> t."id"
        )
    `);

    await queryRunner.query(`
      UPDATE "credit_transactions"
      SET "type" = 'ADJUSTMENT_DEBIT'
      WHERE "reference_type" = 'OPENING_BALANCE'
        AND "type" = 'OPENING_BALANCE'
    `);
  }
}
