import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Applies the immutable-row guard to installations that already ran Phase 2. */
export class EnforceImmutableThemeReleaseArtifacts1712600101000 implements MigrationInterface {
  name = 'EnforceImmutableThemeReleaseArtifacts1712600101000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "prevent_theme_release_artifact_mutation"()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$ BEGIN
        RAISE EXCEPTION 'Theme release artifacts are immutable';
      END; $$
    `);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "TRG_theme_release_artifacts_immutable" ON "theme_release_artifacts"`,
    );
    await queryRunner.query(`
      CREATE TRIGGER "TRG_theme_release_artifacts_immutable"
      BEFORE UPDATE OR DELETE ON "theme_release_artifacts"
      FOR EACH ROW EXECUTE FUNCTION "prevent_theme_release_artifact_mutation"()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "TRG_theme_release_artifacts_immutable" ON "theme_release_artifacts"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "prevent_theme_release_artifact_mutation"()`,
    );
  }
}
