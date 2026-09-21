import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type GstVerifyResponseDto = {
  valid: boolean;
  legalName: string | null;
  tradeName: string | null;
  state: string | null;
  status: string | null;
};

@Injectable()
export class GstService {
  constructor(private readonly config: ConfigService) {}

  async verifyGstin(gstin: string): Promise<GstVerifyResponseDto> {
    const normalized = gstin.replace(/\s/g, '').toUpperCase();
    const keySecret = this.config.get<string>('appyflow.gstApiKey', '')?.trim();
    if (!keySecret) {
      throw new ServiceUnavailableException(
        'GST verification is not configured (missing APPYFLOW_GST_API_KEY).',
      );
    }
    const base = (
      this.config.get<string>('appyflow.gstApiBase') ?? 'https://appyflow.in/api'
    ).replace(/\/$/, '');
    /** AppyFlow docs: GET `…/verifyGST?gstNo=…&key_secret=…` (not `gstin` + API-Key header). */
    const url = new URL(`${base}/verifyGST`);
    url.searchParams.set('gstNo', normalized);
    url.searchParams.set('key_secret', keySecret);

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
    } catch {
      throw new BadGatewayException('GST provider request failed.');
    }

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
      throw new BadGatewayException(
        typeof body === 'object' && body && 'message' in body
          ? String((body as { message: unknown }).message)
          : `GST provider returned HTTP ${res.status}.`,
      );
    }

    return this.normalizeAppyflowBody(body);
  }

  /** Map AppyFlow JSON (`taxpayerInfo`, `error`) to our DTO. */
  private normalizeAppyflowBody(body: unknown): GstVerifyResponseDto {
    if (body === null || body === undefined || typeof body !== 'object') {
      return {
        valid: false,
        legalName: null,
        tradeName: null,
        state: null,
        status: null,
      };
    }

    const root = body as Record<string, unknown>;

    if (root['error'] === true) {
      const msg =
        typeof root['message'] === 'string' && root['message'].trim()
          ? root['message'].trim()
          : 'GST lookup failed.';
      throw new BadRequestException(msg);
    }

    const tp = root['taxpayerInfo'];
    if (!tp || typeof tp !== 'object') {
      return this.normalizeLegacyFlatBody(body);
    }

    const t = tp as Record<string, unknown>;
    const legalName = typeof t['lgnm'] === 'string' ? t['lgnm'].trim() : null;
    const tradeName = typeof t['tradeNam'] === 'string' ? t['tradeNam'].trim() : null;
    const sts = typeof t['sts'] === 'string' ? t['sts'].trim() : null;
    const statusNorm = sts?.toLowerCase() ?? '';
    const valid = statusNorm === 'active' || statusNorm === '';

    let state: string | null = null;
    const pradr = t['pradr'];
    if (pradr && typeof pradr === 'object') {
      const addr = (pradr as Record<string, unknown>)['addr'];
      if (addr && typeof addr === 'object') {
        const a = addr as Record<string, unknown>;
        const stcd = typeof a['stcd'] === 'string' ? a['stcd'].trim() : '';
        if (stcd) state = stcd;
      }
    }

    return {
      valid,
      legalName: legalName || null,
      tradeName: tradeName || null,
      state,
      status: sts || null,
    };
  }

  /** Older / alternate wrappers that return flat fields. */
  private normalizeLegacyFlatBody(body: unknown): GstVerifyResponseDto {
    const root =
      body && typeof body === 'object' && 'data' in (body as object)
        ? (body as { data: unknown }).data
        : body;

    const o = root && typeof root === 'object' ? (root as Record<string, unknown>) : {};

    const pickStr = (...keys: string[]): string | null => {
      for (const k of keys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
      return null;
    };

    const validRaw = o['valid'] ?? o['isValid'] ?? o['status'] === 'Active';
    const valid = validRaw === true || validRaw === 'true' || validRaw === 1;

    return {
      valid,
      legalName: pickStr('legalName', 'legal_name', 'lgnm', 'LegalName'),
      tradeName: pickStr('tradeName', 'trade_name', 'tradeNam', 'TradeName'),
      state: pickStr('state', 'State', 'stcd') ?? null,
      status: pickStr('status', 'Status', 'sts') ?? null,
    };
  }
}
