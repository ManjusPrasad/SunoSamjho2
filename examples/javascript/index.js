import { SunoSamjho } from '@sunosamjho/sdk';

async function main() {
  console.log('🚀 Initializing SunoSamjho JavaScript Client...');

  const client = new SunoSamjho({
    apiKey: process.env.SUNOSAMJHO_API_KEY || 'ss_live_demo1234567890abcdef123456',
    baseUrl: process.env.SUNOSAMJHO_API_BASE_URL || 'http://localhost:4000',
  });

  try {
    // 1. Query verified Indian languages
    const { languages } = await client.getLanguages();
    console.log(`✅ Loaded ${languages.length} supported languages.`);

    // 2. Translate conversational phrase
    const translation = await client.translate({
      text: 'आपको यह दस्तावेज़ कल तक जमा करना होगा।',
      sourceLanguage: 'hi-IN',
      targetLanguage: 'kn-IN',
    });

    console.log('\n--- Machine Translation Result ---');
    console.log('Source (Hindi):   ', translation.sourceText);
    console.log('Target (Kannada): ', translation.translatedText);
    console.log('Latency:          ', `${translation.latencyMs}ms`);

    // 3. Create a live room
    const conversation = await client.conversations.create({
      sourceLanguage: 'hi-IN',
      targetLanguage: 'kn-IN',
    });

    console.log(`\n🎉 Created Live Conversation Room: ${conversation.room.roomCode}`);
  } catch (error) {
    console.error('❌ Example run error:', error.message);
  }
}

main();
