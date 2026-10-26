# Security Policy — SunoSamjho Live

## Responsible Disclosure

Security is a foundational pillar of SunoSamjho Live. If you discover a vulnerability or security flaw, please report it immediately through private channels rather than opening a public issue.

Please email security reports to **security@sunosamjho.ai** with:
- A description of the vulnerability.
- Steps to reproduce or proof-of-concept.
- Potential impact and severity.

We commit to acknowledging reports within 48 hours and providing regular updates throughout remediation.

---

## Security Architecture & Design Principles

### 1. Server-Side Secret Isolation
- Upstream credentials for **Gnani AI** (`GNANI_API_KEY`, `GNANI_API_KEY_ID`, `GNANI_API_KEY_SECRET`) and **Supabase Service Role Keys** reside exclusively on the server.
- Credentials are never exposed to browser bundles, client HTTP requests, logs, or repository commits.
- Client applications access capabilities exclusively via SunoSamjho Developer API keys (`ss_live_...`).

### 2. High-Entropy Hashed API Keys
- SunoSamjho developer API keys are generated using cryptographically secure random entropy (`crypto.randomBytes`).
- The database stores only the **SHA-256 hash** of the secret key alongside an unguessable prefix (`ss_live_...`). Raw secrets are displayed exactly once at creation and cannot be retrieved thereafter.

### 3. Row Level Security (RLS)
- Every table in Supabase is protected by strict PostgreSQL Row Level Security policies.
- Cross-tenant and cross-user data leakage is strictly prohibited. Users and developers can only view and mutate their own resources.

### 4. Privacy by Design: Zero Audio Persistence
- Audio frames captured during real-time conversations are held in ephemeral memory buffers only for the duration of transcription and synthesis.
- No raw audio is written to disk or persistently stored in databases.
- Conversation transcripts are user-controllable (can be disabled per room) and can be permanently deleted at any time with instantaneous data removal.

### 5. Input Validation & Rate Limiting
- Every REST and WebSocket payload is validated against strict Zod schemas.
- Audio file upload sizes are capped (12MB max).
- Token-bucket rate limiting guards all endpoints, responding with HTTP `429 Too Many Requests` and standard `Retry-After` headers upon threshold breaches.

### 6. Production Safety Locks
- The development `MockSpeechProvider` is hard-coded with an active assertion that throws a security exception if instantiated when `NODE_ENV === 'production'`.
