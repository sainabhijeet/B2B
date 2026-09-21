/**
 * Idempotent demo tenants for local/staging. Run after migrations.
 *
 *   npm run tenants:seed
 *
 * Owner login (each tenant): email owner@<slug>.demo and password from DEMO_TENANT_OWNER_PASSWORD.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import dataSource from '../database/data-source';
import { Plan } from '../common/entities/plan.entity';
import { Subscription } from '../common/entities/subscription.entity';
import { SystemConfig } from '../common/entities/system-config.entity';
import { Tenant } from '../common/entities/tenant.entity';
import { User } from '../common/entities/user.entity';
import { TenantStatus } from '../common/enums/tenant-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { randomToken, sha256 } from '../common/utils/hash.util';

const DEMO_PASSWORD = process.env.DEMO_TENANT_OWNER_PASSWORD;

const SAMPLES: Array<{
  slug: string;
  name: string;
  planCode: string;
  status: TenantStatus;
}> = [
  { slug: 'abc-traders', name: 'ABC Traders', planCode: 'BASIC', status: TenantStatus.ACTIVE },
  { slug: 'metro-wholesale', name: 'Metro Wholesale Co.', planCode: 'PREMIUM', status: TenantStatus.ACTIVE },
  { slug: 'north-partners', name: 'North Region Partners', planCode: 'FREE', status: TenantStatus.ACTIVE },
  { slug: 'acme-retail', name: 'Acme Retail', planCode: 'BASIC', status: TenantStatus.ACTIVE },
  { slug: 'beta-labs', name: 'Beta Labs', planCode: 'FREE', status: TenantStatus.SUSPENDED },
];

async function seedTenantDefaults(
  configRepo: Repository<SystemConfig>,
  subRepo: Repository<Subscription>,
  tenantId: string,
  plan: Plan,
): Promise<void> {
  const keySeed = randomToken(24);
  const signingFingerprint = sha256(`${tenantId}:${keySeed}`).slice(0, 32);
  const defaults: SystemConfig[] = [
    configRepo.create({ key: `tenant:${tenantId}:language`, value: 'en' }),
    configRepo.create({ key: `tenant:${tenantId}:theme`, value: 'default' }),
    configRepo.create({ key: `tenant:${tenantId}:invoice_prefix`, value: 'INV' }),
    configRepo.create({ key: `tenant:${tenantId}:signing_fingerprint`, value: signingFingerprint }),
  ];
  await configRepo.save(defaults);
  await subRepo.save(
    subRepo.create({
      tenantId,
      planName: plan.code,
      planId: plan.id,
      status: 'ACTIVE',
      startDate: new Date().toISOString().slice(0, 10),
      expiryDate: null,
      trialEndsAt: null,
    }),
  );
}

async function run() {
  if (!DEMO_PASSWORD) {
    throw new Error('DEMO_TENANT_OWNER_PASSWORD is required.');
  }
  await dataSource.initialize();
  const tenantRepo = dataSource.getRepository(Tenant);
  const planRepo = dataSource.getRepository(Plan);
  const userRepo = dataSource.getRepository(User);
  const configRepo = dataSource.getRepository(SystemConfig);
  const subRepo = dataSource.getRepository(Subscription);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  let created = 0;
  let skipped = 0;

  for (const s of SAMPLES) {
    const exists = await tenantRepo.findOne({ where: { slug: s.slug } });
    if (exists) {
      skipped += 1;
      console.log(`[tenants-seed] skip slug=${s.slug} (already exists)`);
      continue;
    }
    const plan = await planRepo.findOne({ where: { code: s.planCode } });
    if (!plan) {
      throw new Error(
        `Plan code "${s.planCode}" not found. Apply migrations so plans FREE/BASIC/PREMIUM exist.`,
      );
    }
    const id = randomUUID();
    const schemaName = `t_${id.replace(/-/g, '')}`;
    const tenant = await tenantRepo.save(
      tenantRepo.create({
        id,
        slug: s.slug,
        name: s.name,
        status: s.status,
        planId: plan.id,
        schemaName,
      }),
    );
    const qSchema = `"${schemaName.replace(/"/g, '""')}"`;
    await dataSource.query(`CREATE SCHEMA IF NOT EXISTS ${qSchema}`);
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS ${qSchema}._tenant_schema_meta (
        id integer PRIMARY KEY DEFAULT 1,
        schema_version integer NOT NULL DEFAULT 1,
        migrated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT _tenant_schema_meta_single CHECK (id = 1)
      )
    `);
    await dataSource.query(
      `INSERT INTO ${qSchema}._tenant_schema_meta (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,
    );
    await tenantRepo.update({ id: tenant.id }, { tenantSchemaProvisioned: true });
    await userRepo.save(
      userRepo.create({
        tenantId: tenant.id,
        email: `owner@${s.slug}.demo`,
        phone: null,
        passwordHash,
        role: UserRole.OWNER,
      }),
    );
    await seedTenantDefaults(configRepo, subRepo, tenant.id, plan);
    created += 1;
    console.log(`[tenants-seed] created ${s.slug} (${s.planCode}) owner=owner@${s.slug}.demo`);
  }

  console.log(`[tenants-seed] done: created=${created} skipped=${skipped}`);
  await dataSource.destroy();
}

run().catch((e) => {
  console.error('[tenants-seed] failed:', e);
  process.exit(1);
});
