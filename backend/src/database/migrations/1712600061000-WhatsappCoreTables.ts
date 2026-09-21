import { MigrationInterface, QueryRunner } from 'typeorm';

export class WhatsappCoreTables1712600061000 implements MigrationInterface {
  name = 'WhatsappCoreTables1712600061000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_whatsapp_numbers" (
        "phone_number_id" varchar(64) NOT NULL,
        "tenant_id" uuid NOT NULL,
        CONSTRAINT "PK_platform_whatsapp_numbers" PRIMARY KEY ("phone_number_id"),
        CONSTRAINT "FK_platform_whatsapp_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_platform_whatsapp_numbers_tenant"
      ON "platform_whatsapp_numbers" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_whatsapp_permissions" (
        "customer_id" uuid NOT NULL,
        "can_view_status" boolean NOT NULL DEFAULT false,
        "can_view_invoice" boolean NOT NULL DEFAULT false,
        "can_order" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_customer_whatsapp_permissions" PRIMARY KEY ("customer_id"),
        CONSTRAINT "FK_customer_whatsapp_permissions_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "customer_id" uuid NULL,
        "message" text NOT NULL,
        "direction" varchar(8) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_whatsapp_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_whatsapp_messages_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_whatsapp_messages_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_whatsapp_messages_direction" CHECK ("direction" IN ('IN', 'OUT'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_whatsapp_messages_tenant_created"
      ON "whatsapp_messages" ("tenant_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "whatsapp_message_templates" (
        "message_key" varchar(64) NOT NULL,
        "body" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_whatsapp_message_templates" PRIMARY KEY ("message_key")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "whatsapp_message_templates" ("message_key", "body", "created_at", "updated_at") VALUES
      ('NOT_REGISTERED', 'Please contact distributor to register.', now(), now()),
      ('ACCESS_DENIED', 'Access denied', now(), now()),
      ('STATUS_REPLY', 'Your order {{orderNo}} is {{status}}', now(), now()),
      ('STATUS_NO_ORDER', 'No orders found for your account yet.', now(), now()),
      ('INVOICE_REPLY', 'Your invoice {{invoiceNumber}}. {{invoiceLink}}', now(), now()),
      ('INVOICE_NO_INVOICE', 'No invoice found yet.', now(), now()),
      ('HELP_REPLY', '{{commands}}', now(), now()),
      ('UNKNOWN_REPLY', 'Sorry, I did not understand. {{commands}}', now(), now())
      ON CONFLICT ("message_key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_message_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_whatsapp_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_whatsapp_numbers"`);
  }
}
