import { ApiError, apiGet, apiPatch, apiPost, apiPostForm } from '@/lib/apiClient';

/** Row shape from `GET /api/v1/themes` (`themes` table). */
export type ApiTheme = {
  id: string;
  themeName: string;
  themeType: string;
  themeConfigJson: Record<string, unknown>;
  status: string;
  createdAt: string;
  /** `WEB` | `MOBILE` — build paths `storefront-web/themes/{slug}` vs app shell. */
  themeChannel?: string;
  slug?: string | null;
  previewImage?: string | null;
  previewImages?: string[];
  /** Public path or absolute URL to `theme.json` (runtime assets). */
  manifestPath?: string | null;
  themeVersion?: string;
};

type ThemesListEnvelope = {
  success?: boolean;
  data?: ApiTheme[];
  message?: string;
};

export function readDemoHost(config: Record<string, unknown> | undefined): string | null {
  if (!config) return null;
  const h = config.demoHost;
  return typeof h === 'string' && h.trim() ? h.trim() : null;
}

export function readThemeDescription(config: Record<string, unknown> | undefined): string {
  if (!config) return '';
  const d = config.description;
  return typeof d === 'string' ? d : '';
}

export function readThemePreviewImages(config: Record<string, unknown> | undefined): string[] {
  if (!config) return [];
  const v = config.previewImages;
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

export function demoHostToUrl(host: string): string {
  const t = host.trim();
  if (!t) return '';
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return `https://${t}`;
}

export async function fetchThemesCatalog(allStatuses = true): Promise<ApiTheme[]> {
  const q = allStatuses ? '?allStatuses=1' : '';
  const body = await apiGet<ThemesListEnvelope | ApiTheme[]>('/themes' + q);
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object' && Array.isArray(body.data)) return body.data;
  if (body && typeof body === 'object' && body.success && Array.isArray(body.data)) return body.data;
  return [];
}

export type ApiThemeComboPack = {
  id: string;
  webThemeId: string;
  mobileThemeId: string;
  name: string;
  previewImage: string | null;
  status?: string;
  createdAt: string;
  webTheme?: ApiTheme;
  mobileTheme?: ApiTheme;
};

type ComboListEnvelope = {
  success?: boolean;
  data?: ApiThemeComboPack[];
  message?: string;
};

export async function fetchThemeComboPacks(): Promise<ApiThemeComboPack[]> {
  const body = await apiGet<ComboListEnvelope | ApiThemeComboPack[]>('/themes/combo-packs');
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object' && Array.isArray(body.data)) return body.data;
  if (body && typeof body === 'object' && body.success && Array.isArray(body.data)) return body.data;
  return [];
}

type ThemeUploadEnvelope = { success?: boolean; data?: ApiTheme; message?: string };

export async function uploadThemeZip(formData: FormData): Promise<ApiTheme> {
  const body = await apiPostForm<ThemeUploadEnvelope>('/themes/upload', formData);
  if (body && typeof body === 'object' && body.data && typeof body.data === 'object') {
    return body.data;
  }
  throw new ApiError(500, 'Unexpected upload response', body);
}

type CreateComboEnvelope = { success?: boolean; data?: ApiThemeComboPack; message?: string };

export async function createThemeComboPack(payload: {
  name: string;
  webThemeId: string;
  mobileThemeId: string;
  previewImage?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}): Promise<ApiThemeComboPack> {
  const body = await apiPost<CreateComboEnvelope>('/themes/combo-packs', payload);
  if (body && typeof body === 'object' && body.data && typeof body.data === 'object') {
    return body.data;
  }
  throw new ApiError(500, 'Unexpected create combo response', body);
}

type UpdateThemeEnvelope = { success?: boolean; data?: ApiTheme; message?: string };

export async function updateThemeMetadata(
  themeId: string,
  payload: {
    themeName?: string;
    themeType?: string;
    version?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    description?: string;
    demoHost?: string;
    previewImage?: string;
    previewImagesText?: string;
  },
): Promise<ApiTheme> {
  const body = await apiPatch<UpdateThemeEnvelope>(`/themes/${themeId}`, payload);
  if (body && typeof body === 'object' && body.data && typeof body.data === 'object') {
    return body.data;
  }
  throw new ApiError(500, 'Unexpected update theme response', body);
}

export function themesLoadErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    return `HTTP ${e.status} — ${e.message}`;
  }
  return e instanceof Error ? e.message : 'Request failed';
}
