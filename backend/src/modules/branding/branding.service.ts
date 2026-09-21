import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiSettingsService } from '../ai-settings/ai-settings.service';
import { BRANDING_AI_STYLE } from './branding-ai.constants';
import { SuggestPalettesDto } from './dto/suggest-palettes.dto';
import { SuggestTaglinesDto } from './dto/suggest-taglines.dto';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

export type BrandPaletteDto = {
  primary: string;
  secondary: string;
  label?: string;
};

export type SuggestTaglinesResult = {
  taglines: string[];
  font_hint: string | null;
};

const LOCAL_PALETTE_LIBRARY: BrandPaletteDto[][] = [
  [
    { primary: '#0F766E', secondary: '#164E63', label: 'Trusted Teal' },
    { primary: '#0369A1', secondary: '#1E293B', label: 'Business Blue' },
    { primary: '#047857', secondary: '#365314', label: 'Growth Green' },
  ],
  [
    { primary: '#B45309', secondary: '#334155', label: 'Industrial Amber' },
    { primary: '#C2410C', secondary: '#422006', label: 'Supply Orange' },
    { primary: '#4F46E5', secondary: '#312E81', label: 'Commerce Indigo' },
  ],
  [
    { primary: '#BE185D', secondary: '#6D28D9', label: 'Modern Berry' },
    { primary: '#7C3AED', secondary: '#3730A3', label: 'Premium Violet' },
    { primary: '#0E7490', secondary: '#155E75', label: 'Clear Cyan' },
  ],
];

@Injectable()
export class BrandingService {
  constructor(
    private readonly config: ConfigService,
    private readonly aiSettings: AiSettingsService,
  ) {}

  async suggestPalettes(dto: SuggestPalettesDto): Promise<{ palettes: BrandPaletteDto[] }> {
    const { colorPalettes: n } = await this.aiSettings.getResolved();
    if (!this.hasOpenAiConfiguration()) {
      return { palettes: this.localPalettes(dto.business_name, dto.industry, n) };
    }
    const style = BRANDING_AI_STYLE;
    const prompt = [
      `You are a brand designer for B2B wholesale / distribution SaaS storefronts.`,
      `Business name: "${dto.business_name.trim()}". Industry: "${dto.industry.trim()}". Brand style: ${style}.`,
      `Return ONLY valid JSON with this exact shape:`,
      `{"palettes":[{"primary":"#RRGGBB","secondary":"#RRGGBB","label":"short name"}, ...]}`,
      `Include exactly ${n} palettes. Each primary and secondary must be full 7-character CSS hex codes (including #).`,
      `Colors must be professional, accessible on white backgrounds, and work well together.`,
    ].join('\n');

    const raw = await this.chatJson(prompt);
    const palettes = this.parsePalettes(raw, n);
    return { palettes };
  }

  async suggestTaglines(dto: SuggestTaglinesDto): Promise<SuggestTaglinesResult> {
    const { taglineSuggestions: m } = await this.aiSettings.getResolved();
    if (!this.hasOpenAiConfiguration()) {
      return {
        taglines: this.localTaglines(dto.business_name, dto.industry, m),
        font_hint: 'Inter headings + Source Sans 3 body',
      };
    }
    const style = BRANDING_AI_STYLE;
    const colorHint =
      dto.primary_hex && dto.secondary_hex
        ? `Brand colors primary ${dto.primary_hex}, secondary ${dto.secondary_hex}.`
        : '';
    const prompt = [
      `Generate exactly ${m} short professional taglines (max 80 characters each) for a B2B distributor.`,
      `Business name: "${dto.business_name.trim()}". Industry: "${dto.industry.trim()}". Style: ${style}.`,
      colorHint,
      `Also suggest one Google Fonts pairing as font_hint (e.g. "Inter headings + Source Sans 3 body").`,
      `Return ONLY valid JSON: {"taglines":["..."],"font_hint":"..."}`,
      `Taglines must not contain characters that break JSON.`,
      `British or Indian English is fine.`,
    ].join('\n');

    const raw = await this.chatJson(prompt);
    const { taglines, fontHint } = this.parseTaglinesAndFont(raw, m);
    return { taglines, font_hint: fontHint };
  }

  private async chatJson(userPrompt: string): Promise<unknown> {
    const apiKey = this.config.get<string>('openai.apiKey', '')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OpenAI is not configured (missing OPENAI_API_KEY).',
      );
    }

    const res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: userPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.75,
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
          : `OpenAI chat returned HTTP ${res.status}`;
      throw new BadGatewayException(msg);
    }

    const content = (body as { choices?: { message?: { content?: string } }[] })?.choices?.[0]
      ?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new BadGatewayException('OpenAI returned no message content.');
    }

    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new BadGatewayException('OpenAI returned non-JSON content.');
    }
  }

  private hasOpenAiConfiguration(): boolean {
    return Boolean(this.config.get<string>('openai.apiKey', '')?.trim());
  }

  private localPalettes(
    businessName: string,
    industry: string,
    count: number,
  ): BrandPaletteDto[] {
    const seed = `${businessName}|${industry}`
      .toLowerCase()
      .split('')
      .reduce((total, character) => total + character.charCodeAt(0), 0);
    const flattened = LOCAL_PALETTE_LIBRARY.flat();
    const start = seed % flattened.length;
    return Array.from(
      { length: Math.min(count, flattened.length) },
      (_, index) => flattened[(start + index) % flattened.length],
    );
  }

  private localTaglines(
    businessName: string,
    industry: string,
    count: number,
  ): string[] {
    const name = businessName.trim();
    const sector = industry.trim();
    const suggestions = [
      `${name}: Quality supply, delivered on time.`,
      `Reliable ${sector}. Built for business.`,
      'Smarter sourcing. Stronger business.',
      'Trusted products. Dependable fulfilment.',
      'Your supply partner for everyday growth.',
    ];
    return suggestions.slice(0, Math.min(count, suggestions.length));
  }

  private parsePalettes(raw: unknown, max: number): BrandPaletteDto[] {
    if (!raw || typeof raw !== 'object') return [];
    const arr = (raw as { palettes?: unknown }).palettes;
    if (!Array.isArray(arr)) return [];
    const hex = /^#[0-9A-Fa-f]{6}$/;
    const out: BrandPaletteDto[] = [];
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const primary = typeof o.primary === 'string' ? o.primary.trim() : '';
      const secondary = typeof o.secondary === 'string' ? o.secondary.trim() : '';
      if (!hex.test(primary) || !hex.test(secondary)) continue;
      const label = typeof o.label === 'string' ? o.label.trim() : undefined;
      out.push({ primary, secondary, label });
      if (out.length >= max) break;
    }
    return out;
  }

  private parseTaglinesAndFont(
    raw: unknown,
    max: number,
  ): { taglines: string[]; fontHint: string | null } {
    if (!raw || typeof raw !== 'object') {
      return { taglines: [], fontHint: null };
    }
    const o = raw as Record<string, unknown>;
    const arr = o.taglines;
    let fontHint: string | null = null;
    const fh = o.font_hint;
    if (typeof fh === 'string' && fh.trim()) {
      fontHint = fh.trim().slice(0, 200);
    }
    if (!Array.isArray(arr)) {
      return { taglines: [], fontHint };
    }
    const out: string[] = [];
    for (const t of arr) {
      if (typeof t !== 'string') continue;
      const s = t.trim();
      if (!s) continue;
      out.push(s.slice(0, 160));
      if (out.length >= max) break;
    }
    return { taglines: out, fontHint };
  }
}
