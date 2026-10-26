import React, { useState } from 'react';
import { Copy, Check, Terminal, FileCode, Globe, Shield } from 'lucide-react';

export const DocsPage: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const codeSnippets = {
    install: `npm install @sunosamjho/sdk`,
    tsExample: `import { SunoSamjho } from "@sunosamjho/sdk";

// Initialize client
const client = new SunoSamjho({
  apiKey: process.env.SUNOSAMJHO_API_KEY,
  baseUrl: "http://localhost:4000",
});

// Create Hindi -> Kannada live conversation
const conversation = await client.conversations.create({
  sourceLanguage: "hi-IN",
  targetLanguage: "kn-IN",
  saveTranscripts: true,
});

console.log(\`Room created: \${conversation.room.roomCode}\`);

// Listen for recognized speech
conversation.on("transcript", (event) => {
  console.log(\`[\${event.sourceLanguage}] \${event.speakerLabel}: \${event.text}\`);
});

// Listen for translated utterance
conversation.on("translation", (event) => {
  console.log(\`[\${event.targetLanguage}] Translated: \${event.translatedText}\`);
});

// Start real-time connection
conversation.start();`,
    reactHook: `import React, { useEffect, useState } from "react";
import { SunoSamjho } from "@sunosamjho/sdk";

export function LiveVoiceChat({ roomCode }: { roomCode: string }) {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const client = new SunoSamjho({ apiKey: "YOUR_API_KEY" });
    let session: any;

    async function init() {
      session = await client.conversations.get(roomCode);
      session.on("translation", (event) => {
        setMessages((prev) => [...prev, event.translatedText]);
      });
      session.start();
    }

    init();
    return () => session?.stop();
  }, [roomCode]);

  return (
    <div>
      {messages.map((m, i) => (
        <p key={i}>{m}</p>
      ))}
    </div>
  );
}`,
    curlTranslate: `curl -X POST http://localhost:4000/api/v1/translate \\
  -H "Authorization: Bearer ss_live_demo1234567890abcdef123456" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "आपको यह दस्तावेज़ कल तक जमा करना होगा।",
    "sourceLanguage": "hi-IN",
    "targetLanguage": "kn-IN"
  }'`,
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 20px 80px' }}>
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '8px' }}>
          Developer Documentation
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
          Complete integration guide for the SunoSamjho Live API, WebSocket protocol, and TypeScript SDK.
        </p>
      </div>

      {/* QUICK INSTALL */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '14px' }}>Installation</h2>
        <div
          style={{
            position: 'relative',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '16px 20px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9rem',
          }}
        >
          <code>{codeSnippets.install}</code>
          <button
            onClick={() => copyCode('install', codeSnippets.install)}
            className="btn btn-sm btn-secondary"
            style={{ position: 'absolute', right: '12px', top: '10px' }}
          >
            {copiedSection === 'install' ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
          </button>
        </div>
      </section>

      {/* AUTHENTICATION */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '14px' }}>Authentication</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '16px' }}>
          All developer API requests must include your SunoSamjho API key in the standard{' '}
          <code style={{ fontFamily: 'var(--font-mono)' }}>Authorization</code> header. Gnani AI credentials remain
          strictly server-side and are never required from client applications.
        </p>
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '14px 18px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            color: 'var(--brand-primary)',
          }}
        >
          Authorization: Bearer YOUR_SUNOSAMJHO_API_KEY
        </div>
      </section>

      {/* REST API ENDPOINTS */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px' }}>REST Endpoints</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { method: 'POST', path: '/api/v1/conversations', desc: 'Create a new conversation room and generate an unguessable room code.' },
            { method: 'GET', path: '/api/v1/conversations/:id', desc: 'Retrieve room details, participants, and status.' },
            { method: 'POST', path: '/api/v1/transcribe', desc: 'Convert speech audio (WAV/WebM) to text using Gnani Prisma ASR.' },
            { method: 'POST', path: '/api/v1/translate', desc: 'Translate text between verified Indian languages using Gnani Evon NMT.' },
            { method: 'POST', path: '/api/v1/speak', desc: 'Synthesize spoken Indic audio from text using Gnani Timbre TTS.' },
            { method: 'POST', path: '/api/v1/explain', desc: 'Generate simplifying plain-language explanations in the user language.' },
            { method: 'GET', path: '/api/v1/languages', desc: 'Query verified language matrix and capabilities.' },
          ].map((ep, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: ep.method === 'POST' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: ep.method === 'POST' ? 'var(--brand-primary)' : 'var(--accent-emerald)',
                }}
              >
                {ep.method}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.9rem' }}>{ep.path}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', flex: 1 }}>{ep.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* TYPESCRIPT & SDK EXAMPLES */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px' }}>SDK Implementation</h2>
        <div
          style={{
            position: 'relative',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '20px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            overflowX: 'auto',
            marginBottom: '20px',
          }}
        >
          <pre style={{ margin: 0 }}>{codeSnippets.tsExample}</pre>
          <button
            onClick={() => copyCode('ts', codeSnippets.tsExample)}
            className="btn btn-sm btn-secondary"
            style={{ position: 'absolute', right: '12px', top: '12px' }}
          >
            {copiedSection === 'ts' ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
          </button>
        </div>

        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '12px' }}>cURL Translation Example</h3>
        <div
          style={{
            position: 'relative',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '20px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            overflowX: 'auto',
          }}
        >
          <pre style={{ margin: 0 }}>{codeSnippets.curlTranslate}</pre>
          <button
            onClick={() => copyCode('curl', codeSnippets.curlTranslate)}
            className="btn btn-sm btn-secondary"
            style={{ position: 'absolute', right: '12px', top: '12px' }}
          >
            {copiedSection === 'curl' ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
          </button>
        </div>
      </section>
    </div>
  );
};
