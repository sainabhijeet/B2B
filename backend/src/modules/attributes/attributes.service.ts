import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository } from 'typeorm';
import { Attribute } from '../../common/entities/attribute.entity';
import { AttributeValue } from '../../common/entities/attribute-value.entity';
import { CatalogAuditLog } from '../../common/entities/catalog-audit-log.entity';
import { PLATFORM_ROLES, UserRole } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { AttributeQueryDto } from './dto/attribute-query.dto';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { CreateAttributeValueDto } from './dto/create-attribute-value.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';

@Injectable()
export class AttributesService {
  constructor(
    @InjectRepository(Attribute) private readonly attributesRepo: Repository<Attribute>,
    @InjectRepository(AttributeValue)
    private readonly valuesRepo: Repository<AttributeValue>,
    @InjectRepository(CatalogAuditLog)
    private readonly auditRepo: Repository<CatalogAuditLog>,
  ) {}

  async list(actor: JwtUserPayload, query: AttributeQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.attributesRepo.createQueryBuilder('a').where('a.deleted_at IS NULL');
    if (PLATFORM_ROLES.includes(actor.role)) {
      if (query.tenantId) qb.andWhere('a.tenant_id = :tenantId', { tenantId: query.tenantId });
    } else {
      if (!actor.tenantId) throw new ForbiddenException('Tenant context required.');
      qb.andWhere(
        new Brackets((sqb: any) => {
          sqb.where('a.tenant_id IS NULL').orWhere('a.tenant_id = :tenantId', {
            tenantId: actor.tenantId,
          });
        }),
      );
    }
    qb.orderBy('a.created_at', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    const rows =
      query.include === 'mappings' ? await this.attachMappings(data) : data.map((a) => ({ ...a }) as Record<string, unknown>);
    return {
      success: true,
      data: rows,
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
      message: '',
    };
  }

  async findOne(actor: JwtUserPayload, id: string, query: AttributeQueryDto) {
    const attribute = await this.attributesRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!attribute) throw new NotFoundException('Attribute not found.');
    this.ensureTenantRead(actor, attribute.tenantId);
    const rows =
      query.include === 'mappings'
        ? await this.attachMappings([attribute])
        : [{ ...attribute } as Record<string, unknown>];
    return { success: true, data: rows[0], meta: {}, message: '' };
  }

  async create(actor: JwtUserPayload, dto: CreateAttributeDto) {
    const tenantId = this.resolveWritableTenantId(actor, dto.tenantId);
    const saved = await this.attributesRepo.save(
      this.attributesRepo.create({
        tenantId,
        name: dto.name,
        slug: dto.slug,
        dataType: dto.dataType,
        status: dto.status ?? 'active',
      }),
    );
    await this.log(actor, tenantId, 'ATTRIBUTE_CREATED', 'ATTRIBUTE', saved.id, null, saved);
    return { success: true, data: saved, meta: {}, message: '' };
  }

  async update(actor: JwtUserPayload, id: string, dto: UpdateAttributeDto) {
    const attribute = await this.attributesRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!attribute) throw new BadRequestException('Attribute not found.');
    this.ensureWritable(actor, attribute.tenantId);
    const oldValue = { ...attribute };
    Object.assign(attribute, {
      name: dto.name ?? attribute.name,
      slug: dto.slug ?? attribute.slug,
      dataType: dto.dataType ?? attribute.dataType,
      status: dto.status ?? attribute.status,
    });
    const saved = await this.attributesRepo.save(attribute);
    await this.log(actor, attribute.tenantId, 'ATTRIBUTE_UPDATED', 'ATTRIBUTE', saved.id, oldValue, saved);
    return { success: true, data: saved, meta: {}, message: '' };
  }

  async remove(actor: JwtUserPayload, id: string) {
    const attribute = await this.attributesRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!attribute) throw new BadRequestException('Attribute not found.');
    this.ensureWritable(actor, attribute.tenantId);
    await this.attributesRepo.softDelete({ id });
    await this.log(actor, attribute.tenantId, 'ATTRIBUTE_DELETED', 'ATTRIBUTE', attribute.id, attribute, null);
    return { success: true, data: { deleted: true }, meta: {}, message: '' };
  }

  async createValue(actor: JwtUserPayload, attributeId: string, dto: CreateAttributeValueDto) {
    const attribute = await this.attributesRepo.findOne({ where: { id: attributeId, deletedAt: IsNull() } });
    if (!attribute) throw new BadRequestException('Attribute not found.');
    this.ensureTenantRead(actor, attribute.tenantId);
    const saved = await this.valuesRepo.save(
      this.valuesRepo.create({
        attributeId,
        value: dto.value,
        slug: dto.slug,
        status: dto.status ?? 'active',
      }),
    );
    await this.log(actor, attribute.tenantId, 'ATTRIBUTE_CREATED', 'ATTRIBUTE_VALUE', saved.id, null, saved);
    return { success: true, data: saved, meta: {}, message: '' };
  }

  async listValues(actor: JwtUserPayload, attributeId: string) {
    const attribute = await this.attributesRepo.findOne({ where: { id: attributeId, deletedAt: IsNull() } });
    if (!attribute) throw new BadRequestException('Attribute not found.');
    this.ensureTenantRead(actor, attribute.tenantId);
    const data = await this.valuesRepo.find({ where: { attributeId, deletedAt: IsNull() } });
    return { success: true, data, meta: {}, message: '' };
  }

  private async attachMappings(rows: Attribute[]): Promise<Array<Record<string, unknown>>> {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const indRows = await this.attributesRepo.manager.query<Array<{ attribute_id: string; name: string }>>(
      `SELECT ai."attribute_id" AS attribute_id, i."name" AS name
       FROM "attribute_industries" ai
       INNER JOIN "industries" i ON i."industry_id" = ai."industry_id"
       WHERE ai."attribute_id" = ANY($1::uuid[])`,
      [ids],
    );
    const catRows = await this.attributesRepo.manager.query<Array<{ attribute_id: string; slug: string }>>(
      `SELECT ac."attribute_id" AS attribute_id, c."slug" AS slug
       FROM "attribute_categories" ac
       INNER JOIN "categories" c ON c."id" = ac."category_id" AND c."deleted_at" IS NULL
       WHERE ac."attribute_id" = ANY($1::uuid[])`,
      [ids],
    );
    const byInd = new Map<string, string[]>();
    for (const r of indRows) {
      const arr = byInd.get(r.attribute_id) ?? [];
      arr.push(r.name);
      byInd.set(r.attribute_id, arr);
    }
    const byCat = new Map<string, string[]>();
    for (const r of catRows) {
      const arr = byCat.get(r.attribute_id) ?? [];
      arr.push(r.slug);
      byCat.set(r.attribute_id, arr);
    }
    return rows.map((a) => {
      const plain = { ...a } as Record<string, unknown>;
      plain.catalogIndustries = byInd.get(a.id) ?? [];
      plain.catalogCategories = byCat.get(a.id) ?? [];
      return plain;
    });
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

  private ensureTenantRead(actor: JwtUserPayload, recordTenantId: string | null) {
    if (PLATFORM_ROLES.includes(actor.role)) return;
    if (!actor.tenantId) throw new ForbiddenException('Tenant context required.');
    if (recordTenantId && recordTenantId !== actor.tenantId) {
      throw new ForbiddenException('Cross-tenant access denied.');
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
    entityType: string,
    entityId: string,
    oldValue: unknown,
    newValue: unknown,
  ) {
    await this.auditRepo.save(
      this.auditRepo.create({
        tenantId,
        userId: actor.sub,
        eventType,
        entityType,
        entityId,
        oldValue: oldValue ? (JSON.parse(JSON.stringify(oldValue)) as Record<string, unknown>) : null,
        newValue: newValue ? (JSON.parse(JSON.stringify(newValue)) as Record<string, unknown>) : null,
      }),
    );
  }
}
