import crypto from 'node:crypto';

// Characters excluding ambiguous ones (0, O, 1, I, L)
const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Generates an unguessable room code formatted like 'SJ-8K29P'
 * using cryptographically secure random bytes.
 */
export function generateRoomCode(): string {
  const bytes = crypto.randomBytes(5);
  let code = '';
  for (let i = 0; i < 5; i++) {
    const index = bytes[i] % ROOM_CODE_ALPHABET.length;
    code += ROOM_CODE_ALPHABET[index];
  }
  return `SJ-${code}`;
}

/**
 * Generates a high-entropy developer API key
 * Prefix: 'ss_live_' followed by 32 hex characters.
 */
export function generateApiKey(): { secretKey: string; keyPrefix: string } {
  const entropy = crypto.randomBytes(24).toString('hex');
  const secretKey = `ss_live_${entropy}`;
  const keyPrefix = secretKey.slice(0, 16);
  return { secretKey, keyPrefix };
}

/**
 * Computes SHA-256 hash for secure API key storage.
 */
export function hashApiKey(secretKey: string): string {
  return crypto.createHash('sha256').update(secretKey.trim()).digest('hex');
}
