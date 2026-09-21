import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdCampaigns1712600019000 implements MigrationInterface {
  name = 'AddAdCampaigns1712600019000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ad_campaigns" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "placement" character varying(128) NOT NULL,
        "ad_type" character varying(32) NOT NULL DEFAULT 'BANNER_AD',
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'ACTIVE',
        "industry" character varying(64),
        "country" character varying(64),
        "device_type" character varying(32),
        "plan_target" character varying(32) NOT NULL DEFAULT 'FREE_ONLY',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ad_campaigns_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "ad_creatives" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "campaign_id" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "image_url" text NOT NULL,
        "target_url" text NOT NULL,
        "cta" character varying(64),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ad_creatives_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ad_creatives_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ad_creatives_campaign_id" ON "ad_creatives" ("campaign_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "ad_stats" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "campaign_id" uuid NOT NULL,
        "date" date NOT NULL,
        "impressions" integer NOT NULL DEFAULT 0,
        "clicks" integer NOT NULL DEFAULT 0,
        "conversions" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_ad_stats_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ad_stats_campaign_date" UNIQUE ("campaign_id", "date"),
        CONSTRAINT "FK_ad_stats_campaign_id" FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ad_stats_campaign_id_date" ON "ad_stats" ("campaign_id", "date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ad_stats"`);
    await queryRunner.query(`DROP TABLE "ad_creatives"`);
    await queryRunner.query(`DROP TABLE "ad_campaigns"`);
  }
}
