import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminModuleStates1712600163000 implements MigrationInterface {
  name = 'AdminModuleStates1712600163000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_module_states" (
        "module_key" varchar(64) NOT NULL,
        "payload" jsonb NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "updated_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_module_states" PRIMARY KEY ("module_key"),
        CONSTRAINT "FK_admin_module_states_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_module_states"`);
  }
}
