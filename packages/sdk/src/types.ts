export interface SunoSamjhoClientOptions {
  apiKey?: string;
  baseUrl?: string;
  wsUrl?: string;
  timeoutMs?: number;
}

export interface CreateConversationOptions {
  sourceLanguage: string;
  targetLanguage: string;
  saveTranscripts?: boolean;
  maxParticipants?: number;
}

export interface ConversationRoom {
  id: string;
  roomCode: string;
  status: string;
  sourceLanguage: string;
  targetLanguage: string;
  createdAt: string;
  expiresAt: string;
}

export interface TranscriptEvent {
  sessionId: string;
  speakerLabel: string;
  sourceLanguage: string;
  text: string;
  isFinal: boolean;
}

export interface TranslationEvent {
  messageId: string;
  sessionId: string;
  speakerLabel: string;
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
  audioBase64?: string;
  mimeType?: string;
  latencyMs: number;
  timestamp: string;
}

export interface AudioEvent {
  audioBase64: string;
  mimeType: string;
  language: string;
  durationMs?: number;
}

export interface TranscribeRequest {
  audioBase64: string;
  language: string;
  audioFormat?: 'wav' | 'pcm' | 'webm' | 'ogg';
  sampleRate?: number;
}

export interface TranscribeResponse {
  transcript: string;
  language: string;
  confidence: number;
  durationMs?: number;
  isFinal: boolean;
}

export interface TranslateRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  domain?: 'conversational' | 'formal';
}

export interface TranslateResponse {
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  latencyMs: number;
}

export interface SpeakRequest {
  text: string;
  language: string;
  voiceId?: string;
  gender?: 'female' | 'male';
  audioFormat?: 'wav' | 'mp3';
  speed?: number;
}

export interface SpeakResponse {
  audioBase64: string;
  mimeType: string;
  language: string;
  durationMs?: number;
}

export type ConversationEventHandler = {
  connected: (info: { sessionId: string; roomId: string; roomCode: string }) => void;
  transcript: (event: TranscriptEvent) => void;
  translation: (event: TranslationEvent) => void;
  audio: (event: AudioEvent) => void;
  speech_status: (event: { sessionId: string; status: string }) => void;
  error: (error: Error) => void;
  disconnected: () => void;
};
