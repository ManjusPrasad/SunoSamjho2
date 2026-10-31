import { IncomingMessage } from 'node:http';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import { SUPPORTED_LANGUAGES } from '@sunosamjho/gnani';

export const PRISMA_FRAME_BYTES = 1024;
const MAX_ACTIVE_SESSIONS = 20;
const MAX_SESSIONS_PER_IP = 3;
const MAX_UPSTREAM_BUFFERED_BYTES = 64 * 1024;
const SESSION_IDLE_TIMEOUT_MS = 30_000;
const UPSTREAM_CONNECT_TIMEOUT_MS = 15_000;

export interface PrismaDictationConfig {
  apiKeyId?: string;
  endpoint: string;
  enabled: boolean;
  allowedOrigins: string[];
}

export function toPrismaRealtimeUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  if ((url.protocol !== 'https:' && url.protocol !== 'wss:')
    || url.username
    || url.password
    || url.search) {
    throw new Error('Prisma realtime requires a secure HTTPS or WSS endpoint.');
  }
  url.protocol = 'wss:';
  url.pathname = '/stt/v3/stream';
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function isSupportedPrismaLanguage(language: string): boolean {
  return SUPPORTED_LANGUAGES.some((item) => item.stt && item.code === language);
}

export function isPrismaFrame(data: RawData): boolean {
  if (Array.isArray(data)) return Buffer.concat(data).byteLength === PRISMA_FRAME_BYTES;
  if (Buffer.isBuffer(data)) return data.byteLength === PRISMA_FRAME_BYTES;
  return data.byteLength === PRISMA_FRAME_BYTES;
}

function toBuffer(data: RawData): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return Buffer.concat(data);
  return Buffer.from(data);
}

function rejectionMessage(statusCode?: number): string {
  if (statusCode === 401 || statusCode === 403) return 'Gnani Prisma rejected the server credentials. Check the rotated API key and account access.';
  if (statusCode === 429) return 'Gnani Prisma is rate-limiting requests. Wait briefly, then retry.';
  if (statusCode === 503) return 'Gnani Prisma is temporarily unavailable. Try again shortly.';
  return 'Could not connect to Gnani Prisma realtime transcription. Check the provider configuration and try again.';
}

export class PrismaDictationHub {
  private activeSessions = 0;
  private sessionsByIp = new Map<string, number>();

  constructor(private wss: WebSocketServer, private config: PrismaDictationConfig) {
    this.wss.on('connection', (client, request) => {
      this.handleConnection(client, request);
    });
  }

  private handleConnection(client: WebSocket, request: IncomingMessage) {
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const language = requestUrl.searchParams.get('language') || '';
    const origin = request.headers.origin;
    const remoteAddress = request.socket.remoteAddress || 'unknown';

    const reject = (message: string, code = 1008) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'error', message }));
        client.close(code, 'Dictation unavailable');
      } else {
        client.terminate();
      }
    };

    if (!this.config.enabled || !this.config.apiKeyId) {
      reject('Real Prisma transcription is not configured. Add a rotated Gnani API key to the server environment and restart the API.', 1011);
      return;
    }

    if (!isSupportedPrismaLanguage(language)) {
      reject('This speech language is not supported by the configured Prisma service.');
      return;
    }

    const wildcardOrigin = this.config.allowedOrigins.includes('*');
    if ((process.env.NODE_ENV === 'production' && (!origin || wildcardOrigin))
      || (origin && !wildcardOrigin && !this.config.allowedOrigins.includes(origin))) {
      reject('This browser origin is not allowed to start a Prisma transcription session.');
      return;
    }

    if (this.activeSessions >= MAX_ACTIVE_SESSIONS || (this.sessionsByIp.get(remoteAddress) || 0) >= MAX_SESSIONS_PER_IP) {
      reject('Too many active transcription sessions. Stop another session or retry shortly.', 1013);
      return;
    }

    let endpoint: string;
    try {
      const endpointUrl = new URL(this.config.endpoint);
      if (endpointUrl.protocol !== 'wss:' || endpointUrl.username || endpointUrl.password || endpointUrl.search) {
        throw new Error('The Prisma realtime endpoint must use WSS and cannot contain embedded credentials.');
      }
      endpoint = endpointUrl.toString();
    } catch {
      reject('The Prisma realtime endpoint is invalid. Check the server configuration.', 1011);
      return;
    }

    this.activeSessions += 1;
    this.sessionsByIp.set(remoteAddress, (this.sessionsByIp.get(remoteAddress) || 0) + 1);

    let released = false;
    let upstreamReady = false;
    const releaseSession = () => {
      if (released) return;
      released = true;
      this.activeSessions = Math.max(0, this.activeSessions - 1);
      const currentCount = this.sessionsByIp.get(remoteAddress) || 0;
      if (currentCount <= 1) this.sessionsByIp.delete(remoteAddress);
      else this.sessionsByIp.set(remoteAddress, currentCount - 1);
    };

    let upstream: WebSocket;
    try {
      upstream = new WebSocket(endpoint, {
        headers: {
          'x-api-key-id': this.config.apiKeyId,
          'x-api-key': this.config.apiKeyId,
          lang_code: language,
          'x-sample-rate': '16000',
          'x-format': 'transcribe',
        },
        handshakeTimeout: UPSTREAM_CONNECT_TIMEOUT_MS,
        maxPayload: 1024 * 1024,
      });
    } catch {
      releaseSession();
      reject('Could not open a secure connection to Gnani Prisma.');
      return;
    }

    let idleTimer: NodeJS.Timeout | undefined;
    const clearIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = undefined;
    };
    const resetIdleTimer = () => {
      clearIdleTimer();
      idleTimer = setTimeout(() => {
        reject('The transcription stream was idle for too long. Start a new recording to continue.', 1001);
        upstream.close();
      }, SESSION_IDLE_TIMEOUT_MS);
    };
    const closeUpstream = () => {
      clearIdleTimer();
      releaseSession();
      if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
        upstream.close();
      }
    };

    resetIdleTimer();

    client.on('message', (data: RawData, isBinary: boolean) => {
      if (!isBinary || !isPrismaFrame(data)) {
        reject('Audio frames must be binary PCM and exactly 1,024 bytes.');
        closeUpstream();
        return;
      }
      if (!upstreamReady || upstream.readyState !== WebSocket.OPEN) {
        reject('Prisma transcription is not ready yet. Please retry.');
        closeUpstream();
        return;
      }
      if (upstream.bufferedAmount > MAX_UPSTREAM_BUFFERED_BYTES) {
        reject('Audio is arriving faster than the provider can process it. Retry with a more stable connection.', 1013);
        closeUpstream();
        return;
      }
      resetIdleTimer();
      upstream.send(toBuffer(data), { binary: true }, (error) => {
        if (error) {
          reject('Could not forward audio to Gnani Prisma. Retry the recording.');
          closeUpstream();
        }
      });
    });

    client.on('close', closeUpstream);
    client.on('error', () => {
      closeUpstream();
    });

    upstream.on('message', (data: RawData, isBinary: boolean) => {
      if (isBinary || client.readyState !== WebSocket.OPEN) return;
      const message = toBuffer(data).toString('utf8');
      try {
        const event = JSON.parse(message);
        if (event.type === 'connected') upstreamReady = true;
        if (event.type === 'error' && !upstreamReady) {
          reject(typeof event.message === 'string' ? event.message : rejectionMessage());
          closeUpstream();
          return;
        }
      } catch {
        reject('Gnani Prisma returned an unreadable realtime response.');
        closeUpstream();
        return;
      }
      client.send(message);
    });

    upstream.on('unexpected-response', (_request, response) => {
      const message = rejectionMessage(response.statusCode);
      response.resume();
      reject(message, response.statusCode === 429 ? 1013 : 1011);
      closeUpstream();
    });

    upstream.on('error', () => {
      if (client.readyState === WebSocket.OPEN) {
        reject(rejectionMessage());
      }
      closeUpstream();
    });

    upstream.on('close', (code) => {
      if (client.readyState === WebSocket.OPEN && code !== 1000 && code !== 1005) {
        reject(rejectionMessage(code));
      } else if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Prisma stream closed');
      }
      closeUpstream();
    });
  }
}
