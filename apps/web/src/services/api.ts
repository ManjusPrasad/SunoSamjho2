const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') || '';
const API_BASE_URL = /^(https?:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(configuredApiBase)
  ? ''
  : configuredApiBase;
const API_BASE = `${API_BASE_URL}/api/v1`;

function getWebSocketBaseUrl() {
  const configuredBase = import.meta.env.VITE_WS_BASE_URL?.trim().replace(/\/+$/, '');
  const isLoopbackBase = /^wss?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(configuredBase || '');
  return configuredBase && !isLoopbackBase
    ? configuredBase
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
}

export function getRealtimeWebSocketUrl(roomIdOrCode: string) {
  const base = getWebSocketBaseUrl();
  return `${base}/api/v1/realtime/${encodeURIComponent(roomIdOrCode)}`;
}

export function getPrismaDictationWebSocketUrl(language: string) {
  const base = getWebSocketBaseUrl();
  return `${base}/api/v1/dictation/realtime?language=${encodeURIComponent(language)}`;
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('API health check failed');
  return res.json();
}

export async function fetchLanguages() {
  const res = await fetch(`${API_BASE}/languages`);
  return res.json();
}

export async function translateText(text: string, sourceLanguage: string, targetLanguage: string) {
  const res = await fetch(`${API_BASE}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, sourceLanguage, targetLanguage }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Translation failed');
  return data;
}

export async function transcribeAudio(audioBase64: string, language: string) {
  const res = await fetch(`${API_BASE}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, language, audioFormat: 'wav', sampleRate: 16000 }),
  });
  let data: { transcript?: unknown; confidence?: unknown; error?: { message?: string } };
  try {
    data = await res.json();
  } catch {
    throw new Error(`Prisma transcription returned an invalid API response (HTTP ${res.status}).`);
  }
  if (!res.ok) throw new Error(data.error?.message || `Prisma transcription failed (HTTP ${res.status}).`);
  if (typeof data.transcript !== 'string') {
    throw new Error('Prisma transcription returned no transcript. Please retry with a supported audio file.');
  }
  return data;
}

export async function speakText(text: string, language: string, options?: { voiceId?: string; speed?: number }) {
  const res = await fetch(`${API_BASE}/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      language,
      voiceId: options?.voiceId,
      speed: options?.speed,
      audioFormat: 'wav',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Speech synthesis failed');
  return data;
}

export async function createConversation(data: {
  sourceLanguage: string;
  targetLanguage: string;
  saveTranscripts?: boolean;
}) {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to create conversation');
  }
  return res.json();
}

export async function getConversation(idOrCode: string) {
  const res = await fetch(`${API_BASE}/conversations/${idOrCode}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Room not found');
  }
  return res.json();
}

export async function endConversation(id: string) {
  const res = await fetch(`${API_BASE}/conversations/${id}/end`, {
    method: 'POST',
  });
  return res.json();
}

export async function fetchHistory(query?: string) {
  const url = query ? `${API_BASE}/history?q=${encodeURIComponent(query)}` : `${API_BASE}/history`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchTranscript(id: string) {
  const res = await fetch(`${API_BASE}/history/${id}`);
  return res.json();
}

export async function deleteTranscript(id: string) {
  const res = await fetch(`${API_BASE}/history/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchApiKeys() {
  const res = await fetch(`${API_BASE}/developers/keys`);
  return res.json();
}

export async function createApiKey(name: string) {
  const res = await fetch(`${API_BASE}/developers/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function revokeApiKey(id: string) {
  const res = await fetch(`${API_BASE}/developers/keys/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchUsage() {
  const res = await fetch(`${API_BASE}/developers/usage`);
  return res.json();
}
