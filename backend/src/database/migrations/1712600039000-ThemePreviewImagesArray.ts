import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ThemePreviewImagesArray1712600039000 implements MigrationInterface {
  name = 'ThemePreviewImagesArray1712600039000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_preview_images" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "theme_id" uuid NOT NULL,
        "image_url" text NOT NULL,
        "sort_order" integer NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_preview_images" PRIMARY KEY ("id"),
        CONSTRAINT "FK_theme_preview_images_theme" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_theme_preview_images_theme_sort" UNIQUE ("theme_id", "sort_order")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_theme_preview_images_theme_id"
      ON "theme_preview_images" ("theme_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "theme_preview_images"
    `);
  }
}
