import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserCustomerId1712600043000 implements MigrationInterface {
  name = 'AddUserCustomerId1712600043000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "customer_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_customer"
      FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_customer_id" ON "users" ("customer_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_customer"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_customer_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "customer_id"`);
  }
}
