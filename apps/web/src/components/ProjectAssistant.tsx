import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Bot, Check, ChevronDown, CircleHelp, Mic2, Sparkles, X } from 'lucide-react';

type Message = { id: number; role: 'assistant' | 'user'; text: string };

const suggestions = ['What is SunoSamjho?', 'How do I start a room?', 'Which languages are supported?'];

const answers: Array<{ matches: RegExp; text: string }> = [
  {
    matches: /what is sunosamjho|what is suno samjho|about sunosamjho|about this project|sunosamjho live/i,
    text: 'SunoSamjho Live helps people have real-time voice conversations across Indian languages. It captures speech, translates it, and speaks the result to the other participant. You can explore Live Room, History, Developers, and Docs from the navigation.',
  },
  {
    matches: /start|create|join|room|conversation|invite/i,
    text: 'Open Live Room in the top navigation to create or join a conversation. Choose the participants’ languages, allow microphone access, and share the generated room code or link. You can also open a shared room link with its code in the URL.',
  },
  {
    matches: /language|supported|hindi|kannada|tamil|telugu|marathi|bengali|gujarati|malayalam/i,
    text: 'The project lists Hindi, Kannada, Tamil, Telugu, Marathi, Bengali, Gujarati, Malayalam, and Indian English. The Gnani provider layer maps speech recognition (Prisma), translation/reasoning (Evon), and speech synthesis (Timbre).',
  },
  {
    matches: /privacy|audio|transcript|save|delete|history/i,
    text: 'The design aims not to persist raw audio: it is processed in ephemeral buffers. Transcript saving is user-controlled; saved transcripts can be reviewed and deleted from History. Check the current privacy behavior before deploying or changing retention.',
  },
  {
    matches: /mock|offline|credential|key|live ai|real ai|gnani/i,
    text: 'Local development can use the mock provider with ENABLE_MOCK_PROVIDER=true. Mock mode is a simulation, not live AI, and is prohibited in production. For live Gnani services, configure credentials using the variable names in .env.example; never share secret values in chat.',
  },
  {
    matches: /install|setup|run|start app|localhost|develop/i,
    text: 'From the repository root, install workspace dependencies with npm install, copy .env.example to .env, then run npm run dev. The web app is served at localhost:5173 and the API at localhost:4000. Node.js 18+ and npm 9+ are listed as prerequisites.',
  },
  {
    matches: /api|sdk|developer|key|endpoint|integrat/i,
    text: 'The monorepo includes an Express/WebSocket API in services/api and a TypeScript SDK in packages/sdk, with JavaScript, TypeScript, and React examples. Visit Developers and Docs in the app for the API and integration guides.',
  },
  {
    matches: /test|build|error|lint|check/i,
    text: 'At the repository root, npm test runs the SDK and API test suites, and npm run build builds the SDK, services, and web app. If a command fails, share the exact error text and which package command you ran—please remove any secrets first.',
  },
];

function getProjectAnswer(question: string) {
  const match = answers.find(({ matches }) => matches.test(question));
  return match?.text ?? 'I can help with SunoSamjho rooms, supported languages, privacy, mock vs. live Gnani setup, the API/SDK, and development commands. Try asking about one of those, or share the relevant error with secrets removed.';
}

export const ProjectAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      text: 'Hi! I’m your SunoSamjho project guide. Ask me how the app works, how to get started, or anything about its voice and translation features.',
    },
  ]);
  const scrollAnchor = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isOpen]);

  const ask = (question: string) => {
    const normalized = question.trim();
    if (!normalized) return;
    setMessages((current) => {
      const id = Date.now() + current.length;
      return [
        ...current,
        { id, role: 'user', text: normalized },
        { id: id + 1, role: 'assistant', text: getProjectAnswer(normalized) },
      ];
    });
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <>
      {isOpen && (
        <section className="project-assistant" role="dialog" aria-label="SunoSamjho project assistant">
          <header className="assistant-header">
            <div className="assistant-avatar"><Bot size={19} /></div>
            <div className="assistant-heading">
              <strong>Project Guide</strong>
              <span><i /> SunoSamjho · ready to help</span>
            </div>
            <button className="assistant-icon-button" onClick={() => setIsOpen(false)} aria-label="Minimize project guide" title="Minimize">
              <ChevronDown size={19} />
            </button>
            <button className="assistant-icon-button" onClick={() => setIsOpen(false)} aria-label="Close project guide" title="Close">
              <X size={18} />
            </button>
          </header>

          <div className="assistant-context"><Sparkles size={13} /> Answers grounded in this project</div>

          <div className="assistant-messages" aria-live="polite" aria-relevant="additions text">
            {messages.map((message) => (
              <div className={`assistant-message-row ${message.role}`} key={message.id}>
                {message.role === 'assistant' && <span className="assistant-message-avatar"><Mic2 size={13} /></span>}
                <p className="assistant-message">{message.text}</p>
              </div>
            ))}
            <div ref={scrollAnchor} />
          </div>

          {messages.length === 1 && (
            <div className="assistant-suggestions" aria-label="Suggested questions">
              {suggestions.map((suggestion) => (
                <button key={suggestion} onClick={() => ask(suggestion)}>{suggestion}<ArrowUp size={13} /></button>
              ))}
            </div>
          )}

          <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); ask(input); }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about the project…"
              aria-label="Ask the project guide a question"
              maxLength={500}
            />
            <button type="submit" disabled={!input.trim()} aria-label="Send question" title="Send question">
              <ArrowUp size={17} />
            </button>
          </form>
          <footer className="assistant-disclaimer"><CircleHelp size={12} /> Project guide · replies use built-in project knowledge</footer>
        </section>
      )}

      <button
        className={`assistant-launcher ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close project guide' : 'Ask the SunoSamjho project guide'}
      >
        {isOpen ? <Check size={18} /> : <><Sparkles size={18} /><span>Ask our AI</span></>}
      </button>
    </>
  );
};
