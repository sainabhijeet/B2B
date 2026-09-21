import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGeoLocationTables1712600021000 implements MigrationInterface {
  name = 'AddGeoLocationTables1712600021000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "geo_states" (
        "state_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "country_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "code" varchar(32) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_geo_states" PRIMARY KEY ("state_id"),
        CONSTRAINT "FK_geo_states_country" FOREIGN KEY ("country_id") REFERENCES "countries"("country_id") ON DELETE CASCADE,
        CONSTRAINT "UQ_geo_states_country_code" UNIQUE ("country_id", "code")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_geo_states_country" ON "geo_states" ("country_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "geo_cities" (
        "city_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "state_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_geo_cities" PRIMARY KEY ("city_id"),
        CONSTRAINT "FK_geo_cities_state" FOREIGN KEY ("state_id") REFERENCES "geo_states"("state_id") ON DELETE CASCADE,
        CONSTRAINT "UQ_geo_cities_state_name" UNIQUE ("state_id", "name")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_geo_cities_state" ON "geo_cities" ("state_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "geo_pincodes" (
        "pincode_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "city_id" uuid NOT NULL,
        "code" varchar(32) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_geo_pincodes" PRIMARY KEY ("pincode_id"),
        CONSTRAINT "FK_geo_pincodes_city" FOREIGN KEY ("city_id") REFERENCES "geo_cities"("city_id") ON DELETE CASCADE,
        CONSTRAINT "UQ_geo_pincodes_city_code" UNIQUE ("city_id", "code")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_geo_pincodes_city" ON "geo_pincodes" ("city_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "geo_pincodes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "geo_cities"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "geo_states"`);
  }
}
