import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds customer back-in-stock alert subscriptions used by mobile storefronts.
 * The table is platform/public scoped because it references public users and tenants;
 * product ownership is enforced by tenant-aware service validation.
 */
export class StockAlertSubscriptions1712600180000 implements MigrationInterface {
  name = 'StockAlertSubscriptions1712600180000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public."stock_alert_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "variant_id" uuid NULL,
        "product_name" varchar(255) NOT NULL,
        "variant_name" varchar(255) NULL,
        "status" varchar(16) NOT NULL DEFAULT 'ACTIVE',
        "notified_at" timestamptz NULL,
        "cancelled_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_alert_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_stock_alert_subscriptions_status"
          CHECK ("status" IN ('ACTIVE', 'NOTIFIED', 'CANCELLED')),
        CONSTRAINT "FK_stock_alert_subscriptions_tenant"
          FOREIGN KEY ("tenant_id") REFERENCES public."tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_stock_alert_subscriptions_user"
          FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_alerts_tenant_user_status"
      ON public."stock_alert_subscriptions" ("tenant_id", "user_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_alerts_product_status"
      ON public."stock_alert_subscriptions" ("tenant_id", "product_id", "variant_id", "status")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UX_stock_alerts_active_subscription"
      ON public."stock_alert_subscriptions" ("tenant_id", "user_id", "product_id", COALESCE("variant_id", '00000000-0000-0000-0000-000000000000'::uuid))
      WHERE "status" = 'ACTIVE'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS public."UX_stock_alerts_active_subscription"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS public."IDX_stock_alerts_product_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS public."IDX_stock_alerts_tenant_user_status"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS public."stock_alert_subscriptions"`,
    );
  }
}
