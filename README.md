# SunoSamjho Live

> **"Break Language Barriers. Have Real Conversations."**

SunoSamjho Live is an open-source real-time multilingual voice communication platform designed to enable natural, low-latency conversation across Indian languages. Built with **Gnani AI** (Prisma, Evon, and Timbre), it connects speakers across languages through voice-to-voice communication.

```
Person A (Hindi) ──[ Microphone / VAD ]──► Gnani Prisma (STT)
                                                 │
                                                 ▼
Person B (Kannada) ◄──[ Timbre (TTS) ]──◄ Gnani Evon (NMT & NLU)
```

---

## Key Capabilities

- **Two-Way Voice-to-Voice Rooms:** Cryptographically generated room codes (`SJ-XXXXX`) connecting participants in real time.
- **Audio Capture & VAD Engine:** Native browser `AudioContext` with Voice Activity Detection, silence segmentation, and feedback loop prevention (gates mic capture during TTS synthesis).
- **Sequential Playback Queue:** Guarantees translated utterances play in order without acoustic overlap.
- **Explain Simply Mode:** Powered by Gnani Evon reasoning to rephrase complex phrases into plain, accessible language in the user's native tongue.
- **Privacy by Design:** Zero raw audio persistence. Utterances are processed purely in ephemeral memory buffers. User-controlled transcripts can be viewed, searched, exported, or permanently deleted.
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

For account access, configure `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID` from your Firebase web app. In Firebase Console, enable **Email/Password** under Authentication → Sign-in method and add `localhost` under Authentication → Settings → Authorized domains. The app supports registration, email verification, sign-in, and password-reset emails; unverified accounts cannot enter the app. Verification and reset emails may take a few minutes to arrive, so check your spam or junk folder too. Passwords are stored and managed by Firebase Authentication, not by this app. Restart the web server after changing `.env`.

To connect to official **Gnani AI** services, supply your credentials in `.env`:
```env
GNANI_API_KEY=your_gnani_api_key
GNANI_API_KEY_ID=your_key_id
GNANI_API_KEY_SECRET=your_secret_key
GNANI_API_BASE_URL=https://api.gnani.ai
```

*Note: For local offline development without Gnani credentials, keep `ENABLE_MOCK_PROVIDER=true`. The UI will visibly display a "MOCK MODE" banner, and this mode is strictly prohibited from running when `NODE_ENV=production`.*

### 4. Running the Application
```bash
npm run dev
```
- **Web Application:** [http://localhost:5173](http://localhost:5173)
- **API Server:** [http://localhost:4000](http://localhost:4000)
- **WebSocket Gateway:** `ws://localhost:4000/api/v1/realtime/:conversationId`

### Deploying the web app and API separately

The web app and API are separate workspaces and can be deployed as separate services from this one monorepo; they do not need separate GitHub repositories. Vercel is suitable for the static frontend. The API includes a persistent WebSocket gateway, so deploy it as a long-running Node service (the included Render Blueprint is one option), not as a Vercel serverless function.

- **API:** Create a Render Blueprint from `render.yaml` in the repository. Set `CORS_ORIGIN` to the exact Vercel site origin, and provide your Gnani credential as a Render secret (`GNANI_API_KEY_ID` or `GNANI_API_KEY`). The Blueprint keeps mock mode disabled in production. The service health-check path is `/api/v1/health`; the host must support persistent WebSocket connections.
- **Web app:** Import the same repository into Vercel with the repository root as the project root. `vercel.json` configures `npm ci`, `npm run build:web`, the `apps/web/dist` output, and SPA fallback. Set these Vercel environment variables before deploying: `VITE_API_BASE_URL` to the public Render HTTPS origin (for example, `https://sunosamjho-api.onrender.com`) and `VITE_WS_BASE_URL` to the matching secure WebSocket origin (`wss://sunosamjho-api.onrender.com`).
- **Firebase:** Add the Vercel site domain to Firebase Authentication → Settings → Authorized domains. Set the Firebase web-app config values as Vercel environment variables (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`).
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
