export const TRANSLATION_AI_PROVIDER = Symbol('TRANSLATION_AI_PROVIDER');

export type TranslationDraftRequest = {
  sourceLanguage: string;
  targetLanguage: string;
  key: string;
  sourceText: string;
};

export type TranslationDraftResult = {
  value: string;
  provider: string;
  confidence?: number;
  warnings?: string[];
};

export type TranslationBatchRequest = {
  sourceLanguage: string;
  targetLanguage: string;
  entries: Array<{ key: string; sourceText: string }>;
};

export type TranslationBatchResult = {
  key: string;
  value: string;
  confidence?: number;
  warnings?: string[];
};

export interface TranslationAiProvider {
  readonly name: string;
  translate(request: TranslationDraftRequest): Promise<TranslationDraftResult>;
}
