import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupportAndTranslations1712600011000 implements MigrationInterface {
  name = 'AddSupportAndTranslations1712600011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "support_tickets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "created_by" uuid NOT NULL,
        "subject" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'OPEN',
        "priority" varchar(16) NOT NULL DEFAULT 'MEDIUM',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_support_tickets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_support_tickets_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_support_tickets_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_support_tickets_tenant_status"
      ON "support_tickets" ("tenant_id", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "translations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NULL,
        "language_code" varchar(16) NOT NULL,
        "translation_key" varchar(255) NOT NULL,
        "translation_value" text NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_translations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_translations_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_translations_scope_lang_key_unique"
      ON "translations" ("tenant_id", "language_code", "translation_key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_translations_scope_lang_key_unique"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "translations"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_support_tickets_tenant_status"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "support_tickets"`);
  }
}
