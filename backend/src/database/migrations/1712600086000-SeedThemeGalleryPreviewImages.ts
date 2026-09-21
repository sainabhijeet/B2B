import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Deterministic theme UUIDs from ThemeWebMobileCombo + SeedDefaultStorefrontThemes. */
const JEW_WEB = 'f0000001-0000-4000-8000-000000000001';
const ELE_WEB = 'f0000002-0000-4000-8000-000000000002';
const JEW_MOBILE = 'f0000001-0000-4000-8000-000000000101';
const ELE_MOBILE = 'f0000002-0000-4000-8000-000000000102';
const COMBO_JEW = 'c0000001-0000-4000-8000-000000000001';
const COMBO_ELE = 'c0000002-0000-4000-8000-000000000002';

/** Placeholder screenshots (Level 1 gallery); replace with CDN assets when ready. */
const PREVIEW = {
  jewWeb: 'https://placehold.co/960x540/0f172a/f1f5f9/png?text=Jewellery+Web',
  eleWeb: 'https://placehold.co/960x540/1e3a5f/e2e8f0/png?text=Electronics+Web',
  jewMobile:
    'https://placehold.co/390x844/334155/f8fafc/png?text=Jewellery+Mobile',
  eleMobile:
    'https://placehold.co/390x844/0c4a6e/f0f9ff/png?text=Electronics+Mobile',
  jewCombo:
    'https://placehold.co/600x800/14532d/fcf9f5/png?text=Jewellery+Pack',
  eleCombo:
    'https://placehold.co/600x800/1e293b/e2e8f0/png?text=Electronics+Pack',
} as const;

export class SeedThemeGalleryPreviewImages1712600086000 implements MigrationInterface {
  name = 'SeedThemeGalleryPreviewImages1712600086000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "themes"
      SET "preview_image" = '${PREVIEW.jewWeb}'
      WHERE "id" = '${JEW_WEB}'::uuid AND ("preview_image" IS NULL OR trim("preview_image") = '')
    `);
    await queryRunner.query(`
      UPDATE "themes"
      SET "preview_image" = '${PREVIEW.eleWeb}'
      WHERE "id" = '${ELE_WEB}'::uuid AND ("preview_image" IS NULL OR trim("preview_image") = '')
    `);
    await queryRunner.query(`
      UPDATE "themes"
      SET "preview_image" = '${PREVIEW.jewMobile}'
      WHERE "id" = '${JEW_MOBILE}'::uuid AND ("preview_image" IS NULL OR trim("preview_image") = '')
    `);
    await queryRunner.query(`
      UPDATE "themes"
      SET "preview_image" = '${PREVIEW.eleMobile}'
      WHERE "id" = '${ELE_MOBILE}'::uuid AND ("preview_image" IS NULL OR trim("preview_image") = '')
    `);
    await queryRunner.query(`
      UPDATE "theme_combo_mapping"
      SET "preview_image" = '${PREVIEW.jewCombo}'
      WHERE "id" = '${COMBO_JEW}'::uuid AND ("preview_image" IS NULL OR trim("preview_image") = '')
    `);
    await queryRunner.query(`
      UPDATE "theme_combo_mapping"
      SET "preview_image" = '${PREVIEW.eleCombo}'
      WHERE "id" = '${COMBO_ELE}'::uuid AND ("preview_image" IS NULL OR trim("preview_image") = '')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "themes" SET "preview_image" = NULL
      WHERE "id" IN ('${JEW_WEB}'::uuid, '${ELE_WEB}'::uuid, '${JEW_MOBILE}'::uuid, '${ELE_MOBILE}'::uuid)
    `);
    await queryRunner.query(`
      UPDATE "theme_combo_mapping" SET "preview_image" = NULL
      WHERE "id" IN ('${COMBO_JEW}'::uuid, '${COMBO_ELE}'::uuid)
    `);
  }
}
