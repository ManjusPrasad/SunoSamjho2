import React, { useState, useEffect } from 'react';
import { Radio, ArrowRight, Volume2, Shield, Zap, Sparkles, Code2, Globe2, CheckCircle2, Mic, Languages, AudioLines } from 'lucide-react';
import { fetchLanguages, createConversation } from '../services/api';
import { PhraseStudio } from '../components/PhraseStudio';

interface LandingPageProps {
  navigate: (page: string, params?: Record<string, string>) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [supportedLangs, setSupportedLangs] = useState<any[]>([]);
  const [previewStep, setPreviewStep] = useState(1);
  const [isPlayingPreviewAudio, setIsPlayingPreviewAudio] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  useEffect(() => {
    fetchLanguages()
      .then((data) => {
        if (data.languages) setSupportedLangs(data.languages);
      })
      .catch(() => {});
  }, []);

  // Scripted Interactive Preview Loop
  useEffect(() => {
    const timer = setInterval(() => {
      setPreviewStep((prev) => (prev % 4) + 1);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const handleStartLive = async () => {
    try {
      setIsCreatingRoom(true);
      const res = await createConversation({
        sourceLanguage: 'hi-IN',
        targetLanguage: 'kn-IN',
        saveTranscripts: true,
      });
      navigate('live', { code: res.room.roomCode });
    } catch {
      // Fallback directly to live page
      navigate('live');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    navigate('live', { code: roomCodeInput.trim().toUpperCase() });
  };

  const playPreviewTone = () => {
    setIsPlayingPreviewAudio(true);
    // Play synthetic browser tone to demonstrate real audio playback capability
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
      setTimeout(() => setIsPlayingPreviewAudio(false), 1200);
    }
  };

  return (
    <div className="landing-shell" style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px 80px' }}>
      {/* HERO SECTION */}
      <div className="landing-hero" style={{ textAlign: 'center', maxWidth: '840px', margin: '0 auto 64px' }}>
        <div
          className="hero-eyebrow"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            background: 'var(--brand-light)',
            color: 'var(--brand-primary)',
            fontSize: '0.825rem',
            fontWeight: 700,
            marginBottom: '24px',
          }}
        >
          <Sparkles size={14} />
          <span>Real-Time Indic Speech AI Powered by Gnani</span>
        </div>

        <h1 className="hero-title"
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
            marginBottom: '20px',
            color: 'var(--text-primary)',
          }}
        >
          Break Language Barriers.{' '}
          <span
            style={{
              background: 'var(--brand-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Have Real Conversations.
          </span>
        </h1>

        <p className="hero-copy"
          style={{
            fontSize: '1.2rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '36px',
          }}
        >
          SunoSamjho Live helps people speak, understand, and respond across languages in real time.
          Converse naturally between Hindi, Kannada, Tamil, Telugu, and more with voice-to-voice translation.
        </p>

        {/* PRIMARY CALLS TO ACTION */}
        <div className="hero-actions"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <button
            onClick={handleStartLive}
            disabled={isCreatingRoom}
            className="btn btn-primary btn-lg hero-primary"
          >
            <Radio size={18} />
            <span>{isCreatingRoom ? 'Generating Room...' : 'Start Live Conversation'}</span>
          </button>

          <button
            onClick={() => setShowJoinModal(true)}
            className="btn btn-secondary btn-lg hero-secondary"
          >
            <span>Join with Code</span>
          </button>

          <button
            onClick={() => navigate('developers')}
            className="btn btn-secondary btn-lg hero-secondary"
          >
            <Code2 size={18} />
            <span>Build with SunoSamjho</span>
          </button>
        </div>

        <div className="voice-orbit" aria-hidden="true">
          <div className="orbit-ring orbit-ring-outer" />
          <div className="orbit-ring orbit-ring-middle" />
          <div className="orbit-ring orbit-ring-inner" />
          <span className="orbit-node orbit-node-left"><AudioLines size={17} /></span>
          <span className="orbit-node orbit-node-right"><Languages size={17} /></span>
          <span className="orbit-node orbit-node-top"><Sparkles size={15} /></span>
          <div className="orbit-core"><Mic size={28} /></div>
          <span className="orbit-caption">ONE VOICE · EVERY LANGUAGE</span>
        </div>
      </div>

      <PhraseStudio />

      {/* JOIN WITH CODE MODAL */}
      {showJoinModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setShowJoinModal(false)}
        >
          <div
            className="glass-panel"
            style={{
              background: 'var(--bg-secondary)',
              padding: '32px',
              maxWidth: '440px',
              width: '100%',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
              Join a Live Conversation
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px' }}>
              Enter the unique room code shared with you (e.g., SJ-8K29P).
            </p>
            <form onSubmit={handleJoinByCode}>
              <input
                type="text"
                placeholder="SJ-XXXXX"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '16px',
                  outline: 'none',
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Join Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE PRODUCT PREVIEW (Interactive Demonstration) */}
      <div
        className="glass-panel preview-panel"
        style={{
          padding: '32px',
          borderRadius: '24px',
          marginBottom: '80px',
          background: 'var(--bg-secondary)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="status-pill CONNECTED">PIPELINE PREVIEW</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Concept animation · not a live model request
              </span>
            </div>
          </div>
          <button
            onClick={playPreviewTone}
            className="btn btn-sm btn-secondary"
            title="Test synthetic audio output"
          >
            <Volume2 size={14} />
            <span>{isPlayingPreviewAudio ? 'Playing Audio...' : 'Test Sound'}</span>
          </button>
        </div>

        {/* 4-STAGE PIPELINE FLOW VISUALIZER */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              padding: '18px',
              borderRadius: '12px',
              background: previewStep >= 1 ? 'var(--brand-light)' : 'var(--bg-tertiary)',
              border: `1px solid ${previewStep >= 1 ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '4px' }}>
              STAGE 1: AUDIO CAPTURE
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>
              Person A (Hindi)
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              "आपको यह दस्तावेज़ कल तक जमा करना होगा।"
            </p>
          </div>

          <div
            style={{
              padding: '18px',
              borderRadius: '12px',
              background: previewStep >= 2 ? 'rgba(6, 182, 212, 0.12)' : 'var(--bg-tertiary)',
              border: `1px solid ${previewStep >= 2 ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
              STAGE 2: GNANI PRISMA (STT)
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>
              Speech Recognition
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Speech is transcribed into readable captions.
            </p>
          </div>

          <div
            style={{
              padding: '18px',
              borderRadius: '12px',
              background: previewStep >= 3 ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-tertiary)',
              border: `1px solid ${previewStep >= 3 ? 'var(--accent-amber)' : 'var(--border-subtle)'}`,
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '4px' }}>
              STAGE 3: GNANI EVON (NMT)
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>
              Conversational Translation
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              "ಈ ದಾಖಲೆಗಳನ್ನು ನಾಳೆಯೊಳಗೆ ಸಲ್ಲಿಸಬೇಕು."
            </p>
          </div>

          <div
            style={{
              padding: '18px',
              borderRadius: '12px',
              background: previewStep >= 4 ? 'rgba(168, 85, 247, 0.12)' : 'var(--bg-tertiary)',
              border: `1px solid ${previewStep >= 4 ? '#a855f7' : 'var(--border-subtle)'}`,
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a855f7', marginBottom: '4px' }}>
              STAGE 4: GNANI TIMBRE (TTS)
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>
              Person B (Kannada Audio)
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Translation is spoken aloud for the listener.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={handleStartLive} className="btn btn-primary">
            <span>Launch Live Room With Full Audio</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* SUPPORTED LANGUAGES (Real Config Driven) */}
      <div style={{ marginBottom: '80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '12px' }}>
            Verified Indian Language Matrix
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto' }}>
            Derived directly from configured Gnani AI capabilities. No unsupported or fictional languages.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          {supportedLangs.map((lang) => (
            <div
              key={lang.code}
              className="glass-panel"
              style={{
                padding: '18px',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>{lang.name}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'var(--bg-tertiary)',
                  }}
                >
                  {lang.code}
                </span>
              </div>
              <div style={{ fontSize: '1.1rem', color: 'var(--brand-primary)', marginBottom: '12px' }}>
                {lang.nativeName}
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-emerald)' }}>
                  <CheckCircle2 size={12} /> STT (Prisma)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-emerald)' }}>
                  <CheckCircle2 size={12} /> TTS (Timbre)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PRIVACY & SECURITY FIRST */}
      <div
        className="glass-panel"
        style={{
          padding: '40px',
          borderRadius: '20px',
          background: 'var(--bg-secondary)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
        }}
      >
        <div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--accent-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <Shield size={22} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
            Zero Raw Audio Persistence
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Microphone audio is processed entirely in transient memory buffers for transcription and translation.
            No voice recordings are saved to disk or used for training without explicit consent.
          </p>
        </div>

        <div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <Zap size={22} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
            Enterprise Rate Limiting & RLS
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            API keys are hashed with SHA-256 before storage. Every table is guarded with Supabase Row Level Security
            (RLS), ensuring zero cross-tenant access.
          </p>
        </div>

        <div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(6, 182, 212, 0.15)',
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <Globe2 size={22} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
            Real Developer SDK
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Publish-ready TypeScript SDK <code style={{ fontFamily: 'var(--font-mono)' }}>@sunosamjho/sdk</code> with
            EventEmitter, typed errors, and dual ESM/CJS distribution for both Node and modern browsers.
          </p>
        </div>
      </div>
    </div>
  );
};
