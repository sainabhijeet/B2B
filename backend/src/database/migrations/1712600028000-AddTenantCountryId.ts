import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantCountryId1712600028000 implements MigrationInterface {
  name = 'AddTenantCountryId1712600028000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "country_id" uuid NULL`);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "tenants"
          ADD CONSTRAINT "FK_tenants_country_id"
          FOREIGN KEY ("country_id") REFERENCES "countries"("country_id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tenants_country_id" ON "tenants" ("country_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_tenants_country_id"`);
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT IF EXISTS "FK_tenants_country_id"`,
    );
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "country_id"`);
  }
}
