# Contributing to SunoSamjho Live

Thank you for your interest in contributing to SunoSamjho Live! We welcome contributions that expand real-time speech and translation capabilities for Indian languages.

## Architecture Guidelines

1. **Real Over Fake:** All contributions must be backed by functioning, tested code. Do not introduce mock data in production pathways or advertise unsupported capabilities.
2. **Secrets Stay Server-Side:** Never commit API keys or credentials. Client components must never directly invoke upstream AI providers.
3. **Indic Language Respect:** Ensure font families, typography hierarchy, and text direction render Indic scripts correctly (Hindi/Devanagari, Kannada, Tamil, Telugu, Malayalam, Bengali, Gujarati, Marathi).

## Local Development Workflow

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Setup
```bash
# 1. Install all dependencies across workspaces
npm install

# 2. Configure environment
cp .env.example .env

# 3. Run development servers (API on :4000, Web on :5173)
npm run dev
```

### Running Tests
```bash
npm test
```

### Code Style & Verification
- Strict TypeScript everywhere (`noImplicitAny`, strict null checks).
- Clean linting and formatted imports.
- Validate that `ENABLE_MOCK_PROVIDER=true` works for offline development without leaking into production builds.
