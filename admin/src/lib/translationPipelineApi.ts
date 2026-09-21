import { apiGet, apiPost } from '@/lib/apiClient';

export type TranslationJob = { id: string; themeId: string; themeVersion: string | null; sourceLanguage: string; targetLanguages: string[]; status: string; entryCount: number; approvedCount: number; createdAt: string; };
export type TranslationEntry = { id: string; jobId: string; languageCode: string; translationKey: string; sourceText: string; draftText: string | null; approvedText: string | null; status: string; draftVersion: number; };
export type TranslationJobDetail = { job: TranslationJob; entries: TranslationEntry[]; coverage: { total: number; approved: number; missing: number; completeness: number; readyForPublish: boolean } };

export function listTranslationJobs(): Promise<{ success: boolean; data: TranslationJob[] }> { return apiGet('/translation-pipeline/jobs'); }
export function getTranslationJob(id: string): Promise<{ success: boolean; data: TranslationJobDetail }> { return apiGet(`/translation-pipeline/jobs/${id}`); }
export function reviewTranslation(id: string, translationText: string, decision: 'APPROVED' | 'REJECTED', note?: string) { return apiPost(`/translation-pipeline/entries/${id}/review`, { translationText, decision, note }); }
export function publishTranslationJob(id: string) { return apiPost(`/translation-pipeline/jobs/${id}/publish`, {}); }
export function exportTranslationJob(id: string) { return apiGet(`/translation-pipeline/jobs/${id}/export`); }
