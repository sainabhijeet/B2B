import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiSettingsTable1712600033000 implements MigrationInterface {
  name = 'AddAiSettingsTable1712600033000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_settings" (
        "id" varchar(32) NOT NULL,
        "color_palettes" integer NOT NULL DEFAULT 3,
        "tagline_suggestions" integer NOT NULL DEFAULT 2,
        "logo_generation_limit" integer NOT NULL DEFAULT 2,
        "max_logo_batches_per_tenant" integer NOT NULL DEFAULT 5,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_settings" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "ai_settings" ("id", "color_palettes", "tagline_suggestions", "logo_generation_limit", "max_logo_batches_per_tenant")
      VALUES ('default', 3, 2, 2, 5)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_settings"`);
  }
}
