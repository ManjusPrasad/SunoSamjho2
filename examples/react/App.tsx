import React, { useEffect, useState } from 'react';
import { SunoSamjho, TranslationEvent } from '@sunosamjho/sdk';

export function MultilingualChatComponent({ roomCode }: { roomCode: string }) {
  const [messages, setMessages] = useState<TranslationEvent[]>([]);
  const [status, setStatus] = useState<string>('Disconnected');

  useEffect(() => {
    const client = new SunoSamjho({
      apiKey: process.env.REACT_APP_SUNOSAMJHO_KEY || 'ss_live_demo1234567890abcdef123456',
      baseUrl: 'http://localhost:4000',
    });

    let activeSession: any = null;

    async function start() {
      try {
        const room = await client.conversations.get(roomCode);
        const session = await client.conversations.create({
          sourceLanguage: room.sourceLanguage,
          targetLanguage: room.targetLanguage,
        });
        activeSession = session;

        session.on('connected', () => setStatus('Connected'));
        session.on('translation', (evt) => {
          setMessages((prev) => [...prev, evt]);
        });
        session.on('disconnected', () => setStatus('Disconnected'));

        session.start();
      } catch (err: any) {
        setStatus(`Error: ${err.message}`);
      }
    }

    start();

    return () => {
      activeSession?.stop();
    };
  }, [roomCode]);

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '20px auto' }}>
      <h2>SunoSamjho React Live Voice Stream</h2>
      <p>Status: <strong>{status}</strong></p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m) => (
          <div key={m.messageId} style={{ padding: 10, background: '#f1f5f9', borderRadius: 8 }}>
            <small>{m.speakerLabel} ({m.sourceLanguage} → {m.targetLanguage})</small>
            <p style={{ margin: '4px 0' }}>"{m.originalText}"</p>
            <strong>"{m.translatedText}"</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MultilingualChatComponent;
