import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformWhatsappMetaTemplate } from '../../../common/entities/platform-whatsapp-meta-template.entity';
import { PlatformWhatsappNumber } from '../../../common/entities/platform-whatsapp-number.entity';
import {
  resolveWabaIdFromPhoneNumberId,
  type ResolveWabaFromPhoneResult,
} from '../../whatsapp/utils/resolve-waba-from-phone-number-id';

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

export type GlobalMetaSyncWabaResult = {
  waba_id: string;
  synced: number;
  source_tenant_id?: string;
  error?: string;
};

@Injectable()
export class PlatformWhatsappMetaTemplateSyncService {
  private readonly log = new Logger(PlatformWhatsappMetaTemplateSyncService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(PlatformWhatsappNumber)
    private readonly lineRepo: Repository<PlatformWhatsappNumber>,
    @InjectRepository(PlatformWhatsappMetaTemplate)
    private readonly globalRepo: Repository<PlatformWhatsappMetaTemplate>,
  ) {}

  private getSharedToken(): string {
    return (this.config.get<string>('whatsapp.sharedAccessToken', '') ?? '').trim();
  }

  private resolveLineToken(line: PlatformWhatsappNumber): string | null {
    if (line.useOwnToken === true) {
      const t = line.accessToken?.trim() ?? '';
      return t || null;
    }
    const t = this.getSharedToken();
    return t || null;
  }

  /**
   * Fetch all message templates from Meta for one WABA (all categories & statuses), paginated.
   */
  async syncWabaIntoGlobal(
    wabaId: string,
    token: string,
    sourceTenantId: string | null,
  ): Promise<number> {
    const waba = wabaId.trim();
    if (!waba) return 0;

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
        this.log.warn(`Meta message_templates waba=${waba} status=${res.status}: ${msg}`);
        throw new BadRequestException(
          typeof msg === 'string' && msg.trim() ? msg : `Meta API returned ${res.status}.`,
        );
      }

      for (const t of body.data ?? []) {
        const name = (t.name ?? '').trim().slice(0, 128);
        if (!name) continue;

        const catRaw = t.category != null ? String(t.category).trim() : '';
        const category = catRaw ? catRaw.slice(0, 64) : null;

        const langRaw = (t.language ?? 'en').trim();
        const language = langRaw.slice(0, 16) || 'en';

        const status = (t.status ?? 'PENDING').toUpperCase().trim() || 'PENDING';
        const components = Array.isArray(t.components) ? t.components : [];

        let row = await this.globalRepo.findOne({
          where: { wabaId: waba, templateName: name, language },
        });
        if (!row) {
          row = this.globalRepo.create({
            wabaId: waba,
            templateName: name,
            language,
          });
        }

        row.category = category;
        row.status = status;
        row.componentsJson = components;
        row.sourceTenantId = sourceTenantId;
        row.lastSyncedAt = syncedAt;

        await this.globalRepo.save(row);
        synced += 1;
      }

      nextUrl = body.paging?.next?.trim() ? body.paging.next : null;
    }

    this.log.log(`syncWabaIntoGlobal waba_id=${waba} rows=${synced}`);
    return synced;
  }

  /** One sync per distinct WABA (deduped); uses first resolvable token per WABA. */
  async syncAllIntoGlobal(): Promise<{ total_synced: number; results: GlobalMetaSyncWabaResult[] }> {
    const lines = await this.lineRepo.find({ order: { createdAt: 'ASC' } });
    const byWaba = new Map<string, { token: string; sourceTenantId: string }>();

    for (const line of lines) {
      if (!line.phoneNumberId?.trim()) continue;
      const token = this.resolveLineToken(line);
      if (!token) continue;

      let waba = line.whatsappBusinessAccountId?.trim() ?? '';
      if (!waba) {
        const resolved = await resolveWabaIdFromPhoneNumberId(this.config, line.phoneNumberId, token);
        if (resolved.wabaId) {
          waba = resolved.wabaId;
          await this.lineRepo.update(
            { phoneNumberId: line.phoneNumberId },
            { whatsappBusinessAccountId: waba },
          );
        } else if (resolved.graphMessage) {
          this.log.warn(
            `syncAllIntoGlobal skip line tenant=${line.tenantId} phone=${line.phoneNumberId} status=${resolved.graphStatus}: ${resolved.graphMessage}`,
          );
        }
      }
      if (!waba) continue;

      if (!byWaba.has(waba)) {
        byWaba.set(waba, { token, sourceTenantId: line.tenantId });
      }
    }

    let total_synced = 0;
    const results: GlobalMetaSyncWabaResult[] = [];

    for (const [waba_id, ctx] of byWaba) {
      try {
        const synced = await this.syncWabaIntoGlobal(waba_id, ctx.token, ctx.sourceTenantId);
        total_synced += synced;
        results.push({ waba_id, synced, source_tenant_id: ctx.sourceTenantId });
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        results.push({ waba_id, synced: 0, source_tenant_id: ctx.sourceTenantId, error: err });
      }
    }

    return { total_synced, results };
  }

  async syncTenantIntoGlobal(tenantId: string): Promise<{ waba_id: string; synced: number }> {
    const line = await this.lineRepo.findOne({
      where: { tenantId, isActive: true },
      order: { createdAt: 'ASC' },
    });
    if (!line) {
      throw new NotFoundException('No active WhatsApp line for this tenant.');
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
          `syncTenantIntoGlobal WABA resolve failed tenant=${tenantId} phone=${line.phoneNumberId} status=${resolved.graphStatus}: ${resolved.graphMessage}`,
        );
      }
    }
    if (!waba) {
      const r = wabaResolveAttempt;
      const detail = r?.graphMessage
        ? `Meta phone-number lookup (${r.graphStatus}): ${r.graphMessage}`
        : 'Set WABA in Platform → WhatsApp or fix the Graph token.';
      throw new BadRequestException(
        `WhatsApp Business Account id is not set and could not be resolved from the phone number id. ${detail}`,
      );
    }
    const synced = await this.syncWabaIntoGlobal(waba, token, tenantId);
    return { waba_id: waba, synced };
  }
}
