import { Injectable } from '@nestjs/common';
import {
  TranslationAiProvider,
  TranslationDraftRequest,
  TranslationDraftResult,
} from './translation-provider.types';

/** Safe provider boundary. It never presents source text as approved copy. */
@Injectable()
export class DraftTranslationProvider implements TranslationAiProvider {
  readonly name = 'draft-placeholder';

  async translate(
    request: TranslationDraftRequest,
  ): Promise<TranslationDraftResult> {
    return {
      value: request.sourceText,
      provider: this.name,
      confidence: 0,
      warnings: [
        'No configured AI provider; human translation is required before approval.',
      ],
    };
  }
}
