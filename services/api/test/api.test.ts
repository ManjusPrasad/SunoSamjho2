import { test } from 'node:test';
import assert from 'node:assert';
import { generateRoomCode, generateApiKey, hashApiKey } from '../src/utils/id.js';
import { db } from '../src/db/store.js';
import { MockSpeechProvider } from '@sunosamjho/gnani';

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
