import { SupportedLanguage } from './types.js';

/**
 * Verified language configuration backed by Gnani AI capabilities:
 * Prisma (Speech-to-Text), Evon (Neural Machine Translation & Reasoning), and Timbre (Text-to-Speech).
 * Codes strictly follow standard BCP-47 representation.
 */
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  {
    code: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
    stt: true,
    tts: true,
    supportsCodeMixing: true, // Hinglish
    voices: [
      { id: 'hi-IN-priya', name: 'Priya (Female)', gender: 'female' },
      { id: 'hi-IN-rahul', name: 'Rahul (Male)', gender: 'male' },
    ],
  },
  {
    code: 'kn-IN',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    script: 'Kannada',
    stt: true,
    tts: true,
    supportsCodeMixing: true, // Kanglish
    voices: [
      { id: 'kn-IN-ananya', name: 'Ananya (Female)', gender: 'female' },
      { id: 'kn-IN-vijay', name: 'Vijay (Male)', gender: 'male' },
    ],
  },
  {
    code: 'ta-IN',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    script: 'Tamil',
    stt: true,
    tts: true,
    supportsCodeMixing: true, // Tanglish
    voices: [
      { id: 'ta-IN-kavitha', name: 'Kavitha (Female)', gender: 'female' },
      { id: 'ta-IN-suresh', name: 'Suresh (Male)', gender: 'male' },
    ],
  },
  {
    code: 'te-IN',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    script: 'Telugu',
    stt: true,
    tts: true,
    supportsCodeMixing: true, // Tenglish
    voices: [
      { id: 'te-IN-lakshmi', name: 'Lakshmi (Female)', gender: 'female' },
      { id: 'te-IN-ravi', name: 'Ravi (Male)', gender: 'male' },
    ],
  },
  {
    code: 'mr-IN',
    name: 'Marathi',
    nativeName: 'मराठी',
    script: 'Devanagari',
    stt: true,
    tts: true,
    supportsCodeMixing: false,
    voices: [
      { id: 'mr-IN-swati', name: 'Swati (Female)', gender: 'female' },
      { id: 'mr-IN-sachin', name: 'Sachin (Male)', gender: 'male' },
    ],
  },
  {
    code: 'bn-IN',
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'Bengali',
    stt: true,
    tts: true,
    supportsCodeMixing: false,
    voices: [
      { id: 'bn-IN-shreya', name: 'Shreya (Female)', gender: 'female' },
      { id: 'bn-IN-amit', name: 'Amit (Male)', gender: 'male' },
    ],
  },
  {
    code: 'gu-IN',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    script: 'Gujarati',
    stt: true,
    tts: true,
    supportsCodeMixing: false,
    voices: [
      { id: 'gu-IN-disha', name: 'Disha (Female)', gender: 'female' },
      { id: 'gu-IN-chirag', name: 'Chirag (Male)', gender: 'male' },
    ],
  },
  {
    code: 'ml-IN',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    script: 'Malayalam',
    stt: true,
    tts: true,
    supportsCodeMixing: false,
    voices: [
      { id: 'ml-IN-arya', name: 'Arya (Female)', gender: 'female' },
      { id: 'ml-IN-manu', name: 'Manu (Male)', gender: 'male' },
    ],
  },
  {
    code: 'en-IN',
    name: 'Indian English',
    nativeName: 'English (India)',
    script: 'Latin',
    stt: true,
    tts: true,
    supportsCodeMixing: true,
    voices: [
      { id: 'en-IN-neha', name: 'Neha (Female)', gender: 'female' },
      { id: 'en-IN-arjun', name: 'Arjun (Male)', gender: 'male' },
    ],
  },
];

export function getLanguageByCode(code: string): SupportedLanguage | undefined {
  const normalized = code.trim().toLowerCase();
  return SUPPORTED_LANGUAGES.find((lang) => lang.code.toLowerCase() === normalized);
}

export function isLanguageSupported(code: string): boolean {
  return !!getLanguageByCode(code);
}

export function areLanguagesCompatible(sourceCode: string, targetCode: string): boolean {
  const source = getLanguageByCode(sourceCode);
  const target = getLanguageByCode(targetCode);
  if (!source || !target) return false;
  // Source must support STT and target must support TTS
  return source.stt && target.tts;
}
