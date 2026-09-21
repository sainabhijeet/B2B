import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformWhatsappNumber } from '../../../common/entities/platform-whatsapp-number.entity';
import type { WhatsappTemplateKey } from '../mappings/whatsapp-template-mapping';
import { mapToMetaParams } from '../mappings/whatsapp-template-mapping';
import type { WhatsappHybridTemplateKey } from '../whatsapp-hybrid-template-key';
import type { HybridResolveLog } from './whatsapp-template-resolver.service';
import { WhatsappTemplateResolverService } from './whatsapp-template-resolver.service';

type ResolvedSend = {
  token: string;
  phoneNumberId: string;
  useOwnToken: boolean;
};

/**
 * Meta WhatsApp Cloud API outbound.
 * `phone_number_id` always comes from the active `platform_whatsapp_numbers` row.
 * Bearer token: `use_own_token=false` → `.env` only (`WHATSAPP_SHARED_TOKEN` / legacy `WHATSAPP_CLOUD_ACCESS_TOKEN`);
 * `use_own_token=true` → that row’s `access_token` only (no env fallback).
 */
@Injectable()
export class WhatsappSenderService {
  private readonly log = new Logger(WhatsappSenderService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(PlatformWhatsappNumber)
    private readonly waNumberRepo: Repository<PlatformWhatsappNumber>,
    private readonly templateResolver: WhatsappTemplateResolverService,
  ) {}

  private getSharedToken(): string {
    return (this.config.get<string>('whatsapp.sharedAccessToken', '') ?? '').trim();
  }

  /**
   * @param phoneNumberIdHint Same line as inbound webhook when available — keeps token and phone id paired for multi-line tenants.
   */
  private async resolveSend(
    tenantId: string,
    phoneNumberIdHint?: string,
  ): Promise<ResolvedSend | null> {
    const hint = phoneNumberIdHint?.trim();
    let row: PlatformWhatsappNumber | null = null;

    if (hint) {
      row = await this.waNumberRepo.findOne({
        where: { tenantId, phoneNumberId: hint, isActive: true },
      });
      if (!row) {
        this.log.warn(
          `No active platform_whatsapp_numbers row for tenant_id=${tenantId} phone_number_id=${hint}; skip send (no fallback to another line).`,
        );
        return null;
      }
    } else {
      row = await this.waNumberRepo.findOne({
        where: { tenantId, isActive: true },
        order: { createdAt: 'ASC' },
      });
    }

    if (!row) {
      this.log.warn(`No active WhatsApp line for tenant_id=${tenantId}; skip send.`);
      return null;
    }

    const own = row.useOwnToken === true;
    let token: string;
    if (own) {
      token = row.accessToken?.trim() ?? '';
      if (!token) {
        this.log.warn(
          `use_own_token=true but access_token is empty for tenant_id=${tenantId} phone_number_id=${row.phoneNumberId}; skip send (DB only, no .env fallback).`,
        );
        return null;
      }
    } else {
      token = this.getSharedToken();
      if (!token) {
        this.log.warn(
          `use_own_token=false but WHATSAPP_SHARED_TOKEN / WHATSAPP_CLOUD_ACCESS_TOKEN is empty; skip send.`,
        );
        return null;
      }
    }

    const phoneNumberId = row.phoneNumberId;

    if (this.config.get<boolean>('whatsapp.debugSendLog', false)) {
      this.log.log(
        `[WA send debug] tenant_id=${tenantId} phone_number_id=${phoneNumberId} use_own_token=${own}`,
      );
    }

    return { token, phoneNumberId, useOwnToken: own };
  }

  private async graphPost(
    tenantId: string,
    phoneNumberId: string,
    token: string,
    useOwnToken: boolean,
    body: Record<string, unknown>,
    opts?: { skipLastMessageTouch?: boolean },
  ): Promise<void> {
    const v = this.config.get<string>('whatsapp.apiVersion', 'v19.0');
    const url = `https://graph.facebook.com/${v}/${encodeURIComponent(phoneNumberId)}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      this.log.error(
        `WhatsApp Graph API 401 (invalid or expired token) tenant_id=${tenantId} phone_number_id=${phoneNumberId} use_own_token=${useOwnToken}`,
      );
    }

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`WhatsApp Graph API ${res.status}: ${t}`);
    }

    if (!opts?.skipLastMessageTouch) {
      await this.waNumberRepo.update(
        { tenantId, phoneNumberId },
        { lastMessageSentAt: new Date() },
      );
    }
  }

  async sendText(
    tenantId: string,
    to: string,
    message: string,
    phoneNumberIdHint?: string,
  ): Promise<void> {
    const r = await this.resolveSend(tenantId, phoneNumberIdHint);
    if (!r) return;

    await this.graphPost(tenantId, r.phoneNumberId, r.token, r.useOwnToken, {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { preview_url: true, body: message },
    });
  }

  /**
   * Meta Cloud API `type: template` (HSM). `bodyParameterTexts` map to template body {{1}}, {{2}}, … in order.
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#template-messages
   */
  async sendTemplate(
    tenantId: string,
    to: string,
    templateName: string,
    languageCode: string,
    bodyParameterTexts: string[],
    phoneNumberIdHint?: string,
  ): Promise<void> {
    const r = await this.resolveSend(tenantId, phoneNumberIdHint);
    if (!r) return;

    const components =
      bodyParameterTexts.length > 0
        ? [
            {
              type: 'body',
              parameters: bodyParameterTexts.map((text) => ({
                type: 'text',
                text: String(text).slice(0, 1024),
              })),
            },
          ]
        : undefined;

    const templatePayload: Record<string, unknown> = {
      name: templateName,
      language: { code: languageCode },
      ...(components ? { components } : {}),
    };

    await this.graphPost(tenantId, r.phoneNumberId, r.token, r.useOwnToken, {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: templatePayload,
    });
  }

  /**
   * Meta template send using `TEMPLATE_KEY_TO_META` + DB sync row; if no approved Meta row, falls back to tenant custom text.
   * On Graph API error: logs tenant_id / template_name / error, then tries custom text before rethrowing if no custom.
   */
  async sendTemplateMessage(
    tenantId: string,
    to: string,
    templateKey: WhatsappTemplateKey,
    data: Record<string, string>,
    phoneNumberIdHint?: string,
  ): Promise<{ sent: boolean }> {
    const r = await this.resolveSend(tenantId, phoneNumberIdHint);
    if (!r) return { sent: false };

    const meta = await this.templateResolver.resolveMetaTemplate(tenantId, templateKey);
    if (!meta) {
      const body = await this.templateResolver.getActiveCustomBody(tenantId, templateKey, data);
      if (!body) {
        this.log.warn(
          `sendTemplateMessage: no Meta template and no custom body tenant_id=${tenantId} template_key=${templateKey}`,
        );
        return { sent: false };
      }
      await this.sendText(tenantId, to, body, phoneNumberIdHint);
      return { sent: true };
    }

    const parameters = mapToMetaParams(templateKey, data);
    const components =
      parameters.length > 0
        ? [
            {
              type: 'body',
              parameters: parameters.map((p) => ({
                type: 'text',
                text: String(p.text).slice(0, 1024),
              })),
            },
          ]
        : undefined;

    const templatePayload: Record<string, unknown> = {
      name: meta.templateName,
      language: { code: meta.language },
      ...(components ? { components } : {}),
    };

    try {
      await this.graphPost(tenantId, r.phoneNumberId, r.token, r.useOwnToken, {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: templatePayload,
      });
      return { sent: true };
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      this.log.error(
        `sendTemplateMessage Meta API error tenant_id=${tenantId} template_name=${meta.templateName} template_key=${templateKey}: ${err}`,
      );
      const body = await this.templateResolver.getActiveCustomBody(tenantId, templateKey, data);
      if (body) {
        await this.sendText(tenantId, to, body, phoneNumberIdHint);
        return { sent: true };
      }
      throw e;
    }
  }

  /**
   * Hybrid routing: active session → custom text; otherwise → Meta template; Meta missing → custom;
   * Meta send error → custom if configured.
   */
  async sendHybridForTemplateKey(params: {
    templateKey: WhatsappHybridTemplateKey;
    tenantId: string;
    customerId: string | null;
    to: string;
    data: Record<string, string>;
    phoneNumberIdHint?: string;
  }): Promise<{ sent: boolean; log: HybridResolveLog }> {
    const { plan, log } = await this.templateResolver.resolveHybridPlan({
      templateKey: params.templateKey,
      tenantId: params.tenantId,
      customerId: params.customerId,
      data: params.data,
    });

    if (plan.kind === 'NONE') {
      this.log.warn(
        `[WA sendHybrid] skip template_key=${params.templateKey} tenant_id=${params.tenantId} windowWithin24h=${log.windowWithin24h} channel=${log.channel} fallback=${log.fallback}`,
      );
      return { sent: false, log };
    }

    if (plan.kind === 'CUSTOM') {
      this.log.log(
        `[WA sendHybrid] template_key=${params.templateKey} tenant_id=${params.tenantId} channel=CUSTOM windowWithin24h=${log.windowWithin24h} fallback=${log.fallback}`,
      );
      await this.sendText(params.tenantId, params.to, plan.body, params.phoneNumberIdHint);
      return { sent: true, log };
    }

    this.log.log(
      `[WA sendHybrid] template_key=${params.templateKey} tenant_id=${params.tenantId} channel=META name=${plan.templateName} lang=${plan.languageCode} windowWithin24h=${log.windowWithin24h} fallback=${log.fallback}`,
    );
    try {
      await this.sendTemplate(
        params.tenantId,
        params.to,
        plan.templateName,
        plan.languageCode,
        plan.bodyTexts,
        params.phoneNumberIdHint,
      );
      return { sent: true, log };
    } catch (e) {
      this.log.warn(
        `[WA sendHybrid] Meta template send failed → custom fallback attempt: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      const body = await this.templateResolver.getActiveCustomBody(
        params.tenantId,
        params.templateKey,
        params.data,
      );
      if (body) {
        await this.sendText(params.tenantId, params.to, body, params.phoneNumberIdHint);
        return {
          sent: true,
          log: {
            windowWithin24h: log.windowWithin24h,
            channel: 'CUSTOM',
            fallback: true,
          },
        };
      }
      throw e;
    }
  }

  /**
   * Interactive reply buttons (max 3 per Meta).
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#interactive-messages
   */
  async sendButtons(
    tenantId: string,
    to: string,
    text: string,
    buttons: Array<{ id: string; title: string }>,
    phoneNumberIdHint?: string,
  ): Promise<void> {
    const r = await this.resolveSend(tenantId, phoneNumberIdHint);
    if (!r) return;

    const trimmed = buttons.slice(0, 3).map((b) => ({
      id: b.id.slice(0, 256),
      title: b.title.slice(0, 20),
    }));
    if (trimmed.length === 0) {
      this.log.warn('sendButtons: no buttons; skipping.');
      return;
    }

    await this.graphPost(tenantId, r.phoneNumberId, r.token, r.useOwnToken, {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: text.slice(0, 1024) },
        action: {
          buttons: trimmed.map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    });
  }
}
