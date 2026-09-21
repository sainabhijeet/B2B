import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TranslationAiProvider,
  TranslationBatchRequest,
  TranslationBatchResult,
  TranslationDraftRequest,
  TranslationDraftResult,
} from './translation-provider.types';

@Injectable()
export class OpenAiTranslationProvider implements TranslationAiProvider {
  readonly name = 'openai';
  constructor(private readonly config: ConfigService) {}

  async translateBatch(
    request: TranslationBatchRequest,
  ): Promise<TranslationBatchResult[]> {
    const apiKey = this.config.get<string>('openai.apiKey', '')?.trim();
    if (!apiKey)
      throw new BadGatewayException(
        'OpenAI translation provider is not configured.',
      );
    const baseUrl = (
      this.config.get<string>('openai.baseUrl') ||
      this.config.get<string>('OPENAI_BASE_URL') ||
      this.config.get<string>('TRANSLATION_OPENAI_BASE_URL') ||
      'https://api.openai.com/v1'
    ).replace(/\/+$/, '');
    const model =
      this.config.get<string>('openai.model') ||
      this.config.get<string>('OPENAI_MODEL') ||
      this.config.get<string>('TRANSLATION_OPENAI_MODEL') ||
      'gpt-4o-mini';
    const controller = new AbortController();
    const timeoutMs = Number(
      process.env.TRANSLATION_OPENAI_TIMEOUT_MS ?? '60000',
    );
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          ...(model.toLowerCase().startsWith('gpt-5')
            ? {}
            : { temperature: 0.2 }),
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Translate every entry into the requested ecommerce locale. Return JSON only: {"translations":[{"key":"exact-input-key","translation":"...","confidence":0.0}]}. Return exactly one result for every input key, never rename keys, and use conservative confidence from 0 to 1. Preserve placeholders, ICU syntax, URLs, email addresses, SKUs, code, variables, HTML tags and attributes, Markdown, line breaks, numbers, and brand names. Never translate protected tokens.',
            },
            { role: 'user', content: JSON.stringify(request) },
          ],
        }),
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError')
        throw new BadGatewayException(
          `OpenAI batch request timed out after ${timeoutMs}ms.`,
        );
      throw new BadGatewayException(
        `OpenAI batch request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timeout);
    }
    const body = (await response.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { code?: string; message?: string };
    } | null;
    if (!response.ok)
      throw new BadGatewayException(
        `OpenAI translation provider returned HTTP ${response.status}` +
          `${body?.error?.code ? ` (${body.error.code})` : ''}: ${body?.error?.message ?? 'No error message returned.'}`,
      );
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== 'string')
      throw new BadGatewayException('OpenAI batch provider returned no draft.');
    try {
      const parsed = JSON.parse(content) as { translations?: unknown };
      if (!Array.isArray(parsed.translations))
        throw new Error('translations array missing');
      const expected = new Set(request.entries.map((entry) => entry.key));
      const seen = new Set<string>();
      const results = parsed.translations.map((item) => {
        const value = item as {
          key?: unknown;
          translation?: unknown;
          confidence?: unknown;
        };
        if (
          typeof value.key !== 'string' ||
          !expected.has(value.key) ||
          seen.has(value.key) ||
          typeof value.translation !== 'string' ||
          !value.translation.trim()
        )
          throw new Error('batch mapping invalid');
        seen.add(value.key);
        return {
          key: value.key,
          value: value.translation,
          confidence:
            typeof value.confidence === 'number' &&
            Number.isFinite(value.confidence)
              ? Math.min(1, Math.max(0, value.confidence))
              : 0.5,
          provider: this.name,
          warnings: ['AI-generated draft; human approval is required.'],
        };
      });
      if (seen.size !== expected.size)
        throw new Error('batch response omitted one or more input keys');
      return results;
    } catch {
      throw new BadGatewayException(
        'OpenAI batch provider returned invalid JSON or an incomplete key mapping.',
      );
    }
  }

  async translate(
    request: TranslationDraftRequest,
  ): Promise<TranslationDraftResult> {
    const apiKey = this.config.get<string>('openai.apiKey', '')?.trim();
    if (!apiKey)
      throw new BadGatewayException(
        'OpenAI translation provider is not configured.',
      );
    const baseUrl = (
      this.config.get<string>('openai.baseUrl') ||
      this.config.get<string>('OPENAI_BASE_URL') ||
      this.config.get<string>('TRANSLATION_OPENAI_BASE_URL') ||
      'https://api.openai.com/v1'
    ).replace(/\/+$/, '');
    const model =
      this.config.get<string>('openai.model') ||
      this.config.get<string>('OPENAI_MODEL') ||
      this.config.get<string>('TRANSLATION_OPENAI_MODEL') ||
      'gpt-4o-mini';
    const requestBody = {
      model,
      ...(model.toLowerCase().startsWith('gpt-5') ? {} : { temperature: 0.2 }),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Translate ecommerce theme UI copy. Return JSON only: {"translation":"...","confidence":0.0}. Confidence must be a conservative number from 0 to 1. Preserve placeholders, ICU syntax, URLs, email addresses, SKUs, code, variables, HTML tags and attributes, Markdown, line breaks, numbers, and brand names. Never translate protected tokens. This is an unapproved draft.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            sourceLanguage: request.sourceLanguage,
            targetLanguage: request.targetLanguage,
            key: request.key,
            sourceText: request.sourceText,
          }),
        },
      ],
    };
    const controller = new AbortController();
    const timeoutMs = Number(
      process.env.TRANSLATION_OPENAI_TIMEOUT_MS ?? '60000',
    );
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError')
        throw new BadGatewayException(
          `OpenAI translation request timed out after ${timeoutMs}ms.`,
        );
      throw new BadGatewayException(
        `OpenAI translation request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timeout);
    }
    const body = (await response.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { code?: string; message?: string };
    } | null;
    if (!response.ok)
      throw new BadGatewayException(
        `OpenAI translation provider returned HTTP ${response.status}` +
          `${body?.error?.code ? ` (${body.error.code})` : ''}: ` +
          `${body?.error?.message ?? 'No error message returned.'}`,
      );
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== 'string')
      throw new BadGatewayException(
        'OpenAI translation provider returned no draft.',
      );
    try {
      const parsed = JSON.parse(content) as {
        translation?: unknown;
        confidence?: unknown;
      };
      if (typeof parsed.translation !== 'string' || !parsed.translation.trim())
        throw new Error('empty');
      return {
        value: parsed.translation,
        provider: this.name,
        confidence:
          typeof parsed.confidence === 'number' &&
          Number.isFinite(parsed.confidence)
            ? Math.min(1, Math.max(0, parsed.confidence))
            : 0.5,
        warnings: ['AI-generated draft; human approval is required.'],
      };
    } catch {
      throw new BadGatewayException(
        'OpenAI translation provider returned invalid JSON.',
      );
    }
  }
}
