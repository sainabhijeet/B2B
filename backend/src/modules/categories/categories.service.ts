import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, In, IsNull, Repository } from 'typeorm';
import { Attribute } from '../../common/entities/attribute.entity';
import { CatalogAuditLog } from '../../common/entities/catalog-audit-log.entity';
import { Category } from '../../common/entities/category.entity';
import { Industry } from '../../common/entities/industry.entity';
import { TenantProfile } from '../../common/entities/tenant-profile.entity';
import { PLATFORM_ROLES, UserRole } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { CategoryQueryDto } from './dto/category-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private readonly categoriesRepo: Repository<Category>,
    @InjectRepository(Industry) private readonly industryRepo: Repository<Industry>,
    @InjectRepository(CatalogAuditLog)
    private readonly catalogAuditRepo: Repository<CatalogAuditLog>,
    @InjectRepository(TenantProfile) private readonly tenantProfilesRepo: Repository<TenantProfile>,
  ) {}

  async list(actor: JwtUserPayload, query: CategoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.categoriesRepo.createQueryBuilder('c').where('c.deleted_at IS NULL');

    if (PLATFORM_ROLES.includes(actor.role)) {
      if (query.scope === 'global') {
        qb.andWhere('c.tenant_id IS NULL');
      } else if (query.tenantId) {
        if (query.includeGlobal) {
          const profile = await this.tenantProfilesRepo.findOne({ where: { tenantId: query.tenantId } });
          if (profile?.industryId) {
            qb.andWhere('(c.tenant_id = :tenantId OR (c.tenant_id IS NULL AND c.industry_id = :industryId))', {
              tenantId: query.tenantId,
              industryId: profile.industryId,
            });
          } else {
            qb.andWhere('c.tenant_id = :tenantId', { tenantId: query.tenantId });
          }
        } else {
          qb.andWhere('c.tenant_id = :tenantId', { tenantId: query.tenantId });
        }
      } else if (query.scope === 'tenant') {
        throw new BadRequestException('tenantId is required when scope is tenant.');
      }
    } else {
      if (!actor.tenantId) throw new ForbiddenException('Tenant context required.');
      const profile = await this.tenantProfilesRepo.findOne({ where: { tenantId: actor.tenantId } });
      if (profile?.industryId) {
        qb.andWhere(
          new Brackets((sqb: any) => {
            sqb.where('c.tenant_id = :tenantId', { tenantId: actor.tenantId }).orWhere(
              '(c.tenant_id IS NULL AND c.industry_id = :industryId)',
              { industryId: profile.industryId },
            );
          }),
        );
      } else {
        qb.andWhere('c.tenant_id = :tenantId', { tenantId: actor.tenantId });
      }
    }

    qb.orderBy('c.sort_order', 'ASC').addOrderBy('c.name', 'ASC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    const rows = await this.attachAttributeIds(data);
    return {
      success: true,
      data: rows,
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
      message: '',
    };
  }

  async findOne(actor: JwtUserPayload, id: string) {
    const category = await this.categoriesRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!category) throw new BadRequestException('Category not found.');
    this.ensureReadable(actor, category.tenantId);
    const [data] = await this.attachAttributeIds([category]);
    return { success: true, data, meta: {}, message: '' };
  }

  async create(actor: JwtUserPayload, dto: CreateCategoryDto) {
    const tenantId = this.resolveWritableTenantId(actor, dto.tenantId);
    const slug = dto.slug.trim().toLowerCase();
    if (slug.length < 2) throw new BadRequestException('Category slug must contain at least 2 characters.');
    await this.ensureUniqueSlug(tenantId, slug);
    const parentId = dto.parentId ?? null;
    let level = 1;
    let industryId: string | null = dto.industryId !== undefined ? dto.industryId : null;

    if (parentId) {
      const parent = await this.requireValidParent(parentId, tenantId);
      level = (parent.level ?? 1) + 1;
      if (dto.industryId === undefined && parent.industryId) industryId = parent.industryId;
    }

    if (industryId) {
      const ind = await this.industryRepo.findOne({ where: { industryId: industryId } });
      if (!ind) throw new BadRequestException('Industry not found.');
    }
    if (tenantId === null && !industryId) {
      throw new BadRequestException('Industry is required for a global category.');
    }

    const saved = await this.categoriesRepo.manager.transaction(async (m) => {
      const repo = m.getRepository(Category);
      const row = await repo.save(repo.create({
        tenantId,
        name: dto.name,
        slug,
        parentId,
        industryId,
        level,
        status: dto.status ?? 'active',
        description: dto.description ?? '',
        sortOrder: dto.sortOrder ?? 0,
        iconUrl: dto.iconUrl?.trim() || null,
        bannerUrl: dto.bannerUrl?.trim() || null,
        thumbnailUrl: dto.thumbnailUrl?.trim() || null,
        showInApp: dto.showInApp ?? true,
        showInWebsite: dto.showInWebsite ?? true,
        showInMenu: dto.showInMenu ?? true,
      }));
      await this.syncAttributeIds(m, row.id, tenantId, dto.attributeIds ?? []);
      return row;
    });
    await this.log(actor, tenantId, 'CATEGORY_CREATED', saved.id, null, saved);
    return { success: true, data: saved, meta: {}, message: '' };
  }

  async update(actor: JwtUserPayload, id: string, dto: UpdateCategoryDto) {
    const category = await this.categoriesRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!category) throw new BadRequestException('Category not found.');
    this.ensureWritable(actor, category.tenantId);
    const oldValue = { ...category };
    if (dto.slug !== undefined) {
      const normalizedSlug = dto.slug.trim().toLowerCase();
      if (normalizedSlug.length < 2) throw new BadRequestException('Category slug must contain at least 2 characters.');
      await this.ensureUniqueSlug(category.tenantId, normalizedSlug, id);
    }
    if (dto.name !== undefined) category.name = dto.name;
    if (dto.slug !== undefined) category.slug = dto.slug.trim().toLowerCase();
    if (dto.status !== undefined) category.status = dto.status;
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;
    if (dto.iconUrl !== undefined) category.iconUrl = dto.iconUrl.trim() || null;
    if (dto.bannerUrl !== undefined) category.bannerUrl = dto.bannerUrl.trim() || null;
    if (dto.thumbnailUrl !== undefined) category.thumbnailUrl = dto.thumbnailUrl.trim() || null;
    if (dto.showInApp !== undefined) category.showInApp = dto.showInApp;
    if (dto.showInWebsite !== undefined) category.showInWebsite = dto.showInWebsite;
    if (dto.showInMenu !== undefined) category.showInMenu = dto.showInMenu;

    if (dto.industryId !== undefined) {
      if (dto.industryId) {
        const ind = await this.industryRepo.findOne({ where: { industryId: dto.industryId } });
        if (!ind) throw new BadRequestException('Industry not found.');
      }
      category.industryId = dto.industryId;
    }

    if (dto.parentId !== undefined) {
      const newParentId = dto.parentId || null;
      category.parentId = newParentId;
      if (!newParentId) {
        category.level = 1;
      } else {
        if (newParentId === category.id) throw new BadRequestException('A category cannot be its own parent.');
        const parent = await this.requireValidParent(newParentId, category.tenantId, category.id);
        category.level = (parent.level ?? 1) + 1;
      }
    }

    const saved = await this.categoriesRepo.manager.transaction(async (m) => {
      const row = await m.getRepository(Category).save(category);
      if (dto.attributeIds !== undefined) {
        await this.syncAttributeIds(m, row.id, row.tenantId, dto.attributeIds);
      }
      if (dto.parentId !== undefined) await this.recalculateDescendantLevels(m, row.id, row.level);
      return row;
    });
    await this.log(actor, category.tenantId, 'CATEGORY_UPDATED', saved.id, oldValue, saved);
    return { success: true, data: saved, meta: {}, message: '' };
  }

  async remove(actor: JwtUserPayload, id: string) {
    const category = await this.categoriesRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!category) throw new BadRequestException('Category not found.');
    this.ensureWritable(actor, category.tenantId);
    const children = await this.categoriesRepo.count({ where: { parentId: id, deletedAt: IsNull() } });
    if (children > 0) throw new BadRequestException('Move or delete child categories first.');
    await this.categoriesRepo.softDelete({ id });
    await this.log(actor, category.tenantId, 'CATEGORY_DELETED', category.id, category, null);
    return { success: true, data: { deleted: true }, meta: {}, message: '' };
  }

  private resolveWritableTenantId(actor: JwtUserPayload, requestedTenantId?: string): string | null {
    if (PLATFORM_ROLES.includes(actor.role)) return requestedTenantId ?? null;
    if (actor.role === UserRole.STAFF) throw new ForbiddenException('STAFF has read-only permissions.');
    if (!actor.tenantId) throw new ForbiddenException('Tenant context required.');
    if (requestedTenantId && requestedTenantId !== actor.tenantId) {
      throw new ForbiddenException('Cannot write into another tenant.');
    }
    return actor.tenantId;
  }

  private ensureReadable(actor: JwtUserPayload, recordTenantId: string | null) {
    if (PLATFORM_ROLES.includes(actor.role)) return;
    if (!actor.tenantId || (recordTenantId !== null && actor.tenantId !== recordTenantId)) {
      throw new ForbiddenException('Cross-tenant read access denied.');
    }
  }

  private async requireValidParent(parentId: string, tenantId: string | null, categoryId?: string) {
    const parent = await this.categoriesRepo.findOne({ where: { id: parentId, deletedAt: IsNull() } });
    if (!parent) throw new BadRequestException('Parent category not found.');
    if (tenantId === null && parent.tenantId !== null) {
      throw new BadRequestException('A global category cannot use a tenant category as its parent.');
    }
    if (tenantId !== null && parent.tenantId !== null && parent.tenantId !== tenantId) {
      throw new BadRequestException('Parent category belongs to another tenant.');
    }
    if (tenantId !== null && parent.tenantId === null) {
      const profile = await this.tenantProfilesRepo.findOne({ where: { tenantId } });
      if (!profile?.industryId || !parent.industryId || profile.industryId !== parent.industryId) {
        throw new BadRequestException('Global parent category is not assigned to this tenant industry.');
      }
    }
    if (categoryId) {
      let cursor: Category | null = parent;
      const visited = new Set<string>();
      while (cursor?.parentId) {
        if (cursor.id === categoryId || visited.has(cursor.id)) {
          throw new BadRequestException('Category hierarchy cannot contain a cycle.');
        }
        visited.add(cursor.id);
        cursor = await this.categoriesRepo.findOne({ where: { id: cursor.parentId, deletedAt: IsNull() } });
      }
      if (cursor?.id === categoryId) throw new BadRequestException('Category hierarchy cannot contain a cycle.');
    }
    return parent;
  }

  private async ensureUniqueSlug(tenantId: string | null, slug: string, excludeId?: string) {
    const qb = this.categoriesRepo.createQueryBuilder('c')
      .where('c.deleted_at IS NULL')
      .andWhere('LOWER(c.slug) = :slug', { slug });
    if (tenantId === null) qb.andWhere('c.tenant_id IS NULL');
    else qb.andWhere('c.tenant_id = :tenantId', { tenantId });
    if (excludeId) qb.andWhere('c.id <> :excludeId', { excludeId });
    if (await qb.getExists()) throw new BadRequestException('A category with this slug already exists in the selected scope.');
  }

  private async recalculateDescendantLevels(manager: EntityManager, categoryId: string, level: number) {
    await manager.query(
      `WITH RECURSIVE tree AS (
         SELECT id, 1 AS depth FROM categories WHERE parent_id = $1 AND deleted_at IS NULL
         UNION ALL
         SELECT c.id, tree.depth + 1 FROM categories c INNER JOIN tree ON c.parent_id = tree.id
         WHERE c.deleted_at IS NULL
       )
       UPDATE categories c SET level = $2 + tree.depth FROM tree WHERE c.id = tree.id`,
      [categoryId, level],
    );
  }

  private async attachAttributeIds(rows: Category[]) {
    if (!rows.length) return [];
    const links = await this.categoriesRepo.manager.query<Array<{ category_id: string; attribute_id: string }>>(
      `SELECT "category_id", "attribute_id" FROM "attribute_categories" WHERE "category_id" = ANY($1::uuid[])`,
      [rows.map((row) => row.id)],
    );
    const byCategory = new Map<string, string[]>();
    for (const link of links) {
      const ids = byCategory.get(link.category_id) ?? [];
      ids.push(link.attribute_id);
      byCategory.set(link.category_id, ids);
    }
    return rows.map((row) => ({ ...row, attributeIds: byCategory.get(row.id) ?? [] }));
  }

  private async syncAttributeIds(
    manager: EntityManager,
    categoryId: string,
    tenantId: string | null,
    attributeIds: string[],
  ) {
    const uniqueIds = [...new Set(attributeIds)];
    if (uniqueIds.length) {
      const attributes = await manager.getRepository(Attribute).find({
        where: { id: In(uniqueIds), deletedAt: IsNull() },
      });
      const allowed = attributes.filter(
        (attribute) => attribute.tenantId === null || attribute.tenantId === tenantId,
      );
      if (allowed.length !== uniqueIds.length) {
        throw new BadRequestException('One or more attributes are missing or belong to another tenant.');
      }
    }
    await manager.query(`DELETE FROM "attribute_categories" WHERE "category_id" = $1`, [categoryId]);
    for (const attributeId of uniqueIds) {
      await manager.query(
        `INSERT INTO "attribute_categories" ("attribute_id", "category_id") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [attributeId, categoryId],
      );
    }
  }

  private ensureWritable(actor: JwtUserPayload, recordTenantId: string | null) {
    if (actor.role === UserRole.STAFF) throw new ForbiddenException('STAFF has read-only permissions.');
    if (PLATFORM_ROLES.includes(actor.role)) {
      if (recordTenantId === null && actor.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Only SUPER_ADMIN can modify global records.');
      }
      return;
    }
    if (!actor.tenantId || actor.tenantId !== recordTenantId) {
      throw new ForbiddenException('Cross-tenant write access denied.');
    }
  }

  private async log(
    actor: JwtUserPayload,
    tenantId: string | null,
    eventType: string,
    entityId: string,
    oldValue: unknown,
    newValue: unknown,
  ) {
    await this.catalogAuditRepo.save(
      this.catalogAuditRepo.create({
        tenantId,
        userId: actor.sub,
        eventType,
        entityType: 'CATEGORY',
        entityId,
        oldValue: oldValue ? (JSON.parse(JSON.stringify(oldValue)) as Record<string, unknown>) : null,
        newValue: newValue ? (JSON.parse(JSON.stringify(newValue)) as Record<string, unknown>) : null,
      }),
    );
  }
}
