import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { TenantDomain } from '../common/entities/tenant-domain.entity';
import { Tenant } from '../common/entities/tenant.entity';
import { TenantStatus } from '../common/enums/tenant-status.enum';

@Injectable()
export class TenantResolver {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(TenantDomain)
    private readonly domainRepo: Repository<TenantDomain>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  /**
   * Resolves tenant id from `X-Tenant-Id` (API / JWT flows), from `X-Storefront-Host` or `Host`
   * subdomain (`{slug}.APP_PLATFORM_DOMAIN` or `{slug}.localhost` in development), or from
   * a matching `tenant_domains.custom_domain` (with optional `www.` variant).
   *
   * `X-Storefront-Host` is applied even when `Authorization: Bearer` is present (consumer app).
   */
  async resolveTenantFromRequest(request: Request): Promise<string | null> {
    const fromHeader = request.headers['x-tenant-id'];
    if (typeof fromHeader === 'string' && fromHeader.trim().length > 0) {
      return fromHeader.trim();
    }

    /** Mobile / Next.js SSR: virtual storefront host while API `Host` is the API server. */
    const storefrontHost = request.headers['x-storefront-host'];
    if (typeof storefrontHost === 'string' && storefrontHost.trim().length > 0) {
      const fromStorefront = await this.resolveTenantFromHostish(storefrontHost);
      if (fromStorefront) {
        return fromStorefront;
      }
    }

    const auth = request.headers.authorization;
    if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
      return null;
    }

    const hostHeader = typeof request.headers.host === 'string' ? request.headers.host : '';
    return this.resolveTenantFromHostish(hostHeader);
  }

  private async resolveTenantFromHostish(hostish: string): Promise<string | null> {
    const rawHost = hostish.split(':')[0]?.toLowerCase() ?? '';
    if (!rawHost) {
      return null;
    }

    const platformDomain = (
      this.config.get<string>('app.platformDomain', 'platform.local') ?? 'platform.local'
    ).toLowerCase();

    let subdomain: string | null = null;

    if (rawHost.endsWith(`.${platformDomain}`)) {
      subdomain = rawHost.slice(0, -(platformDomain.length + 1));
    } else if (rawHost.endsWith('.localhost')) {
      subdomain = rawHost.replace(/\.localhost$/u, '');
    }

    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      const bySub = await this.domainRepo.findOne({
        where: { subdomain, status: 'active' },
        select: ['tenantId'],
      });
      if (bySub?.tenantId) {
        return bySub.tenantId;
      }

      /**
       * Local dev: `{slug}.localhost` often has no `tenant_domains` row yet (or status pending).
       * Match `tenants.slug` so storefront SSR (`X-Storefront-Host`) still resolves the tenant
       * and `GET /themes/storefront/current` returns the selected theme.
       */
      const isLocalhostSubdomain = rawHost.endsWith('.localhost');
      const nodeEnv = process.env.NODE_ENV ?? 'development';
      /** Allow `{slug}.localhost` → `tenants.slug` in any non-production env (staging local, etc.). */
      if (isLocalhostSubdomain && nodeEnv !== 'production') {
        const bySlug = await this.tenantRepo.findOne({
          where: { slug: subdomain, status: TenantStatus.ACTIVE },
          select: ['id'],
        });
        if (bySlug?.id) {
          return bySlug.id;
        }
      }
    }

    const host = rawHost;
    const variants = host.startsWith('www.') ? [host, host.slice(4)] : [host, `www.${host}`];
    const uniq = [...new Set(variants)];
    for (const h of uniq) {
      const byCustom = await this.domainRepo.findOne({
        where: { customDomain: h, status: 'active' },
        select: ['tenantId'],
      });
      if (byCustom?.tenantId) {
        return byCustom.tenantId;
      }
    }

    return null;
  }
}
