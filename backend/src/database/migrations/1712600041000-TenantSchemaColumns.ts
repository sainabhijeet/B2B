import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantSchemaColumns1712600041000 implements MigrationInterface {
  name = 'TenantSchemaColumns1712600041000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN IF NOT EXISTS "schema_name" character varying(128) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN IF NOT EXISTS "tenant_schema_provisioned" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      UPDATE "tenants"
      SET "schema_name" = 't_' || replace("id"::text, '-', '')
      WHERE "schema_name" IS NULL
    `);

    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN SELECT "schema_name" AS sn FROM "tenants" WHERE "schema_name" IS NOT NULL
        LOOP
          EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', r.sn);
          EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I._tenant_schema_meta (
              id integer PRIMARY KEY DEFAULT 1,
              schema_version integer NOT NULL DEFAULT 1,
              migrated_at timestamptz NOT NULL DEFAULT now(),
              CONSTRAINT _tenant_schema_meta_single CHECK (id = 1)
            )',
            r.sn
          );
          EXECUTE format(
            'INSERT INTO %I._tenant_schema_meta (id) VALUES (1) ON CONFLICT (id) DO NOTHING',
            r.sn
          );
        END LOOP;
      END $$
    `);

    await queryRunner.query(`
      UPDATE "tenants" SET "tenant_schema_provisioned" = true WHERE "schema_name" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_tenants_schema_name" ON "tenants" ("schema_name")
    `);

    await queryRunner.query(`
      ALTER TABLE "tenants" ALTER COLUMN "schema_name" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_tenants_schema_name"`);

    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN SELECT "schema_name" AS sn FROM "tenants" WHERE "schema_name" IS NOT NULL
        LOOP
          EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', r.sn);
        END LOOP;
      END $$
    `);

    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "tenant_schema_provisioned"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "schema_name"`);
  }
}
