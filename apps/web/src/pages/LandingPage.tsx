import React, { useState, useEffect } from 'react';
import { Radio, ArrowRight, Volume2, Shield, Zap, Sparkles, Globe2, CheckCircle2, Mic, Languages, AudioLines, BookOpen, CloudRain, Thermometer, Droplets, Wheat, Leaf, X } from 'lucide-react';
import { fetchLanguages, createConversation } from '../services/api';
import { PhraseStudio, SpeechMode } from '../components/PhraseStudio';

interface LandingPageProps {
  navigate: (page: string, params?: Record<string, string>) => void;
}

const CROPS = [
  { name: 'Rice', icon: '🌾' },
  { name: 'Wheat', icon: '🌿' },
  { name: 'Cotton', icon: '☁️' },
  { name: 'Sugarcane', icon: '🎋' },
  { name: 'Tomato', icon: '🍅' },
];

const WEATHER_TOPICS = [
  { name: 'Rainfall', icon: <CloudRain size={18} /> },
  { name: 'Temperature', icon: <Thermometer size={18} /> },
  { name: 'Humidity', icon: <Droplets size={18} /> },
];

const HOW_IT_WORKS = [
  { step: 1, title: 'Choose your language', desc: 'Select from 9 supported Indian languages — Hindi, Kannada, Telugu, Tamil, and more.' },
  { step: 2, title: 'Ask by voice', desc: 'Tap the mic and ask your crop or weather question naturally, just as you would to a friend.' },
  { step: 3, title: 'We find the advisory', desc: 'KisanSaathi searches source-attributed ICAR and IMD advisories relevant to your query.' },
  { step: 4, title: 'Hear the answer', desc: 'Gnani Timbre speaks the answer back to you in your own language, clearly and naturally.' },
];

const TRUST_ITEMS = [
  { icon: <Shield size={20} />, title: 'Source-attributed advisories only', desc: 'Every advisory shows its source — ICAR, IMD, or State Agriculture Dept. No fabricated guidance.' },
  { icon: <CheckCircle2 size={20} />, title: 'Privacy-first mic consent', desc: 'Your microphone is never accessed without explicit permission. You control when it activates.' },
  { icon: <Zap size={20} />, title: 'Powered by Gnani Prisma + Timbre', desc: 'State-of-the-art Indian language STT (Prisma) and TTS (Timbre) built for real Indian accents.' },
  { icon: <Globe2 size={20} />, title: 'No fabricated guidance', desc: 'KisanSaathi only surfaces real, curated advisories. When uncertain, it connects you to human experts.' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [supportedLangs, setSupportedLangs] = useState<any[]>([]);
  const [previewStep, setPreviewStep] = useState(1);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [speechMode, setSpeechMode] = useState<SpeechMode>('tts');

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
      setRoomError('');
      const res = await createConversation({
        sourceLanguage: 'hi-IN',
        targetLanguage: 'kn-IN',
        saveTranscripts: true,
      });
      navigate('live', { code: res.room.roomCode });
    } catch (cause) {
      setRoomError(cause instanceof Error ? cause.message : 'Could not create a room. Check that the local API is running and try again.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const openSpeechTool = (mode: SpeechMode) => {
    setSpeechMode(mode);
    document.getElementById('phrase-studio')?.focus();
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    navigate('live', { code: roomCodeInput.trim().toUpperCase() });
  };

  const previewSteps = [
    { label: 'STEP 1: FARMER SPEAKS', color: 'var(--brand-primary)', bg: 'var(--brand-light)', title: 'Farmer speaks in Hindi', desc: '"मेरी धान की फसल में पीले पत्ते आ रहे हैं, क्या करूँ?"' },
    { label: 'STEP 2: GNANI PRISMA (STT)', color: 'var(--accent-cyan)', bg: 'rgba(6,182,212,0.12)', title: 'Prisma transcribes audio', desc: 'Speech converted to accurate Hindi text in real-time.' },
    { label: 'STEP 3: ADVISORY RETRIEVAL', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', title: 'Advisory retrieved', desc: 'Relevant ICAR Yellow Leaf advisory matched from verified database.' },
    { label: 'STEP 4: GNANI TIMBRE (TTS)', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', title: 'Timbre speaks the answer', desc: 'Answer spoken aloud in Hindi — clear, natural, farmer-friendly.' },
  ];

  return (
    <div className="landing-shell" style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px 80px' }}>

      {/* ── HERO SECTION ── */}
      <div style={{ textAlign: 'center', maxWidth: '860px', margin: '0 auto 72px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            background: 'var(--brand-light)',
            color: 'var(--brand-primary)',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '28px',
            letterSpacing: '0.05em',
          }}
        >
          <Sparkles size={13} />
          <span>VOICE ADVISOR · POWERED BY GNANI PRISMA + TIMBRE</span>
        </div>

        <h1 style={{ fontSize: 'clamp(2.6rem, 5vw, 4.2rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '22px', color: 'var(--text-primary)' }}>
          KisanSaathi{' '}
          <span style={{ background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Voice Desk
          </span>
        </h1>

        <p style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Your farm advisor, in your language.
        </p>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: '640px', margin: '0 auto 40px' }}>
          Ask crop and weather questions by voice in Hindi, Kannada, Telugu, Tamil, and 5 more Indian languages.
          KisanSaathi understands you and speaks the answer back — powered by Gnani Prisma STT and Timbre TTS.
        </p>

        {/* QUICK-ACTION CARDS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <button type="button" className="home-feature-card" onClick={() => openSpeechTool('stt')}>
            <Mic size={26} />
            <strong>Ask by Voice</strong>
            <span>Speak your crop question → Prisma transcribes → Advisory answered → Timbre reads it back.</span>
          </button>
          <button type="button" className="home-feature-card" onClick={() => openSpeechTool('tts')}>
            <Volume2 size={26} />
            <strong>Listen to Advisory</strong>
            <span>Type or paste an advisory and hear it spoken aloud in your language via Gnani Timbre.</span>
          </button>
          <button
            type="button"
            className="home-feature-card home-feature-card-primary"
            onClick={() => void handleStartLive()}
            disabled={isCreatingRoom}
          >
            <Radio size={26} />
            <strong>{isCreatingRoom ? 'Creating room…' : 'Live Room'}</strong>
            <span>2-person voice translation for farmer + agriculture officer. Real-time bilingual conversation.</span>
          </button>
          <button type="button" className="home-feature-card" onClick={() => navigate('advisory')}>
            <BookOpen size={26} />
            <strong>Crop Advisory</strong>
            <span>Browse and search source-attributed crop advisories from ICAR, IMD and State Depts.</span>
          </button>
        </div>
        {roomError && <p className="phrase-error" role="alert">{roomError}</p>}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setShowJoinModal(true)}>Join Room with Code</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('advisory')}>
            <Leaf size={15} /> Browse Advisories
          </button>
        </div>
      </div>

      {/* ── JOIN MODAL ── */}
      {showJoinModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
          onClick={() => setShowJoinModal(false)}
        >
          <div
            className="glass-panel"
            style={{ background: 'var(--bg-secondary)', padding: '32px', maxWidth: '440px', width: '100%', borderRadius: '16px', boxShadow: 'var(--shadow-xl)', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setShowJoinModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Join a Live Conversation</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px' }}>
              Enter the room code shared with you (e.g., SJ-8K29P).
            </p>
            <form onSubmit={handleJoinByCode}>
              <input
                type="text"
                placeholder="SJ-XXXXX"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px', outline: 'none', boxSizing: 'border-box' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowJoinModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Join Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── INTERACTIVE DEMO PREVIEW ── */}
      <div
        className="glass-panel preview-panel"
        style={{ padding: '36px', borderRadius: '24px', marginBottom: '80px', background: 'var(--bg-secondary)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <span className="status-pill CONNECTED">PIPELINE PREVIEW</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Farmer speaks Hindi → Prisma transcribes → Advisory retrieved → Timbre speaks answer</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {previewSteps.map((s, i) => (
            <div
              key={i}
              style={{
                padding: '18px',
                borderRadius: '12px',
                background: previewStep >= i + 1 ? s.bg : 'var(--bg-tertiary)',
                border: `1px solid ${previewStep >= i + 1 ? s.color : 'var(--border-subtle)'}`,
                transition: 'all 0.4s ease',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: s.color, marginBottom: '6px', letterSpacing: '0.04em' }}>{s.label}</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>{s.title}</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => navigate('advisory')} className="btn btn-primary">
            <span>Browse Crop Advisories</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* ── ADVISORY TOPICS GRID ── */}
      <div style={{ marginBottom: '80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: '10px' }}>Advisory Topics</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto', fontSize: '0.95rem' }}>
            Ask questions about any of these crops and weather factors in your native language.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '24px' }}>
          {CROPS.map((crop) => (
            <button
              key={crop.name}
              type="button"
              onClick={() => navigate('advisory')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '9999px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{crop.icon}</span>
              {crop.name}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {WEATHER_TOPICS.map((topic) => (
            <div
              key={topic.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '9999px',
                background: 'rgba(6,182,212,0.1)',
                border: '1px solid var(--accent-cyan)',
                color: 'var(--accent-cyan)',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              {topic.icon}
              {topic.name}
            </div>
          ))}
        </div>
      </div>

      {/* ── LANGUAGE MATRIX ── */}
      <div style={{ marginBottom: '80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: '10px' }}>9 Indian Languages</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', fontSize: '0.95rem' }}>
            Every language comes with full STT (Gnani Prisma) and TTS (Gnani Timbre) support — no second-class languages.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {supportedLangs.length > 0 ? supportedLangs.map((lang) => (
            <div key={lang.code} className="glass-panel" style={{ padding: '18px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>{lang.name}</span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-tertiary)' }}>{lang.code}</span>
              </div>
              <div style={{ fontSize: '1.1rem', color: 'var(--brand-primary)', marginBottom: '12px' }}>{lang.nativeName}</div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-emerald)' }}><CheckCircle2 size={12} /> STT (Prisma)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-emerald)' }}><CheckCircle2 size={12} /> TTS (Timbre)</span>
              </div>
            </div>
          )) : (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              <Languages size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <p>Language data loads from the API. Start the backend to see supported languages.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{ marginBottom: '80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: '10px' }}>How It Works</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Four simple steps from your question to a spoken answer.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="glass-panel" style={{ padding: '28px', background: 'var(--bg-secondary)', borderRadius: '16px', position: 'relative' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--brand-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1rem',
                  color: '#fff',
                  marginBottom: '16px',
                  flexShrink: 0,
                }}
              >
                {item.step}
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>{item.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TRUST / SAFETY SECTION ── */}
      <div
        className="glass-panel"
        style={{ padding: '40px', borderRadius: '20px', background: 'var(--bg-secondary)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '28px', marginBottom: '80px' }}
      >
        <div style={{ gridColumn: '1/-1', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '6px' }}>Built for Trust</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Farmers trust KisanSaathi because every piece of advice is grounded in real data.
          </p>
        </div>
        {TRUST_ITEMS.map((item) => (
          <div key={item.title}>
            <div
              style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'rgba(99,102,241,0.12)', color: 'var(--brand-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px',
              }}
            >
              {item.icon}
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>{item.title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{item.desc}</p>
          </div>
        ))}
      </div>

      {/* ── PHRASE STUDIO (keep at bottom with id) ── */}
      <div id="phrase-studio" tabIndex={-1} style={{ outline: 'none', scrollMarginTop: '80px' }}>
        <PhraseStudio mode={speechMode} onModeChange={setSpeechMode} />
      </div>
    </div>
  );
};
