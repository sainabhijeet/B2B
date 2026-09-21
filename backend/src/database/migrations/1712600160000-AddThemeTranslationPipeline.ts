import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddThemeTranslationPipeline1712600160000 implements MigrationInterface {
  name = 'AddThemeTranslationPipeline1712600160000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS theme_translation_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL,
        theme_id uuid NOT NULL,
        theme_version varchar(64) NULL,
        source_language varchar(16) NOT NULL DEFAULT 'en',
        target_languages jsonb NOT NULL,
        status varchar(24) NOT NULL DEFAULT 'QUEUED',
        requested_by uuid NULL,
        error_message text NULL,
        entry_count integer NOT NULL DEFAULT 0,
        approved_count integer NOT NULL DEFAULT 0,
        metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_theme_translation_jobs_theme_status ON theme_translation_jobs(theme_id, source_language, status)`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS theme_translation_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id uuid NOT NULL REFERENCES theme_translation_jobs(id) ON DELETE CASCADE,
        theme_id uuid NOT NULL,
        language_code varchar(16) NOT NULL,
        translation_key varchar(512) NOT NULL,
        source_text text NOT NULL,
        draft_text text NULL,
        approved_text text NULL,
        status varchar(24) NOT NULL DEFAULT 'MISSING',
        draft_provider varchar(64) NULL,
        draft_version integer NOT NULL DEFAULT 0,
        lock_version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_theme_translation_entry_job_locale_key UNIQUE(job_id, language_code, translation_key)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_theme_translation_entries_theme_locale_status ON theme_translation_entries(theme_id, language_code, status)`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS theme_translation_revisions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_id uuid NOT NULL REFERENCES theme_translation_entries(id) ON DELETE CASCADE,
        version integer NOT NULL,
        translation_text text NOT NULL,
        status varchar(24) NOT NULL,
        provider varchar(64) NULL,
        created_by uuid NULL,
        reviewed_by uuid NULL,
        review_note text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_theme_translation_revision_entry_version UNIQUE(entry_id, version)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS theme_translation_audit_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id uuid NOT NULL REFERENCES theme_translation_jobs(id) ON DELETE CASCADE,
        entry_id uuid NULL REFERENCES theme_translation_entries(id) ON DELETE SET NULL,
        action varchar(48) NOT NULL,
        actor_id uuid NULL,
        payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_theme_translation_events_job_created ON theme_translation_audit_events(job_id, created_at)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TABLE IF EXISTS theme_translation_audit_events',
    );
    await queryRunner.query('DROP TABLE IF EXISTS theme_translation_revisions');
    await queryRunner.query('DROP TABLE IF EXISTS theme_translation_entries');
    await queryRunner.query('DROP TABLE IF EXISTS theme_translation_jobs');
  }
}
