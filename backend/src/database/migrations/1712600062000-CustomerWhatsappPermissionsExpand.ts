import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Feature-based WhatsApp permissions: tenant_id, rename can_order → can_place_order,
 * can_repeat_order, can_view_credit, can_receive_broadcast; backfill missing rows.
 */
export class CustomerWhatsappPermissionsExpand1712600062000 implements MigrationInterface {
  name = 'CustomerWhatsappPermissionsExpand1712600062000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_whatsapp_permissions"
      ADD COLUMN IF NOT EXISTS "tenant_id" uuid
    `);
    await queryRunner.query(`
      UPDATE "customer_whatsapp_permissions" p
      SET "tenant_id" = c."tenant_id"
      FROM "customers" c
      WHERE c."id" = p."customer_id" AND p."tenant_id" IS NULL
    `);
    await queryRunner.query(`
      DELETE FROM "customer_whatsapp_permissions" WHERE "tenant_id" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "customer_whatsapp_permissions"
      ALTER COLUMN "tenant_id" SET NOT NULL
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "customer_whatsapp_permissions"
        ADD CONSTRAINT "FK_customer_whatsapp_permissions_tenant"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_customer_whatsapp_permissions_tenant"
      ON "customer_whatsapp_permissions" ("tenant_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "customer_whatsapp_permissions"
      RENAME COLUMN "can_order" TO "can_place_order"
    `);

    await queryRunner.query(`
      ALTER TABLE "customer_whatsapp_permissions"
      ADD COLUMN IF NOT EXISTS "can_repeat_order" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "customer_whatsapp_permissions"
      ADD COLUMN IF NOT EXISTS "can_view_credit" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "customer_whatsapp_permissions"
      ADD COLUMN IF NOT EXISTS "can_receive_broadcast" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      UPDATE "customer_whatsapp_permissions"
      SET "can_repeat_order" = "can_place_order"
      WHERE "can_place_order" = true AND "can_repeat_order" = false
    `);

    await queryRunner.query(`
      INSERT INTO "customer_whatsapp_permissions" (
        "customer_id",
        "tenant_id",
        "can_view_status",
        "can_view_invoice",
        "can_place_order",
        "can_repeat_order",
        "can_view_credit",
        "can_receive_broadcast"
      )
      SELECT
        c."id",
        c."tenant_id",
        true,
        true,
        false,
        false,
        false,
        false
      FROM "customers" c
      WHERE c."deleted_at" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "customer_whatsapp_permissions" p WHERE p."customer_id" = c."id"
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customer_whatsapp_permissions" DROP CONSTRAINT IF EXISTS "FK_customer_whatsapp_permissions_tenant"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_customer_whatsapp_permissions_tenant"`);
    await queryRunner.query(`
      ALTER TABLE "customer_whatsapp_permissions" DROP COLUMN IF EXISTS "can_receive_broadcast"
    `);
    await queryRunner.query(`
      ALTER TABLE "customer_whatsapp_permissions" DROP COLUMN IF EXISTS "can_view_credit"
    `);
    await queryRunner.query(`
      ALTER TABLE "customer_whatsapp_permissions" DROP COLUMN IF EXISTS "can_repeat_order"
    `);
    await queryRunner.query(`
      ALTER TABLE "customer_whatsapp_permissions" RENAME COLUMN "can_place_order" TO "can_order"
    `);
    await queryRunner.query(`
      ALTER TABLE "customer_whatsapp_permissions" DROP COLUMN IF EXISTS "tenant_id"
    `);
  }
}
