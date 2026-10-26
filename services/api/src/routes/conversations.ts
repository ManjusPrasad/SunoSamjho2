import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/store.js';
import { generateRoomCode } from '../utils/id.js';
import { validate } from '../middleware/validate.js';
import { ERROR_MESSAGES } from '../utils/errors.js';

export const conversationsRouter = Router();

const createRoomSchema = z.object({
  sourceLanguage: z.string().default('hi-IN'),
  targetLanguage: z.string().default('kn-IN'),
  saveTranscripts: z.boolean().default(true),
  maxParticipants: z.number().int().min(2).max(10).default(2),
});

const postMessageSchema = z.object({
  speakerLabel: z.string().min(1),
  sourceLanguage: z.string().min(2),
  targetLanguage: z.string().min(2),
  originalText: z.string().min(1),
  translatedText: z.string().min(1),
  explanationText: z.string().optional(),
  audioDurationMs: z.number().optional(),
  latencyMs: z.number().optional(),
});

// POST /api/v1/conversations - Create room
conversationsRouter.post(
  '/',
  validate({ body: createRoomSchema }),
  (req: Request, res: Response) => {
    const roomCode = generateRoomCode();
    const room = db.createRoom({
      roomCode,
      sourceLanguage: req.body.sourceLanguage,
      targetLanguage: req.body.targetLanguage,
      saveTranscripts: req.body.saveTranscripts,
      maxParticipants: req.body.maxParticipants,
    });

    res.status(201).json({
      room,
      shareUrl: `/live?code=${room.roomCode}`,
    });
  }
);

// GET /api/v1/conversations/:idOrCode - Get room status & participants
conversationsRouter.get('/:idOrCode', (req: Request, res: Response) => {
  const { idOrCode } = req.params;
  let room = db.getRoomById(idOrCode);
  if (!room) {
    room = db.getRoomByCode(idOrCode);
  }

  if (!room) {
    res.status(404).json({
      error: {
        code: 'ROOM_NOT_FOUND',
        message: ERROR_MESSAGES.ROOM_NOT_FOUND,
        requestId: req.requestId,
      },
    });
    return;
  }

  const participants = db.getParticipants(room.id);
  const messages = db.getMessages(room.id);

  res.json({
    room,
    participants,
    messagesCount: messages.length,
  });
});

// POST /api/v1/conversations/:id/messages - Add message
conversationsRouter.post(
  '/:id/messages',
  validate({ body: postMessageSchema }),
  (req: Request, res: Response) => {
    const room = db.getRoomById(req.params.id) || db.getRoomByCode(req.params.id);
    if (!room) {
      res.status(404).json({
        error: {
          code: 'ROOM_NOT_FOUND',
          message: ERROR_MESSAGES.ROOM_NOT_FOUND,
          requestId: req.requestId,
        },
      });
      return;
    }

    const message = db.addMessage({
      roomId: room.id,
      speakerLabel: req.body.speakerLabel,
      sourceLanguage: req.body.sourceLanguage,
      targetLanguage: req.body.targetLanguage,
      originalText: req.body.originalText,
      translatedText: req.body.translatedText,
      explanationText: req.body.explanationText,
      audioDurationMs: req.body.audioDurationMs,
      latencyMs: req.body.latencyMs,
    });

    res.status(201).json({ message });
  }
);

// POST /api/v1/conversations/:id/end - End room
conversationsRouter.post('/:id/end', (req: Request, res: Response) => {
  const room = db.getRoomById(req.params.id) || db.getRoomByCode(req.params.id);
  if (!room) {
    res.status(404).json({
      error: {
        code: 'ROOM_NOT_FOUND',
        message: ERROR_MESSAGES.ROOM_NOT_FOUND,
        requestId: req.requestId,
      },
    });
    return;
  }

  db.endRoom(room.id);
  res.json({ success: true, message: 'Conversation ended successfully.' });
});
