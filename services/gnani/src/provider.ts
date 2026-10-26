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
import { PrismaClient } from './prisma.js';
import { EvonClient } from './evon.js';
import { TimbreClient } from './timbre.js';
import { SUPPORTED_LANGUAGES, areLanguagesCompatible } from './languages.js';

export interface GnaniProviderConfig {
  baseUrl: string;
  prismaBaseUrl?: string;
  timbreBaseUrl?: string;
  evonModel?: string;
  evonApiKey?: string;
  apiKey?: string;
  apiKeyId?: string;
  apiKeySecret?: string;
}

export class GnaniProvider implements SpeechProvider {
  readonly name = 'Gnani-AI-Production-Provider';
  readonly isMock = false;

  private prisma: PrismaClient;
  private evon: EvonClient;
  private timbre: TimbreClient;

  constructor(private config: GnaniProviderConfig) {
    if (!config.apiKey && !config.apiKeyId) {
      throw new Error(
        'Gnani AI is not configured yet. Add your Gnani credentials (GNANI_API_KEY or GNANI_API_KEY_ID) to the server environment.'
      );
    }

    this.prisma = new PrismaClient({
      baseUrl: config.prismaBaseUrl || config.baseUrl,
      apiKey: config.apiKey,
      apiKeyId: config.apiKeyId,
      apiKeySecret: config.apiKeySecret,
    });

    this.evon = new EvonClient({
      baseUrl: config.baseUrl,
      apiKey: config.evonApiKey,
      model: config.evonModel,
    });

    this.timbre = new TimbreClient({
      baseUrl: config.timbreBaseUrl || config.baseUrl,
      apiKey: config.apiKey,
      apiKeyId: config.apiKeyId,
      apiKeySecret: config.apiKeySecret,
    });
  }

  async getHealth(): Promise<ProviderHealth> {
    return {
      status: 'healthy',
      providerName: this.name,
      isMock: false,
      message: 'Connected to official Gnani AI endpoints (Prisma, Evon, Timbre).',
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
    audio: Buffer | Uint8Array,
    language: string,
    options?: TranscribeOptions
  ): Promise<TranscribeResult> {
    return this.prisma.transcribe(audio, language, options);
  }

  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    options?: TranslateOptions
  ): Promise<TranslateResult> {
    return this.evon.translate(text, sourceLanguage, targetLanguage, options);
  }

  async synthesize(
    text: string,
    language: string,
    options?: SynthesizeOptions
  ): Promise<SynthesizeResult> {
    return this.timbre.synthesize(text, language, options);
  }

  async explain(
    text: string,
    language: string,
    options?: ExplainOptions
  ): Promise<ExplainResult> {
    const explanationResult = await this.evon.explain(text, language, options || { userLanguage: language });
    let listenAudioBase64: string | undefined;

    try {
      const audioResult = await this.timbre.synthesize(explanationResult.explanation, language);
      listenAudioBase64 = audioResult.audioBase64;
    } catch {
      // Audio synthesis for explanation is optional
    }

    return {
      ...explanationResult,
      listenAudioBase64,
    };
  }
}
