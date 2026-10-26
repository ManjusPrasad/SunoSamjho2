# @sunosamjho/sdk

Official TypeScript/JavaScript SDK for **SunoSamjho Live** — the real-time multilingual voice communication platform for Indian languages.

## Installation

```bash
npm install @sunosamjho/sdk
```

## Quick Start

### 1. Initialize the Client

```typescript
import { SunoSamjho } from "@sunosamjho/sdk";

const client = new SunoSamjho({
  apiKey: process.env.SUNOSAMJHO_API_KEY,
  baseUrl: "http://localhost:4000", // or your deployment URL
});
```

### 2. Create and Join a Real-Time Conversation

```typescript
// Create a live conversation room between Hindi and Kannada speakers
const conversation = await client.conversations.create({
  sourceLanguage: "hi-IN",
  targetLanguage: "kn-IN",
  saveTranscripts: true,
});

console.log(`Room created: ${conversation.room.roomCode}`);

// Listen for recognized speech
conversation.on("transcript", (event) => {
  console.log(`[${event.sourceLanguage}] ${event.speakerLabel}: ${event.text}`);
});

// Listen for translated utterance
conversation.on("translation", (event) => {
  console.log(`[${event.targetLanguage}] Translated: ${event.translatedText}`);
});

// Listen for audio output
conversation.on("audio", (audioEvent) => {
  console.log(`Received synthesized audio in ${audioEvent.language}`);
});

// Start the real-time connection
conversation.start();
```

### 3. Direct Speech & Translation Operations

```typescript
// 1. Speech-to-Text
const transcription = await client.transcribe({
  audioBase64: "<base64_wav_data>",
  language: "hi-IN",
});
console.log(transcription.transcript);

// 2. Machine Translation
const translation = await client.translate({
  text: "आपको यह दस्तावेज़ कल तक जमा करना होगा।",
  sourceLanguage: "hi-IN",
  targetLanguage: "kn-IN",
});
console.log(translation.translatedText); // "ಈ ದಾಖಲೆಗಳನ್ನು ನಾಳೆಯೊಳಗೆ ಸಲ್ಲಿಸಬೇಕು."

// 3. Text-to-Speech
const speech = await client.speak({
  text: "ಈ ದಾಖಲೆಗಳನ್ನು ನಾಳೆಯೊಳಗೆ ಸಲ್ಲಿಸಬೇಕು.",
  language: "kn-IN",
});
```
