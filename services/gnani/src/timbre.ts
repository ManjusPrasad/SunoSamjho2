import { SynthesizeOptions, SynthesizeResult } from './types.js';
import { CircuitBreaker, withRetry } from './circuitBreaker.js';

export interface TimbreConfig {
  baseUrl: string;
  apiKey?: string;
  apiKeyId?: string;
  apiKeySecret?: string;
}

export class TimbreClient {
  private breaker = new CircuitBreaker({ timeoutMs: 12000 });

  constructor(private config: TimbreConfig) {}

  /**
   * Synthesize Indic speech from text using Gnani Timbre TTS
   */
  async synthesize(
    text: string,
    language: string,
    options: SynthesizeOptions = {}
  ): Promise<SynthesizeResult> {
    const startTime = Date.now();

    return this.breaker.execute(async (signal) => {
      return withRetry(async () => {
        const url = `${this.config.baseUrl.replace(/\/$/, '')}/api/v1/tts/inference`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        const apiKeyId = this.config.apiKeyId || this.config.apiKey;
        if (apiKeyId) headers['X-API-Key-ID'] = apiKeyId;

        const languageVoices: Record<string, string> = {
          'hi-IN': 'Nalini', 'en-IN': 'Kaveri', 'ta-IN': 'Asmita', 'te-IN': 'Suhana',
          'kn-IN': 'Saanvi', 'ml-IN': 'Reshma', 'mr-IN': 'Zahira', 'bn-IN': 'Kirra',
          'gu-IN': 'Falak', 'pa-IN': 'Mehuli',
        };
        const voice = options.voiceId || languageVoices[language] || 'Nalini';
        const container = options.audioFormat === 'mp3' ? 'mp3' : 'wav';

        const payload = {
          text,
          voice,
          model: 'timbre-v2.5',
          language,
          speed: Math.min(1.15, Math.max(0.85, options.speed ?? 1.0)),
          audio_config: {
            sample_rate: 48000,
            num_channels: 1,
            sample_width: 2,
            encoding: 'linear_pcm',
            container,
          },
        };

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Gnani Timbre TTS failed [${response.status}]: ${errorText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const audioBase64 = buffer.toString('base64');

        return {
          audioBase64,
          audioBuffer: buffer,
          mimeType: options.audioFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav',
          language,
          durationMs: Date.now() - startTime,
        };
      }, 2, 250);
    });
  }
}
