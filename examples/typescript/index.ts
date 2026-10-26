import { SunoSamjho, TranscriptEvent, TranslationEvent } from '@sunosamjho/sdk';

async function run() {
  console.log('⚡ Running SunoSamjho TypeScript SDK Example...');

  const client = new SunoSamjho({
    apiKey: process.env.SUNOSAMJHO_API_KEY || 'ss_live_demo1234567890abcdef123456',
    baseUrl: process.env.SUNOSAMJHO_API_BASE_URL || 'http://localhost:4000',
  });

  // Create real-time conversation session
  const session = await client.conversations.create({
    sourceLanguage: 'hi-IN',
    targetLanguage: 'ta-IN',
    saveTranscripts: true,
  });

  console.log(`Connected to room code: ${session.room.roomCode}`);

  session.on('transcript', (evt: TranscriptEvent) => {
    console.log(`Recognized [${evt.sourceLanguage}]: ${evt.text}`);
  });

  session.on('translation', (evt: TranslationEvent) => {
    console.log(`Translated [${evt.targetLanguage}]: ${evt.translatedText} (Latency: ${evt.latencyMs}ms)`);
  });

  session.on('connected', (info) => {
    console.log(`Session established! SessionId: ${info.sessionId}`);
    // Cleanup after short demonstration
    setTimeout(() => {
      session.stop();
      console.log('Example finished cleanly.');
    }, 1500);
  });

  session.start();
}

run().catch(console.error);
