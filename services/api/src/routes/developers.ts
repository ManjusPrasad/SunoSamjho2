import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/store.js';
import { generateApiKey, hashApiKey } from '../utils/id.js';
import { validate } from '../middleware/validate.js';

export const developersRouter = Router();

const createKeySchema = z.object({
  name: z.string().min(1, 'Key name is required').max(100),
  scopes: z.array(z.string()).optional(),
});

// POST /api/v1/developers/keys - Create API Key (SHOW SECRET ONCE)
developersRouter.post(
  '/keys',
  validate({ body: createKeySchema }),
  (req: Request, res: Response) => {
    const { name, scopes } = req.body;
    const { secretKey, keyPrefix } = generateApiKey();
    const keyHash = hashApiKey(secretKey);

    const record = db.createApiKey({
      name,
      keyPrefix,
      keyHash,
      scopes,
    });

    res.status(201).json({
      key: {
        id: record.id,
        name: record.name,
        keyPrefix: record.keyPrefix,
        scopes: record.scopes,
        createdAt: record.createdAt,
        // The raw secret is returned ONLY ONCE at creation time
        secretKey,
      },
      warning: 'Save this API key safely now. You will not be able to view the secret key again.',
    });
  }
);

// GET /api/v1/developers/keys - List API Keys (Never returns secrets)
developersRouter.get('/keys', (_req: Request, res: Response) => {
  const keys = db.listApiKeys();
  res.json({ keys });
});

// DELETE /api/v1/developers/keys/:id - Revoke API Key
developersRouter.delete('/keys/:id', (req: Request, res: Response) => {
  const revoked = db.revokeApiKey(req.params.id);
  if (!revoked) {
    res.status(404).json({
      error: {
        code: 'KEY_NOT_FOUND',
        message: 'The requested API key was not found.',
        requestId: req.requestId,
      },
    });
    return;
  }
  res.json({ success: true, message: 'API key has been revoked.' });
});

// GET /api/v1/developers/usage - Real usage metrics
developersRouter.get('/usage', (_req: Request, res: Response) => {
  const usage = db.getDeveloperUsage();
  res.json({ usage });
});
