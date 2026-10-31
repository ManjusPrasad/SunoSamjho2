# GnaniFlow

> **Voice, clearly understood.**

GnaniFlow is a voice workspace for speech-to-text, text-to-speech, and multilingual conversations. The existing room feature supports live voice communication. Provider-backed speech features require valid, server-side Gnani credentials; local mock mode is explicitly labeled and refuses to return fabricated transcripts, translations, explanations, or synthesized audio.

```
Person A (Hindi) ──[ Microphone / VAD ]──► Gnani Prisma (STT)
                                                 │
                                                 ▼
Person B (Kannada) ◄──[ Timbre (TTS) ]──◄ Gnani Evon (NMT & NLU)
```

---

## Key Capabilities

- **Two-Way Voice-to-Voice Rooms:** Cryptographically generated room codes (`SJ-XXXXX`) connecting participants in real time.
- **Standalone Speech Playground:** Use separate Text to Speech and Speech to Text tools without creating a room. Read typed or uploaded `.txt`, `.md`, `.csv`, and `.json` notes aloud or submit audio for transcription. Live microphone dictation streams mono 16 kHz PCM to Prisma through the server-side WebSocket proxy; uploaded clips use Prisma REST. Real provider results require valid Gnani credentials; mock mode does not fabricate transcripts.
- **Audio Capture & VAD Engine:** Native browser `AudioContext` with Voice Activity Detection, silence segmentation, and feedback loop prevention (gates mic capture during TTS synthesis).
- **Sequential Playback Queue:** Guarantees translated utterances play in order without acoustic overlap.
- **Explain Simply Mode:** Powered by Gnani Evon reasoning to rephrase complex phrases into plain, accessible language in the user's native tongue.
- **Privacy Controls:** Microphone capture begins only after the user chooses a speech action and grants permission. Provider handling and retention depend on the account's terms; review those terms before using sensitive audio.
- **Developer Ecosystem:** REST API and TypeScript SDK (`@sunosamjho/sdk`) with token-bucket rate limiting, SHA-256 hashed API keys, and comprehensive documentation.

---

## Monorepo Architecture

```
sunosamjho/
├── apps/
│   └── web/                   # React 18 + Vite Web App & Original Design System
├── packages/
│   └── sdk/                   # @sunosamjho/sdk TypeScript Client & EventEmitter
├── services/
│   ├── api/                   # Express + WebSocket Real-Time Conversation Server
│   └── gnani/                 # Gnani AI Provider Layer (Prisma, Evon, Timbre)
├── docs/                      # Architectural & API Guides
├── examples/
│   ├── javascript/            # Node.js Vanilla JS SDK sample
│   ├── typescript/            # TypeScript SDK sample
│   └── react/                 # React hook conversation sample
├── supabase/
│   └── migrations/            # Versioned SQL migrations with RLS policies
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
└── .env.example
```

---

## Quick Start

### 1. Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher

### 2. Installation
```bash
# Clone the repository and install dependencies across workspaces
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

For account access, configure `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID` from your Firebase web app. In Firebase Console, enable **Email/Password** under Authentication → Sign-in method. Add `localhost` under Authentication → Settings → Authorized domains for local development, and add each deployed frontend hostname there as well (for example, `sunosamjho2.vercel.app`; enter only the hostname, without `https://`). The app supports registration, email verification, sign-in, and password-reset emails; unverified accounts cannot enter the app. Verification and reset emails may take a few minutes to arrive, so check your spam or junk folder too. Passwords are stored and managed by Firebase Authentication, not by this app. Restart the web server after changing `.env`.

To check the local app on a phone on the same Wi-Fi, open the Vite Network URL printed by `npm run dev` (for example, `http://192.168.x.x:5173`) instead of `localhost`. Add that phone-accessible hostname/IP to Firebase Authentication → Settings → Authorized domains, and allow Node/Vite through the computer's local firewall if prompted. Browser microphone access generally requires a secure context; plain HTTP on a LAN IP may allow sign-in and text features but block recording. Use a trusted local HTTPS certificate for microphone testing on a phone.

To connect to official **Gnani AI** services, supply your credentials in `.env`:
```env
GNANI_API_KEY=your_gnani_api_key
GNANI_API_KEY_ID=your_key_id
GNANI_API_KEY_SECRET=your_secret_key
GNANI_API_BASE_URL=https://api.gnani.ai
```

Use a newly rotated credential in the server-side `.env` only; never place it in `VITE_*` settings, source code, or chat. Set `ENABLE_MOCK_PROVIDER=false` when you want the backend to use configured Gnani credentials. The local environment template leaves the credential fields blank.

*Note: For local offline development without Gnani credentials, keep `ENABLE_MOCK_PROVIDER=true`. The UI will visibly display a "MOCK MODE" banner; real STT/TTS is unavailable in this mode, and the mock provider is prohibited when `NODE_ENV=production`.*

For real Prisma realtime dictation, configure `GNANI_API_KEY_ID` with a rotated credential and set `ENABLE_MOCK_PROVIDER=false`. The server derives `wss://api.vachana.ai/stt/v3/stream` from `GNANI_PRISMA_BASE_URL`; set `GNANI_PRISMA_WS_URL` only when Gnani supplies a different official endpoint. Never expose provider keys in frontend variables. Phone microphone access requires a trusted HTTPS origin.

### 4. Running the Application
```bash
npm run dev
```
- **Web Application:** [http://localhost:5173](http://localhost:5173)
- **API Server:** [http://localhost:4000](http://localhost:4000)
- **WebSocket Gateway:** `ws://localhost:4000/api/v1/realtime/:conversationId`

The web interface uses the GnaniFlow design system with Open Sans, responsive layouts, Tailwind tokens, and Zustand theme state. Run `npm test` for SDK/API, font-family, and PCM framing checks. No deployment is part of local development.

### Deploying the web app and API separately

The web app and API are separate workspaces and can be deployed as separate services from this one monorepo; they do not need separate GitHub repositories. Vercel is suitable for the static frontend. The API includes a persistent WebSocket gateway, so deploy it as a long-running Node service (the included Render Blueprint is one option), not as a Vercel serverless function.

- **API:** Create a Render Blueprint from `render.yaml` in the repository. Set `CORS_ORIGIN` to the exact Vercel site origin, and provide your Gnani credential as a Render secret (`GNANI_API_KEY_ID` or `GNANI_API_KEY`). The Blueprint keeps mock mode disabled in production. The service health-check path is `/api/v1/health`; the host must support persistent WebSocket connections.
- **Web app (Vercel):** Import the same repository into Vercel with **Root Directory set to the repository root (`.`)**, not `apps/web` or `services/api`. `vercel.json` at the repository root configures Vite, `npm ci`, `npm run build:web`, the `apps/web/dist` output, and SPA fallback. Setting the root to a subfolder makes Vercel ignore this root config and causes workspace errors such as `Missing script: "build:web"`.
- **Web app (Netlify):** Import the same repository into Netlify with the repository root as the base directory. `netlify.toml` configures `npm run build:web`, the `apps/web/dist` publish directory, and SPA fallback.
- **Frontend environment variables:** In Vercel or Netlify, set `VITE_API_BASE_URL` to the public Render HTTPS origin (for example, `https://sunosamjho-api.onrender.com`) and `VITE_WS_BASE_URL` to its secure WebSocket origin (`wss://sunosamjho-api.onrender.com`) before building.
- **Firebase:** Add the deployed frontend domains to Firebase Authentication → Settings → Authorized domains. Set the Firebase web-app config values as frontend build environment variables (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`).
- **Gnani:** Store credentials only in the backend host's secret/environment settings. Never set Gnani credentials as `VITE_*` variables or commit them to GitHub. Prisma handles speech-to-text (STT), and Timbre handles speech synthesis when configured. Evon translation needs an approved inference endpoint and is not enabled merely by setting the API key.

The `VITE_*` values are embedded into the frontend at build time; redeploy the Vercel app after changing them. For local development, the web app defaults to same-origin `/api/v1` requests and WebSockets; setting the two API URL values to `http://localhost:4000` and `ws://localhost:4000` connects directly to the local API.

---

## Testing & Quality

Run the test suite across packages and services:
```bash
npm test
```
The suite verifies:
- Cryptographic room code collision resistance and alphabet safety.
- SHA-256 API key generation and hashing.
- Mock speech provider security lock-out in production environments.
- SDK initialization, typed errors, and conversation event emitter semantics.

---

## Verified Language Matrix

The following Indian languages are supported by the integrated Gnani AI pipeline:

| Language | BCP-47 Code | Native Script | STT (Prisma) | NMT (Evon) | TTS (Timbre) |
|---|---|---|:---:|:---:|:---:|
| **Hindi** | `hi-IN` | हिन्दी | ✅ | ✅ | ✅ |
| **Kannada** | `kn-IN` | ಕನ್ನಡ | ✅ | ✅ | ✅ |
| **Tamil** | `ta-IN` | தமிழ் | ✅ | ✅ | ✅ |
| **Telugu** | `te-IN` | తెలుగు | ✅ | ✅ | ✅ |
| **Marathi** | `mr-IN` | मराठी | ✅ | ✅ | ✅ |
| **Bengali** | `bn-IN` | বাংলা | ✅ | ✅ | ✅ |
| **Gujarati** | `gu-IN` | ગુજરાતી | ✅ | ✅ | ✅ |
| **Malayalam** | `ml-IN` | മലയാളം | ✅ | ✅ | ✅ |
| **Indian English**| `en-IN` | English | ✅ | ✅ | ✅ |
