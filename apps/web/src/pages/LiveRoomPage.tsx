import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Copy,
  Check,
  Volume2,
  HelpCircle,
  PhoneOff,
  Share2,
  Sparkles,
  Wifi,
  Globe,
  AlertTriangle,
  QrCode,
  Link2,
  RefreshCw,
  Download,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAudioPipeline } from '../hooks/useAudioPipeline';
import { WaveformVisualizer } from '../components/WaveformVisualizer';
import { fetchLanguages, getConversation, endConversation, getRealtimeWebSocketUrl } from '../services/api';

interface LiveRoomPageProps {
  initialRoomCode?: string;
  navigate: (page: string) => void;
}

interface MessageItem {
  id: string;
  speakerLabel: string;
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
  explanationText?: string;
  audioBase64?: string;
  latencyMs?: number;
  timestamp: string;
  isPending?: boolean;
}

export const LiveRoomPage: React.FC<LiveRoomPageProps> = ({
  initialRoomCode,
  navigate,
}) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode || 'SJ-DEMO1');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR'>('CONNECTING');
  const [speechState, setSpeechState] = useState<'LISTENING' | 'PROCESSING' | 'TRANSLATING' | 'SPEAKING' | 'ERROR'>('LISTENING');
  const [latencyMs, setLatencyMs] = useState<number>(185);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [myLanguage, setMyLanguage] = useState('hi-IN');
  const [partnerLanguage, setPartnerLanguage] = useState('kn-IN');
  const [nativeNumerals, setNativeNumerals] = useState(false);
  const [boostWordsInput, setBoostWordsInput] = useState('');
  const [biasScore, setBiasScore] = useState('1');
  const [supportedLangs, setSupportedLangs] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);
  const [isExplaining, setIsExplaining] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);
  const intentionalCloseRef = useRef(false);
  const roomCodeRef = useRef(roomCode);
  const myLanguageRef = useRef(myLanguage);
  const prismaOptionsRef = useRef({ nativeNumerals, boostWordsInput, biasScore });
  const messageStreamEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);
  useEffect(() => { myLanguageRef.current = myLanguage; }, [myLanguage]);
  useEffect(() => { prismaOptionsRef.current = { nativeNumerals, boostWordsInput, biasScore }; }, [nativeNumerals, boostWordsInput, biasScore]);

  // Audio Pipeline hook
  const handleAudioSegmentReady = useCallback((audioBase64: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'audio_frame',
          audioBase64,
          language: myLanguageRef.current,
          prismaOptions: {
            format: prismaOptionsRef.current.boostWordsInput.trim() ? 'verbatim' : 'transcribe',
            itnNativeNumerals: prismaOptionsRef.current.nativeNumerals && !prismaOptionsRef.current.boostWordsInput.trim(),
            biasList: prismaOptionsRef.current.boostWordsInput.split(',').map((word) => word.trim()).filter(Boolean),
            biasScore: Number(prismaOptionsRef.current.biasScore),
          },
        })
      );
    }
  }, []);

  const {
    hasPermission,
    permissionError,
    isMuted,
    isSpeaking,
    micLevel,
    isPlayingAudio,
    initializeMic,
    toggleMute,
    queueAudioForPlayback,
    playAudioDirectly,
  } = useAudioPipeline({
    onAudioSegmentReady: handleAudioSegmentReady,
  });

  // Load verified languages and lookup room
  useEffect(() => {
    fetchLanguages()
      .then((data) => {
        if (data.languages) setSupportedLangs(data.languages);
      })
      .catch(() => {});

    if (initialRoomCode) {
      getConversation(initialRoomCode)
        .then((data) => {
          if (data.room) {
            setRoomId(data.room.id);
            setRoomCode(data.room.roomCode);
            setMyLanguage(data.room.sourceLanguage || 'hi-IN');
            setPartnerLanguage(data.room.targetLanguage || 'kn-IN');
          }
        })
        .catch(() => {
          // If room lookup fails, use initial code
        });
    }
  }, [initialRoomCode]);

  // Connect to Realtime WebSocket
  useEffect(() => {
    intentionalCloseRef.current = false;
    retryAttemptRef.current = 0;
    setRetryAttempt(0);
    let disposed = false;
    const connect = () => {
      if (disposed) return;
      setConnectionState(retryAttemptRef.current > 0 ? 'RECONNECTING' : 'CONNECTING');
    const targetCodeOrId = roomCodeRef.current;
    const wsUrl = getRealtimeWebSocketUrl(targetCodeOrId);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      retryAttemptRef.current = 0;
      setRetryAttempt(0);
      setConnectionState('CONNECTED');
      ws.send(
        JSON.stringify({
          type: 'join',
          participantLabel: 'You',
          assignedLanguage: myLanguageRef.current,
          isHost: true,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          setConnectionState('CONNECTED');
          if (data.roomId) setRoomId(data.roomId);
          if (data.roomCode) setRoomCode(data.roomCode);
        } else if (data.type === 'error') {
          setConnectionState('ERROR');
          // Invalid/expired room codes are terminal; avoid retrying forever.
          if (/room not found|expired/i.test(data.message || '')) {
            intentionalCloseRef.current = true;
            ws.close();
          }
        } else if (data.type === 'speech_status') {
          if (['LISTENING', 'PROCESSING', 'TRANSLATING', 'SPEAKING', 'ERROR'].includes(data.status)) {
            setSpeechState(data.status);
          }
        } else if (data.type === 'transcript' && data.isFinal && data.text) {
          const captionId = data.messageId || `caption-${data.sessionId || 'speaker'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          setMessages((prev) => [...prev, {
            id: captionId,
            speakerLabel: data.speakerLabel || 'Speaker',
            sourceLanguage: data.sourceLanguage || 'Unknown',
            targetLanguage: '',
            originalText: data.text,
            translatedText: '',
            timestamp: new Date().toISOString(),
            isPending: true,
          }]);
        } else if (data.type === 'translation_complete') {
          const newItem: MessageItem = {
            id: data.messageId || Math.random().toString(),
            speakerLabel: data.speakerLabel || 'Speaker',
            sourceLanguage: data.sourceLanguage,
            targetLanguage: data.targetLanguage,
            originalText: data.originalText,
            translatedText: data.translatedText,
            audioBase64: data.audioBase64,
            latencyMs: data.latencyMs || 180,
            timestamp: data.timestamp || new Date().toISOString(),
            isPending: false,
          };

          setMessages((prev) => {
            const captionIndex = [...prev].reverse().findIndex((item) =>
              item.isPending && item.originalText === newItem.originalText && item.sourceLanguage === newItem.sourceLanguage
            );
            if (captionIndex < 0) return [...prev, newItem];
            const index = prev.length - 1 - captionIndex;
            return prev.map((item, itemIndex) => itemIndex === index ? { ...item, ...newItem } : item);
          });
          if (data.latencyMs) setLatencyMs(data.latencyMs);

          // Queue audio for sequential FIFO playback
          if (data.audioBase64) {
            queueAudioForPlayback(data.audioBase64, data.mimeType || 'audio/wav');
          }
        } else if (data.type === 'explanation_ready') {
          setMessages((prev) =>
            prev.map((m) =>
              m.originalText === data.originalText
                ? { ...m, explanationText: data.explanation }
                : m
            )
          );
          setIsExplaining(null);
          if (data.audioBase64) {
            playAudioDirectly(data.audioBase64, 'audio/wav');
          }
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onerror = () => {
      if (!disposed && !intentionalCloseRef.current) setConnectionState('RECONNECTING');
    };

    ws.onclose = () => {
      if (disposed || intentionalCloseRef.current) return;
      const nextAttempt = retryAttemptRef.current + 1;
      retryAttemptRef.current = nextAttempt;
      setRetryAttempt(nextAttempt);
      setConnectionState('RECONNECTING');
      if (nextAttempt <= 8) {
        const delay = Math.min(1000 * (2 ** (nextAttempt - 1)), 15000);
        reconnectTimerRef.current = setTimeout(connect, delay);
      } else {
        setConnectionState('ERROR');
      }
    };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      intentionalCloseRef.current = true;
      wsRef.current?.close();
    };
  }, [myLanguage, retryNonce, queueAudioForPlayback, playAudioDirectly]);

  // Auto-scroll message list
  useEffect(() => {
    messageStreamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const inviteUrl = `${window.location.origin}${window.location.pathname}?code=${encodeURIComponent(roomCode)}`;
  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2200);
    } catch {
      setShowInvite(true);
    }
  };

  const handleEndRoom = async () => {
    if (messages.length > 0) downloadLiveTranscript();
    intentionalCloseRef.current = true;
    wsRef.current?.close();
    if (roomId) {
      await endConversation(roomId).catch(() => {});
    }
    navigate('history');
  };

  const downloadLiveTranscript = () => {
    if (messages.length === 0) return;
    const content = [
      'SUNOSAMJHO LIVE — CONVERSATION TRANSCRIPT',
      `Room: ${roomCode}`,
      `Date: ${new Date().toLocaleString()}`,
      `Languages: ${myLanguage} ↔ ${partnerLanguage}`,
      '',
      ...messages.flatMap((message) => [
        `[${new Date(message.timestamp).toLocaleTimeString()}] ${message.speakerLabel} (${message.sourceLanguage})${message.isPending ? ' — translation pending' : ''}`,
        `Original: ${message.originalText}`,
        ...(message.translatedText ? [`Translation (${message.targetLanguage}): ${message.translatedText}`] : []),
        ...(message.explanationText ? [`Explanation: ${message.explanationText}`] : []),
        '',
      ]),
    ].join('\n');
    const blobUrl = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = `sunosamjho-${roomCode.toLowerCase()}-transcript.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  const handleExplainSimply = (msg: MessageItem) => {
    setIsExplaining(msg.id);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'explain',
          text: msg.originalText,
          language: myLanguage,
        })
      );
    }
  };

  const handleCopyMessage = (msg: MessageItem) => {
    const textToCopy = `[${msg.sourceLanguage}] ${msg.originalText}\n[${msg.targetLanguage}] ${msg.translatedText}`;
    navigator.clipboard.writeText(textToCopy);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* TOP BAR */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Room Code:</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '0.05em',
                background: 'var(--bg-tertiary)',
                padding: '4px 10px',
                borderRadius: '6px',
              }}
            >
              {roomCode}
            </span>
          </div>

          <button
            onClick={copyRoomCode}
            className="btn btn-sm btn-secondary"
            title="Copy Room Code"
          >
            {copiedCode ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
            <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
          </button>
          <button
            onClick={() => setShowInvite((show) => !show)}
            className="btn btn-sm btn-primary"
          >
            <Share2 size={14} />
            <span>{showInvite ? 'Hide Invite' : 'Share Invite'}</span>
          </button>
        </div>

        {/* CONNECTION & LATENCY STATUS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className={`status-pill ${connectionState}`}
            title="Real-time WebSocket connection state"
          >
            <Wifi size={12} />
            <span>{connectionState === 'RECONNECTING' ? `RECONNECTING · ${retryAttempt}/8` : connectionState}</span>
          </div>

          {connectionState === 'ERROR' && (
            <button className="btn btn-sm btn-secondary" onClick={() => { retryAttemptRef.current = 0; setRetryNonce((n) => n + 1); }}>
              <RefreshCw size={13} /> Retry
            </button>
          )}

          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-tertiary)',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            Latency: <strong>{latencyMs}ms</strong>
          </div>

          {messages.length > 0 && (
            <button onClick={downloadLiveTranscript} className="btn btn-sm btn-secondary" title="Download live transcript as a text file">
              <Download size={14} />
              <span>Download Text</span>
            </button>
          )}

          <button
            onClick={handleEndRoom}
            className="btn btn-sm btn-danger"
          >
            <PhoneOff size={14} />
            <span>End Call</span>
          </button>
        </div>
      </div>

      {connectionState === 'RECONNECTING' && (
        <div className="room-reconnect-note" role="status">
          <RefreshCw size={16} />
          <span>Connection interrupted. Reconnecting automatically… New speech won’t send until you’re back online.</span>
        </div>
      )}
      {connectionState === 'ERROR' && (
        <div className="room-reconnect-note error" role="alert">
          <AlertTriangle size={16} />
          <span>Couldn’t connect to this room. Check the invite code or retry the connection.</span>
        </div>
      )}

      {/* PERMISSION ERROR ALERT */}
      {permissionError && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '10px',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: 'var(--accent-rose)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.9rem',
          }}
        >
          <AlertTriangle size={18} />
          <span>{permissionError}</span>
        </div>
      )}

      {/* PARTICIPANTS STRIP */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Participant 1: YOU */}
        <div
          className="glass-panel"
          style={{
            padding: '18px',
            background: 'var(--bg-secondary)',
            border: isSpeaking ? '2px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
            transition: 'border 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--brand-light)',
                  color: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                YOU
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.925rem' }}>Your Microphone</div>
                <div style={{ fontSize: '0.75rem', color: isMuted ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                  {isMuted ? 'Muted' : isSpeaking ? 'Speaking...' : 'Listening...'}
                </div>
              </div>
            </div>

            <div className={`status-pill ${speechState}`}>
              {speechState}
            </div>
          </div>

          {/* Language Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Globe size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Spoken Language:</span>
            <select
              value={myLanguage}
              onChange={(e) => setMyLanguage(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.825rem',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {supportedLangs.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.nativeName})
                </option>
              ))}
            </select>
          </div>

          {/* Live Waveform Indicator */}
          <div className={`mic-monitor${isMuted ? ' is-muted' : ''}${isSpeaking ? ' is-speaking' : ''}`}>
            <div className="mic-monitor-heading">
              <span className="mic-monitor-status">
                <span className="mic-monitor-dot" />
                {isMuted ? 'MICROPHONE MUTED' : isSpeaking ? 'VOICE DETECTED' : 'LISTENING FOR SPEECH'}
              </span>
              <span className="mic-monitor-level">{isMuted ? '—' : `${micLevel}%`}</span>
            </div>
            <WaveformVisualizer isActive={!isMuted && Boolean(hasPermission)} level={micLevel} barCount={24} />
            <div className="mic-monitor-hint">
              {isMuted ? 'Unmute your microphone when you are ready to speak.' : isSpeaking ? 'Your voice is being captured for translation.' : 'Speak naturally — your live audio level will appear here.'}
            </div>
          </div>

          <details className="prisma-tuning">
            <summary><Sparkles size={14} /> Prisma recognition settings <span>Optional</span></summary>
            <div className="prisma-options-grid">
              <label className="prisma-field prisma-boost-field">
                <span>Boost names and key terms</span>
                <input
                  value={boostWordsInput}
                  onChange={(event) => setBoostWordsInput(event.target.value)}
                  placeholder="e.g. Gnani, Prisma, Timbre"
                  aria-describedby="prisma-boost-help"
                />
                <small id="prisma-boost-help">Comma-separated single words only; up to 100. Boosting uses verbatim output, so ITN numerals apply only when this is empty.</small>
              </label>
              <label className="prisma-field">
                <span>Boost strength</span>
                <select value={biasScore} onChange={(event) => setBiasScore(event.target.value)}>
                  <option value="0.5">Light · 0.5</option>
                  <option value="1">Balanced · 1.0</option>
                  <option value="1.5">Strong · 1.5</option>
                  <option value="2">Maximum · 2.0</option>
                </select>
              </label>
              <label className="prisma-check-field">
                <input type="checkbox" checked={nativeNumerals} onChange={(event) => setNativeNumerals(event.target.checked)} />
                <span>Use native-script digits for normalized numbers</span>
              </label>
            </div>
          </details>
        </div>

        {/* Participant 2: PARTNER */}
        <div
          className="glass-panel"
          style={{
            padding: '18px',
            background: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(6, 182, 212, 0.15)',
                  color: 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                P2
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.925rem' }}>Conversation Partner</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isPlayingAudio ? 'Audio Playing...' : 'Connected'}
                </div>
              </div>
            </div>

            <div className="status-pill CONNECTED">
              READY
            </div>
          </div>

          {/* Language Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Globe size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Target Language:</span>
            <select
              value={partnerLanguage}
              onChange={(e) => setPartnerLanguage(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.825rem',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {supportedLangs.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.nativeName})
                </option>
              ))}
            </select>
          </div>

          {/* Partner Audio Queue Indicator */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span>Audio Playback Queue:</span>
            <span style={{ fontWeight: 700, color: isPlayingAudio ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
              {isPlayingAudio ? 'Sequential Playback Active' : 'Idle'}
            </span>
          </div>
        </div>
      </div>

      {/* CENTER: LIVE CAPTIONS AND CONVERSATION STREAM */}
      <div
        className="glass-panel"
        style={{
          minHeight: '380px',
          maxHeight: '520px',
          overflowY: 'auto',
          padding: '24px',
          marginBottom: '24px',
          background: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div className="caption-stream-heading">
          <div><span className="caption-live-dot" /> Live captions</div>
          <span>Transcription appears before translation</span>
        </div>
        {messages.length === 0 ? (
          <div
            style={{
              margin: 'auto',
              textAlign: 'center',
              maxWidth: '400px',
              color: 'var(--text-muted)',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'var(--brand-primary)',
              }}
            >
              <Mic size={24} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Conversation Room Ready
            </h4>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
              Click <strong>Enable Microphone</strong> below and begin speaking naturally. Speech will be transcribed,
              translated, and spoken aloud in real time.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '18px 20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{msg.speakerLabel}</span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--brand-light)',
                      color: 'var(--brand-primary)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {msg.sourceLanguage}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>

              {/* Original Utterance */}
              <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {msg.originalText}
              </div>

              {/* Translation Arrow & Translated Text */}
              {msg.isPending ? (
                <div className="caption-pending" role="status">
                  <span className="caption-spinner" /> Translation in progress…
                </div>
              ) : <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  borderLeft: '3px solid var(--brand-primary)',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--brand-primary)',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  {msg.targetLanguage} Translation
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {msg.translatedText}
                </div>
              </div>}

              {/* Plain Language Explanation (if requested) */}
              {msg.explanationText && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Sparkles size={16} color="var(--accent-emerald)" />
                  <span><strong>Plain Explanation:</strong> {msg.explanationText}</span>
                </div>
              )}

              {/* Utterance Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {msg.audioBase64 && (
                  <button
                    onClick={() => playAudioDirectly(msg.audioBase64!)}
                    className="btn btn-sm btn-secondary"
                    title="Play translated voice"
                  >
                    <Volume2 size={13} />
                    <span>Play Voice</span>
                  </button>
                )}

                <button
                  onClick={() => handleExplainSimply(msg)}
                  disabled={isExplaining === msg.id}
                  className="btn btn-sm btn-secondary"
                  title="Explain this phrase simply in plain terms"
                >
                  <HelpCircle size={13} />
                  <span>{isExplaining === msg.id ? 'Explaining...' : 'Explain Simply'}</span>
                </button>

                <button
                  onClick={() => handleCopyMessage(msg)}
                  className="btn btn-sm btn-secondary"
                  title="Copy transcription and translation"
                >
                  <Copy size={13} />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          ))
        )}
        <div ref={messageStreamEndRef} />
      </div>

      {/* BOTTOM CONVERSATION CONTROLS (Mobile-friendly One-Hand Bar) */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 24px',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {!hasPermission ? (
          <button onClick={initializeMic} className="btn btn-primary btn-lg pulsing-mic">
            <Mic size={20} />
            <span>Enable Microphone to Speak</span>
          </button>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`btn btn-lg ${isMuted ? 'btn-danger' : 'btn-primary'}`}
              style={{ minWidth: '180px' }}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              <span>{isMuted ? 'Unmute Microphone' : 'Mute Microphone'}</span>
            </button>

          </>
        )}
      </div>

      {showInvite && (
        <div className="invite-card glass-panel">
          <div className="invite-card-copy">
            <div className="invite-icon"><Link2 size={18} /></div>
            <div>
              <h3>Invite someone to this room</h3>
              <p>Anyone with this link can join. Share it only with people you trust.</p>
            </div>
          </div>
          <div className="invite-url-row">
            <input aria-label="Room invite link" readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} />
            <button onClick={copyInviteLink} className="btn btn-primary">
              {copiedInvite ? <Check size={16} /> : <Copy size={16} />}
              {copiedInvite ? 'Copied link' : 'Copy invite link'}
            </button>
          </div>
          <div className="invite-qr-wrap">
            <div className="invite-qr"><QRCodeSVG value={inviteUrl} size={132} bgColor="#ffffff" fgColor="#101521" level="M" /></div>
            <div><QrCode size={16} /><span>Scan to join this conversation</span></div>
          </div>
        </div>
      )}
    </div>
  );
};
