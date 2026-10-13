import type { TemplateFile } from "@/engine/schema/theme-engine.schema";
import {
  createLanguageContext,
  loadLocale,
  LocalizationService,
  type LocaleDictionary,
  type StorefrontLoadedLocale,
} from "@/lib/localization-service";

const SKIP_TRANSLATION_KEYS = new Set([
  "id",
  "type",
  "component",
  "variant",
  "layout",
  "base_layout",
  "slug",
  "image",
  "images",
  "icon",
  "href",
  "url",
  "assetBaseUrl",
  "previewImage",
  "previewImages",
  "logo",
  "logoUrl",
  "backgroundImage",
  "imageCenter",
  "imageLeft",
  "imageRight",
  "primary",
  "secondary",
  "surface",
  "ink",
  "muted",
]);

function shouldTranslateString(key: string | null, value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^(?:https?:)?\/\//iu.test(trimmed) || trimmed.startsWith("data:")) return false;
  if (/^#(?:[0-9a-f]{3}){1,2}$/iu.test(trimmed)) return false;
  if (/\.(?:png|jpe?g|webp|gif|svg|avif|json|css|js)(?:[?#].*)?$/iu.test(trimmed)) return false;
  return !key || !SKIP_TRANSLATION_KEYS.has(key);
}

export function translate(
  key: string,
  languageCode: string | null | undefined,
  localeDictionary: LocaleDictionary = {},
): string {
  return new LocalizationService(createLanguageContext(languageCode), localeDictionary).translate(key);
}

export const t = translate;

function localizeValue(
  value: unknown,
  service: LocalizationService,
  key: string | null = null,
): unknown {
  if (typeof value === "string") {
    return shouldTranslateString(key, value) ? service.translate(value) : value;
  }
  if (Array.isArray(value)) return value.map((item) => localizeValue(item, service, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, child]) => [childKey, localizeValue(child, service, childKey)]),
    );
  }
  return value;
}

export function localizeTemplate(
  template: TemplateFile,
  languageCode: string | null | undefined,
  locale: StorefrontLoadedLocale | LocaleDictionary = {},
): TemplateFile {
  const service = new LocalizationService(createLanguageContext(languageCode), locale);
  return localizeValue(template, service) as TemplateFile;
}

export async function loadLocalization(options: {
  languageCode: string | null | undefined;
  manifestPath?: string | null;
  manifest?: Record<string, unknown> | null;
  scope?: string;
}): Promise<LocalizationService> {
  const context = createLanguageContext(options.languageCode);
  const locale = await loadLocale(options);
  return new LocalizationService(context, locale);
}

export function missingTranslations(
  template: unknown,
  languageCode: string | null | undefined,
  locale: StorefrontLoadedLocale | LocaleDictionary = {},
): string[] {
  const service = new LocalizationService(createLanguageContext(languageCode), locale);
  return service.missing(template);
}
