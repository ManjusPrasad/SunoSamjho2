# GnaniFlow Implementation Plan

## Goal

Evolve the existing SunoSamjho monorepo into **GnaniFlow**, a polished, responsive, privacy-first voice-dictation product using only Gnani AI models: Prisma STT, Evon cleanup/commands when access is verified, and Timbre TTS. Deliver the web app and responsive marketing experience first. Electron remains a later milestone.

**Approval gate:** Implement only user-approved milestones and stop after each milestone for review. M1 and M2 are approved; M1 is complete and M2 is implemented locally pending real-provider verification.

## Repository baseline

- `apps/web`: React 18, Vite, TypeScript, existing custom CSS; Firebase auth, speech playground, live room and navigation.
- `services/api`: Express REST and WebSocket server; current speech endpoints proxy through `services/gnani`.
- `services/gnani`: Prisma, Timbre and Evon provider clients plus a mock provider.
- Existing tests are Node test-runner scripts for SDK and API. Tailwind and Zustand are configured for the GnaniFlow shell; PWA service worker, IndexedDB history, and browser E2E test framework are not yet configured.
- Local `.env` has blank Gnani key fields and `ENABLE_MOCK_PROVIDER=true`. Real provider integration cannot be verified until a rotated key is configured locally. Never copy the key previously pasted into chat.

## Architecture proposal

```text
Responsive React/Vite web + PWA
  ├─ Dictation UI, history, settings, onboarding, marketing
  ├─ Local-first state (Zustand) and IndexedDB persistence
  └─ Browser microphone → PCM/WAV encoding; audio is ephemeral by default
           │ server-side credentialed API / WebSocket proxy
           ▼
Express API (server-only credentials)
  ├─ Prisma REST for file clips; Prisma Realtime WebSocket proxy for live dictation
  ├─ Evon adapter only after Gnani confirms an endpoint and account access
  └─ Timbre REST (v2.5 default; v3.0 only after account verification)
```

- Keep all API keys in the Node server environment; browser code receives no provider key.
- Use the documented Prisma WebSocket protocol for live dictation: the backend supplies required upgrade headers, forwards binary PCM frames and relays transcript/error events.
- Keep REST STT for supported audio uploads up to 60 seconds; use explicit client-side format/duration checks and clear errors for browser decode failures.
- Prefer Timbre v2.5 initially because the public API introduction recommends it; make v3.0 opt-in only when the account is entitled and the selected model/voice pair is verified.
- Do not call an unverified Evon endpoint or silently use another AI provider. Until access details are obtained, ship the cleanup interface as gated/unavailable and explain why.
- Apply Tailwind and Zustand incrementally to new/converted product surfaces; do not mechanically rewrite unrelated existing UI. Preserve the existing CSS design system only as temporary migration compatibility.

## Milestones

### M1 — Product foundation and shell

- Introduce original GnaniFlow brand, Open Sans-only typography, tokenized light/dark themes, responsive navigation, mobile bottom tabs, accessible focus and reduced-motion behavior.
- Configure Tailwind theme tokens, strict TypeScript checks, Zustand store, and a failing font-family lint/test.
- Build the app shell and marketing landing with real dictation UI as the hero visual; do not start a room or request microphone access on page load.
- Provide explicit offline/provider status and a clearly labeled local-only mock path for layout testing.
- Validate at 360, 390, 768, 1024 and 1440 px with no horizontal overflow; run locally and stop for review.
- **Status:** Complete. Build, SDK/API tests, font check, local health, and responsive viewport checks passed.

### M2 — Real Prisma dictation

- Implement microphone permission/onboarding, tap-to-toggle and hold-to-talk, WAV/PCM conversion, silence handling, recording state, and robust cancel/retry behavior.
- Implement the server-side Prisma REST upload and authenticated realtime WebSocket proxy based on the documented formats/protocol.
- Show the raw transcript immediately, preserve it through transient failures, handle offline, permission-denied, 401, 429 and 5xx errors, and never claim mock output is a real transcript.
- Test with rotated credentials only after account entitlement is verified; stop for review after local and viewport checks.
- **Status:** Implemented locally. Realtime capture sends exact mono 16 kHz PCM frames through the server-side Prisma proxy; upload transcription uses the REST route. Mock mode refuses to fabricate transcripts, translations, explanations, or speech audio, and health reports the provider as degraded. Fixed mobile feature-card navigation that did not scroll to the workspace, verified no horizontal overflow at 320, 360, 390, 768, 1024, and 1440 px, and made unavailable STT/TTS actions show actionable provider setup errors. Builds and tests pass. A real provider round-trip remains blocked until a rotated credential is configured and Prisma realtime access is confirmed; do not deploy.

### M3 — Evon cleanup and tone

- Proceed only with verified official access, endpoint, request schema, retention, and rate-limit details.
- Add strict cleanup prompt builder, raw/polished toggle, tone profiles, under-1.5-second best-effort target, timeout, and raw transcript fallback.
- Test meaning preservation, multilingual/code-mixed cases, self-corrections, names, dates, numbers and emails; stop for review.

### M4 — Multilingual, dictionary and command mode

- Add supported language/auto-detect where explicitly documented, native/romanized preference only where supported, custom dictionary hints, snippets, selected-text command mode, and privacy controls.
- Keep unavailable language/model operations explicitly disabled; do not infer provider capability from locale names.
- Stop for review after targeted tests and responsive run.

### M5 — Timbre playback

- Add play/replay for editor and history; language/voice/speed selectors restricted to documented voice/model combinations.
- Default to documented Timbre v2.5; enable v3.0 only after account validation. Provide clear beta/unavailable fallbacks, accessible playback controls, and avoid a synthetic demo tone being presented as provider audio.
- Stop for review after successful real account testing or clearly labeled mock/UI checks if credentials are unavailable.

### M6 — History, dashboard, settings, onboarding and PWA

- Add local-first IndexedDB records, searchable raw/polished history, copy/share/export/delete, stats, settings, four-step onboarding, web manifest/icons, service worker/app shell, and offline UX.
- No raw audio persistence unless the user explicitly opts in. Establish retention and local-data deletion behavior.
- Stop for review with app-shell/offline checks and viewport coverage.

### M7 — Marketing, quality and responsive audit

- Finish editorial marketing sections: real product UI, Hinglish example, how it works, documented languages, privacy, FAQ and accurate Gnani credits.
- Add meaningful unit tests for API clients, prompt builder, dictionary/snippets, plus Playwright E2E/mobile viewport projects; verify WCAG AA contrast, keyboard operation, and computed font family.
- Add architecture diagram, setup/API guides, demo script and future-work list; test build/test and run locally; stop for review.

### M8 — Electron desktop shell (later, only after web approval)

- Wrap the same app with isolated Electron main/preload processes, configurable global hotkey, floating overlay, SQLite local history, OS keychain credentials, selected-text command mode, and guarded auto-paste with clipboard restore.
- Threat-model IPC, permissions, secrets, signing and packaging; test supported OS behavior. Do not begin this milestone as part of the first web implementation.

## Risks and dependencies

1. **Secrets:** The previously shared key is compromised and must be revoked. Real provider tests wait for a replacement key in ignored server `.env`.
2. **Evon:** Public Speech API docs reviewed do not document a public Evon inference endpoint. M3/M4 depend on official endpoint/auth/model/access details.
3. **Timbre v3.0 entitlement:** Public docs list it, but user/account entitlement and beta behavior are unverified. v2.5 is the safe default.
4. **Browser audio:** iOS Safari format and AudioContext behavior varies; use gesture-driven capture/playback and test real devices. LAN HTTP is not a secure context for microphone access; phone microphone testing needs trusted HTTPS.
5. **Realtime proxy:** Browser WebSocket cannot set custom auth headers. The server proxy must validate requests, protect the API key, limit connections, handle backpressure, and clean up provider sockets.
6. **Migration scope:** Existing Firebase auth, conversation rooms, assistant and custom CSS are established surfaces. The new dictation product should not trigger unrelated behavioral changes without review.
7. **Privacy:** Provider retention and data residency are account/provider terms, not proven by a no-disk-save browser design; describe only verified behavior.
8. **Dependency footprint:** Tailwind and Zustand are in use; Playwright is not installed. Add browser E2E tooling only when its milestone is approved and package changes are ready for validation.

## Local validation and delivery

- After each approved milestone: run the smallest relevant tests/build, start the local web/API stack, exercise the changed workflow, check 360/390/768/1024/1440 px when applicable, summarize findings, and stop for user review.
- No deployment without an explicit separate request.
- First web milestone local URL is expected to remain Vite at `http://localhost:5173`; API stays on `http://localhost:4000`.
