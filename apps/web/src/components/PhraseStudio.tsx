import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownUp, AudioLines, Check, Copy, Download, FileText, LoaderCircle, MessageSquareText, Mic, Play, RefreshCw, StopCircle, Trash2, Upload, Volume2, X } from 'lucide-react';
import { encodeMonoWav, playWavBase64 } from '../services/audio';
import { fetchHealth, fetchLanguages, speakText, transcribeAudio, translateText } from '../services/api';
import { usePrismaRealtimeDictation } from '../hooks/usePrismaRealtimeDictation';

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

interface ProviderHealth {
  status?: string;
  provider?: { providerName?: string; isMock?: boolean; status?: string; message?: string };
  integrations?: {
    prisma?: { configured?: boolean; mode?: string };
    timbre?: { configured?: boolean; mode?: string };
    evon?: { configured?: boolean; mode?: string };
  };
}

export type SpeechMode = 'tts' | 'stt';
type SetupService = 'Prisma' | 'Timbre' | 'Evon';

interface PhraseStudioProps {
  mode: SpeechMode;
  onModeChange: (mode: SpeechMode) => void;
}

const phraseExamples: Record<string, string[]> = {
  'hi-IN': ['मुझे इस दवा को दिन में कितनी बार लेना चाहिए?', 'मेरी फसल के लिए आज कौन-सी सलाह है?', 'क्या आप यह पता मुझे लिखकर दे सकते हैं?'],
  'kn-IN': ['ಈ ಔಷಧಿಯನ್ನು ದಿನಕ್ಕೆ ಎಷ್ಟು ಬಾರಿ ತೆಗೆದುಕೊಳ್ಳಬೇಕು?', 'ನನ್ನ ಬೆಳೆಗೆ ಇಂದು ಯಾವ ಸಲಹೆ ಇದೆ?', 'ಈ ವಿಳಾಸವನ್ನು ನನಗೆ ಬರೆದು ಕೊಡಬಹುದೇ?'],
  'ta-IN': ['இந்த மருந்தை ஒரு நாளில் எத்தனை முறை எடுத்துக்கொள்ள வேண்டும்?', 'என் பயிருக்கு இன்று என்ன ஆலோசனை?', 'இந்த முகவரியை எனக்கு எழுதித் தர முடியுமா?'],
  'te-IN': ['ఈ మందును రోజుకు ఎన్నిసార్లు తీసుకోవాలి?', 'నా పంటకు ఈరోజు ఏ సలహా ఉంది?', 'ఈ చిరునామాను నాకు రాసి ఇస్తారా?'],
  'en-IN': ['How many times a day should I take this medicine?', 'What advice is available for my crop today?', 'Could you write this address down for me?'],
  'mr-IN': ['हे औषध दिवसातून किती वेळा घ्यावे?', 'आज माझ्या पिकासाठी कोणता सल्ला आहे?', 'हा पत्ता मला लिहून द्याल का?'],
  'bn-IN': ['এই ওষুধ দিনে কতবার খেতে হবে?', 'আজ আমার ফসলের জন্য কী পরামর্শ আছে?', 'এই ঠিকানাটি কি আমাকে লিখে দেবেন?'],
  'gu-IN': ['આ દવા દિવસમાં કેટલી વાર લેવી જોઈએ?', 'આજે મારા પાક માટે શું સલાહ છે?', 'શું તમે મને આ સરનામું લખી આપશો?'],
  'ml-IN': ['ഈ മരുന്ന് ഒരു ദിവസം എത്ര തവണ കഴിക്കണം?', 'ഇന്ന് എന്റെ വിളയ്ക്ക് എന്ത് ഉപദേശമാണ്?', 'ഈ വിലാസം എനിക്ക് എഴുതിത്തരാമോ?'],
  'pa-IN': ['ਇਹ ਦਵਾਈ ਦਿਨ ਵਿੱਚ ਕਿੰਨੀ ਵਾਰ ਲੈਣੀ ਚਾਹੀਦੀ ਹੈ?', 'ਅੱਜ ਮੇਰੀ ਫ਼ਸਲ ਲਈ ਕੀ ਸਲਾਹ ਹੈ?', 'ਕੀ ਤੁਸੀਂ ਇਹ ਪਤਾ ਮੈਨੂੰ ਲਿਖ ਕੇ ਦੇ ਸਕਦੇ ਹੋ?'],
};

const voiceMap: Record<string, { id: string; name: string }[]> = {
  'hi-IN': [{ id: 'Nalini', name: 'Nalini (Female)' }, { id: 'Madhav', name: 'Madhav (Male)' }],
  'en-IN': [{ id: 'Kaveri', name: 'Kaveri (Female)' }, { id: 'Dhruv', name: 'Dhruv (Male)' }],
  'ta-IN': [{ id: 'Asmita', name: 'Asmita (Female)' }, { id: 'Karthi', name: 'Karthi (Male)' }],
  'te-IN': [{ id: 'Suhana', name: 'Suhana (Female)' }, { id: 'Sandeep', name: 'Sandeep (Male)' }],
  'kn-IN': [{ id: 'Saanvi', name: 'Saanvi (Female)' }, { id: 'Varun', name: 'Varun (Male)' }],
  'ml-IN': [{ id: 'Reshma', name: 'Reshma (Female)' }, { id: 'Jithin', name: 'Jithin (Male)' }],
  'mr-IN': [{ id: 'Zahira', name: 'Zahira (Female)' }, { id: 'Amol', name: 'Amol (Male)' }],
  'bn-IN': [{ id: 'Kirra', name: 'Kirra (Female)' }, { id: 'Joy', name: 'Joy (Male)' }],
  'gu-IN': [{ id: 'Falak', name: 'Falak (Female)' }, { id: 'Jay', name: 'Jay (Male)' }],
  'pa-IN': [{ id: 'Mehuli', name: 'Mehuli (Female)' }, { id: 'Gurpreet', name: 'Gurpreet (Male)' }],
};

const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read the recorded audio.'));
  reader.onload = () => {
    if (typeof reader.result !== 'string') {
      reject(new Error('Could not encode the recorded audio.'));
      return;
    }
    const separator = reader.result.indexOf(',');
    if (separator < 0 || separator === reader.result.length - 1) {
      reject(new Error('The recorded audio was empty.'));
      return;
    }
    resolve(reader.result.slice(separator + 1));
  };
  reader.readAsDataURL(blob);
});

export const PhraseStudio: React.FC<PhraseStudioProps> = ({ mode, onModeChange }) => {
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [sourceLanguage, setSourceLanguage] = useState('hi-IN');
  const [targetLanguage, setTargetLanguage] = useState('kn-IN');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeakingSource, setIsSpeakingSource] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recognitionConfidence, setRecognitionConfidence] = useState<number | null>(null);
  const [uploadedNotesName, setUploadedNotesName] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedSource, setCopiedSource] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Nalini');
  const [selectedSpeed, setSelectedSpeed] = useState<number>(1.0);
  const [lastSynthesizedAudio, setLastSynthesizedAudio] = useState<string | null>(null);
  const [health, setHealth] = useState<ProviderHealth | null>(null);
  const [setupService, setSetupService] = useState<SetupService | null>(null);
  const [setupMessage, setSetupMessage] = useState('');
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const holdStartedRef = useRef(false);
  const hasRealtimeTranscriptRef = useRef(false);
  const refreshProviderHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    setSetupMessage('');
    try {
      const result = await fetchHealth() as ProviderHealth;
      setHealth(result);
      setSetupMessage(result.provider?.isMock
        ? 'The API is reachable, but it is still in mock mode. Add the rotated Gnani key to the API server environment, disable mock mode, and restart the API.'
        : 'API status refreshed. Try the speech button again to verify the selected Gnani service.');
    } catch (cause) {
      setHealth(null);
      setSetupMessage(cause instanceof Error
        ? `Could not reach the API: ${cause.message}`
        : 'Could not reach the API. Start the API server and try again.');
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);
  const openSetupGuide = (service: SetupService) => {
    setSetupService(service);
    setSetupMessage('');
    setError('');
  };
  const liveDictation = usePrismaRealtimeDictation({
    onTranscript: (text) => {
      setSourceText((current) => {
        if (!hasRealtimeTranscriptRef.current) {
          hasRealtimeTranscriptRef.current = true;
          return text;
        }
        return current ? `${current.trim()} ${text}` : text;
      });
      setTranslatedText('');
      setRecognitionConfidence(null);
    },
    onError: setError,
  });
  const isRecording = liveDictation.status !== 'idle';

  useEffect(() => {
    fetchLanguages().then((result) => setLanguages(result.languages || [])).catch(() => {});
    void refreshProviderHealth();
  }, [refreshProviderHealth]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshProviderHealth();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refreshProviderHealth]);

  useEffect(() => () => {
    if (playbackContextRef.current?.state !== 'closed') void playbackContextRef.current?.close();
  }, []);

  useEffect(() => {
    if (mode !== 'stt' && liveDictation.status !== 'idle') void liveDictation.stop();
  }, [mode, liveDictation.stop]);

  const handleRecordingStopped = async (recordedBlob: Blob) => {
    if (!recordedBlob.size) {
      setError('No audio was captured. Please try recording again.');
      return;
    }

    setIsTranscribing(true);
    setError('');
    try {
      if (typeof AudioContext === 'undefined') {
        throw new Error('This browser cannot decode audio uploads. Try recording from a supported browser or convert the file to WAV.');
      }
      const audioContext = new AudioContext();
      try {
        let decodedAudio: AudioBuffer;
        try {
          decodedAudio = await audioContext.decodeAudioData(await recordedBlob.arrayBuffer());
        } catch {
          throw new Error('This browser cannot decode the selected audio. Convert it to WAV or try a different supported file.');
        }
        if (decodedAudio.duration > 60) throw new Error('Audio must be 60 seconds or shorter. Please trim it and try again.');
        const wavAudio = encodeMonoWav(decodedAudio);
        const result = await transcribeAudio(await blobToBase64(wavAudio), sourceLanguage);
        const transcript = typeof result.transcript === 'string' ? result.transcript.trim() : '';
        if (!transcript) throw new Error('No speech was recognized. Please try again in a quieter place.');
        setSourceText(transcript);
        setTranslatedText('');
        setRecognitionConfidence(typeof result.confidence === 'number' ? result.confidence : null);
      } finally {
        await audioContext.close();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Speech recognition failed. Check provider configuration and try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleNotesUpload = async (file?: File) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['txt', 'md', 'csv', 'json'].includes(extension || '')) {
      setError('Upload a text note in .txt, .md, .csv, or .json format.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Notes must be 2 MB or smaller.');
      return;
    }
    try {
      const text = await file.text();
      if (!text.trim()) throw new Error('This notes file is empty.');
      if (text.length > 20000) throw new Error('Notes must be 20,000 characters or fewer.');
      setSourceText(text);
      setTranslatedText('');
      setUploadedNotesName(file.name);
      setRecognitionConfidence(null);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read this notes file.');
    }
  };

  const handleAudioUpload = async (file?: File) => {
    if (!file) return;
    if (isMock) {
      openSetupGuide('Prisma');
      return;
    }
    const allowedAudio = ['audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4'];
    if (!allowedAudio.includes(file.type) && !/\.(wav|webm|ogg|mp3|m4a)$/i.test(file.name)) {
      setError('Upload an audio file in WAV, WebM, OGG, MP3, or M4A format.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Audio files must be 10 MB or smaller.');
      return;
    }
    setError('');
    setRecognitionConfidence(null);
    await handleRecordingStopped(file);
  };

  const splitSpeechText = (text: string) => {
    const chunks: string[] = [];
    let remaining = text.trim();
    while (remaining.length > 600) {
      let splitAt = remaining.lastIndexOf(' ', 600);
      if (splitAt < 200) splitAt = 600;
      chunks.push(remaining.slice(0, splitAt).trim());
      remaining = remaining.slice(splitAt).trim();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
  };

  const speakLongText = async (text: string, language: string, setSpeaking: (speaking: boolean) => void) => {
    setSpeaking(true);
    setError('');
    try {
      if (health?.provider?.isMock) throw new Error('Real Gnani Timbre is not configured. Add a rotated Gnani credential to the server .env and restart the API.');

      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) throw new Error('Web Audio playback is not supported in this browser.');
      let audioContext = playbackContextRef.current;
      if (!audioContext || audioContext.state === 'closed') audioContext = new AudioContextConstructor();
      playbackContextRef.current = audioContext;
      const resumePlayback = audioContext.resume();

      for (const chunk of splitSpeechText(text)) {
        const result = await speakText(chunk, language, { voiceId: selectedVoice, speed: selectedSpeed });
        if (result.audioBase64) {
          setLastSynthesizedAudio(result.audioBase64);
        }
        await resumePlayback;
        await playWavBase64(audioContext, result.audioBase64);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Voice playback failed. Check provider configuration and try again.');
    } finally {
      setSpeaking(false);
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      await liveDictation.stop();
      return;
    }

    if (isMock) {
      openSetupGuide('Prisma');
      return;
    }

    setError('');
    setRecognitionConfidence(null);
    hasRealtimeTranscriptRef.current = false;
    setTranslatedText('');
    await liveDictation.start(sourceLanguage);
  };

  const handleHoldStart = (event: React.PointerEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (isRecording) return;
    if (isMock) {
      openSetupGuide('Prisma');
      return;
    }
    holdStartedRef.current = true;
    setError('');
    setRecognitionConfidence(null);
    hasRealtimeTranscriptRef.current = false;
    setTranslatedText('');
    void liveDictation.start(sourceLanguage);
  };

  const handleHoldEnd = () => {
    if (!holdStartedRef.current) return;
    holdStartedRef.current = false;
    if (isRecording) void liveDictation.stop();
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    if (!canTranslate) {
      openSetupGuide('Evon');
      return;
    }
    setIsTranslating(true);
    setError('');
    try {
      const result = await translateText(sourceText.trim(), sourceLanguage, targetLanguage);
      setTranslatedText(result.translatedText || '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Translation failed. Check provider configuration and try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSpeak = async () => {
    if (!translatedText.trim()) return;
    if (isMock) {
      openSetupGuide('Timbre');
      return;
    }
    await speakLongText(translatedText, targetLanguage, setIsSpeaking);
  };

  const handleSpeakSource = async () => {
    if (!sourceText.trim()) return;
    if (isMock) {
      openSetupGuide('Timbre');
      return;
    }
    await speakLongText(sourceText, sourceLanguage, setIsSpeakingSource);
  };

  const copyTranslation = async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Clipboard access is unavailable in this browser.');
    }
  };

  const swapLanguages = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    setSourceText(translatedText || sourceText);
    setTranslatedText('');
  };

  const provider = health?.provider;
  const isMock = provider?.isMock ?? true;
  const canTranslate = health?.integrations?.evon?.mode === 'endpoint-configured';
  const setupTitle = setupService === 'Timbre'
    ? 'Text to speech (Timbre)'
    : setupService === 'Prisma'
      ? 'Speech to text (Prisma)'
      : 'Translation (Evon)';
  const setupEnv = setupService === 'Timbre'
    ? 'GNANI_TIMBRE_BASE_URL=https://api.vachana.ai'
    : setupService === 'Prisma'
      ? 'GNANI_PRISMA_BASE_URL=https://api.vachana.ai'
      : 'GNANI_EVON_BASE_URL=https://your-approved-inference-endpoint';
  const examplePhrases = phraseExamples[sourceLanguage] || phraseExamples['en-IN'];

  return (
    <section id="phrase-studio" className="phrase-studio glass-panel" aria-labelledby="phrase-studio-title" tabIndex={-1}>
      <div className="phrase-studio-heading">
        <div>
          <div className="section-kicker"><AudioLines size={14} /> VOICE AI PLAYGROUND</div>
          <h2 id="phrase-studio-title">Choose how you want to use speech AI.</h2>
          <p>Read notes aloud, turn a recording into editable text, or translate text into another spoken language. No room required.</p>
        </div>
        <div className={`provider-status ${!provider ? 'is-mock' : isMock ? 'is-mock' : canTranslate ? 'is-live' : 'is-partial'}`} title={provider?.message || 'Local API status'}>
          <span className="provider-status-dot" />
          <span>{provider ? (isMock ? 'Mock preview' : canTranslate ? 'Speech APIs configured' : 'Prisma + Timbre configured · Evon setup needed') : 'API offline'}</span>
          <button type="button" className="provider-status-refresh" onClick={() => void refreshProviderHealth()} disabled={isCheckingHealth} aria-label="Refresh API status" title="Refresh API status">
            <RefreshCw size={13} className={isCheckingHealth ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {setupService && (
        <div className="stt-provider-notice provider-setup-guide" role="status">
          <div className="provider-setup-heading">
            <strong>Set up Gnani {setupTitle}</strong>
            <button type="button" className="provider-setup-close" onClick={() => setSetupService(null)} aria-label="Close setup guide"><X size={15} /></button>
          </div>
          {setupService === 'Evon' ? (
            <>
              <p>Evon needs its own approved OpenAI-compatible inference endpoint. A Prisma/Timbre API key alone does not configure Evon.</p>
              <ol>
                <li>Set <code>{setupEnv}</code> in the API server environment.</li>
                <li>If your approved endpoint requires a key, set it server-side as <code>GNANI_EVON_API_KEY</code>.</li>
                <li>Restart the API server. Never enter any API key in this page.</li>
              </ol>
            </>
          ) : (
            <>
              <p>These buttons use your API server; the Gnani key must stay on that server and must never be entered in this page.</p>
              <ol>
                <li>Put your newly rotated key in the server-side <code>.env</code> as <code>GNANI_API_KEY_ID=your_rotated_key</code>.</li>
                <li>Set <code>ENABLE_MOCK_PROVIDER=false</code>, then restart the API server.</li>
                <li>Use the official base URL <code>https://api.vachana.ai</code>. Optional endpoint setting: <code>{setupEnv}</code>.</li>
              </ol>
            </>
          )}
          {setupMessage && <p className="provider-setup-status">{setupMessage}</p>}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void refreshProviderHealth()} disabled={isCheckingHealth}>
            {isCheckingHealth ? <LoaderCircle className="spin-icon" size={14} /> : <RefreshCw size={14} />}
            {isCheckingHealth ? 'Checking API…' : 'Check API status again'}
          </button>
        </div>
      )}

      <div className="speech-mode-tabs" role="tablist" aria-label="Speech tools">
        <button type="button" role="tab" aria-selected={mode === 'tts'} className={mode === 'tts' ? 'is-active' : ''} onClick={() => onModeChange('tts')}>
          <Volume2 size={16} /> Text to Speech
        </button>
        <button type="button" role="tab" aria-selected={mode === 'stt'} className={mode === 'stt' ? 'is-active' : ''} onClick={() => onModeChange('stt')}>
          <Mic size={16} /> Speech to Text
        </button>
      </div>

      <div className={`phrase-language-row ${mode === 'stt' ? 'is-single' : ''}`}>
        <label>
          <span>{mode === 'tts' ? 'Speak text in' : 'Speech language'}</span>
          <select value={sourceLanguage} onChange={(event) => setSourceLanguage(event.target.value)} disabled={isRecording || isTranscribing}>
            {languages.map((language) => <option key={language.code} value={language.code}>{language.name} · {language.nativeName}</option>)}
            {!languages.length && <><option value="hi-IN">Hindi</option><option value="kn-IN">Kannada</option></>}
          </select>
        </label>
        {mode === 'tts' && (
          <>
            <button type="button" className="phrase-swap" aria-label="Swap languages" onClick={swapLanguages}><ArrowDownUp size={17} /></button>
            <label>
              <span>Translate to</span>
              <select value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)}>
                {languages.map((language) => <option key={language.code} value={language.code}>{language.name} · {language.nativeName}</option>)}
                {!languages.length && <><option value="hi-IN">Hindi</option><option value="kn-IN">Kannada</option></>}
              </select>
            </label>
          </>
        )}
      </div>

      {mode === 'tts' && <div className="phrase-examples" aria-label="Example phrases">
        <span>Choose a real-world use</span>
        <button type="button" onClick={() => { setSourceText(examplePhrases[0]); setTranslatedText(''); }}>Health conversation</button>
        <button type="button" onClick={() => { setSourceText(examplePhrases[1]); setTranslatedText(''); }}>Farmer conversation</button>
        <button type="button" onClick={() => { setSourceText(examplePhrases[2]); setTranslatedText(''); }}>Everyday conversation</button>
      </div>}

      <label className="notes-upload">
        <FileText size={18} />
        <span><strong>Upload notes</strong><small>TXT, Markdown, CSV, or JSON · max 2 MB</small></span>
        <span className="notes-upload-button"><Upload size={14} /> Browse files</span>
        <input type="file" accept=".txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json" onChange={(event) => { void handleNotesUpload(event.target.files?.[0]); event.currentTarget.value = ''; }} />
      </label>
      {uploadedNotesName && <p className="uploaded-file-name"><FileText size={13} /> Loaded {uploadedNotesName}</p>}

      <div className="phrase-workspace">
        <label className="phrase-editor">
          <span><MessageSquareText size={14} /> {mode === 'tts' ? 'Text or notes to speak' : 'Transcript (editable)'}</span>
          <textarea value={sourceText} onChange={(event) => { setSourceText(event.target.value); setUploadedNotesName(''); }} maxLength={20000} placeholder={mode === 'tts' ? 'Type text or upload notes to hear them spoken…' : 'Record or upload audio to transcribe it…'} />
          {mode === 'stt' && <>
            {isMock && (
              <p className="stt-provider-notice" role="status">
                {!provider ? 'The API is offline. Start the API server to check Prisma configuration.' : 'Demo mode is on: real microphone transcription is unavailable.'}{' '}
                <button type="button" className="provider-inline-setup" onClick={() => openSetupGuide('Prisma')}>Set up Prisma</button>
              </p>
            )}
            {!isMock && <p className="phrase-mic-guidance">Microphone access starts only after you choose a recording control. Live audio is streamed to Prisma; your API key stays on the server.</p>}
            <div className="phrase-record-controls">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void handleToggleRecording()} disabled={isTranscribing} aria-pressed={isRecording} title={isMock ? 'Requires a configured Gnani Prisma credential' : undefined}>
                {isTranscribing || liveDictation.status === 'connecting' ? <LoaderCircle className="spin-icon" size={14} /> : isRecording ? <StopCircle size={14} /> : <Mic size={14} />}
                {isTranscribing ? 'Transcribing upload…' : liveDictation.status === 'connecting' ? 'Connecting…' : liveDictation.status === 'processing' ? 'Finishing speech…' : isRecording ? 'Stop recording' : isMock ? 'Set up Gnani Prisma' : 'Tap to record'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm hold-to-talk"
                disabled={isTranscribing}
                aria-label="Hold to talk"
                aria-pressed={isRecording}
                onPointerDown={handleHoldStart}
                onPointerUp={handleHoldEnd}
                onPointerCancel={handleHoldEnd}
                onPointerLeave={handleHoldEnd}
                onKeyDown={(event) => {
                  if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) handleHoldStart(event);
                }}
                onKeyUp={(event) => {
                  if (event.key === ' ' || event.key === 'Enter') handleHoldEnd();
                }}
                onBlur={handleHoldEnd}
              >
                <Mic size={14} /> Hold to talk
              </button>
              <label className={`btn btn-secondary btn-sm audio-upload-button${isTranscribing || isMock ? ' is-disabled' : ''}`}>
                <Upload size={14} /> Upload audio
                <input type="file" disabled={isTranscribing || isMock} accept="audio/wav,audio/webm,audio/ogg,audio/mpeg,audio/mp4,.wav,.webm,.ogg,.mp3,.m4a" onChange={(event) => { void handleAudioUpload(event.target.files?.[0]); event.currentTarget.value = ''; }} />
              </label>
              <span aria-live="polite">
                {liveDictation.status === 'connecting' ? 'Connecting securely to Prisma…' : liveDictation.status === 'processing' ? 'Finishing the current speech segment…' : liveDictation.status === 'listening' ? 'Listening · Prisma transcribes after each pause' : recognitionConfidence !== null ? `Recognized · ${Math.round(recognitionConfidence * 100)}% confidence` : isMock ? 'Set up Gnani Prisma to enable transcription and audio uploads' : 'Audio uploads: WAV, WebM, OGG, MP3, or M4A · max 10 MB'}
              </span>
            </div>
          </>}
          <small>{sourceText.length}/20,000 characters</small>
        </label>
        <div className="phrase-result" aria-live="polite">
          <div className="phrase-result-label"><span>{mode === 'tts' ? 'Translation' : 'Speech recognition'}</span><span>{mode === 'tts' ? targetLanguage : sourceLanguage}</span></div>
          {translatedText && isMock && <span className="mock-output-label">SIMULATED SAMPLE · NOT A REAL TRANSLATION</span>}
          <p className={translatedText ? '' : 'is-empty'}>{mode === 'tts' ? translatedText || 'Translate your text to another language, or speak it as written.' : sourceText || 'Your recognized words will appear here.'}</p>
          {mode === 'tts' && translatedText && (
            <div className="phrase-result-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleSpeak} disabled={isSpeaking}>
                {isSpeaking ? <LoaderCircle className="spin-icon" size={14} /> : <Volume2 size={14} />}{isSpeaking ? 'Speaking…' : 'Listen'}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={copyTranslation}>
                {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <p className="phrase-error" role="alert">{error}</p>}
      <div className="phrase-studio-footer">
        <span>{isMock ? 'Preview only · mock responses do not call Gnani services' : canTranslate ? `${provider?.providerName || 'Gnani'} · secrets remain server-side` : 'Speech APIs can be tested; configure approved Evon inference to translate.'}</span>
        <div className="phrase-footer-actions">
          <button type="button" className="btn btn-secondary" onClick={isMock ? () => openSetupGuide('Timbre') : handleSpeakSource} disabled={isSpeakingSource || (!isMock && !sourceText.trim()) || isRecording || isTranscribing}>
            {isSpeakingSource ? <LoaderCircle className="spin-icon" size={16} /> : <Volume2 size={16} />}
            {isSpeakingSource ? 'Speaking…' : isMock ? 'Set up Gnani Timbre' : mode === 'stt' ? 'Read transcript aloud' : 'Convert text to speech'}
          </button>
          {mode === 'tts' && <button type="button" className="btn btn-primary" onClick={canTranslate ? handleTranslate : () => openSetupGuide('Evon')} disabled={isTranslating || (canTranslate && !sourceText.trim())}>
            {isTranslating ? <LoaderCircle className="spin-icon" size={16} /> : <AudioLines size={16} />}
            {isTranslating ? 'Translating…' : canTranslate ? 'Translate text' : 'Set up Gnani Evon'}
          </button>}
        </div>
      </div>

      <div className="model-readiness" aria-label="Gnani model readiness">
        <span className={health?.integrations?.prisma?.mode === 'real' ? 'ready' : 'demo'}><i /> Prisma <b>{health?.integrations?.prisma?.mode === 'real' ? 'API' : 'Demo'}</b></span>
        <span className={health?.integrations?.evon?.mode === 'endpoint-configured' ? 'ready' : 'demo'}><i /> Evon <b>{health?.integrations?.evon?.mode === 'endpoint-configured' && !isMock ? 'Endpoint set' : 'Setup needed'}</b></span>
        <span className={health?.integrations?.timbre?.mode === 'real' ? 'ready' : 'demo'}><i /> Timbre <b>{health?.integrations?.timbre?.mode === 'real' ? 'API' : 'Demo'}</b></span>
      </div>
    </section>
  );
};
