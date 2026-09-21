import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddThemeImmutabilityGuards1712600150000 implements MigrationInterface {
  name = 'AddThemeImmutabilityGuards1712600150000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION theme_release_published_guard() RETURNS trigger AS $$
      BEGIN
        IF OLD.status = 'PUBLISHED' AND (
          NEW.id IS DISTINCT FROM OLD.id OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key OR
          NEW.family_slug IS DISTINCT FROM OLD.family_slug OR NEW.channel IS DISTINCT FROM OLD.channel OR
          NEW.version IS DISTINCT FROM OLD.version OR NEW.quarantine_key IS DISTINCT FROM OLD.quarantine_key OR
          NEW.package_sha256 IS DISTINCT FROM OLD.package_sha256 OR NEW.package_size_bytes IS DISTINCT FROM OLD.package_size_bytes OR
          NEW.manifest_version IS DISTINCT FROM OLD.manifest_version OR NEW.manifest_json IS DISTINCT FROM OLD.manifest_json OR
          NEW.release_metadata_json IS DISTINCT FROM OLD.release_metadata_json OR NEW.validation_report_json IS DISTINCT FROM OLD.validation_report_json OR
          NEW.compatibility_score IS DISTINCT FROM OLD.compatibility_score OR NEW.security_score IS DISTINCT FROM OLD.security_score OR
          NEW.performance_score IS DISTINCT FROM OLD.performance_score OR NEW.preview_manifest_json IS DISTINCT FROM OLD.preview_manifest_json OR
          NEW.preview_key IS DISTINCT FROM OLD.preview_key OR NEW.validation_run_count IS DISTINCT FROM OLD.validation_run_count OR
          NEW.validated_at IS DISTINCT FROM OLD.validated_at
        ) THEN
          RAISE EXCEPTION 'Published theme releases are immutable' USING ERRCODE = '55000';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS theme_release_published_immutable ON theme_release_candidates;
      CREATE TRIGGER theme_release_published_immutable
      BEFORE UPDATE ON theme_release_candidates
      FOR EACH ROW EXECUTE FUNCTION theme_release_published_guard();
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION theme_append_only_guard() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Theme deployment records are append-only' USING ERRCODE = '55000';
      END;
      $$ LANGUAGE plpgsql;
    `);
    for (const table of [
      'theme_deployment_snapshots',
      'theme_deployment_events',
      'theme_deployment_progress_events',
    ]) {
      await queryRunner.query(`
        DROP TRIGGER IF EXISTS ${table}_append_only ON "${table}";
        CREATE TRIGGER ${table}_append_only
        BEFORE UPDATE OR DELETE ON "${table}"
        FOR EACH ROW EXECUTE FUNCTION theme_append_only_guard();
      `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'theme_deployment_snapshots',
      'theme_deployment_events',
      'theme_deployment_progress_events',
    ]) {
      await queryRunner.query(
        `DROP TRIGGER IF EXISTS ${table}_append_only ON "${table}"`,
      );
    }
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS theme_release_published_immutable ON theme_release_candidates',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS theme_append_only_guard()',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS theme_release_published_guard()',
    );
  }
}
