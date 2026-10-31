import React, { useState, useRef } from 'react';
import { Mic, Volume2, MicOff, ChevronDown, Phone, Leaf, Loader } from 'lucide-react';
import { speakText, transcribeAudio } from '../services/api';

interface AdvisoryPageProps {
  navigate: (page: string, params?: Record<string, string>) => void;
}

const LANGUAGES = [
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी' },
  { code: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'te-IN', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta-IN', name: 'Tamil', native: 'தமிழ்' },
  { code: 'ml-IN', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr-IN', name: 'Marathi', native: 'मराठी' },
  { code: 'gu-IN', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa-IN', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'en-IN', name: 'English (India)', native: 'English' },
];

const CROPS = ['Rice', 'Wheat', 'Cotton', 'Sugarcane', 'Tomato', 'Maize', 'Soybean'];

interface Advisory {
  id: number;
  title: string;
  content: string;
  source: string;
  date: string;
  district: string;
  language: string;
}

const ADVISORIES: Record<string, Advisory[]> = {
  Rice: [
    { id: 1, title: 'Pest Alert: Brown Planthopper', content: 'Brown planthopper infestation detected in kharif rice. Apply Buprofezin 25% SC at 1mL/L water. Avoid prophylactic use of synthetic pyrethroids.', source: 'ICAR-CRRI Advisory', date: 'Oct 2026', district: 'Cuttack', language: 'en-IN' },
    { id: 2, title: 'Water Management', content: 'Maintain 2-5 cm standing water during tillering stage. Drain fields 10 days before harvest for better grain quality.', source: 'State Agriculture Dept', date: 'Oct 2026', district: 'All Districts', language: 'en-IN' },
  ],
  Wheat: [
    { id: 3, title: 'Sowing Time Advisory', content: 'Timely sown wheat (November 1-15) gives best yields. Use HD-2967 or GW-322 varieties for North India plains. Seed rate: 100 kg/hectare.', source: 'ICAR-IIWBR Advisory', date: 'Oct 2026', district: 'All Districts', language: 'en-IN' },
  ],
  Cotton: [
    { id: 4, title: 'Bollworm Management', content: 'American bollworm pressure increasing. Install pheromone traps at 5 per acre. Spray NSKE 5% at egg-laying stage before chemical intervention.', source: 'CICR Advisory', date: 'Oct 2026', district: 'Vidarbha', language: 'en-IN' },
  ],
  Tomato: [
    { id: 5, title: 'Late Blight Warning', content: 'High humidity (>85%) and temperature 15-20°C favour late blight. Apply Mancozeb 75% WP at 2g/L preventively. Remove and destroy infected plants.', source: 'State Horticulture Dept', date: 'Oct 2026', district: 'Nashik', language: 'en-IN' },
  ],
  Sugarcane: [
    { id: 6, title: 'Ratoon Management', content: 'Gap filling in ratoon crop should be done within 30 days of harvest. Apply 25% extra nitrogen dose for ratoon. Ensure proper drainage to prevent waterlogging.', source: 'ICAR-SBI Advisory', date: 'Oct 2026', district: 'All Districts', language: 'en-IN' },
  ],
  Maize: [
    { id: 7, title: 'Fall Armyworm Alert', content: 'Fall armyworm (Spodoptera frugiperda) has been detected. Use Emamectin Benzoate 5% SG at 0.4g/L. Scout fields twice weekly during vegetative stages.', source: 'ICAR-IIMR Advisory', date: 'Oct 2026', district: 'All Districts', language: 'en-IN' },
  ],
  Soybean: [
    { id: 8, title: 'Girdle Beetle Management', content: 'Girdle beetle causes stem cutting in soybean. Apply Triazophos 40% EC at 2mL/L at first sign of damage. Collect and destroy fallen stems.', source: 'ICAR-IISR Advisory', date: 'Oct 2026', district: 'Madhya Pradesh', language: 'en-IN' },
  ],
};

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = 1;
  const sampleRate = 16000;
  const format = 1;
  const bitDepth = 16;
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const data = buffer.getChannelData(0);
  const samples = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const ab = new ArrayBuffer(44 + samples.byteLength);
  const view = new DataView(ab);
  const writeStr = (off: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.byteLength, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.byteLength, true);
  new Int16Array(ab, 44).set(samples);
  return ab;
}

export const AdvisoryPage: React.FC<AdvisoryPageProps> = ({ navigate }) => {
  const [selectedCrop, setSelectedCrop] = useState('Rice');
  const [selectedLanguage, setSelectedLanguage] = useState('hi-IN');
  const [districtInput, setDistrictInput] = useState('');
  const [voiceQuestion, setVoiceQuestion] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [sttError, setSttError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const advisories = ADVISORIES[selectedCrop] ?? [];

  const handleListen = async (advisory: Advisory) => {
    if (isSpeaking) return;
    try {
      setIsSpeaking(true);
      setSpeakingId(advisory.id);
      const data = await speakText(advisory.content, selectedLanguage);
      if (data.audioBase64) {
        const binary = atob(data.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => { setIsSpeaking(false); setSpeakingId(null); URL.revokeObjectURL(url); };
        audio.onerror = () => { setIsSpeaking(false); setSpeakingId(null); };
        await audio.play();
      }
    } catch {
      setIsSpeaking(false);
      setSpeakingId(null);
    }
  };

  const startListening = async () => {
    setSttError('');
    setVoiceQuestion('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          // Decode and re-encode to WAV at 16 kHz
          const arrayBuffer = await blob.arrayBuffer();
          const audioCtx = new AudioContext({ sampleRate: 16000 });
          const decoded = await audioCtx.decodeAudioData(arrayBuffer);
          const wavBuffer = audioBufferToWav(decoded);
          await audioCtx.close();
          const wavB64 = btoa(String.fromCharCode(...new Uint8Array(wavBuffer)));
          const result = await transcribeAudio(wavB64, selectedLanguage);
          setVoiceQuestion(typeof result.transcript === 'string' ? result.transcript : '');
        } catch (err) {
          setSttError(err instanceof Error ? err.message : 'Transcription failed. Please try again.');
        } finally {
          setIsListening(false);
        }
      };
      mr.start();
      setIsListening(true);
    } catch {
      setSttError('Microphone access denied. Please allow mic access and try again.');
    }
  };

  const stopListening = () => {
    mediaRecorderRef.current?.stop();
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <button
          type="button"
          onClick={() => navigate('landing')}
          style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', padding: 0 }}
        >
          ← Back to Home
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--brand-light)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Crop Advisory</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Source-attributed advisories from ICAR, IMD and State Agriculture Departments</p>
          </div>
        </div>
      </div>

      {/* Kisan Helpline Banner */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderRadius: '12px',
          background: 'rgba(16,185,129,0.1)', border: '1px solid var(--accent-emerald)', marginBottom: '32px',
        }}
      >
        <Phone size={20} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-emerald)' }}>Kisan Call Centre — 24×7 Free Helpline</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Call <strong style={{ color: 'var(--text-primary)' }}>1800-180-1551</strong> (toll-free) to speak with an Agriculture Officer in your language.
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="glass-panel"
        style={{ padding: '24px', borderRadius: '16px', background: 'var(--bg-secondary)', marginBottom: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}
      >
        {/* Language */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Language</label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              style={{ width: '100%', padding: '10px 36px 10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.9rem', appearance: 'none', cursor: 'pointer', outline: 'none' }}
            >
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name} — {l.native}</option>)}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
          </div>
        </div>

        {/* Crop */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Crop</label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              style={{ width: '100%', padding: '10px 36px 10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.9rem', appearance: 'none', cursor: 'pointer', outline: 'none' }}
            >
              {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
          </div>
        </div>

        {/* District */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>District (optional)</label>
          <input
            type="text"
            placeholder="e.g. Nashik, Cuttack…"
            value={districtInput}
            onChange={(e) => setDistrictInput(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Voice Question Section */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', background: 'var(--bg-secondary)', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Mic size={18} style={{ color: 'var(--brand-primary)' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Ask a Question by Voice</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px' }}>
          Tap the mic, ask your question in {LANGUAGES.find(l => l.code === selectedLanguage)?.name ?? 'your language'}, then release to get it transcribed.
        </p>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 20px', borderRadius: '9999px',
              background: isListening ? 'rgba(239,68,68,0.12)' : 'var(--brand-light)',
              color: isListening ? '#ef4444' : 'var(--brand-primary)',
              border: `1px solid ${isListening ? '#ef4444' : 'var(--brand-primary)'}`,
              fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            {isListening ? 'Stop Recording' : 'Start Recording'}
          </button>

          {voiceQuestion && (
            <div
              style={{
                flex: 1, minWidth: '200px', padding: '12px 16px', borderRadius: '10px',
                background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5,
              }}
            >
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brand-primary)', display: 'block', marginBottom: '4px' }}>TRANSCRIBED</span>
              {voiceQuestion}
            </div>
          )}
        </div>

        {isListening && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', color: '#ef4444', fontSize: '0.875rem', fontWeight: 600 }}>
            <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Recording… speak now
          </div>
        )}
        {sttError && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '10px' }}>{sttError}</p>}
      </div>

      {/* Advisories List */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
            {selectedCrop} Advisories
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '10px' }}>{advisories.length} found</span>
          </h2>
        </div>

        {advisories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
            <Leaf size={36} style={{ marginBottom: '12px', opacity: 0.35 }} />
            <p>No advisories found for {selectedCrop}. Try another crop or check back later.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {advisories
              .filter(a => !districtInput.trim() || a.district.toLowerCase().includes(districtInput.trim().toLowerCase()) || a.district === 'All Districts')
              .map((advisory) => (
                <div
                  key={advisory.id}
                  className="glass-panel"
                  style={{ padding: '24px', borderRadius: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{advisory.title}</h3>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '9999px', background: 'var(--brand-light)', color: 'var(--brand-primary)', fontSize: '0.72rem', fontWeight: 700 }}>
                        {advisory.source}
                      </span>
                      <span style={{ padding: '3px 10px', borderRadius: '9999px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>
                        {advisory.district}
                      </span>
                      <span style={{ padding: '3px 10px', borderRadius: '9999px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>
                        {advisory.date}
                      </span>
                    </div>
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '16px' }}>
                    {advisory.content}
                  </p>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleListen(advisory)}
                      disabled={isSpeaking}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 16px', borderRadius: '9999px',
                        background: speakingId === advisory.id ? 'var(--brand-light)' : 'var(--bg-tertiary)',
                        color: speakingId === advisory.id ? 'var(--brand-primary)' : 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                        fontWeight: 600, fontSize: '0.8rem', cursor: isSpeaking ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s', opacity: isSpeaking && speakingId !== advisory.id ? 0.5 : 1,
                      }}
                    >
                      {speakingId === advisory.id ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Volume2 size={14} />}
                      {speakingId === advisory.id ? 'Speaking…' : '🔊 Listen'}
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Powered by Gnani Timbre · {LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Ask an Agriculture Officer fallback */}
      <div
        className="glass-panel"
        style={{ padding: '28px', borderRadius: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}
      >
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Can't find what you need?</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', maxWidth: '480px', margin: '0 auto 20px' }}>
          Our advisories cover common scenarios. For specific or urgent issues, speak directly with a trained agriculture officer.
        </p>
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px', borderRadius: '9999px',
            background: 'var(--brand-gradient)', color: '#fff',
            border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
          }}
        >
          <Phone size={16} /> Ask an Agriculture Officer
        </button>

        {showHelp && (
          <div
            style={{
              marginTop: '20px', padding: '20px', borderRadius: '12px',
              background: 'rgba(16,185,129,0.1)', border: '1px solid var(--accent-emerald)',
              maxWidth: '480px', margin: '20px auto 0',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '8px' }}>📞 Kisan Call Centre</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px' }}>1800-180-1551</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Free, 24×7 helpline. Available in all major Indian languages.
              Agriculture officers will answer your crop, pest, weather and scheme queries.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
