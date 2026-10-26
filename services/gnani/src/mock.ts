import {
  SpeechProvider,
  ProviderHealth,
  SupportedLanguage,
  TranscribeOptions,
  TranscribeResult,
  TranslateOptions,
  TranslateResult,
  SynthesizeOptions,
  SynthesizeResult,
  ExplainOptions,
  ExplainResult,
} from './types.js';
import { SUPPORTED_LANGUAGES, areLanguagesCompatible } from './languages.js';

// Pre-packaged conversational phrases for high-fidelity offline demonstration
const CONVERSATIONAL_MAP: Record<string, Record<string, string>> = {
  'hi-IN': {
    'kn-IN': 'ಈ ದಾಖಲೆಗಳನ್ನು ನಾಳೆಯೊಳಗೆ ಸಲ್ಲಿಸಬೇಕು.',
    'ta-IN': 'இந்த ஆவணங்களை நாளைக்குள் சமர்ப்பிக்க வேண்டும்.',
    'te-IN': 'ఈ పత్రాలను రేపటిలోగా సమర్పించాలి.',
    'en-IN': 'You must submit these documents by tomorrow.',
    'mr-IN': 'ही कागदपत्रे उद्यापर्यंत जमा करावी लागतील.',
  },
  'kn-IN': {
    'hi-IN': 'मैं समझ गया, मैं इसे कल सुबह पहली फुर्सत में भेज दूंगा।',
    'en-IN': 'Understood, I will send it first thing tomorrow morning.',
    'ta-IN': 'புரிந்தது, நாளை காலை முதலில் அனுப்பி விடுகிறேன்.',
    'te-IN': 'అర్థమైంది, రేపు ఉదయాన్నే మొదటగా పంపుతాను.',
  },
  'ta-IN': {
    'hi-IN': 'धन्यवाद, कृपया मुझे पुष्टि संदेश भेजें।',
    'kn-IN': 'ಧನ್ಯವಾದಗಳು, ದಯವಿಟ್ಟು ನನಗೆ ದೃಢೀಕರಣ ಸಂದೇಶವನ್ನು ಕಳುಹಿಸಿ.',
    'en-IN': 'Thank you, please send me a confirmation message.',
  },
  'te-IN': {
    'hi-IN': 'हाँ, मैंने सभी विवरणों की जाँच कर ली है।',
    'kn-IN': 'ಹೌದು, ನಾನು ಎಲ್ಲಾ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿದ್ದೇನೆ.',
    'en-IN': 'Yes, I have verified all the details.',
  },
  'en-IN': {
    'hi-IN': 'नमस्ते, आज मैं आपकी क्या सहायता कर सकता हूँ?',
    'kn-IN': 'ನಮಸ್ಕಾರ, ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
    'ta-IN': 'வணக்கம், இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?',
    'te-IN': 'నమస్కారం, ఈ రోజు నేను మీకు ఎలా సహాయపడగలను?',
  },
};

const PLAYGROUND_SAMPLE_MAP: Record<string, Record<string, string>> = {
  'hi-IN': {
    'kn-IN': [
      ['मुझे इस दवा को दिन में कितनी बार लेना चाहिए?', 'ಈ ಔಷಧಿಯನ್ನು ದಿನಕ್ಕೆ ಎಷ್ಟು ಬಾರಿ ತೆಗೆದುಕೊಳ್ಳಬೇಕು?'],
      ['मेरी फसल के लिए आज कौन-सी सलाह है?', 'ನನ್ನ ಬೆಳೆಗೆ ಇಂದು ಯಾವ ಸಲಹೆ ಇದೆ?'],
      ['क्या आप यह पता मुझे लिखकर दे सकते हैं?', 'ಈ ವಿಳಾಸವನ್ನು ನನಗೆ ಬರೆದು ಕೊಡಬಹುದೇ?'],
    ].map(([source, target]) => `${source}|||${target}`).join('\n'),
    'en-IN': [
      ['मुझे इस दवा को दिन में कितनी बार लेना चाहिए?', 'How many times a day should I take this medicine?'],
      ['मेरी फसल के लिए आज कौन-सी सलाह है?', 'What advice is available for my crop today?'],
      ['क्या आप यह पता मुझे लिखकर दे सकते हैं?', 'Could you write this address down for me?'],
    ].map(([source, target]) => `${source}|||${target}`).join('\n'),
  },
};

function getPlaygroundSample(text: string, sourceLanguage: string, targetLanguage: string): string | undefined {
  const rows = PLAYGROUND_SAMPLE_MAP[sourceLanguage]?.[targetLanguage];
  if (!rows) return undefined;
  const normalizedText = text.trim();
  return rows.split('\n').map((row) => row.split('|||')).find(([source]) => source === normalizedText)?.[1];
}

/**
 * Generate a standard 44-byte WAV header + short sine wave PCM tone
 * so the frontend AudioContext or <audio> element plays a valid sound in mock mode.
 */
function createSyntheticWav(durationSeconds = 1.2, frequency = 440): Buffer {
  const sampleRate = 16000;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const blockAlign = 2; // 16-bit mono
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate gentle fade-in / fade-out tone
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, Math.min(i / (sampleRate * 0.05), (numSamples - i) / (sampleRate * 0.05)));
    const sampleVal = Math.sin(2 * Math.PI * frequency * t) * envelope;
    const intVal = Math.max(-32768, Math.min(32767, Math.floor(sampleVal * 18000)));
    buffer.writeInt16LE(intVal, 44 + i * 2);
  }

  return buffer;
}

export class MockSpeechProvider implements SpeechProvider {
  readonly name = 'Gnani-Mock-Provider (Development Mode Only)';
  readonly isMock = true;

  constructor() {
    // STRICT SECURITY GUARD: Never allow Mock mode in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SECURITY VIOLATION: MockSpeechProvider is strictly prohibited when NODE_ENV=production. ' +
        'Please supply real Gnani credentials (GNANI_API_KEY / GNANI_API_KEY_ID).'
      );
    }
  }

  async getHealth(): Promise<ProviderHealth> {
    return {
      status: 'healthy',
      providerName: this.name,
      isMock: true,
      message: 'Running in MOCK MODE for local development and offline testing.',
      supportedLanguageCount: SUPPORTED_LANGUAGES.length,
    };
  }

  listLanguages(): SupportedLanguage[] {
    return SUPPORTED_LANGUAGES;
  }

  isLanguagePairSupported(sourceLang: string, targetLang: string): boolean {
    return areLanguagesCompatible(sourceLang, targetLang);
  }

  async transcribe(
    _audio: Buffer | Uint8Array,
    language: string,
    _options?: TranscribeOptions
  ): Promise<TranscribeResult> {
    // Simulate real network audio processing delay (150ms - 300ms)
    await new Promise((r) => setTimeout(r, 200));

    let simulatedText = 'नमस्ते, आप कैसे हैं?';
    if (language.startsWith('kn')) {
      simulatedText = 'ಹೌದು, ನಾನು ಇದನ್ನು ನಾಳೆಯೊಳಗೆ ಕಳುಹಿಸುತ್ತೇನೆ.';
    } else if (language.startsWith('ta')) {
      simulatedText = 'வணக்கம், நான் உங்களுக்கு உதவ முடியுமா?';
    } else if (language.startsWith('te')) {
      simulatedText = 'నమస్కారం, మీ సహాయం నాకు కావాలి.';
    } else if (language.startsWith('en')) {
      simulatedText = 'Please submit this document by tomorrow.';
    }

    return {
      text: simulatedText,
      language,
      confidence: 0.98,
      durationMs: 200,
      isFinal: true,
    };
  }

  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    _options?: TranslateOptions
  ): Promise<TranslateResult> {
    await new Promise((r) => setTimeout(r, 120));

    const sampleTranslation = getPlaygroundSample(text, sourceLanguage, targetLanguage);
    if (sampleTranslation) {
      return {
        sourceText: text,
        translatedText: sampleTranslation,
        sourceLanguage,
        targetLanguage,
        latencyMs: 120,
      };
    }

    // Lookup a room-demo phrase or clearly identify the output as simulated.
    const srcMap = CONVERSATIONAL_MAP[sourceLanguage];
    let translated = srcMap ? srcMap[targetLanguage] : null;

    if (!translated) {
      translated = `[Mock preview · ${targetLanguage}]: ${text}`;
    }

    return {
      sourceText: text,
      translatedText: translated,
      sourceLanguage,
      targetLanguage,
      latencyMs: 120,
    };
  }

  async synthesize(
    text: string,
    language: string,
    _options?: SynthesizeOptions
  ): Promise<SynthesizeResult> {
    await new Promise((r) => setTimeout(r, 150));

    const wavBuffer = createSyntheticWav(1.0, 480);
    return {
      audioBase64: wavBuffer.toString('base64'),
      audioBuffer: wavBuffer,
      mimeType: 'audio/wav',
      language,
      durationMs: 150,
    };
  }

  async explain(
    text: string,
    language: string,
    _options?: ExplainOptions
  ): Promise<ExplainResult> {
    await new Promise((r) => setTimeout(r, 100));

    let simpleText = `In simple terms: ${text}`;
    if (language.startsWith('hi')) {
      simpleText = `सरल शब्दों में: कृपया यह कार्य कल तक पूरा कर लें।`;
    } else if (language.startsWith('kn')) {
      simpleText = `ಸರಳವಾಗಿ ಹೇಳುವುದಾದರೆ: ನಾಳೆಯೊಳಗೆ ಈ ಕೆಲಸವನ್ನು ಮುಗಿಸಿ.`;
    }

    const wavBuffer = createSyntheticWav(0.8, 520);
    return {
      originalText: text,
      explanation: simpleText,
      language,
      listenAudioBase64: wavBuffer.toString('base64'),
    };
  }
}
