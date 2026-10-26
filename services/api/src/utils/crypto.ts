import crypto from 'node:crypto';

export function hashApiKey(secretKey: string): string {
  return crypto.createHash('sha256').update(secretKey.trim()).digest('hex');
}
