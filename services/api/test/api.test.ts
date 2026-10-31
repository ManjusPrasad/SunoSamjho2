import { test } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { generateRoomCode, generateApiKey, hashApiKey } from '../src/utils/id.js';
import { db } from '../src/db/store.js';
import { MockSpeechProvider } from '@sunosamjho/gnani';
import { createSpeechRouter } from '../src/routes/speech.js';
import {
  isPrismaFrame,
  isSupportedPrismaLanguage,
  PRISMA_FRAME_BYTES,
  toPrismaRealtimeUrl,
} from '../src/websocket/prismaDictation.js';

test('Room code generation produces unguessable codes without ambiguous characters', () => {
  const code1 = generateRoomCode();
  const code2 = generateRoomCode();
  assert.ok(code1.startsWith('SJ-'));
  assert.ok(code2.startsWith('SJ-'));
  assert.notStrictEqual(code1, code2);
  // Verify no 0, O, 1, I in code
  assert.strictEqual(/[0O1IL]/.test(code1), false);
  assert.strictEqual(/[0O1IL]/.test(code2), false);
});

test('API key generation and SHA-256 hashing', () => {
  const { secretKey, keyPrefix } = generateApiKey();
  assert.ok(secretKey.startsWith('ss_live_'));
  assert.ok(secretKey.startsWith(keyPrefix));

  const hash1 = hashApiKey(secretKey);
  const hash2 = hashApiKey(secretKey);
  assert.strictEqual(hash1, hash2);
  assert.strictEqual(hash1.length, 64);
});

test('Database store operations: room creation, joining, transcripts', () => {
  const code = generateRoomCode();
  const room = db.createRoom({
    roomCode: code,
    sourceLanguage: 'hi-IN',
    targetLanguage: 'kn-IN',
  });

  assert.strictEqual(room.roomCode, code);
  assert.strictEqual(room.status, 'active');

  const fetched = db.getRoomByCode(code);
  assert.ok(fetched);
  assert.strictEqual(fetched.id, room.id);

  const participant = db.addParticipant({
    roomId: room.id,
    sessionId: 'test-session-123',
    participantLabel: 'Tester',
    assignedLanguage: 'hi-IN',
  });
  assert.strictEqual(participant.participantLabel, 'Tester');

  const pList = db.getParticipants(room.id);
  assert.strictEqual(pList.length, 1);

  db.addMessage({
    roomId: room.id,
    speakerLabel: 'Tester',
    sourceLanguage: 'hi-IN',
    targetLanguage: 'kn-IN',
    originalText: 'नमस्ते',
    translatedText: 'ನಮಸ್ಕಾರ',
  });
  assert.strictEqual(db.endRoom(room.id), true);
  const savedTranscript = db.listTranscripts().find((transcript) => transcript.roomId === room.id);
  assert.ok(savedTranscript);
  assert.strictEqual(savedTranscript.messages[0].originalText, 'नमस्ते');
  assert.strictEqual(savedTranscript.messages[0].translatedText, 'ನಮಸ್ಕಾರ');
});

test('Mock provider security guard: Refuses execution when NODE_ENV=production', () => {
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  assert.throws(
    () => {
      new MockSpeechProvider();
    },
    /SECURITY VIOLATION.*strictly prohibited when NODE_ENV=production/
  );

  process.env.NODE_ENV = prevEnv;
});

test('Prisma realtime proxy validates frame size and supported language', () => {
  assert.strictEqual(PRISMA_FRAME_BYTES, 1024);
  assert.strictEqual(isPrismaFrame(Buffer.alloc(1024)), true);
  assert.strictEqual(isPrismaFrame(Buffer.alloc(1023)), false);
  assert.strictEqual(isPrismaFrame(new ArrayBuffer(1024)), true);
  assert.strictEqual(isSupportedPrismaLanguage('hi-IN'), true);
  assert.strictEqual(isSupportedPrismaLanguage('fr-FR'), false);
});

test('Prisma realtime URL always uses secure transport and the documented stream path', () => {
  assert.strictEqual(
    toPrismaRealtimeUrl('https://api.vachana.ai/custom/path'),
    'wss://api.vachana.ai/stt/v3/stream'
  );
  assert.throws(() => toPrismaRealtimeUrl('http://localhost:4000'), /secure HTTPS or WSS endpoint/);
});

test('Mock provider refuses AI routes instead of returning sample speech, translations, or audio', async () => {
  const app = express();
  app.use(express.json());
  app.use(createSpeechRouter(new MockSpeechProvider()));
  const server = app.listen(0);

  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const requests = [
      {
        path: '/transcribe',
        body: {
        audioBase64: Buffer.from('audio').toString('base64'),
        language: 'hi-IN',
        },
        code: 'SPEECH_RECOGNITION_UNAVAILABLE',
      },
      {
        path: '/translate',
        body: { text: 'Hello', sourceLanguage: 'en-IN', targetLanguage: 'hi-IN' },
        code: 'TRANSLATION_UNAVAILABLE',
      },
      {
        path: '/speak',
        body: { text: 'Hello', language: 'en-IN' },
        code: 'SPEECH_SYNTHESIS_UNAVAILABLE',
      },
      {
        path: '/explain',
        body: { text: 'Hello', language: 'en-IN' },
        code: 'EXPLANATION_UNAVAILABLE',
      },
    ];

    for (const request of requests) {
      const response = await fetch(`${baseUrl}${request.path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body),
      });
      const data = await response.json() as { error?: { code?: string; message?: string }; transcript?: string; translatedText?: string; audioBase64?: string };
      assert.strictEqual(response.status, 503, request.path);
      assert.strictEqual(data.error?.code, request.code, request.path);
      assert.match(data.error?.message || '', /not configured/i, request.path);
      assert.strictEqual(data.transcript, undefined, request.path);
      assert.strictEqual(data.translatedText, undefined, request.path);
      assert.strictEqual(data.audioBase64, undefined, request.path);
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
