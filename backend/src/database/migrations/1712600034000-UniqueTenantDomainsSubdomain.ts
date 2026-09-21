import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueTenantDomainsSubdomain1712600034000 implements MigrationInterface {
  name = 'UniqueTenantDomainsSubdomain1712600034000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_tenant_domains_subdomain"
      ON "tenant_domains" ("subdomain")
      WHERE "subdomain" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_tenant_domains_subdomain"`);
  }
}
