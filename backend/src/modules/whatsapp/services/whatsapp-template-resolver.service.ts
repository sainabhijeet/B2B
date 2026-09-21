import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantWhatsappTemplate } from '../../../common/entities/tenant-whatsapp-template.entity';
import { TenantWhatsappMetaTemplate } from '../entities/tenant-whatsapp-meta-template.entity';
import type { WhatsappTemplateKey } from '../mappings/whatsapp-template-mapping';
import {
  metaTemplateNameForKey,
  metaTemplateNameLowerKey,
} from '../mappings/whatsapp-template-mapping';
import type { WhatsappHybridTemplateKey } from '../whatsapp-hybrid-template-key';
import { mapDataToMetaBodyTexts, renderCustomWhatsappTemplate } from '../whatsapp-hybrid-template-variables';
import { WhatsappConversationWindowService } from './whatsapp-conversation-window.service';
import { WhatsappTemplateMappingService } from './whatsapp-template-mapping.service';

export type HybridSendPlan =
  | { kind: 'CUSTOM'; body: string }
  | {
      kind: 'META';
      templateName: string;
      languageCode: string;
      bodyTexts: string[];
    }
  | { kind: 'NONE' };

export type HybridResolveLog = {
  windowWithin24h: boolean;
  channel: 'CUSTOM' | 'META' | 'NONE';
  fallback: boolean;
};

@Injectable()
export class WhatsappTemplateResolverService {
  private readonly log = new Logger(WhatsappTemplateResolverService.name);

  constructor(
    private readonly window: WhatsappConversationWindowService,
    @InjectRepository(TenantWhatsappTemplate)
    private readonly customRepo: Repository<TenantWhatsappTemplate>,
    @InjectRepository(TenantWhatsappMetaTemplate)
    private readonly metaRepo: Repository<TenantWhatsappMetaTemplate>,
    private readonly templateMappings: WhatsappTemplateMappingService,
  ) {}

  private async findApprovedMetaRow(
    tenantId: string,
    templateName: string,
  ): Promise<TenantWhatsappMetaTemplate | null> {
    return this.metaRepo
      .createQueryBuilder('m')
      .where('m.tenant_id = :tenantId', { tenantId })
      .andWhere('m.template_name = :name', { name: templateName })
      .andWhere('m.status = :status', { status: 'APPROVED' })
      .andWhere('(m.category IS NULL OR UPPER(TRIM(m.category)) IN (:...cats))', {
        cats: ['UTILITY', 'AUTHENTICATION'],
      })
      .getOne();
  }

  /**
   * Resolve synced Meta row: tenant DB mapping → platform default name → `template_key` lowercased;
   * first matching APPROVED row wins.
   */
  async resolveMetaTemplate(
    tenantId: string,
    templateKey: WhatsappTemplateKey,
  ): Promise<TenantWhatsappMetaTemplate | null> {
    const candidates: string[] = [];
    const fromTenant = await this.templateMappings.getActiveMappedMetaName(tenantId, templateKey);
    if (fromTenant) candidates.push(fromTenant);
    const platformDefault = metaTemplateNameForKey(templateKey).trim();
    if (!candidates.includes(platformDefault)) candidates.push(platformDefault);
    const lowerGuess = metaTemplateNameLowerKey(templateKey);
    if (!candidates.includes(lowerGuess)) candidates.push(lowerGuess);

    for (const name of candidates) {
      const row = await this.findApprovedMetaRow(tenantId, name);
      if (row) return row;
    }
    return null;
  }

  async getActiveCustomBody(
    tenantId: string,
    templateKey: WhatsappHybridTemplateKey,
    data: Record<string, string>,
  ): Promise<string | null> {
    const custom = await this.customRepo.findOne({
      where: { tenantId, templateKey, isActive: true },
    });
    const raw = custom?.content?.trim();
    if (!raw) return null;
    return renderCustomWhatsappTemplate(raw, data);
  }

  async resolveHybridPlan(params: {
    templateKey: WhatsappHybridTemplateKey;
    tenantId: string;
    customerId: string | null;
    data: Record<string, string>;
  }): Promise<{ plan: HybridSendPlan; log: HybridResolveLog }> {
    const { templateKey, tenantId, customerId, data } = params;
    const windowWithin24h = await this.window.isWithin24h(tenantId, customerId);

    const custom = await this.customRepo.findOne({
      where: { tenantId, templateKey, isActive: true },
    });
    const meta = await this.resolveMetaTemplate(tenantId, templateKey);

    const tryCustomBody = (): string | null => {
      const raw = custom?.content?.trim();
      if (!raw) return null;
      return renderCustomWhatsappTemplate(raw, data);
    };

    if (windowWithin24h) {
      const body = tryCustomBody();
      if (body) {
        return {
          plan: { kind: 'CUSTOM', body },
          log: { windowWithin24h: true, channel: 'CUSTOM', fallback: false },
        };
      }
      if (meta) {
        const bodyTexts = mapDataToMetaBodyTexts(templateKey, data);
        return {
          plan: {
            kind: 'META',
            templateName: meta.templateName,
            languageCode: meta.language,
            bodyTexts,
          },
          log: { windowWithin24h: true, channel: 'META', fallback: true },
        };
      }
      this.log.warn(
        `[WA hybrid] tenant_id=${tenantId} template_key=${templateKey} within_24h=true but no custom or meta row; skip send.`,
      );
      return {
        plan: { kind: 'NONE' },
        log: { windowWithin24h: true, channel: 'NONE', fallback: false },
      };
    }

    if (meta) {
      const bodyTexts = mapDataToMetaBodyTexts(templateKey, data);
      return {
        plan: {
          kind: 'META',
          templateName: meta.templateName,
          languageCode: meta.language,
          bodyTexts,
        },
        log: { windowWithin24h: false, channel: 'META', fallback: false },
      };
    }

    const body = tryCustomBody();
    if (body) {
      this.log.warn(
        `[WA hybrid] tenant_id=${tenantId} template_key=${templateKey} outside_24h=true meta_missing=true → custom fallback`,
      );
      return {
        plan: { kind: 'CUSTOM', body },
        log: { windowWithin24h: false, channel: 'CUSTOM', fallback: true },
      };
    }

    this.log.warn(
      `[WA hybrid] tenant_id=${tenantId} template_key=${templateKey} no meta and no custom; skip send.`,
    );
    return {
      plan: { kind: 'NONE' },
      log: { windowWithin24h: false, channel: 'NONE', fallback: false },
    };
  }
}
