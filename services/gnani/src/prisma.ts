import { TranscribeOptions, TranscribeResult } from './types.js';
import { CircuitBreaker, withRetry } from './circuitBreaker.js';

export interface PrismaConfig {
  baseUrl: string;
  apiKey?: string;
  apiKeyId?: string;
  apiKeySecret?: string;
}

export class PrismaApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'PrismaApiError';
  }
}

export class PrismaClient {
  private breaker = new CircuitBreaker({ timeoutMs: 12000 });

  constructor(private config: PrismaConfig) {}

  /**
   * Transcribe an audio segment using Gnani Prisma ASR
   */
  async transcribe(
    audio: Buffer | Uint8Array,
    language: string,
    options: TranscribeOptions = {}
  ): Promise<TranscribeResult> {
    const startTime = Date.now();

    return this.breaker.execute(async (signal) => {
      return withRetry(async () => {
        const url = `${this.config.baseUrl.replace(/\/$/, '')}/stt/v3`;
        const headers: Record<string, string> = {};
        const apiKeyId = this.config.apiKeyId || this.config.apiKey;
        if (apiKeyId) {
          headers['X-API-Key-ID'] = apiKeyId;
          headers['X-API-Key'] = apiKeyId;
        }

        const audioBytes = audio instanceof Buffer ? audio : Buffer.from(audio);
        const form = new FormData();
        form.append('audio_file', new Blob([new Uint8Array(audioBytes)], { type: 'audio/wav' }), 'speech.wav');
        form.append('language_code', language);
        form.append('format', options.format || 'transcribe');
        if (options.itnNativeNumerals) form.append('itn_native_numerals', 'true');

        const biasList = (options.biasList || [])
          .filter((word) => /^[\p{L}]+$/u.test(word))
          .slice(0, 100);
        const validBiasScore = [0.5, 1, 1.5, 2].includes(options.biasScore || 0);
        if (biasList.length && validBiasScore) {
          form.append('bias_list', JSON.stringify(biasList));
          form.append('bias_score', String(options.biasScore));
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: form,
          signal,
        });

        if (!response.ok) {
          await response.arrayBuffer();
          const message = response.status === 401 || response.status === 403
            ? 'Gnani Prisma rejected the server credentials. Check the rotated API key and account access.'
            : response.status === 429
              ? 'Gnani Prisma is rate-limiting requests. Wait briefly, then retry.'
              : response.status === 503
                ? 'Gnani Prisma is temporarily unavailable. Try again shortly.'
                : 'Gnani Prisma could not transcribe this audio. Check the audio format and try again.';
          throw new PrismaApiError(response.status, message);
        }

        const data: {
          transcript?: string;
          text?: string;
          results?: Array<{ transcript?: string }>;
          confidence?: number;
        } = await response.json();
        const text = data.transcript || data.text || (data.results && data.results[0]?.transcript) || '';
        const confidence = typeof data.confidence === 'number' ? data.confidence : undefined;

        return {
          text: text.trim(),
          language,
          confidence,
          durationMs: Date.now() - startTime,
          isFinal: true,
        };
      }, 2, 250);
    });
  }
}
