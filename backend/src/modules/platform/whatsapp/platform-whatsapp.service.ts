import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { PlatformWhatsappMetaTemplate } from '../../../common/entities/platform-whatsapp-meta-template.entity';
import { PlatformWhatsappNumber } from '../../../common/entities/platform-whatsapp-number.entity';
import { Tenant } from '../../../common/entities/tenant.entity';
import { TenantWhatsappMetaTemplate } from '../../whatsapp/entities/tenant-whatsapp-meta-template.entity';
import { WhatsappMetaTemplateSyncService } from '../../whatsapp/services/whatsapp-meta-template-sync.service';
import { WhatsappTemplateMappingService } from '../../whatsapp/services/whatsapp-template-mapping.service';
import type { ListGlobalMetaTemplatesQueryDto } from './dto/list-global-meta-templates-query.dto';
import type { PutWhatsappTemplateMappingsDto } from './dto/put-whatsapp-template-mappings.dto';
import type { UpdateWhatsappConfigDto } from './dto/update-whatsapp-config.dto';
import { PlatformWhatsappMetaTemplateSyncService } from './platform-whatsapp-meta-template-sync.service';

@Injectable()
export class PlatformWhatsappService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(PlatformWhatsappNumber)
    private readonly waRepo: Repository<PlatformWhatsappNumber>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantWhatsappMetaTemplate)
    private readonly metaRepo: Repository<TenantWhatsappMetaTemplate>,
    @InjectRepository(PlatformWhatsappMetaTemplate)
    private readonly globalMetaRepo: Repository<PlatformWhatsappMetaTemplate>,
    private readonly templateMappings: WhatsappTemplateMappingService,
    private readonly metaSync: WhatsappMetaTemplateSyncService,
    private readonly globalMetaSync: PlatformWhatsappMetaTemplateSyncService,
  ) {}

  private async ensureTenant(tenantId: string): Promise<void> {
    const ok = await this.tenantRepo.exist({ where: { id: tenantId } });
    if (!ok) throw new NotFoundException('Tenant not found.');
  }

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

  private async testGraphPhoneToken(phoneNumberId: string, token: string): Promise<boolean> {
    const v = this.config.get<string>('whatsapp.apiVersion', 'v19.0');
    const url = `https://graph.facebook.com/${v}/${encodeURIComponent(phoneNumberId)}?fields=id`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  }

  async getConfig(tenantId: string) {
    await this.ensureTenant(tenantId);
    const row =
      (await this.waRepo.findOne({
        where: { tenantId, isActive: true },
        order: { createdAt: 'DESC' },
      })) ??
      (await this.waRepo.findOne({
        where: { tenantId },
        order: { createdAt: 'DESC' },
      }));

    if (!row) {
      return {
        success: true as const,
        data: {
          tenant_id: tenantId,
          phone_number_id: null,
          waba_id: null,
          use_own_token: false,
          is_active: false,
          access_token_configured: false,
          graph_api_token_configured: false,
          webhook_verified: false,
          last_meta_sync_at: null,
          last_meta_sync_error: null,
          last_message_sent_at: null,
        },
      };
    }

    const tok = row.accessToken?.trim() ?? '';
    const graph_api_token_configured = this.resolveLineToken(row) != null;
    return {
      success: true as const,
      data: {
        tenant_id: tenantId,
        phone_number_id: row.phoneNumberId,
        waba_id: row.whatsappBusinessAccountId,
        use_own_token: row.useOwnToken === true,
        is_active: row.isActive === true,
        access_token_configured: tok.length > 0,
        graph_api_token_configured,
        webhook_verified: row.webhookVerified === true,
        last_meta_sync_at: row.lastMetaSyncAt,
        last_meta_sync_error: row.lastMetaSyncError,
        last_message_sent_at: row.lastMessageSentAt,
      },
    };
  }

  async updateConfig(tenantId: string, dto: UpdateWhatsappConfigDto) {
    await this.ensureTenant(tenantId);
    const phone = dto.phoneNumberId.trim();
    if (!phone) throw new BadRequestException('phone_number_id is required.');

    const byPhone = await this.waRepo.findOne({ where: { phoneNumberId: phone } });
    if (byPhone && byPhone.tenantId !== tenantId) {
      throw new ConflictException('This phone number id is already mapped to another tenant.');
    }

    const useOwn =
      dto.useOwnToken !== undefined ? dto.useOwnToken === true : (byPhone?.useOwnToken ?? false) === true;

    const isActive =
      dto.isActive !== undefined ? dto.isActive === true : (byPhone?.isActive ?? true) === true;

    const incomingToken = dto.accessToken?.trim() ?? '';
    const incomingVerify = dto.webhookVerifyToken?.trim() ?? '';
    const incomingSecret = dto.appSecret?.trim() ?? '';
    const incomingWaba = dto.whatsappBusinessAccountId?.trim() ?? '';

    const existingToken = byPhone?.accessToken?.trim() ?? '';
    const effectiveToken = incomingToken || existingToken;

    if (useOwn) {
      if (!effectiveToken) {
        throw new BadRequestException('access_token is required when use_own_token is true.');
      }
      const verify = incomingVerify || byPhone?.webhookVerifyToken?.trim() || '';
      const secret = incomingSecret || byPhone?.appSecret?.trim() || '';
      if (!verify) {
        throw new BadRequestException('webhook_verify_token is required when use_own_token is true (set or already stored).');
      }
      if (!secret) {
        throw new BadRequestException('app_secret is required when use_own_token is true (set or already stored).');
      }
    }

    if (isActive) {
      await this.waRepo.update(
        { tenantId, phoneNumberId: Not(phone) },
        { isActive: false },
      );
    }

    if (byPhone) {
      byPhone.tenantId = tenantId;
      byPhone.isActive = isActive;
      byPhone.useOwnToken = useOwn;
      if (dto.whatsappBusinessAccountId !== undefined) {
        byPhone.whatsappBusinessAccountId = incomingWaba || null;
      }
      if (useOwn) {
        if (incomingToken) byPhone.accessToken = incomingToken;
        if (incomingVerify) byPhone.webhookVerifyToken = incomingVerify;
        if (incomingSecret) byPhone.appSecret = incomingSecret;
      } else {
        byPhone.accessToken = null;
        byPhone.webhookVerifyToken = null;
        byPhone.appSecret = null;
      }
      await this.waRepo.save(byPhone);
    } else {
      const row = this.waRepo.create({
        phoneNumberId: phone,
        tenantId,
        isActive: isActive,
        useOwnToken: useOwn,
        whatsappBusinessAccountId: incomingWaba || null,
        accessToken: useOwn ? effectiveToken : null,
        webhookVerifyToken: useOwn ? incomingVerify || null : null,
        appSecret: useOwn ? incomingSecret || null : null,
        webhookVerified: false,
      });
      if (useOwn && (!row.webhookVerifyToken?.trim() || !row.appSecret?.trim())) {
        throw new BadRequestException('webhook_verify_token and app_secret are required for new lines with use_own_token.');
      }
      await this.waRepo.save(row);
    }

    if (dto.validateTokenOnSave === true) {
      const line = await this.waRepo.findOne({ where: { phoneNumberId: phone } });
      if (!line) throw new BadRequestException('Line not found after save.');
      const token = this.resolveLineToken(line);
      if (!token) throw new BadRequestException('No token available to validate.');
      const ok = await this.testGraphPhoneToken(phone, token);
      if (!ok) {
        throw new BadRequestException('Meta token validation failed (Graph GET phone_number_id).');
      }
    }

    return this.getConfig(tenantId);
  }

  async testConnection(tenantId: string) {
    await this.ensureTenant(tenantId);
    const line = await this.waRepo.findOne({
      where: { tenantId, isActive: true },
      order: { createdAt: 'ASC' },
    });
    if (!line) throw new BadRequestException('No active WhatsApp line for this tenant.');
    const token = this.resolveLineToken(line);
    if (!token) throw new BadRequestException('No Graph token available for this line.');
    const ok = await this.testGraphPhoneToken(line.phoneNumberId, token);
    return { success: true as const, data: { ok } };
  }

  async listMetaTemplates(tenantId: string) {
    await this.ensureTenant(tenantId);
    const rows = await this.metaSync.listForTenant(tenantId);
    return {
      success: true as const,
      data: rows.map((r) => ({
        template_name: r.templateName,
        category: r.category,
        status: r.status,
        language: r.language,
        last_synced_at: r.lastSyncedAt,
      })),
    };
  }

  async syncMetaTemplates(tenantId: string): Promise<{ synced: number; waba_id: string }> {
    await this.ensureTenant(tenantId);
    const line = await this.waRepo.findOne({
      where: { tenantId, isActive: true },
      order: { createdAt: 'ASC' },
    });
    try {
      const r = await this.metaSync.syncTemplates(tenantId);
      if (line) {
        await this.waRepo.update(
          { phoneNumberId: line.phoneNumberId },
          { lastMetaSyncAt: new Date(), lastMetaSyncError: null },
        );
      }
      return r;
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 4000);
      if (line) {
        await this.waRepo.update({ phoneNumberId: line.phoneNumberId }, { lastMetaSyncError: msg });
      }
      throw e;
    }
  }

  async syncAllMetaTemplates(): Promise<{
    results: Array<{ tenant_id: string; synced?: number; waba_id?: string; error?: string }>;
  }> {
    const rows = await this.waRepo.find({ where: { isActive: true } });
    const tenantIds = [
      ...new Set(
        rows
          .filter((r) => !!this.resolveLineToken(r) && !!r.phoneNumberId?.trim())
          .map((r) => r.tenantId),
      ),
    ];
    const results: Array<{ tenant_id: string; synced?: number; waba_id?: string; error?: string }> = [];
    for (const tid of tenantIds) {
      try {
        const { synced, waba_id } = await this.syncMetaTemplates(tid);
        results.push({ tenant_id: tid, synced, waba_id });
      } catch (e) {
        results.push({
          tenant_id: tid,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return { results };
  }

  async checkHealthTenant(tenantId: string) {
    await this.ensureTenant(tenantId);
    const line = await this.waRepo.findOne({
      where: { tenantId, isActive: true },
      order: { createdAt: 'ASC' },
    });
    let token_valid = false;
    if (line) {
      const token = this.resolveLineToken(line);
      if (token) {
        token_valid = await this.testGraphPhoneToken(line.phoneNumberId, token);
      }
    }
    const templates_count = await this.metaRepo.count({ where: { tenantId } });
    const rawMax = await this.metaRepo
      .createQueryBuilder('m')
      .select('MAX(m.last_synced_at)', 'mx')
      .where('m.tenant_id = :tenantId', { tenantId })
      .getRawOne<{ mx: Date | null }>();
    const templateMax = rawMax?.mx ?? null;
    const lineSync = line?.lastMetaSyncAt ?? null;
    let last_sync: Date | null = null;
    if (templateMax && lineSync) {
      last_sync = templateMax > lineSync ? templateMax : lineSync;
    } else {
      last_sync = templateMax ?? lineSync;
    }
    const webhook_status = line?.webhookVerified === true ? 'OK' : 'UNVERIFIED';

    return {
      success: true as const,
      data: {
        token_valid,
        templates_count,
        last_sync,
        webhook_status,
      },
    };
  }

  async checkHealthSummary() {
    const activeRows = await this.waRepo.find({ where: { isActive: true } });
    const active_whatsapp_tenants = new Set(activeRows.map((r) => r.tenantId)).size;

    const lines_with_sync_errors = await this.waRepo
      .createQueryBuilder('w')
      .where('w.last_meta_sync_error IS NOT NULL')
      .andWhere("TRIM(w.last_meta_sync_error) <> ''")
      .getCount();
    const total_meta_template_rows = await this.metaRepo.count();
    const unverified_webhooks = await this.waRepo.count({
      where: { isActive: true, webhookVerified: false },
    });

    return {
      success: true as const,
      data: {
        active_whatsapp_tenants,
        lines_with_sync_errors,
        total_meta_template_rows,
        unverified_webhooks,
      },
    };
  }

  async listOverview(limit = 200) {
    const tenants = await this.tenantRepo.find({
      order: { name: 'ASC' },
      take: Math.min(Math.max(limit, 1), 500),
    });
    const activeWa = await this.waRepo.find({ where: { isActive: true } });
    const waByTenant = new Map(activeWa.map((w) => [w.tenantId, w]));
    const counts = await this.metaRepo
      .createQueryBuilder('m')
      .select('m.tenant_id', 'tenantId')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('m.tenant_id')
      .getRawMany<{ tenantId: string; cnt: string }>();
    const countMap = new Map(counts.map((c) => [c.tenantId, parseInt(c.cnt, 10)]));

    return {
      success: true as const,
      data: tenants.map((t) => {
        const w = waByTenant.get(t.id);
        return {
          tenant_id: t.id,
          tenant_name: t.name,
          tenant_slug: t.slug,
          wa_active: w?.isActive === true,
          phone_number_id: w?.phoneNumberId ?? null,
          waba_id: w?.whatsappBusinessAccountId ?? null,
          graph_api_token_configured: w ? this.resolveLineToken(w) != null : false,
          templates_count: countMap.get(t.id) ?? 0,
          last_meta_sync_error: w?.lastMetaSyncError ?? null,
          webhook_verified: w?.webhookVerified === true,
        };
      }),
    };
  }

  async listTemplateMappings(tenantId: string) {
    await this.ensureTenant(tenantId);
    const items = await this.templateMappings.listMergedSnake(tenantId);
    return {
      success: true as const,
      data: { items },
    };
  }

  async replaceTemplateMappings(tenantId: string, dto: PutWhatsappTemplateMappingsDto) {
    await this.ensureTenant(tenantId);
    const keys = dto.items.map((i) => i.templateKey);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Duplicate template_key in payload.');
    }
    await this.templateMappings.replaceAllFromPlatform(
      tenantId,
      dto.items.map((i) => ({
        templateKey: i.templateKey,
        metaTemplateName: i.metaTemplateName.trim(),
        isActive: i.isActive,
      })),
    );
    return this.listTemplateMappings(tenantId);
  }

  /** Central template library (WABA-scoped rows; optional filters). */
  async listGlobalMetaTemplates(q: ListGlobalMetaTemplatesQueryDto) {
    const qb = this.globalMetaRepo
      .createQueryBuilder('g')
      .orderBy('g.waba_id', 'ASC')
      .addOrderBy('g.template_name', 'ASC')
      .addOrderBy('g.language', 'ASC');
    const waba = q.waba_id?.trim();
    if (waba) qb.andWhere('g.waba_id = :waba', { waba });
    const cat = q.category?.trim();
    if (cat) qb.andWhere('UPPER(TRIM(g.category)) = UPPER(TRIM(:cat))', { cat });
    const st = q.status?.trim();
    if (st) qb.andWhere('UPPER(TRIM(g.status)) = UPPER(TRIM(:st))', { st });
    const rows = await qb.getMany();
    return {
      success: true as const,
      data: {
        items: rows.map((r) => ({
          waba_id: r.wabaId,
          template_name: r.templateName,
          category: r.category,
          status: r.status,
          language: r.language,
          last_synced_at: r.lastSyncedAt,
          source_tenant_id: r.sourceTenantId,
        })),
      },
    };
  }

  async syncGlobalMetaTemplatesAll() {
    const data = await this.globalMetaSync.syncAllIntoGlobal();
    return { success: true as const, data };
  }

  async syncGlobalMetaTemplatesTenant(tenantId: string) {
    await this.ensureTenant(tenantId);
    const data = await this.globalMetaSync.syncTenantIntoGlobal(tenantId);
    return { success: true as const, data };
  }
}
