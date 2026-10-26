import { Request, Response, NextFunction } from 'express';
import { ERROR_MESSAGES } from '../utils/errors.js';

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, RateLimitBucket>();

export interface RateLimitOptions {
  capacity?: number; // Maximum burst tokens
  refillRate?: number; // Tokens added per second
}

/**
 * Token-bucket rate limiter.
 * Emits HTTP 429 with standard Retry-After header upon quota exhaustion.
 */
export function rateLimiter(options: RateLimitOptions = {}) {
  const capacity = options.capacity ?? 60; // 60 requests
  const refillRate = options.refillRate ?? 10; // 10 requests per second

  return (req: Request, res: Response, next: NextFunction) => {
    // Key by Developer API key if authenticated, else IP address
    const authHeader = req.headers['authorization'];
    const clientKey = authHeader || req.ip || req.socket.remoteAddress || 'unknown';

    const now = Date.now();
    let bucket = buckets.get(clientKey);

    if (!bucket) {
      bucket = { tokens: capacity, lastRefill: now };
      buckets.set(clientKey, bucket);
    } else {
      // Calculate token refill
      const elapsedSeconds = (now - bucket.lastRefill) / 1000;
      bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * refillRate);
      bucket.lastRefill = now;
    }

    if (bucket.tokens < 1) {
      const waitSeconds = Math.ceil((1 - bucket.tokens) / refillRate);
      res.setHeader('Retry-After', String(waitSeconds));
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
          requestId: req.requestId,
          details: { retryAfterSeconds: waitSeconds },
        },
      });
      return;
    }

    bucket.tokens -= 1;
    next();
  };
}
