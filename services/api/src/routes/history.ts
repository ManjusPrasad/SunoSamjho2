import { Router, Request, Response } from 'express';
import { db } from '../db/store.js';

export const historyRouter = Router();

// GET /api/v1/history - List saved transcripts (search supported)
historyRouter.get('/', (req: Request, res: Response) => {
  const query = req.query.q as string | undefined;
  const transcripts = db.listTranscripts(query);

  res.json({
    transcripts: transcripts.map((t) => ({
      id: t.id,
      roomId: t.roomId,
      title: t.title,
      sourceLanguage: t.sourceLanguage,
      targetLanguage: t.targetLanguage,
      totalMessages: t.messages.length,
      createdAt: t.createdAt,
    })),
    total: transcripts.length,
  });
});

// GET /api/v1/history/:id - Get full transcript with utterances
historyRouter.get('/:id', (req: Request, res: Response) => {
  const transcript = db.getTranscriptById(req.params.id);
  if (!transcript) {
    res.status(404).json({
      error: {
        code: 'TRANSCRIPT_NOT_FOUND',
        message: 'The requested conversation transcript was not found.',
        requestId: req.requestId,
      },
    });
    return;
  }
  res.json({ transcript });
});

// DELETE /api/v1/history/:id - Actually delete transcript
historyRouter.delete('/:id', (req: Request, res: Response) => {
  const deleted = db.deleteTranscript(req.params.id);
  if (!deleted) {
    res.status(404).json({
      error: {
        code: 'TRANSCRIPT_NOT_FOUND',
        message: 'The requested transcript was not found or has already been deleted.',
        requestId: req.requestId,
      },
    });
    return;
  }
  res.json({ success: true, message: 'Transcript permanently removed.' });
});

// GET /api/v1/history/:id/export?format=txt|json - Export transcript
historyRouter.get('/:id/export', (req: Request, res: Response) => {
  const transcript = db.getTranscriptById(req.params.id);
  if (!transcript) {
    res.status(404).json({
      error: {
        code: 'TRANSCRIPT_NOT_FOUND',
        message: 'The requested conversation transcript was not found.',
        requestId: req.requestId,
      },
    });
    return;
  }

  const format = (req.query.format as string)?.toLowerCase() || 'txt';

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="transcript-${transcript.id}.json"`);
    res.send(JSON.stringify(transcript, null, 2));
    return;
  }

  // Format as plain text transcript
  let textOutput = `========================================================\n`;
  textOutput += `SUNOSAMJHO LIVE - CONVERSATION TRANSCRIPT\n`;
  textOutput += `Title: ${transcript.title}\n`;
  textOutput += `Date: ${new Date(transcript.createdAt).toLocaleString()}\n`;
  textOutput += `Languages: ${transcript.sourceLanguage} <-> ${transcript.targetLanguage}\n`;
  textOutput += `========================================================\n\n`;

  for (const m of transcript.messages) {
    textOutput += `[${new Date(m.createdAt).toLocaleTimeString()}] ${m.speakerLabel} (${m.sourceLanguage}):\n`;
    textOutput += `  Original:   ${m.originalText}\n`;
    textOutput += `  Translated: ${m.translatedText} (${m.targetLanguage})\n`;
    if (m.explanationText) {
      textOutput += `  Plain Note: ${m.explanationText}\n`;
    }
    textOutput += `\n`;
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="transcript-${transcript.id}.txt"`);
  res.send(textOutput);
});
