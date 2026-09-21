import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformWhatsappNumber } from '../../../common/entities/platform-whatsapp-number.entity';
import { TenantWhatsappMetaTemplate } from '../entities/tenant-whatsapp-meta-template.entity';
import {
  resolveWabaIdFromPhoneNumberId,
  type ResolveWabaFromPhoneResult,
} from '../utils/resolve-waba-from-phone-number-id';

type MetaTemplatesListResponse = {
  data?: Array<{
    name?: string;
    status?: string;
    category?: string;
    language?: string;
    components?: unknown[];
  }>;
  paging?: { next?: string | null };
  error?: { message?: string };
};

@Injectable()
export class WhatsappMetaTemplateSyncService {
  private readonly log = new Logger(WhatsappMetaTemplateSyncService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(PlatformWhatsappNumber)
    private readonly lineRepo: Repository<PlatformWhatsappNumber>,
    @InjectRepository(TenantWhatsappMetaTemplate)
    private readonly metaRepo: Repository<TenantWhatsappMetaTemplate>,
  ) {}

  private getSharedToken(): string {
    return (this.config.get<string>('whatsapp.sharedAccessToken', '') ?? '').trim();
  }

  private resolveLineToken(line: PlatformWhatsappNumber): string | null {
    const own = line.useOwnToken === true;
    if (own) {
      const t = line.accessToken?.trim() ?? '';
      return t || null;
    }
    const t = this.getSharedToken();
    return t || null;
  }

  async listForTenant(tenantId: string): Promise<TenantWhatsappMetaTemplate[]> {
    return this.metaRepo.find({
      where: { tenantId },
      order: { templateName: 'ASC' },
    });
  }

  /**
   * All template categories from Meta; upsert by `tenant_id` + `template_name` (per-language row).
   * WABA is read from the line or resolved via Graph `phone_number_id → whatsapp_business_account` when missing.
   */
  async syncTemplates(tenantId: string): Promise<{ synced: number; waba_id: string }> {
    const line = await this.lineRepo.findOne({
      where: { tenantId, isActive: true },
      order: { createdAt: 'ASC' },
    });
    if (!line) {
      throw new BadRequestException('No active WhatsApp line for this tenant.');
    }
    const token = this.resolveLineToken(line);
    if (!token) {
      throw new BadRequestException(
        'No Graph API token available for this line (set access token when use_own_token is true, or configure WHATSAPP_SHARED_TOKEN).',
      );
    }

    let waba = line.whatsappBusinessAccountId?.trim() ?? '';
    let wabaResolveAttempt: ResolveWabaFromPhoneResult | null = null;
    if (!waba) {
      const resolved = await resolveWabaIdFromPhoneNumberId(this.config, line.phoneNumberId, token);
      wabaResolveAttempt = resolved;
      if (resolved.wabaId) {
        waba = resolved.wabaId;
        await this.lineRepo.update(
          { phoneNumberId: line.phoneNumberId },
          { whatsappBusinessAccountId: waba },
        );
      } else if (resolved.graphMessage) {
        this.log.warn(
          `WABA resolve failed tenant_id=${tenantId} phone=${line.phoneNumberId} status=${resolved.graphStatus}: ${resolved.graphMessage}`,
        );
      }
    }
    if (!waba) {
      const r = wabaResolveAttempt;
      const detail = r?.graphMessage
        ? `Meta phone-number lookup (${r.graphStatus}): ${r.graphMessage}`
        : 'Set WABA in Platform → WhatsApp config, or use a valid Graph token with permission to read the phone number.';
      throw new BadRequestException(
        `WhatsApp Business Account id is missing and could not be resolved from the phone number id. ${detail}`,
      );
    }

    const v = this.config.get<string>('whatsapp.apiVersion', 'v19.0');
    const syncedAt = new Date();
    let synced = 0;
    let nextUrl: string | null =
      `https://graph.facebook.com/${v}/${encodeURIComponent(waba)}/message_templates?fields=name,status,category,language,components&limit=100`;

    while (nextUrl) {
      const res = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json()) as MetaTemplatesListResponse;
      if (!res.ok) {
        const msg = body?.error?.message ?? (await res.text().catch(() => ''));
        this.log.warn(`Meta message_templates ${res.status}: ${msg}`);
        throw new BadRequestException(
          typeof msg === 'string' && msg.trim() ? msg : `Meta API returned ${res.status}.`,
        );
      }

      for (const t of body.data ?? []) {
        const name = (t.name ?? '').trim().slice(0, 128);
        if (!name) continue;

        const catRaw = t.category != null ? String(t.category).trim() : '';
        const cat = catRaw ? catRaw.slice(0, 64).toUpperCase() : null;

        const langRaw = (t.language ?? 'en').trim();
        const language = langRaw.slice(0, 16) || 'en';
        const status = (t.status ?? 'PENDING').toUpperCase().trim() || 'PENDING';
        const components = Array.isArray(t.components) ? t.components : [];

        const existing = await this.metaRepo.findOne({
          where: { tenantId, templateName: name },
        });

        const row =
          existing ??
          this.metaRepo.create({
            tenantId,
            templateName: name,
          });

        row.category = cat;
        row.status = status;
        row.language = language;
        row.componentsJson = components;
        row.lastSyncedAt = syncedAt;

        await this.metaRepo.save(row);
        synced += 1;
      }

      nextUrl = body.paging?.next?.trim() ? body.paging.next : null;
    }

    this.log.log(`syncTemplates tenant_id=${tenantId} waba_id=${waba} rows=${synced}`);
    if (synced === 0) {
      this.log.warn(
        `syncTemplates tenant_id=${tenantId} waba_id=${waba}: Meta returned zero message_templates rows (empty WABA library or token cannot list templates).`,
      );
    }
    return { synced, waba_id: waba };
  }
}
