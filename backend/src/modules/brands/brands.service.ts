import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Brand } from '../../common/entities/brand.entity';
import { MasterBrand } from '../../common/entities/master-brand.entity';
import { Product } from '../../common/entities/product.entity';
import { PLATFORM_ROLES } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';
import { CreateTenantBrandDto } from './dto/create-tenant-brand.dto';
import { UpdateTenantBrandDto } from './dto/update-tenant-brand.dto';

export type MergedBrandOption = {
  id: string;
  type: 'master' | 'tenant';
  name: string;
  slug: string;
  logoUrl: string | null;
  /** Present for tenant rows; master rows are only returned when active. */
  status?: string;
  description?: string | null;
};

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 240);
}

@Injectable()
export class BrandsService {
  private async isSlugTaken(repo: Repository<Brand>, slug: string): Promise<boolean> {
    return (
      (await repo.createQueryBuilder('b').where('LOWER(b.slug) = LOWER(:slug)', { slug }).getCount()) > 0
    );
  }

  constructor(
    @InjectRepository(MasterBrand) private readonly masterBrandsRepo: Repository<MasterBrand>,
    private readonly tenantRunner: TenantSchemaRunner,
  ) {}

  private tenantIdOrThrow(actor: JwtUserPayload): string {
    if (PLATFORM_ROLES.includes(actor.role)) {
      throw new ForbiddenException('Use tenant-scoped distributor auth for brand APIs.');
    }
    if (!actor.tenantId) throw new ForbiddenException('Tenant context required.');
    return actor.tenantId;
  }

  async listMerged(
    actor: JwtUserPayload,
    includeInactiveTenantCustom = false,
  ): Promise<{ success: true; data: MergedBrandOption[]; message: string }> {
    const tenantId = this.tenantIdOrThrow(actor);
    const masters = await this.masterBrandsRepo.find({
      where: { status: 'active' },
      order: { name: 'ASC' },
    });
    const masterItems: MergedBrandOption[] = masters.map((m) => ({
      id: m.id,
      type: 'master' as const,
      name: m.name,
      slug: m.slug,
      logoUrl: m.logoUrl,
      status: m.status,
      description: null,
    }));

    const tenantCustom = await this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const where = includeInactiveTenantCustom
        ? { masterBrandId: IsNull() }
        : { masterBrandId: IsNull(), status: 'active' };
      return m.getRepository(Brand).find({
        where,
        order: { name: 'ASC' },
      });
    });
    const tenantItems: MergedBrandOption[] = tenantCustom.map((b) => ({
      id: b.id,
      type: 'tenant' as const,
      name: b.name,
      slug: b.slug,
      logoUrl: b.logoUrl,
      status: b.status,
      description: b.description,
    }));

    return { success: true, data: [...masterItems, ...tenantItems], message: '' };
  }

  async createCustomBrand(
    actor: JwtUserPayload,
    dto: CreateTenantBrandDto,
  ): Promise<{ success: true; data: Brand; message: string }> {
    const tenantId = this.tenantIdOrThrow(actor);
    const baseSlug = (dto.slug?.trim() || slugify(dto.name)) || slugify(dto.name);
    if (!baseSlug) throw new BadRequestException('Could not derive slug from name.');

    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const repo = m.getRepository(Brand);
      let slug = baseSlug;
      for (let i = 0; i < 20; i += 1) {
        if (!(await this.isSlugTaken(repo, slug))) break;
        slug = `${baseSlug}-${i + 2}`;
      }
      const row = repo.create({
        masterBrandId: null,
        name: dto.name.trim(),
        slug,
        logoUrl: dto.logoUrl?.trim() || null,
        description: dto.description?.trim() || null,
        status: dto.status === 'inactive' ? 'inactive' : 'active',
      });
      try {
        const saved = await repo.save(row);
        return { success: true, data: saved, message: '' };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('duplicate') || msg.includes('unique')) {
          throw new ConflictException('Brand slug already exists.');
        }
        throw e;
      }
    });
  }

  async updateCustomBrand(
    actor: JwtUserPayload,
    brandId: string,
    dto: UpdateTenantBrandDto,
  ): Promise<{ success: true; data: Brand; message: string }> {
    const tenantId = this.tenantIdOrThrow(actor);
    const touched =
      dto.name !== undefined ||
      dto.slug !== undefined ||
      dto.logoUrl !== undefined ||
      dto.description !== undefined ||
      dto.status !== undefined;
    if (!touched) throw new BadRequestException('No fields to update.');

    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const repo = m.getRepository(Brand);
      const row = await repo.findOne({ where: { id: brandId } });
      if (!row) throw new NotFoundException('Brand not found.');
      if (row.masterBrandId != null) {
        throw new ForbiddenException('Platform-linked brands cannot be edited here.');
      }

      if (dto.name !== undefined) row.name = dto.name.trim();
      if (dto.description !== undefined) {
        row.description = dto.description.trim() || null;
      }
      if (dto.logoUrl !== undefined) {
        row.logoUrl = dto.logoUrl.trim() || null;
      }
      if (dto.status !== undefined) row.status = dto.status;

      if (dto.slug !== undefined) {
        const next = dto.slug.trim();
        if (!next) throw new BadRequestException('Slug cannot be empty.');
        const taken =
          (await repo
            .createQueryBuilder('b')
            .where('LOWER(b.slug) = LOWER(:slug)', { slug: next })
            .andWhere('b.id != :id', { id: brandId })
            .getCount()) > 0;
        if (taken) throw new ConflictException('Brand slug already exists.');
        row.slug = next;
      }

      try {
        const saved = await repo.save(row);
        return { success: true, data: saved, message: '' };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('duplicate') || msg.includes('unique')) {
          throw new ConflictException('Brand slug already exists.');
        }
        throw e;
      }
    });
  }

  async deleteCustomBrand(actor: JwtUserPayload, brandId: string): Promise<{ success: true; message: string }> {
    const tenantId = this.tenantIdOrThrow(actor);
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const repo = m.getRepository(Brand);
      const row = await repo.findOne({ where: { id: brandId } });
      if (!row) throw new NotFoundException('Brand not found.');
      if (row.masterBrandId != null) {
        throw new ForbiddenException('Platform-linked brands cannot be deleted here.');
      }
      const used = await m.getRepository(Product).count({ where: { brandId } });
      if (used > 0) {
        throw new ConflictException('Brand is still linked to one or more products.');
      }
      await repo.delete({ id: brandId });
      return { success: true, message: '' };
    });
  }

  /** Ensures a tenant shadow row exists for a master brand (one per tenant). */
  async findOrCreateShadowBrand(tenantId: string, masterBrandId: string): Promise<Brand> {
    const master = await this.masterBrandsRepo.findOne({ where: { id: masterBrandId, status: 'active' } });
    if (!master) throw new NotFoundException('Master brand not found.');

    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const repo = m.getRepository(Brand);
      const existing = await repo.findOne({ where: { masterBrandId } });
      if (existing) return existing;

      let slug = master.slug;
      for (let i = 0; i < 20; i += 1) {
        if (!(await this.isSlugTaken(repo, slug))) break;
        slug = `${master.slug}-${i + 1}`;
      }
      const row = repo.create({
        masterBrandId,
        name: master.name,
        slug,
        logoUrl: master.logoUrl,
        description: null,
        status: 'active',
      });
      return repo.save(row);
    });
  }

  /**
   * Resolves structured brand fields for product create/update.
   * Priority: `brandMasterId` → shadow row; `brandId` → tenant row; else legacy `brand` text only.
   */
  async resolveBrandForProductSave(
    tenantId: string,
    input: { brandId?: string | null; brandMasterId?: string | null; brand?: string | null },
  ): Promise<{ brandId: string | null; brandLabel: string | null }> {
    const legacy = input.brand?.trim() || null;

    if (input.brandMasterId && input.brandId) {
      throw new BadRequestException('Specify only one of brandId or brandMasterId.');
    }
    if (input.brandMasterId) {
      const shadow = await this.findOrCreateShadowBrand(tenantId, input.brandMasterId);
      return { brandId: shadow.id, brandLabel: shadow.name };
    }
    if (input.brandId) {
      const row = await this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
        return m.getRepository(Brand).findOne({ where: { id: input.brandId as string } });
      });
      if (!row) throw new BadRequestException('Brand not found for this store.');
      return { brandId: row.id, brandLabel: row.name };
    }
    return { brandId: null, brandLabel: legacy };
  }
}
