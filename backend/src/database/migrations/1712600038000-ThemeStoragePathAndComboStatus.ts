import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ThemeStoragePathAndComboStatus1712600038000 implements MigrationInterface {
  name = 'ThemeStoragePathAndComboStatus1712600038000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "themes"
      ADD COLUMN IF NOT EXISTS "storage_path" character varying(512) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "themes"
      ADD COLUMN IF NOT EXISTS "theme_version" character varying(32) NOT NULL DEFAULT '1.0'
    `);
    await queryRunner.query(`
      ALTER TABLE "theme_combo_mapping"
      ADD COLUMN IF NOT EXISTS "status" character varying(32) NOT NULL DEFAULT 'ACTIVE'
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "theme_combo_mapping"
        ADD CONSTRAINT "CHK_theme_combo_mapping_status"
        CHECK ("status" IN ('ACTIVE', 'INACTIVE'));
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "theme_combo_mapping" DROP CONSTRAINT IF EXISTS "CHK_theme_combo_mapping_status"
    `);
    await queryRunner.query(
      `ALTER TABLE "theme_combo_mapping" DROP COLUMN IF EXISTS "status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" DROP COLUMN IF EXISTS "theme_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" DROP COLUMN IF EXISTS "storage_path"`,
    );
  }
}
