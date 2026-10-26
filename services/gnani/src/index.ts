import { SpeechProvider } from './types.js';
import { GnaniProvider } from './provider.js';
import { MockSpeechProvider } from './mock.js';

export * from './types.js';
export * from './languages.js';
export * from './provider.js';
export * from './mock.js';
export * from './circuitBreaker.js';

export interface ProviderResolution {
  provider: SpeechProvider;
  isMock: boolean;
  statusMessage: string;
}

/**
 * Validates environment and instantiates the appropriate SpeechProvider.
 * Fails safely with explicit guidance if credentials are missing.
 */
export function createSpeechProvider(): ProviderResolution {
  const isProduction = process.env.NODE_ENV === 'production';
  const apiKey = process.env.GNANI_API_KEY?.trim();
  const apiKeyId = process.env.GNANI_API_KEY_ID?.trim();
  const apiKeySecret = process.env.GNANI_API_KEY_SECRET?.trim();
  const baseUrl = process.env.GNANI_API_BASE_URL?.trim() || 'https://api.vachana.ai';
  const prismaBaseUrl = process.env.GNANI_PRISMA_BASE_URL?.trim() || 'https://api.vachana.ai';
  const timbreBaseUrl = process.env.GNANI_TIMBRE_BASE_URL?.trim() || 'https://api.vachana.ai';
  const evonBaseUrl = process.env.GNANI_EVON_BASE_URL?.trim() || '';
  const evonModel = process.env.GNANI_EVON_MODEL?.trim() || 'gnani/gnani-evon-v3.3-30B-A3B';
  const evonApiKey = process.env.GNANI_EVON_API_KEY?.trim();
  const enableMock = process.env.ENABLE_MOCK_PROVIDER === 'true' || process.env.ENABLE_MOCK_PROVIDER === '1';

  const hasCredentials = Boolean(apiKey || apiKeyId);

  // 1. Production Mode: Only real Gnani credentials are valid
  if (isProduction) {
    if (!hasCredentials) {
      throw new Error(
        'CRITICAL CONFIGURATION ERROR: Gnani AI is not configured yet. ' +
        'Add your Gnani credentials (GNANI_API_KEY_ID or GNANI_API_KEY) to the server environment.'
      );
    }
    return {
      provider: new GnaniProvider({ baseUrl: evonBaseUrl, prismaBaseUrl, timbreBaseUrl, evonModel, evonApiKey, apiKey, apiKeyId, apiKeySecret }),
      isMock: false,
      statusMessage: 'Production Gnani AI provider initialized successfully.',
    };
  }

  // 2. Development / Testing Mode:
  if (hasCredentials) {
    return {
      provider: new GnaniProvider({ baseUrl: evonBaseUrl, prismaBaseUrl, timbreBaseUrl, evonModel, evonApiKey, apiKey, apiKeyId, apiKeySecret }),
      isMock: false,
      statusMessage: 'Gnani AI credentials detected. Production provider initialized in development.',
    };
  }

  // 3. Fallback to Mock Provider if explicitly enabled for development
  if (enableMock) {
    console.warn(
      '⚠️  [SunoSamjho Notice] Gnani AI credentials not set. Falling back to MOCK MODE for local development. ' +
      'To switch to real Gnani services, configure GNANI_API_KEY in .env.'
    );
    return {
      provider: new MockSpeechProvider(),
      isMock: true,
      statusMessage: 'MOCK MODE active for local development/testing.',
    };
  }

  // 4. Missing credentials and mock mode disabled
  throw new Error(
    'Gnani AI is not configured yet. Add your Gnani credentials to the server environment, ' +
    'or set ENABLE_MOCK_PROVIDER=true in .env for local development.'
  );
}
