import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantWhatsappTemplateMapping } from '../entities/tenant-whatsapp-template-mapping.entity';
import { TenantWhatsappMetaTemplate } from '../entities/tenant-whatsapp-meta-template.entity';
import { WHATSAPP_HYBRID_TEMPLATE_KEYS } from '../whatsapp-hybrid-template-key';

export type TemplateMappingSnakeRow = {
  template_key: string;
  meta_template_name: string | null;
  is_active: boolean;
};

export type PlatformReplaceMappingItem = {
  templateKey: string;
  metaTemplateName: string;
  isActive?: boolean;
};

@Injectable()
export class WhatsappTemplateMappingService {
  constructor(
    @InjectRepository(TenantWhatsappTemplateMapping)
    private readonly mappingRepo: Repository<TenantWhatsappTemplateMapping>,
    @InjectRepository(TenantWhatsappMetaTemplate)
    private readonly metaRepo: Repository<TenantWhatsappMetaTemplate>,
  ) {}

  /**
   * Tenant override: active row only. Returns Meta `template_name` string or null.
   */
  async getActiveMappedMetaName(tenantId: string, templateKey: string): Promise<string | null> {
    const row = await this.mappingRepo.findOne({
      where: { tenantId, templateKey, isActive: true },
    });
    const n = row?.metaTemplateName?.trim();
    return n || null;
  }

  /** One row per hybrid logical key, merged with DB (for GET APIs). */
  async listMergedSnake(tenantId: string): Promise<TemplateMappingSnakeRow[]> {
    const rows = await this.mappingRepo.find({ where: { tenantId } });
    const byKey = new Map(rows.map((r) => [r.templateKey, r]));
    return [...WHATSAPP_HYBRID_TEMPLATE_KEYS].map((template_key) => {
      const r = byKey.get(template_key);
      return {
        template_key,
        meta_template_name: r?.metaTemplateName ?? null,
        is_active: r?.isActive === true,
      };
    });
  }

  private async assertApprovedUtilityMeta(tenantId: string, templateName: string): Promise<void> {
    const name = templateName.trim();
    const row = await this.metaRepo
      .createQueryBuilder('m')
      .where('m.tenant_id = :tenantId', { tenantId })
      .andWhere('m.template_name = :name', { name })
      .andWhere('m.status = :status', { status: 'APPROVED' })
      .andWhere('(m.category IS NULL OR UPPER(TRIM(m.category)) IN (:...cats))', {
        cats: ['UTILITY', 'AUTHENTICATION'],
      })
      .getOne();
    if (!row) {
      throw new BadRequestException(
        `Meta template "${name}" is not synced, not APPROVED, or not UTILITY/AUTHENTICATION for this tenant.`,
      );
    }
  }

  /**
   * Super-admin: delete all tenant rows, then insert payload (replace semantics).
   */
  async replaceAllFromPlatform(tenantId: string, items: PlatformReplaceMappingItem[]): Promise<void> {
    const keys = items.map((i) => i.templateKey);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Duplicate template_key in payload.');
    }
    await this.mappingRepo.delete({ tenantId });
    for (const i of items) {
      await this.mappingRepo.save(
        this.mappingRepo.create({
          tenantId,
          templateKey: i.templateKey,
          metaTemplateName: i.metaTemplateName.trim(),
          isActive: i.isActive !== false,
        }),
      );
    }
  }

  /**
   * Distributor: per-key upsert; optional rows can be removed by `is_active: false`.
   * Validates Meta row when saving an active mapping.
   */
  async upsertFromDistributor(
    tenantId: string,
    items: Array<{ template_key: string; meta_template_name?: string; is_active?: boolean }>,
  ): Promise<TemplateMappingSnakeRow[]> {
    const keys = items.map((i) => i.template_key);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Duplicate template_key in payload.');
    }
    for (const i of items) {
      const active = i.is_active !== false;
      if (!active) {
        await this.mappingRepo.delete({ tenantId, templateKey: i.template_key });
        continue;
      }
      const meta = i.meta_template_name?.trim() ?? '';
      if (!meta) {
        throw new BadRequestException(`meta_template_name required when is_active is true (${i.template_key}).`);
      }
      await this.assertApprovedUtilityMeta(tenantId, meta);
      let row = await this.mappingRepo.findOne({ where: { tenantId, templateKey: i.template_key } });
      if (row) {
        row.metaTemplateName = meta;
        row.isActive = true;
        await this.mappingRepo.save(row);
      } else {
        await this.mappingRepo.save(
          this.mappingRepo.create({
            tenantId,
            templateKey: i.template_key,
            metaTemplateName: meta,
            isActive: true,
          }),
        );
      }
    }
    return this.listMergedSnake(tenantId);
  }
}
