import { TranslateOptions, TranslateResult, ExplainOptions, ExplainResult } from './types.js';
import { CircuitBreaker, withRetry } from './circuitBreaker.js';

export interface EvonConfig {
  baseUrl: string;
  apiKey?: string;
  model?: string;
}

export class EvonClient {
  private breaker = new CircuitBreaker({ timeoutMs: 10000 });

  constructor(private config: EvonConfig) {}

  private async complete(systemPrompt: string, userPrompt: string, signal: AbortSignal): Promise<string> {
    if (!this.config.baseUrl) {
      throw new Error('Evon is an open-weight model. Configure GNANI_EVON_BASE_URL to your approved OpenAI-compatible Evon inference endpoint.');
    }

    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const url = baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) headers.Authorization = `Bearer ${this.config.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.model || 'gnani/gnani-evon-v3.3-30B-A3B',
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Evon inference failed [${response.status}]: ${errorText}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('Evon returned an empty response.');
    return content.trim();
  }

  /**
   * Translate conversational text using Gnani Evon NMT
   */
  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    options: TranslateOptions = {}
  ): Promise<TranslateResult> {
    const startTime = Date.now();

    if (sourceLanguage === targetLanguage) {
      return {
        sourceText: text,
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        latencyMs: 0,
      };
    }

    return this.breaker.execute(async (signal) => {
      return withRetry(async () => {
        const translatedText = await this.complete(
          `You are a precise Indian-language translator. Translate from ${sourceLanguage} to ${targetLanguage}. Preserve meaning, names, numbers, tone, and code-switching. Return only the translation. Domain: ${options.domain || 'conversational'}.`,
          text,
          signal
        );

        return {
          sourceText: text,
          translatedText: translatedText.trim(),
          sourceLanguage,
          targetLanguage,
          latencyMs: Date.now() - startTime,
        };
      }, 2, 250);
    });
  }

  /**
   * Explain complex or fast speech in simple, plain terms in the user's native language
   */
  async explain(
    text: string,
    language: string,
    _options: ExplainOptions
  ): Promise<ExplainResult> {
    return this.breaker.execute(async (signal) => {
      return withRetry(async () => {
        const explanation = await this.complete(
          `Explain the user's text simply in language ${language}. Preserve the facts and do not add information. Return only the explanation.`,
          text,
          signal
        );

        return {
          originalText: text,
          explanation: explanation.trim(),
          language,
        };
      }, 2, 250);
    });
  }
}
