import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { TenantBranding } from '../../common/entities/tenant-branding.entity';
import { AiSettingsService } from '../ai-settings/ai-settings.service';
import { GenerateLogoDto } from './dto/generate-logo.dto';

const PROMPT_HINTS = [
  'Icon + text layout: simple symbolic mark beside the business name.',
  'Clean wordmark with a small abstract mark; favicon-friendly.',
  'Compact badge or shield layout suitable for favicons.',
  'Abstract lettermark or monogram with minimal supporting text.',
] as const;

@Injectable()
export class LogoService {
  private r2Client: S3Client | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly aiSettings: AiSettingsService,
    @InjectRepository(TenantBranding)
    private readonly brandingRepo: Repository<TenantBranding>,
  ) {}

  async generate(
    tenantId: string,
    dto: GenerateLogoDto,
  ): Promise<{
    logos: string[];
    generations_used: number;
    generations_limit: number;
    generations_remaining: number;
    generation_source: 'openai' | 'local';
  }> {
    const apiKey = this.config.get<string>('openai.apiKey', '')?.trim();
    const { logoGenerationLimit: variantCount, maxLogoBatchesPerTenant } =
      await this.aiSettings.getResolved();

    let brand = await this.brandingRepo.findOne({ where: { tenantId } });
    if (!brand) {
      brand = this.brandingRepo.create({
        tenantId,
        logoUrl: null,
        logoDataUrl: null,
        primaryColor: null,
        secondaryColor: null,
        tagline: null,
        themeId: null,
        logoGenerationCount: 0,
      });
      await this.brandingRepo.save(brand);
    }

    const used = brand.logoGenerationCount ?? 0;
    if (!apiKey) {
      return {
        logos: Array.from({ length: variantCount }, (_, index) =>
          this.buildLocalLogoDataUrl(dto, index),
        ),
        generations_used: used,
        generations_limit: maxLogoBatchesPerTenant,
        generations_remaining: Math.max(0, maxLogoBatchesPerTenant - used),
        generation_source: 'local',
      };
    }

    if (used >= maxLogoBatchesPerTenant) {
      throw new HttpException(
        {
          message: `Maximum of ${maxLogoBatchesPerTenant} AI logo generations reached for this store.`,
          generations_used: used,
          generations_limit: maxLogoBatchesPerTenant,
          generations_remaining: 0,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const industry = dto.industry.trim();
    const name = dto.business_name.trim();

    const logos: string[] = [];
    const hints = PROMPT_HINTS.slice(0, Math.min(variantCount, PROMPT_HINTS.length));
    for (let i = 0; i < variantCount; i++) {
      const hint = hints[i] ?? hints[hints.length - 1] ?? PROMPT_HINTS[0];
      const prompt = this.buildPrompt(dto, industry, name, hint);
      const openaiUrl = await this.callOpenAiImage(apiKey, prompt);
      const out = await this.persistImage(tenantId, i, openaiUrl);
      logos.push(out);
    }

    brand.logoGenerationCount = used + 1;
    await this.brandingRepo.save(brand);

    const nextUsed = brand.logoGenerationCount;
    return {
      logos,
      generations_used: nextUsed,
      generations_limit: maxLogoBatchesPerTenant,
      generations_remaining: Math.max(0, maxLogoBatchesPerTenant - nextUsed),
      generation_source: 'openai',
    };
  }

  private buildLocalLogoDataUrl(dto: GenerateLogoDto, variantIndex: number): string {
    const primary = this.safeHex(dto.primary_hex, '#0F766E');
    const secondary = this.safeHex(dto.secondary_hex, '#164E63');
    const name = dto.business_name.trim();
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'B';
    const safeName = this.escapeXml(name);
    const safeInitials = this.escapeXml(initials);
    const tagline = dto.tagline?.trim();
    const safeTagline = tagline ? this.escapeXml(tagline.slice(0, 64)) : '';
    const variant = variantIndex % 4;
    const marks = [
      `<rect x="92" y="232" width="272" height="272" rx="72" fill="${primary}"/><path d="M160 370l68-76 68 76-68 76z" fill="${secondary}"/><text x="228" y="393" text-anchor="middle" font-family="Arial,sans-serif" font-size="74" font-weight="700" fill="#fff">${safeInitials}</text>`,
      `<circle cx="228" cy="368" r="136" fill="${secondary}"/><circle cx="228" cy="368" r="104" fill="${primary}"/><text x="228" y="394" text-anchor="middle" font-family="Arial,sans-serif" font-size="78" font-weight="700" fill="#fff">${safeInitials}</text>`,
      `<path d="M228 220l138 58v104c0 91-55 164-138 206-83-42-138-115-138-206V278z" fill="${primary}"/><path d="M228 258l96 40v76c0 64-36 117-96 152-60-35-96-88-96-152v-76z" fill="${secondary}"/><text x="228" y="405" text-anchor="middle" font-family="Arial,sans-serif" font-size="74" font-weight="700" fill="#fff">${safeInitials}</text>`,
      `<path d="M92 368c0-75 61-136 136-136h136v136c0 75-61 136-136 136H92z" fill="${primary}"/><path d="M152 308h152v120H152z" rx="36" fill="${secondary}"/><text x="228" y="394" text-anchor="middle" font-family="Arial,sans-serif" font-size="76" font-weight="700" fill="#fff">${safeInitials}</text>`,
    ];
    const taglineMarkup = safeTagline
      ? `<text x="420" y="464" font-family="Arial,sans-serif" font-size="28" fill="#64748B">${safeTagline}</text>`
      : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768"><rect width="1024" height="768" rx="48" fill="#fff"/>${marks[variant]}<text x="420" y="380" font-family="Arial,sans-serif" font-size="62" font-weight="700" fill="${secondary}">${safeName}</text>${taglineMarkup}</svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
  }

  private safeHex(value: string | undefined, fallback: string): string {
    return value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : fallback;
  }

  private escapeXml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      };
      return entities[character] ?? character;
    });
  }

  private buildPrompt(
    dto: GenerateLogoDto,
    industry: string,
    name: string,
    layoutHint: string,
  ): string {
    const p = dto.primary_hex?.trim();
    const s = dto.secondary_hex?.trim();
    const colorBlock =
      p && s
        ? `Primary color: ${p}. Secondary color: ${s}.`
        : `Color preference: ${(dto.color ?? '').trim() || 'professional coordinated brand palette'}.`;
    const tag = (dto.tagline ?? '').trim();
    const tagBlock = tag ? `Tagline: ${tag}.` : '';

    return [
      `Create a modern minimal logo for "${name}".`,
      colorBlock,
      `Industry: ${industry.toLowerCase()} wholesale.`,
      tagBlock,
      `Flat vector style. White background. Icon + wordmark layout.`,
      layoutHint,
      `No photorealistic textures, no stock-photo look, no cluttered details.`,
      `Must be legible at small sizes (favicon / app icon).`,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private async callOpenAiImage(apiKey: string, prompt: string): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url',
      }),
    });

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = null;
      }
    }

    if (!res.ok) {
      const msg =
        body &&
        typeof body === 'object' &&
        'error' in body &&
        (body as { error?: { message?: string } }).error?.message
          ? String((body as { error: { message?: string } }).error.message)
          : `OpenAI returned HTTP ${res.status}`;
      throw new BadGatewayException(msg);
    }

    const data = (body as { data?: { url?: string }[] })?.data;
    const url = data?.[0]?.url;
    if (!url) {
      throw new BadGatewayException('OpenAI response had no image URL.');
    }
    return url;
  }

  private async persistImage(
    tenantId: string,
    variantIndex: number,
    openaiImageUrl: string,
  ): Promise<string> {
    const imgRes = await fetch(openaiImageUrl);
    if (!imgRes.ok) {
      throw new BadGatewayException('Failed to download generated image from OpenAI.');
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());

    const bucket = this.config.get<string>('r2.bucket', '')?.trim();
    const accountId = this.config.get<string>('r2.accountId', '')?.trim();
    const accessKeyId = this.config.get<string>('r2.accessKeyId', '')?.trim();
    const secretAccessKey = this.config.get<string>('r2.secretAccessKey', '')?.trim();
    const publicBase = this.config.get<string>('r2.publicBaseUrl', '')?.trim();

    if (!bucket || !accountId || !accessKeyId || !secretAccessKey || !publicBase) {
      const b64 = buf.toString('base64');
      return `data:image/png;base64,${b64}`;
    }

    const client = this.getR2Client(accountId, accessKeyId, secretAccessKey);
    const key = `tenants/${tenantId}/ai-logos/${randomUUID()}-v${variantIndex + 1}.png`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buf,
        ContentType: 'image/png',
      }),
    );
    return `${publicBase}/${key}`;
  }

  private getR2Client(accountId: string, accessKeyId: string, secretAccessKey: string): S3Client {
    if (!this.r2Client) {
      this.r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
    return this.r2Client;
  }
}
