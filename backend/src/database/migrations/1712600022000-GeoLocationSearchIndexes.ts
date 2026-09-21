import type { MigrationInterface, QueryRunner } from 'typeorm';

export class GeoLocationSearchIndexes1712600022000 implements MigrationInterface {
  name = 'GeoLocationSearchIndexes1712600022000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_geo_states_country_name" ON "geo_states" ("country_id", "name")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_geo_cities_state_name" ON "geo_cities" ("state_id", "name")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_geo_pincodes_city_code" ON "geo_pincodes" ("city_id", "code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_geo_pincodes_city_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_geo_cities_state_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_geo_states_country_name"`);
  }
}
