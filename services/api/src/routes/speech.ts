import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SpeechProvider } from '@sunosamjho/gnani';
import { validate } from '../middleware/validate.js';
import { optionalApiKey } from '../middleware/auth.js';
import { ERROR_MESSAGES } from '../utils/errors.js';

export function createSpeechRouter(provider: SpeechProvider): Router {
  const router = Router();

  const transcribeSchema = z.object({
    audioBase64: z.string().min(1, 'Audio base64 payload is required.'),
    language: z.string().min(2, 'Valid language code is required.'),
    audioFormat: z.enum(['wav', 'pcm', 'webm', 'ogg']).optional().default('wav'),
    sampleRate: z.number().optional().default(16000),
  });

  const translateSchema = z.object({
    text: z.string().min(1, 'Text is required.'),
    sourceLanguage: z.string().min(2),
    targetLanguage: z.string().min(2),
    domain: z.enum(['conversational', 'formal']).optional().default('conversational'),
  });

  const speakSchema = z.object({
    text: z.string().min(1, 'Text is required.'),
    language: z.string().min(2),
    voiceId: z.string().optional(),
    gender: z.enum(['female', 'male']).optional().default('female'),
    audioFormat: z.enum(['wav', 'mp3']).optional().default('wav'),
    speed: z.number().min(0.5).max(2.0).optional().default(1.0),
  });

  const explainSchema = z.object({
    text: z.string().min(1, 'Text is required.'),
    language: z.string().min(2),
  });

  // GET /api/v1/languages - List supported languages and capabilities
  router.get('/languages', (_req: Request, res: Response) => {
    const languages = provider.listLanguages();
    res.json({
      languages,
      total: languages.length,
      provider: provider.name,
      isMock: provider.isMock,
    });
  });

  // POST /api/v1/transcribe - Speech-to-Text
  router.post(
    '/transcribe',
    optionalApiKey,
    validate({ body: transcribeSchema }),
    async (req: Request, res: Response) => {
      try {
        const { audioBase64, language, audioFormat, sampleRate } = req.body;
        const audioBuffer = Buffer.from(audioBase64, 'base64');

        const result = await provider.transcribe(audioBuffer, language, {
          audioFormat,
          sampleRate,
        });

        res.json({
          transcript: result.text,
          language: result.language,
          confidence: result.confidence,
          durationMs: result.durationMs,
          isFinal: result.isFinal,
        });
      } catch (error: any) {
        res.status(502).json({
          error: {
            code: 'SPEECH_RECOGNITION_ERROR',
            message: error.message || ERROR_MESSAGES.GNANI_UNAVAILABLE,
            requestId: req.requestId,
          },
        });
      }
    }
  );

  // POST /api/v1/translate - Machine Translation
  router.post(
    '/translate',
    optionalApiKey,
    validate({ body: translateSchema }),
    async (req: Request, res: Response) => {
      try {
        const { text, sourceLanguage, targetLanguage, domain } = req.body;

        if (!provider.isLanguagePairSupported(sourceLanguage, targetLanguage)) {
          res.status(400).json({
            error: {
              code: 'UNSUPPORTED_LANGUAGE_PAIR',
              message: `Translation from ${sourceLanguage} to ${targetLanguage} is not supported.`,
              requestId: req.requestId,
            },
          });
          return;
        }

        const result = await provider.translate(text, sourceLanguage, targetLanguage, {
          domain,
        });

        res.json(result);
      } catch (error: any) {
        res.status(502).json({
          error: {
            code: 'TRANSLATION_ERROR',
            message: error.message || ERROR_MESSAGES.GNANI_UNAVAILABLE,
            requestId: req.requestId,
          },
        });
      }
    }
  );

  // POST /api/v1/speak - Text-to-Speech
  router.post(
    '/speak',
    optionalApiKey,
    validate({ body: speakSchema }),
    async (req: Request, res: Response) => {
      try {
        const { text, language, voiceId, gender, audioFormat, speed } = req.body;

        const result = await provider.synthesize(text, language, {
          voiceId,
          gender,
          audioFormat,
          speed,
        });

        res.json({
          audioBase64: result.audioBase64,
          mimeType: result.mimeType,
          language: result.language,
          durationMs: result.durationMs,
        });
      } catch (error: any) {
        res.status(502).json({
          error: {
            code: 'SPEECH_SYNTHESIS_ERROR',
            message: error.message || ERROR_MESSAGES.GNANI_UNAVAILABLE,
            requestId: req.requestId,
          },
        });
      }
    }
  );

  // POST /api/v1/explain - Explain Simply Mode
  router.post(
    '/explain',
    optionalApiKey,
    validate({ body: explainSchema }),
    async (req: Request, res: Response) => {
      try {
        const { text, language } = req.body;
        const result = await provider.explain(text, language);
        res.json(result);
      } catch (error: any) {
        res.status(502).json({
          error: {
            code: 'EXPLAIN_ERROR',
            message: error.message || ERROR_MESSAGES.GNANI_UNAVAILABLE,
            requestId: req.requestId,
          },
        });
      }
    }
  );

  return router;
}
