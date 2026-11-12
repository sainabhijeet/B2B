import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerAvatarStorageObject1712600175000 implements MigrationInterface {
  name = 'AddCustomerAvatarStorageObject1712600175000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD COLUMN IF NOT EXISTS "avatar_storage_object_id" uuid NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customers_avatar_storage_object_id"
      ON "customers" ("avatar_storage_object_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_customers_avatar_storage_object_id'
        ) THEN
          ALTER TABLE "customers"
          ADD CONSTRAINT "FK_customers_avatar_storage_object_id"
          FOREIGN KEY ("avatar_storage_object_id") REFERENCES "storage_objects"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP CONSTRAINT IF EXISTS "FK_customers_avatar_storage_object_id"
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_customers_avatar_storage_object_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP COLUMN IF EXISTS "avatar_storage_object_id"
    `);
  }
}
