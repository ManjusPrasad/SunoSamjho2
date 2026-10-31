import {
  SpeechProvider,
  ProviderHealth,
  SupportedLanguage,
  TranscribeOptions,
  TranscribeResult,
  TranslateOptions,
  TranslateResult,
  SynthesizeOptions,
  SynthesizeResult,
  ExplainOptions,
  ExplainResult,
} from './types.js';
import { SUPPORTED_LANGUAGES, areLanguagesCompatible } from './languages.js';

export class MockSpeechProvider implements SpeechProvider {
  readonly name = 'Gnani-Mock-Provider (Development Mode Only)';
  readonly isMock = true;

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SECURITY VIOLATION: MockSpeechProvider is strictly prohibited when NODE_ENV=production. ' +
        'Please supply real Gnani credentials (GNANI_API_KEY / GNANI_API_KEY_ID).'
      );
    }
  }

  async getHealth(): Promise<ProviderHealth> {
    return {
      status: 'degraded',
      providerName: this.name,
      isMock: true,
      message: 'Gnani speech services are not configured. Mock mode does not recognize, translate, or synthesize speech.',
      supportedLanguageCount: SUPPORTED_LANGUAGES.length,
    };
  }

  listLanguages(): SupportedLanguage[] {
    return SUPPORTED_LANGUAGES;
  }

  isLanguagePairSupported(sourceLang: string, targetLang: string): boolean {
    return areLanguagesCompatible(sourceLang, targetLang);
  }

  async transcribe(
    _audio: Buffer | Uint8Array,
    _language: string,
    _options?: TranscribeOptions
  ): Promise<TranscribeResult> {
    throw new Error('Real Gnani Prisma transcription is not configured. Mock mode does not return sample transcripts.');
  }

  async translate(
    _text: string,
    _sourceLanguage: string,
    _targetLanguage: string,
    _options?: TranslateOptions
  ): Promise<TranslateResult> {
    throw new Error('Real Gnani Evon translation is not configured. Mock mode does not return sample translations.');
  }

  async synthesize(
    _text: string,
    _language: string,
    _options?: SynthesizeOptions
  ): Promise<SynthesizeResult> {
    throw new Error('Real Gnani Timbre speech synthesis is not configured. Mock mode does not return sample audio.');
  }

  async explain(
    _text: string,
    _language: string,
    _options?: ExplainOptions
  ): Promise<ExplainResult> {
    throw new Error('Real Gnani Evon is not configured. Mock mode does not return sample explanations.');
  }
}
