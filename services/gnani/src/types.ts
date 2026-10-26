export interface SupportedLanguage {
  code: string; // BCP-47, e.g., 'hi-IN'
  name: string; // 'Hindi'
  nativeName: string; // 'हिन्दी'
  script: string; // 'Devanagari'
  stt: boolean; // Prisma support
  tts: boolean; // Timbre support
  supportsCodeMixing: boolean; // Hinglish, Tanglish, etc.
  voices: { id: string; name: string; gender: 'female' | 'male' }[];
}

export interface TranscribeOptions {
  audioFormat?: 'wav' | 'pcm' | 'webm' | 'ogg';
  sampleRate?: number;
  encoding?: 'LINEAR16' | 'OPUS';
  interimResults?: boolean;
  format?: 'verbatim' | 'transcribe';
  itnNativeNumerals?: boolean;
  biasList?: string[];
  biasScore?: 0 | 0.5 | 1 | 1.5 | 2;
}

export interface TranscribeResult {
  text: string;
  language: string;
  confidence: number;
  durationMs?: number;
  isFinal: boolean;
}

export interface TranslateOptions {
  domain?: 'conversational' | 'formal';
}

export interface TranslateResult {
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  latencyMs: number;
}

export interface SynthesizeOptions {
  voiceId?: string;
  gender?: 'female' | 'male';
  audioFormat?: 'wav' | 'mp3';
  speed?: number; // 0.8 to 1.2
}

export interface SynthesizeResult {
  audioBase64: string;
  audioBuffer?: Buffer;
  mimeType: string;
  language: string;
  durationMs?: number;
}

export interface ExplainOptions {
  userLanguage: string;
}

export interface ExplainResult {
  originalText: string;
  explanation: string;
  language: string;
  listenAudioBase64?: string;
}

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unconfigured' | 'offline';
  providerName: string;
  isMock: boolean;
  message: string;
  supportedLanguageCount: number;
}

export interface SpeechProvider {
  readonly name: string;
  readonly isMock: boolean;

  getHealth(): Promise<ProviderHealth>;
  listLanguages(): SupportedLanguage[];
  isLanguagePairSupported(sourceLang: string, targetLang: string): boolean;

  transcribe(audio: Buffer | Uint8Array, language: string, options?: TranscribeOptions): Promise<TranscribeResult>;
  translate(text: string, sourceLanguage: string, targetLanguage: string, options?: TranslateOptions): Promise<TranslateResult>;
  synthesize(text: string, language: string, options?: SynthesizeOptions): Promise<SynthesizeResult>;
  explain(text: string, language: string, options?: ExplainOptions): Promise<ExplainResult>;
}
