import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkerNodes1712600013000 implements MigrationInterface {
  name = 'AddWorkerNodes1712600013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "worker_nodes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "hostname" varchar(128) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'ONLINE',
        "active_jobs" int NOT NULL DEFAULT 0,
        "last_heartbeat" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_worker_nodes_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_worker_nodes_hostname" UNIQUE ("hostname")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "worker_nodes"`);
  }
}
