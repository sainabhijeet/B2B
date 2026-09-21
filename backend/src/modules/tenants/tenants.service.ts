import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { Plan } from '../../common/entities/plan.entity';
import { SystemConfig } from '../../common/entities/system-config.entity';
import { Tenant } from '../../common/entities/tenant.entity';
import { User } from '../../common/entities/user.entity';
import { Subscription } from '../../common/entities/subscription.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { randomToken, sha256 } from '../../common/utils/hash.util';
import { ReferralsService } from '../referrals/referrals.service';
import { UsersService } from '../users/users.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { DistributorOnboardingService } from '../distributor-onboarding/distributor-onboarding.service';
import { computeTenantSchemaName, TenantSchemaService } from '../../tenancy/tenant-schema.service';

@Injectable()
export class TenantsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(SystemConfig)
    private readonly configRepository: Repository<SystemConfig>,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
    private readonly referralsService: ReferralsService,
    private readonly distributorOnboarding: DistributorOnboardingService,
    private readonly tenantSchemaService: TenantSchemaService,
  ) {}

  async create(dto: CreateTenantDto, meta?: { clientIp?: string | null }): Promise<Tenant> {
    const existing = await this.tenantRepository.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Tenant slug already exists.');

    const freePlan = await this.planRepository.findOne({ where: { code: 'FREE' } });
    if (!freePlan) throw new NotFoundException('FREE plan not found. Run migrations first.');

    const id = randomUUID();
    const tenant = this.tenantRepository.create({
      id,
      slug: dto.slug.toLowerCase(),
      name: dto.name,
      planId: freePlan.id,
      countryId: dto.countryId ?? null,
      schemaName: computeTenantSchemaName(id),
    });
    const savedTenant = await this.tenantRepository.save(tenant);
    await this.tenantSchemaService.provisionAfterTenantCreate(savedTenant);

    await this.usersService.create({
      tenantId: savedTenant.id,
      email: dto.ownerEmail,
      phone: dto.ownerPhone,
      password: dto.ownerPassword,
      role: UserRole.OWNER,
    });

    await this.seedTenantDefaults(savedTenant.id);
    await this.auditLogsService.log({
      action: 'TENANT_CREATED',
      tenantId: savedTenant.id,
      metadata: {
        slug: savedTenant.slug,
        name: savedTenant.name,
        countryId: savedTenant.countryId ?? null,
      },
    });
    await this.referralsService.recordTenantSignupFromReferral({
      referralCode: dto.referralCode,
      tenantId: savedTenant.id,
      ownerEmail: dto.ownerEmail,
      clientIp: meta?.clientIp ?? null,
    });
    await this.distributorOnboarding.ensureInProgressForNewTenant(savedTenant.id);
    return savedTenant;
  }

  /** Super-admin retry when automatic `CREATE SCHEMA` failed at signup. */
  async provisionTenantSchema(id: string): Promise<Tenant> {
    return this.tenantSchemaService.provisionByTenantId(id);
  }

  /** OTP-only distributor signup: owner has phone + random unused password; synthetic email for uniqueness. */
  async createTenantForMobileOwner(
    ownerPhone: string,
    meta?: { clientIp?: string | null; countryId?: string | null },
  ): Promise<Tenant> {
    const digits = ownerPhone.replace(/\D/g, '');
    const syntheticEmail = `u${digits}@distributors.internal`;
    const { slug, name } = await this.allocateSlugAndNameForNewTenant(syntheticEmail);
    const ownerPassword = `Pw_${randomToken(32)}_9`;
    return this.create(
      {
        slug,
        name,
        ownerEmail: syntheticEmail,
        ownerPassword,
        ownerPhone: digits,
        countryId: meta?.countryId ?? undefined,
      },
      meta,
    );
  }

  /** Unique slug + display name when user does not provide store URL / business name at signup. */
  async allocateSlugAndNameForNewTenant(ownerEmail: string): Promise<{ slug: string; name: string }> {
    const rawLocal = ownerEmail.split('@')[0]?.trim() || 'store';
    let base = rawLocal.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (base.length < 3) {
      base = `org${randomToken(4).replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
    }
    base = base.slice(0, 44);
    let slug = base;
    for (let attempt = 0; attempt < 24; attempt++) {
      const clash = await this.tenantRepository.findOne({ where: { slug } });
      if (!clash) break;
      const suffix = randomToken(4).replace(/[^a-z0-9]/gi, '').toLowerCase();
      slug = `${base}-${suffix}`.slice(0, 64);
    }
    if (await this.tenantRepository.findOne({ where: { slug } })) {
      slug = `t-${randomToken(12).replace(/[^a-z0-9]/gi, '').toLowerCase()}`.slice(0, 64);
    }
    const readable = rawLocal.replace(/[._-]+/g, ' ').trim() || 'Store';
    const titled =
      readable.length > 0
        ? readable.charAt(0).toUpperCase() + readable.slice(1).toLowerCase()
        : 'Store';
    const name = titled.slice(0, 255);
    return { slug, name };
  }

  async list(): Promise<
    Array<{
      id: string;
      slug: string;
      name: string;
      countryId: string | null;
      status: string;
      planId: string | null;
      planCode: string | null;
      planName: string | null;
      ownerEmail: string | null;
      ownerPhone: string | null;
      schemaName: string;
      tenantSchemaProvisioned: boolean;
      createdAt: string;
      updatedAt: string;
    }>
  > {
    const rows = await this.tenantRepository.find({
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });
    const ids = rows.map((t) => t.id);
    const owners =
      ids.length === 0
        ? []
        : await this.userRepository.find({
            where: { tenantId: In(ids), role: UserRole.OWNER },
          });
    const ownerByTenant = new Map<string, User>();
    for (const u of owners) {
      if (u.tenantId && !ownerByTenant.has(u.tenantId)) ownerByTenant.set(u.tenantId, u);
    }
    return rows.map((t) => {
      const o = ownerByTenant.get(t.id);
      return {
        id: t.id,
        slug: t.slug,
        name: t.name,
        countryId: t.countryId ?? null,
        status: t.status,
        planId: t.planId,
        planCode: t.plan?.code ?? null,
        planName: t.plan?.name ?? null,
        ownerEmail: o?.email ?? null,
        ownerPhone: o?.phone ?? null,
        schemaName: t.schemaName,
        tenantSchemaProvisioned: t.tenantSchemaProvisioned,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      };
    });
  }

  async getById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found.');
    return tenant;
  }

  async getUsage(id: string) {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found.');
    const expectedSchema = computeTenantSchemaName(tenant.id);
    if (
      tenant.schemaName !== expectedSchema ||
      !/^t_[a-f0-9]{32}$/u.test(tenant.schemaName)
    ) {
      throw new ConflictException('Tenant schema configuration is invalid.');
    }
    const quotedSchema = `"${tenant.schemaName}"`;
    const scalar = async (sql: string, params: unknown[] = []) => {
      const rows = (await this.dataSource.query(sql, params)) as Array<{
        value: string;
      }>;
      return Number(rows[0]?.value ?? 0);
    };
    const subscription = await this.subscriptionsRepository.findOne({
      where: { tenantId: tenant.id },
    });
    const [
      products,
      customers,
      orders,
      users,
      storageBytes,
      apiCalls30d,
      notifications30d,
      notificationsToday,
      limitRows,
    ] = await Promise.all([
      scalar(
        `SELECT COUNT(*)::text AS value FROM ${quotedSchema}."products" WHERE tenant_id = $1`,
        [id],
      ),
      scalar(
        `SELECT COUNT(*)::text AS value FROM customers WHERE tenant_id = $1 AND deleted_at IS NULL`,
        [id],
      ),
      scalar(
        `SELECT COUNT(*)::text AS value FROM ${quotedSchema}."orders" WHERE tenant_id = $1`,
        [id],
      ),
      scalar(
        `SELECT COUNT(*)::text AS value FROM users WHERE tenant_id = $1 AND deleted_at IS NULL`,
        [id],
      ),
      scalar(
        `SELECT COALESCE(SUM(ba.file_size::numeric), 0)::text AS value
         FROM build_artifacts ba
         INNER JOIN build_jobs bj ON bj.id = ba.build_job_id
         WHERE bj.tenant_id = $1`,
        [id],
      ),
      scalar(
        `SELECT COUNT(*)::text AS value FROM api_request_logs
         WHERE tenant_id = $1 AND created_at >= now() - interval '30 days'`,
        [id],
      ),
      scalar(
        `SELECT COUNT(*)::text AS value FROM notifications
         WHERE tenant_id = $1 AND created_at >= now() - interval '30 days'`,
        [id],
      ),
      scalar(
        `SELECT COUNT(*)::text AS value FROM notifications
         WHERE tenant_id = $1 AND created_at >= date_trunc('day', now())`,
        [id],
      ),
      subscription
        ? (this.dataSource.query(
            `SELECT max_products AS "maxProducts",
                    max_users AS "maxUsers",
                    notifications_per_day AS "notificationsPerDay"
             FROM plan_limits WHERE plan_name = $1 LIMIT 1`,
            [subscription.planName],
          ) as Promise<
            Array<{
              maxProducts: number;
              maxUsers: number;
              notificationsPerDay: number;
            }>
          >)
        : Promise.resolve([]),
    ]);
    const limits = limitRows[0] ?? null;
    return {
      success: true,
      data: {
        products,
        customers,
        orders,
        users,
        storageBytes,
        apiCalls30d,
        notifications30d,
        notificationsToday,
        limits,
      },
      meta: {},
      message: '',
    };
  }

  /** Super Admin / support — single payload for tenant detail UI. */
  async getAdminDetail(id: string): Promise<{
    id: string;
    slug: string;
    name: string;
    countryId: string | null;
    status: string;
    schemaName: string;
    tenantSchemaProvisioned: boolean;
    createdAt: string;
    updatedAt: string;
    plan: {
      id: string;
      code: string;
      name: string;
      price: number;
      billingCycle: string;
    } | null;
    owner: { email: string | null; phone: string | null } | null;
    subscription: {
      id: string;
      planName: string;
      planId: string | null;
      status: string;
      startDate: string;
      expiryDate: string | null;
      endDate: string | null;
      trialEndsAt: string | null;
    } | null;
  }> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
      relations: { plan: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found.');

    const [owner, subscription] = await Promise.all([
      this.userRepository.findOne({ where: { tenantId: id, role: UserRole.OWNER } }),
      this.subscriptionsRepository.findOne({ where: { tenantId: id } }),
    ]);

    const p = tenant.plan;
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      countryId: tenant.countryId ?? null,
      status: tenant.status,
      schemaName: tenant.schemaName,
      tenantSchemaProvisioned: tenant.tenantSchemaProvisioned,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
      plan: p
        ? {
            id: p.id,
            code: p.code,
            name: p.name,
            price: p.price,
            billingCycle: p.billingCycle,
          }
        : null,
      owner: owner
        ? {
            email: owner.email,
            phone: owner.phone,
          }
        : null,
      subscription: subscription
        ? {
            id: subscription.id,
            planName: subscription.planName,
            planId: subscription.planId,
            status: subscription.status,
            startDate: subscription.startDate,
            expiryDate: subscription.expiryDate,
            endDate: subscription.endDate,
            trialEndsAt: subscription.trialEndsAt
              ? subscription.trialEndsAt.toISOString()
              : null,
          }
        : null,
    };
  }

  private async seedTenantDefaults(tenantId: string): Promise<void> {
    const keySeed = randomToken(24);
    const signingFingerprint = sha256(`${tenantId}:${keySeed}`).slice(0, 32);

    const defaults: SystemConfig[] = [
      this.configRepository.create({ key: `tenant:${tenantId}:language`, value: 'en' }),
      this.configRepository.create({ key: `tenant:${tenantId}:theme`, value: 'default' }),
      this.configRepository.create({
        key: `tenant:${tenantId}:invoice_prefix`,
        value: 'INV',
      }),
      this.configRepository.create({
        key: `tenant:${tenantId}:signing_fingerprint`,
        value: signingFingerprint,
      }),
    ];
    await this.configRepository.save(defaults);
    await this.subscriptionsRepository.save(
      this.subscriptionsRepository.create({
        tenantId,
        planName: 'FREE',
        status: 'ACTIVE',
        startDate: new Date().toISOString().slice(0, 10),
        expiryDate: null,
        trialEndsAt: null,
      }),
    );
  }
}
