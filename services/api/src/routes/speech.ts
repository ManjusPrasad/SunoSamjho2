import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaApiError, SpeechProvider } from '@sunosamjho/gnani';
import { validate } from '../middleware/validate.js';
import { optionalApiKey } from '../middleware/auth.js';
import { ERROR_MESSAGES } from '../utils/errors.js';

export function createSpeechRouter(provider: SpeechProvider): Router {
  const router = Router();

  const transcribeSchema = z.object({
    audioBase64: z.string().min(4, 'Audio base64 payload is required.').max(14 * 1024 * 1024).regex(
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
      'Audio must be a valid base64 payload.'
    ),
    language: z.string().min(2).max(10).regex(/^[a-z]{2}-[A-Z]{2}$/, 'Valid BCP-47 language code is required.'),
    audioFormat: z.enum(['wav', 'pcm', 'webm', 'ogg']).optional().default('wav'),
    sampleRate: z.union([z.literal(8000), z.literal(16000), z.literal(44100), z.literal(48000)]).optional().default(16000),
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
        if (!provider.listLanguages().some((item) => item.code === language && item.stt)) {
          res.status(400).json({
            error: {
              code: 'UNSUPPORTED_SPEECH_LANGUAGE',
              message: `Prisma speech recognition does not support ${language}.`,
              requestId: req.requestId,
            },
          });
          return;
        }
        if (provider.isMock) {
          res.status(503).json({
            error: {
              code: 'SPEECH_RECOGNITION_UNAVAILABLE',
              message: 'Real Prisma transcription is not configured. The local demo provider does not recognize audio.',
              requestId: req.requestId,
            },
          });
          return;
        }
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        if (audioBuffer.length === 0) {
          res.status(400).json({
            error: {
              code: 'EMPTY_AUDIO',
              message: 'The audio payload is empty. Record speech or choose a valid audio file.',
              requestId: req.requestId,
            },
          });
          return;
        }

        const result = await provider.transcribe(audioBuffer, language, {
          audioFormat,
          sampleRate,
        });
        if (!result.text.trim()) {
          res.status(422).json({
            error: {
              code: 'NO_SPEECH_RECOGNIZED',
              message: 'No speech was recognized. Try a clearer recording in a quieter place.',
              requestId: req.requestId,
            },
          });
          return;
        }

        res.json({
          transcript: result.text,
          language: result.language,
          confidence: result.confidence,
          durationMs: result.durationMs,
          isFinal: result.isFinal,
        });
      } catch (error: any) {
        const statusCode = error instanceof PrismaApiError
          ? error.statusCode === 429
            ? 429
            : error.statusCode === 503
              ? 503
              : 502
          : 502;
        res.status(statusCode).json({
          error: {
            code: 'SPEECH_RECOGNITION_ERROR',
            message: error instanceof PrismaApiError ? error.message : ERROR_MESSAGES.GNANI_UNAVAILABLE,
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

        if (provider.isMock) {
          res.status(503).json({
            error: {
              code: 'TRANSLATION_UNAVAILABLE',
              message: 'Real Gnani translation is not configured. The local demo provider does not translate text.',
              requestId: req.requestId,
            },
          });
          return;
        }

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

        if (provider.isMock) {
          res.status(503).json({
            error: {
              code: 'SPEECH_SYNTHESIS_UNAVAILABLE',
              message: 'Real Gnani Timbre speech synthesis is not configured. The local demo provider does not synthesize speech.',
              requestId: req.requestId,
            },
          });
          return;
        }

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
        if (provider.isMock) {
          res.status(503).json({
            error: {
              code: 'EXPLANATION_UNAVAILABLE',
              message: 'Real Gnani Evon is not configured. The local demo provider cannot explain text.',
              requestId: req.requestId,
            },
          });
          return;
        }
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
