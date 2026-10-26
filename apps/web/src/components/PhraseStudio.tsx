import React, { useEffect, useState } from 'react';
import { ArrowDownUp, AudioLines, Check, Copy, LoaderCircle, MessageSquareText, Volume2 } from 'lucide-react';
import { fetchHealth, fetchLanguages, speakText, translateText } from '../services/api';

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

interface ProviderHealth {
  provider?: { providerName?: string; isMock?: boolean; status?: string; message?: string };
  integrations?: {
    prisma?: { configured?: boolean; mode?: string };
    timbre?: { configured?: boolean; mode?: string };
    evon?: { configured?: boolean; mode?: string };
  };
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

export const PhraseStudio: React.FC = () => {
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [sourceLanguage, setSourceLanguage] = useState('hi-IN');
  const [targetLanguage, setTargetLanguage] = useState('kn-IN');
  const [sourceText, setSourceText] = useState('नमस्ते, आपकी दुकान कितने बजे बंद होती है?');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeakingSource, setIsSpeakingSource] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [health, setHealth] = useState<ProviderHealth | null>(null);

  useEffect(() => {
    fetchLanguages().then((result) => setLanguages(result.languages || [])).catch(() => {});
    fetchHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
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
    setIsSpeaking(true);
    setError('');
    try {
      const result = await speakText(translatedText, targetLanguage);
      const audio = new Audio(`data:${result.mimeType || 'audio/wav'};base64,${result.audioBase64}`);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      await audio.play();
    } catch (cause) {
      setIsSpeaking(false);
      setError(cause instanceof Error ? cause.message : 'Voice playback failed. Check provider configuration and try again.');
    }
  };

  const handleSpeakSource = async () => {
    if (!sourceText.trim()) return;
    setIsSpeakingSource(true);
    setError('');
    try {
      const result = await speakText(sourceText, sourceLanguage);
      const audio = new Audio(`data:${result.mimeType || 'audio/wav'};base64,${result.audioBase64}`);
      audio.onended = () => setIsSpeakingSource(false);
      audio.onerror = () => setIsSpeakingSource(false);
      await audio.play();
    } catch (cause) {
      setIsSpeakingSource(false);
      setError(cause instanceof Error ? cause.message : 'Voice playback failed. Check provider configuration and try again.');
    }
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
  const canTranslate = isMock || Boolean(health?.integrations?.evon?.configured);
  const examplePhrases = phraseExamples[sourceLanguage] || phraseExamples['en-IN'];

  return (
    <section className="phrase-studio glass-panel" aria-labelledby="phrase-studio-title">
      <div className="phrase-studio-heading">
        <div>
          <div className="section-kicker"><AudioLines size={14} /> VOICE AI PLAYGROUND</div>
          <h2 id="phrase-studio-title">Make every conversation understood.</h2>
          <p>Try common health, farm, and everyday phrases. Translate them and hear the spoken version in another language.</p>
        </div>
        <div className={`provider-status ${isMock ? 'is-mock' : canTranslate ? 'is-live' : 'is-partial'}`} title={provider?.message || 'Local API status'}>
          <span className="provider-status-dot" />
          <span>{provider ? (isMock ? 'Mock preview' : canTranslate ? 'Speech APIs configured' : 'Prisma + Timbre configured · Evon setup needed') : 'API offline'}</span>
        </div>
      </div>

      <div className="phrase-language-row">
        <label>
          <span>From</span>
          <select value={sourceLanguage} onChange={(event) => setSourceLanguage(event.target.value)}>
            {languages.map((language) => <option key={language.code} value={language.code}>{language.name} · {language.nativeName}</option>)}
            {!languages.length && <><option value="hi-IN">Hindi</option><option value="kn-IN">Kannada</option></>}
          </select>
        </label>
        <button type="button" className="phrase-swap" aria-label="Swap languages" onClick={swapLanguages}><ArrowDownUp size={17} /></button>
        <label>
          <span>To</span>
          <select value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)}>
            {languages.map((language) => <option key={language.code} value={language.code}>{language.name} · {language.nativeName}</option>)}
            {!languages.length && <><option value="hi-IN">Hindi</option><option value="kn-IN">Kannada</option></>}
          </select>
        </label>
      </div>

      <div className="phrase-examples" aria-label="Example phrases">
        <span>Choose a real-world use</span>
        <button type="button" onClick={() => { setSourceText(examplePhrases[0]); setTranslatedText(''); }}>Health conversation</button>
        <button type="button" onClick={() => { setSourceText(examplePhrases[1]); setTranslatedText(''); }}>Farmer conversation</button>
        <button type="button" onClick={() => { setSourceText(examplePhrases[2]); setTranslatedText(''); }}>Everyday conversation</button>
      </div>

      <div className="phrase-workspace">
        <label className="phrase-editor">
          <span><MessageSquareText size={14} /> Your phrase</span>
          <textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} maxLength={500} placeholder="Type a short phrase…" />
          <small>{sourceText.length}/500 characters</small>
        </label>
        <div className="phrase-result" aria-live="polite">
          <div className="phrase-result-label"><span>Translation</span><span>{targetLanguage}</span></div>
          {translatedText && isMock && <span className="mock-output-label">SIMULATED SAMPLE · NOT A REAL TRANSLATION</span>}
          <p className={translatedText ? '' : 'is-empty'}>{translatedText || 'Your translation will appear here.'}</p>
          {translatedText && (
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
          <button type="button" className="btn btn-secondary" onClick={handleSpeakSource} disabled={isSpeakingSource || !sourceText.trim()}>
            {isSpeakingSource ? <LoaderCircle className="spin-icon" size={16} /> : <Volume2 size={16} />}
            {isSpeakingSource ? 'Speaking…' : 'Test voice'}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleTranslate} disabled={isTranslating || !sourceText.trim() || !canTranslate} title={!canTranslate ? 'Configure the approved Evon inference endpoint on the server to enable translation.' : undefined}>
            {isTranslating ? <LoaderCircle className="spin-icon" size={16} /> : <AudioLines size={16} />}
            {isTranslating ? 'Translating…' : 'Translate phrase'}
          </button>
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
