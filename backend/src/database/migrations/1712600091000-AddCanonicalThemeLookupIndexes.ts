import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds lookup indexes used by health, audit, and future canonical services. */
export class AddCanonicalThemeLookupIndexes1712600091000 implements MigrationInterface {
  name = 'AddCanonicalThemeLookupIndexes1712600091000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_releases_channel_status" ON "theme_releases" ("channel", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_deployments_web_release" ON "theme_deployments" ("web_release_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_deployments_mobile_release" ON "theme_deployments" ("mobile_release_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_deployments_bundle" ON "theme_deployments" ("bundle_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_backfill_runs_started_at" ON "theme_backfill_runs" ("started_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_theme_backfill_runs_started_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_theme_deployments_bundle"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_theme_deployments_mobile_release"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_theme_deployments_web_release"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_theme_releases_channel_status"`,
    );
  }
}
