import { EventEmitter } from 'node:events';
import { ConversationRoom, ConversationEventHandler } from './types.js';

// Resolve WebSocket dynamically for Node and Browser
let WSConstructor: any;
if (typeof window !== 'undefined' && window.WebSocket) {
  WSConstructor = window.WebSocket;
} else {
  try {
    const wsModule = await import('ws');
    WSConstructor = wsModule.default || wsModule.WebSocket;
  } catch {
    WSConstructor = globalThis.WebSocket;
  }
}

export class ConversationSession extends EventEmitter {
  private ws: any = null;
  private isExplicitlyClosed = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(
    public readonly room: ConversationRoom,
    private wsBaseUrl: string,
    private participantLabel = 'Developer Client'
  ) {
    super();
  }

  // Type-safe event listeners
  override on<K extends keyof ConversationEventHandler>(
    event: K,
    listener: ConversationEventHandler[K]
  ): this {
    return super.on(event, listener as any);
  }

  override emit<K extends keyof ConversationEventHandler>(
    event: K,
    ...args: Parameters<ConversationEventHandler[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  /**
   * Connect to the real-time conversation WebSocket stream
   */
  start(): void {
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
      return;
    }

    this.isExplicitlyClosed = false;
    const url = `${this.wsBaseUrl}/api/v1/realtime/${this.room.id}`;

    try {
      this.ws = new WSConstructor(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.ws.send(
          JSON.stringify({
            type: 'join',
            participantLabel: this.participantLabel,
            assignedLanguage: this.room.sourceLanguage,
            isHost: true,
          })
        );
      };

      this.ws.onmessage = (event: any) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : event.data.toString();
          const data = JSON.parse(raw);

          if (data.type === 'connected') {
            this.emit('connected', data);
          } else if (data.type === 'transcript') {
            this.emit('transcript', data);
          } else if (data.type === 'translation_complete') {
            this.emit('translation', data);
            if (data.audioBase64) {
              this.emit('audio', {
                audioBase64: data.audioBase64,
                mimeType: data.mimeType || 'audio/wav',
                language: data.targetLanguage,
              });
            }
          } else if (data.type === 'speech_status') {
            this.emit('speech_status', data);
          } else if (data.type === 'error') {
            this.emit('error', new Error(data.message));
          }
        } catch (err: any) {
          this.emit('error', err);
        }
      };

      this.ws.onerror = (err: any) => {
        this.emit('error', new Error(err.message || 'WebSocket connection error'));
      };

      this.ws.onclose = () => {
        this.emit('disconnected');
        if (!this.isExplicitlyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          setTimeout(() => this.start(), delay);
        }
      };
    } catch (err: any) {
      this.emit('error', err);
    }
  }

  /**
   * Send speech audio segment (base64 WAV or PCM) to be transcribed and translated
   */
  sendAudioFrame(audioBase64: string, language?: string): void {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(
        JSON.stringify({
          type: 'audio_frame',
          audioBase64,
          language: language || this.room.sourceLanguage,
        })
      );
    } else {
      throw new Error('Cannot send audio: WebSocket is not connected.');
    }
  }

  /**
   * Request plain simplifying explanation for an utterance
   */
  requestExplanation(text: string, language?: string): void {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(
        JSON.stringify({
          type: 'explain',
          text,
          language: language || this.room.sourceLanguage,
        })
      );
    }
  }

  /**
   * Stop conversation and close connection
   */
  stop(): void {
    this.isExplicitlyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
