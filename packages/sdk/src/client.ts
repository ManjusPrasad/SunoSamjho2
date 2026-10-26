import {
  SunoSamjhoClientOptions,
  CreateConversationOptions,
  ConversationRoom,
  TranscribeRequest,
  TranscribeResponse,
  TranslateRequest,
  TranslateResponse,
  SpeakRequest,
  SpeakResponse,
} from './types.js';
import { ConversationSession } from './conversation.js';
import { AuthenticationError, RateLimitError, RoomNotFoundError, SunoSamjhoError } from './errors.js';

export class SunoSamjho {
  private apiKey?: string;
  private baseUrl: string;
  private wsUrl: string;

  public readonly conversations: {
    create: (options: CreateConversationOptions) => Promise<ConversationSession>;
    get: (idOrCode: string) => Promise<ConversationRoom>;
  };

  constructor(options: SunoSamjhoClientOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || 'http://localhost:4000').replace(/\/$/, '');
    this.wsUrl = (options.wsUrl || this.baseUrl.replace(/^http/, 'ws')).replace(/\/$/, '');

    this.conversations = {
      create: async (opts) => this.createConversation(opts),
      get: async (idOrCode) => this.getConversation(idOrCode),
    };
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        // Non-JSON response
      }

      const message = errorData.error?.message || `HTTP ${response.status} Request failed`;
      const code = errorData.error?.code || 'API_ERROR';
      const reqId = errorData.error?.requestId;

      if (response.status === 401) {
        throw new AuthenticationError(message, reqId);
      }
      if (response.status === 429) {
        const retry = Number(response.headers.get('Retry-After')) || undefined;
        throw new RateLimitError(message, retry, reqId);
      }
      if (response.status === 404) {
        throw new RoomNotFoundError(message, reqId);
      }

      throw new SunoSamjhoError(message, code, response.status, reqId);
    }

    return response.json() as Promise<T>;
  }

  private async createConversation(options: CreateConversationOptions): Promise<ConversationSession> {
    const data = await this.request<{ room: ConversationRoom }>('/api/v1/conversations', {
      method: 'POST',
      body: JSON.stringify(options),
    });

    return new ConversationSession(data.room, this.wsUrl);
  }

  private async getConversation(idOrCode: string): Promise<ConversationRoom> {
    const data = await this.request<{ room: ConversationRoom }>(`/api/v1/conversations/${idOrCode}`);
    return data.room;
  }

  /**
   * Transcribe speech audio to text
   */
  async transcribe(req: TranscribeRequest): Promise<TranscribeResponse> {
    return this.request<TranscribeResponse>('/api/v1/transcribe', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  /**
   * Translate text between supported languages
   */
  async translate(req: TranslateRequest): Promise<TranslateResponse> {
    return this.request<TranslateResponse>('/api/v1/translate', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  /**
   * Synthesize text to spoken audio
   */
  async speak(req: SpeakRequest): Promise<SpeakResponse> {
    return this.request<SpeakResponse>('/api/v1/speak', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  /**
   * List supported Indian languages
   */
  async getLanguages(): Promise<any> {
    return this.request('/api/v1/languages');
  }
}
