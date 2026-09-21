import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  type RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { PlatformWhatsappNumber } from '../../../common/entities/platform-whatsapp-number.entity';
import type { WaWebhookPayload } from '../whatsapp-webhook.types';

function metaAppSignatureOk(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader?.trim() || !appSecret) return false;
  const expectedHex = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  /** Meta may send multiple space/comma-separated signatures; digest hex may be upper-case. */
  const segments = signatureHeader
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const segment of segments) {
    const m = segment.match(/^sha256\s*=\s*(.+)$/i);
    if (!m) continue;
    const recvHex = m[1].replace(/\s+/g, '').toLowerCase();
    if (!/^[0-9a-f]+$/.test(recvHex) || recvHex.length !== expectedHex.length) continue;
    try {
      const a = Buffer.from(recvHex, 'hex');
      if (a.length !== expectedBuf.length) continue;
      if (timingSafeEqual(a, expectedBuf)) return true;
    } catch {
      continue;
    }
  }
  return false;
}

function extractPhoneNumberId(payload: WaWebhookPayload): string | null {
  const entries = payload?.entry ?? [];
  for (const entry of entries) {
    for (const ch of entry.changes ?? []) {
      const id = ch.value?.metadata?.phone_number_id;
      if (id && String(id).trim()) return String(id).trim();
    }
  }
  return null;
}

@Injectable()
export class WhatsappWebhookVerifyService {
  private readonly log = new Logger(WhatsappWebhookVerifyService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(PlatformWhatsappNumber)
    private readonly waRepo: Repository<PlatformWhatsappNumber>,
  ) {}

  /** Meta GET subscription challenge: global `WHATSAPP_VERIFY_TOKEN` or a `use_own_token` row's `webhook_verify_token`. */
  async resolveVerifyChallenge(
    mode?: string,
    token?: string,
    challenge?: string,
  ): Promise<string> {
    if (mode !== 'subscribe' || !token?.trim() || !challenge?.trim()) {
      throw new ForbiddenException('Webhook verification failed.');
    }
    const t = token.trim();
    const expectedGlobal = (
      this.config.get<string>('whatsapp.verifyToken', '') ?? ''
    ).trim();
    if (expectedGlobal && t === expectedGlobal) {
      return challenge;
    }
    const rowHit = await this.waRepo
      .createQueryBuilder('w')
      .where('w.use_own_token = true')
      .andWhere('w.webhook_verify_token IS NOT NULL')
      .andWhere('w.webhook_verify_token = :t', { t })
      .getOne();
    if (rowHit) {
      return challenge;
    }
    throw new ForbiddenException('Webhook verification failed.');
  }

  /**
   * If a signing secret applies, require valid `X-Hub-Signature-256`.
   * `use_own_token=false` on the line → verify only with `WHATSAPP_APP_SECRET` from `.env` (ignore DB `app_secret`).
   * `use_own_token=true` → verify only with that row’s `app_secret` in DB (no .env fallback).
   */
  async assertInboundSignatureValid(
    req: RawBodyRequest<Request>,
  ): Promise<void> {
    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw)) {
      throw new BadRequestException('Raw body required for WhatsApp webhook.');
    }
    const globalSecret = (
      this.config.get<string>('whatsapp.appSecret', '') ?? ''
    ).trim();
    const sigHeader = req.headers['x-hub-signature-256'];
    const sigStr = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;

    let payload: WaWebhookPayload;
    try {
      payload = JSON.parse(raw.toString('utf8')) as WaWebhookPayload;
    } catch {
      throw new BadRequestException('Invalid JSON body.');
    }

    const phoneId = extractPhoneNumberId(payload);
    let secretToUse = '';
    let secretSource = '';

    if (phoneId) {
      const row = await this.waRepo.findOne({
        where: { phoneNumberId: phoneId },
        select: ['phoneNumberId', 'useOwnToken', 'appSecret'],
      });
      if (row?.useOwnToken === true) {
        secretToUse = row.appSecret?.trim() ?? '';
        secretSource = 'platform_whatsapp_numbers.app_secret';
        if (!secretToUse) {
          this.log.error(
            `use_own_token=true for phone_number_id=${phoneId} but app_secret is empty. Set DB column or set use_own_token=false to use WHATSAPP_APP_SECRET.`,
          );
          throw new BadRequestException(
            'This WhatsApp line has use_own_token=true but app_secret is not set in platform_whatsapp_numbers.',
          );
        }
      } else {
        secretToUse = globalSecret;
        secretSource = 'WHATSAPP_APP_SECRET_env';
      }
    } else {
      secretToUse = globalSecret;
      secretSource = 'WHATSAPP_APP_SECRET_env_no_phone_id_in_payload';
    }

    if (!secretToUse) {
      return;
    }
    if (!metaAppSignatureOk(raw, sigStr, secretToUse)) {
      this.log.warn(
        `Invalid webhook X-Hub-Signature-256. secret_source=${secretSource} has_header=${Boolean(sigStr?.trim())} phone_number_id=${phoneId ?? 'n/a'}`,
      );
      if (this.config.get<boolean>('whatsapp.webhookSignatureDebug')) {
        const enc = req.headers['content-encoding'];
        const encStr = Array.isArray(enc) ? enc[0] : enc;
        this.log.warn(
          `WHATSAPP_WEBHOOK_SIGNATURE_DEBUG raw_len=${raw.length} content_encoding=${encStr ?? 'n/a'} has_signature=${Boolean(sigStr?.trim())}`,
        );
        if (secretToUse.length < 24) {
          this.log.warn(
            `WHATSAPP_WEBHOOK_SIGNATURE_DEBUG hint: signing secret is only ${secretToUse.length} chars — Meta App Secret (App settings → Basic) is usually ~32 characters. Update WHATSAPP_APP_SECRET or platform_whatsapp_numbers.app_secret with the full value, no quotes or line breaks.`,
          );
        }
      }
      throw new ForbiddenException('Invalid webhook signature.');
    }
  }
}
