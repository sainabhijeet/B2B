import { apiGet, apiPut } from '@/lib/apiClient';
import type { LanguageRow } from '@/lib/languageModuleDemoData';

export async function fetchPlatformLanguages(): Promise<LanguageRow[]> {
  return apiGet<LanguageRow[]>('/distributor/onboarding/languages');
}

export async function savePlatformLanguages(languages: LanguageRow[]): Promise<LanguageRow[]> {
  return apiPut<LanguageRow[]>('/distributor/onboarding/languages', { languages });
}
