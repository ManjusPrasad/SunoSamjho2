import { Request, Response, NextFunction } from 'express';
import { hashApiKey } from '../utils/crypto.js';
import { db, ApiKeyRecord } from '../db/store.js';
import { ERROR_MESSAGES } from '../utils/errors.js';

declare global {
  namespace Express {
    interface Request {
      apiKeyRecord?: ApiKeyRecord;
    }
  }
}

/**
 * Validates Developer API Keys via SHA-256 hash lookup.
 * Protects developer API routes (/api/v1/transcribe, /api/v1/translate, /api/v1/speak).
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization header. Expected format: Bearer <API_KEY>',
        requestId: req.requestId,
      },
    });
    return;
  }

  const rawKey = authHeader.substring(7).trim();
  const keyHash = hashApiKey(rawKey);
  const keyRecord = db.findApiKeyByHash(keyHash);

  if (!keyRecord || !keyRecord.isActive) {
    res.status(401).json({
      error: {
        code: 'INVALID_API_KEY',
        message: ERROR_MESSAGES.INVALID_API_KEY,
        requestId: req.requestId,
      },
    });
    return;
  }

  db.incrementKeyUsage(keyHash);
  req.apiKeyRecord = keyRecord;
  next();
}

/**
 * Optional API key authentication:
 * If an API key is present, validates it. If not present (e.g. from the web app client), permits request.
 */
export function optionalApiKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawKey = authHeader.substring(7).trim();
    const keyHash = hashApiKey(rawKey);
    const keyRecord = db.findApiKeyByHash(keyHash);
    if (!keyRecord || !keyRecord.isActive) {
      res.status(401).json({
        error: {
          code: 'INVALID_API_KEY',
          message: ERROR_MESSAGES.INVALID_API_KEY,
          requestId: req.requestId,
        },
      });
      return;
    }
    db.incrementKeyUsage(keyHash);
    req.apiKeyRecord = keyRecord;
  }
  next();
}
