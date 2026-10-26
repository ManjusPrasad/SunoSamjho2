import { test } from 'node:test';
import assert from 'node:assert';
import { SunoSamjho } from '../src/client.js';
import { AuthenticationError, RateLimitError, RoomNotFoundError } from '../src/errors.js';

test('SunoSamjho SDK initializes with custom options', () => {
  const client = new SunoSamjho({
    apiKey: 'ss_live_demo1234567890abcdef123456',
    baseUrl: 'http://localhost:4000',
  });

  assert.ok(client);
  assert.ok(typeof client.conversations.create === 'function');
  assert.ok(typeof client.translate === 'function');
  assert.ok(typeof client.transcribe === 'function');
  assert.ok(typeof client.speak === 'function');
});

test('Typed SDK errors contain accurate status codes and codes', () => {
  const authErr = new AuthenticationError('Key invalid', 'req-123');
  assert.strictEqual(authErr.statusCode, 401);
  assert.strictEqual(authErr.code, 'AUTHENTICATION_ERROR');
  assert.strictEqual(authErr.requestId, 'req-123');

  const rateErr = new RateLimitError('Too many requests', 5, 'req-456');
  assert.strictEqual(rateErr.statusCode, 429);
  assert.strictEqual(rateErr.retryAfterSeconds, 5);

  const roomErr = new RoomNotFoundError('Room missing', 'req-789');
  assert.strictEqual(roomErr.statusCode, 404);
});
