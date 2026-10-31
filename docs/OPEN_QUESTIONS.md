# GnaniFlow: API Open Questions

Research checked 27 October 2026 against the public Gnani Speech API documentation. These notes distinguish documented behavior from account-specific details that still require confirmation.

## Prisma speech-to-text

### Confirmed

- REST endpoint: `POST https://api.vachana.ai/stt/v3`, multipart fields `audio_file` and `language_code`, authenticated by `X-API-Key-ID`.
- REST accepts WAV, MP3, OGG, FLAC, AAC, and M4A audio up to 60 seconds (30 seconds or less is recommended). The quick start describes 8 kHz–44.1 kHz inputs.
- REST `format` is `verbatim` or `transcribe`; `transcribe` enables inverse text normalization. Documented errors include 400, 429, 500, and 503. The success payload includes `transcript`.
- Realtime endpoint: `wss://api.vachana.ai/stt/v3/stream`. It requires the API key and language in WebSocket upgrade headers. A browser cannot attach these headers, so the web client must connect through the project's authenticated server proxy.
- Realtime audio is signed 16-bit little-endian mono PCM. Frames must be exactly 1,024 bytes, sent at real-time cadence. At 16 kHz each frame is 512 samples / 32 ms. Realtime produces `connected`, `processing`, `transcript`, and `error` events.
- The documented language list contains Bengali, English, Gujarati, Hindi, Kannada, Malayalam, Marathi, Punjabi, Tamil, and Telugu. English (`en-IN`) accepts English-Hindi mixed audio. The REST documentation says Gujarati and Punjabi are not supported by Batch STT, but they are listed for REST and Realtime.
- Numeric rate limits are not specified in the public pages reviewed. REST documents 429 for rate limiting.

### Unresolved

- Confirm the account's provisioned Prisma API key and plan entitlements; a key previously pasted into chat must be revoked and replaced before use.
- Confirm whether the account permits both REST and Realtime STT, and request numeric rate/concurrency limits from Gnani.
- Confirm behavior and expected errors for silent/empty audio and whether word boosting/substitution is enabled for this account.
- Current browser file decoding is not equivalent to accepting every documented server format: browser support for decoding MP3/M4A/OGG varies. Prefer native PCM/WAV recording or a supported server-side decoder; show an actionable error if a browser cannot decode an upload.

## Timbre text-to-speech

### Confirmed

- REST endpoint: `POST https://api.vachana.ai/api/v1/tts/inference`, authenticated by `X-API-Key-ID`.
- The response is binary audio, not JSON. The request includes `text`, `model`, `voice`, `language`, `speed`, and `audio_config`.
- Public docs list Timbre v2.5 and v3.0. v2.5 has 42 language-preferred voices; v3.0 has 13 voices which speak all ten documented Indian languages. Voices cannot be mixed between models.
- v2.5 is the recommended production model in the public introduction. Supported containers include WAV, MP3, and OGG; WAV is returned as `audio/wav`. Supported sample rates are 8,000, 16,000, 22,050, 24,000, 44,100, and 48,000 Hz.
- The numeric speed range is 0.85–1.15. Documented errors include 400, 429, 500, and 503.
- The documentation lists Hinglish (`hi-en`) with voice Poorvi for v2.5, in addition to the ten primary languages.

### Unresolved

- Confirm v3.0 account entitlement and whether the user's intended "Timbre beta" means v3.0. Safest initial implementation: v2.5 with documented model/voice/language pairings; expose v3.0 only after a successful account test.
- Confirm account-specific text length, request/concurrency limits, and credits/pricing; the reviewed public TTS pages do not give numeric limits.
- Confirm the exact audio response headers and recommended browser playback behavior for each chosen container. The binary body and documented MIME types are known.

## Evon language model

- The public Speech API documentation index reviewed on 27 October 2026 does not list an Evon REST endpoint, authentication scheme, request/response schema, or supported model IDs.
- The project currently assumes an OpenAI-compatible chat-completions endpoint configured with `GNANI_EVON_BASE_URL`, `GNANI_EVON_MODEL`, and optional `GNANI_EVON_API_KEY`; this is a project integration assumption, not a verified Gnani Speech API contract.
- Before building cleanup and command mode, obtain written endpoint, model, auth, access, rate-limit, retention, and safety guidance from Gnani. Until verified, disable Evon actions or clearly label the configured compatible endpoint; never silently substitute another AI vendor.

## Security and privacy

- All provider credentials stay in server environment variables or a server-side secret store. They must never be sent to Vite/browser code, placed in a VITE-prefixed variable, committed, or included in logs.
- The previously pasted credential is considered compromised and must be revoked and rotated. The local `.env` currently has no Gnani key and enables the mock provider.
- Confirm retention, data residency, and whether audio/transcripts are stored by the provider before making product privacy claims. Keep browser audio ephemeral by default.

## Public references

- [Gnani Speech API introduction](https://docs.gnani.ai/api/introduction/introduction)
- [Gnani quick start](https://docs.gnani.ai/api/introduction/quick-start)
- [Prisma STT REST](https://docs.gnani.ai/api/STT/speech-to-text)
- [Prisma STT Realtime WebSocket](https://docs.gnani.ai/api/STT/stt-websocket)
- [Timbre TTS REST](https://docs.gnani.ai/api/TTS/tts-inference)
- [Timbre voice catalog](https://docs.gnani.ai/api/TTS/available-voices)
- [Gnani website](https://www.gnani.ai/)
