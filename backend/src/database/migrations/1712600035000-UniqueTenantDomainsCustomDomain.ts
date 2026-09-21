import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueTenantDomainsCustomDomain1712600035000 implements MigrationInterface {
  name = 'UniqueTenantDomainsCustomDomain1712600035000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_tenant_domains_custom_domain"
      ON "tenant_domains" ("custom_domain")
      WHERE "custom_domain" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_tenant_domains_custom_domain"`);
  }
}
