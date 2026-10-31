import http from 'node:http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { createSpeechProvider } from '@sunosamjho/gnani';

import { requestIdMiddleware } from './middleware/requestId.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { conversationsRouter } from './routes/conversations.js';
import { createSpeechRouter } from './routes/speech.js';
import { historyRouter } from './routes/history.js';
import { developersRouter } from './routes/developers.js';
import { RealtimeHub } from './websocket/hub.js';
import { PrismaDictationHub, PRISMA_FRAME_BYTES, toPrismaRealtimeUrl } from './websocket/prismaDictation.js';
import { AppError, ERROR_MESSAGES } from './utils/errors.js';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Look for .env in current working dir and repository root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';
const corsOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = corsOrigins.length ? corsOrigins : ['*'];

// 1. Initialize Gnani Speech Provider
let speechProvider: any;
try {
  const resolution = createSpeechProvider();
  speechProvider = resolution.provider;
  console.log(`[SunoSamjho Server] ${resolution.statusMessage}`);
} catch (err: any) {
  console.error('\n======================================================');
  console.error('❌  CONFIG ERROR:', err.message);
  console.error('======================================================\n');
  process.exit(1);
}

// 2. Global Middleware
app.use(requestIdMiddleware);
app.use(
  cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-api-key'],
  })
);
app.use(express.json({ limit: '14mb' }));
app.use(rateLimiter({ capacity: 120, refillRate: 20 }));

// 3. Health & Status Check
app.get('/api/v1/health', async (req: Request, res: Response) => {
  const providerHealth = await speechProvider.getHealth();
  const speechKeyConfigured = Boolean(process.env.GNANI_API_KEY_ID?.trim() || process.env.GNANI_API_KEY?.trim());
  const evonEndpointConfigured = Boolean(process.env.GNANI_EVON_BASE_URL?.trim());
  res.json({
    status: providerHealth.status,
    timestamp: new Date().toISOString(),
    service: 'SunoSamjho API Server',
    version: '1.0.0',
    provider: providerHealth,
    integrations: {
      prisma: { configured: !providerHealth.isMock && speechKeyConfigured, mode: providerHealth.isMock ? 'mock' : 'real' },
      prismaRealtime: { configured: !providerHealth.isMock && speechKeyConfigured },
      timbre: { configured: !providerHealth.isMock && speechKeyConfigured, mode: providerHealth.isMock ? 'mock' : 'real' },
      evon: { configured: !providerHealth.isMock && evonEndpointConfigured, mode: providerHealth.isMock ? 'mock' : evonEndpointConfigured ? 'endpoint-configured' : 'needs-inference-endpoint' },
    },
    environment: process.env.NODE_ENV || 'development',
  });
});

// 4. API Routes
app.use('/api/v1/conversations', conversationsRouter);
app.use('/api/v1', createSpeechRouter(speechProvider));
app.use('/api/v1/history', historyRouter);
app.use('/api/v1/developers', developersRouter);

// 5. 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `The endpoint ${req.method} ${req.path} does not exist.`,
      requestId: req.requestId,
    },
  });
});

// 6. Global Sanitized Error Handler (Never leaks stacks, credentials, or internal paths)
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[Error] [Req: ${req.requestId}]`, err.message || err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        requestId: req.requestId,
        details: err.details,
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: ERROR_MESSAGES.INTERNAL_ERROR,
      requestId: req.requestId,
    },
  });
});

// 7. HTTP & WebSocket Server Creation
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true, maxPayload: 14 * 1024 * 1024, perMessageDeflate: false });
const dictationWss = new WebSocketServer({ noServer: true, maxPayload: PRISMA_FRAME_BYTES, perMessageDeflate: false });
new RealtimeHub(wss, speechProvider);
const prismaApiKeyId = process.env.GNANI_API_KEY_ID?.trim() || process.env.GNANI_API_KEY?.trim();
const prismaBaseUrl = process.env.GNANI_PRISMA_BASE_URL?.trim() || 'https://api.vachana.ai';
const prismaRealtimeEndpoint = process.env.GNANI_PRISMA_WS_URL?.trim() || toPrismaRealtimeUrl(prismaBaseUrl);
const configuredPrismaRealtimeUrl = new URL(prismaRealtimeEndpoint);
if (configuredPrismaRealtimeUrl.protocol !== 'wss:'
  || configuredPrismaRealtimeUrl.username
  || configuredPrismaRealtimeUrl.password
  || configuredPrismaRealtimeUrl.search) {
  throw new Error('GNANI_PRISMA_WS_URL must use WSS and must not contain embedded credentials or query parameters.');
}
new PrismaDictationHub(dictationWss, {
  apiKeyId: prismaApiKeyId,
  endpoint: prismaRealtimeEndpoint,
  enabled: !speechProvider.isMock && Boolean(prismaApiKeyId),
  allowedOrigins,
});

server.on('upgrade', (request, socket, head) => {
  let pathname: string;
  try {
    pathname = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).pathname;
  } catch {
    socket.destroy();
    return;
  }

  const target = pathname === '/api/v1/dictation/realtime'
    ? dictationWss
    : pathname.startsWith('/api/v1/realtime/')
      ? wss
      : undefined;
  if (!target) {
    socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }

  target.handleUpgrade(request, socket, head, (websocket) => {
    target.emit('connection', websocket, request);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 [SunoSamjho Live API] Listening on http://${HOST}:${PORT}`);
  console.log(`⚡ [SunoSamjho WebSocket] Ready at ws://${HOST}:${PORT}/api/v1/realtime/:conversationId`);
});

// Graceful termination
const shutdown = () => {
  console.log('\n[SunoSamjho Server] Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
