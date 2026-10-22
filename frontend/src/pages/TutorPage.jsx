import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot, Send, Trash2, Lightbulb, Languages, BookOpenText, SpellCheck,
  Mic, MicOff, RotateCcw, AlertTriangle, User, Key, CheckCircle2,
  Square, Eye, EyeOff, Sparkles, ExternalLink, X, Settings2
} from 'lucide-react';
import { ApiError, getHealth, saveApiKey, streamChat, getModels, setModel as updateModelApi } from '../services/api.js';
import { actions, useProgress } from '../hooks/useProgress.js';
import { LEVELS } from '../lib/progress.js';
import { SpeakButton, Spinner, useDocumentTitle } from '../components/ui.jsx';
import { useDictation } from '../hooks/useSpeech.js';

const MODES = [
  { id: 'everyday', label: 'Everyday Spanish' },
  { id: 'university', label: 'University life' },
  { id: 'engineering', label: 'Engineering & technology' },
  { id: 'travel', label: 'Travel' },
  { id: 'interview', label: 'Job interviews' },
  { id: 'free', label: 'Free conversation' },
];

const STARTERS = {
  everyday: ['Hola, ¿cómo estás?', 'Quiero hablar de mi familia.', '¿Qué comida te gusta?'],
  university: ['Hola, soy estudiante de ingeniería.', '¿Puedes ayudarme con mi horario?', 'Tengo un examen mañana.'],
  engineering: ['Estoy aprendiendo a programar.', '¿Qué es un algoritmo?', 'Mi proyecto es un robot.'],
  travel: ['Quiero viajar a España.', '¿Dónde está la estación?', 'Necesito una habitación de hotel.'],
  interview: ['Quiero practicar una entrevista de prácticas.', 'Hola, buenos días. Soy Raj.', '¿Puedes ser el entrevistador?'],
  free: ['Hola, vamos a hablar.', 'Cuéntame algo interesante.', '¿Qué hacemos hoy?'],
};

const ACTION_LABEL = {
  hint: 'Hint',
  translate: 'Translation',
  explain: 'Grammar explanation',
  correct: 'Correction',
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const time = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function Bubble({ m, isLastStreaming }) {
  const mine = m.role === 'user';
  return (
    <div className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
      <span
        className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          mine ? 'bg-coral-500 text-navy-950' : 'bg-navy-900 text-teal-400'
        }`}
        aria-hidden
      >
        {mine ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          mine ? 'rounded-tr-sm bg-navy-900 text-white' : 'rounded-tl-sm border border-[#e4dfd0] bg-white'
        }`}
      >
        {m.kind && m.kind !== 'chat' && (
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-teal-700">
            {ACTION_LABEL[m.kind]}
          </p>
        )}
        <p className="whitespace-pre-wrap" lang={mine ? 'es' : undefined}>
          {m.text}
          {isLastStreaming && (
            <span className="inline-block h-4 w-1.5 ml-1 bg-teal-600 animate-pulse align-middle" />
          )}
        </p>
        {m.text && (
          <p className={`mt-1 flex items-center gap-1 text-xs ${mine ? 'text-navy-100' : 'text-ink-soft'}`}>
            {time(m.at)}
            {!mine && !isLastStreaming && <SpeakButton text={m.text} />}
          </p>
        )}
      </div>
    </div>
  );
}

export default function TutorPage() {
  useDocumentTitle('¡Hola Amigo! AI tutor');
  const state = useProgress();
  const level = state.level ?? 'A1';
  const { messages, mode } = state.chat;

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState({ status: 'checking' });
  const [confirmClear, setConfirmClear] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);

  // Key configuration state
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [availableModels, setAvailableModels] = useState([]);
  const [savingKey, setSavingKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // { type: 'success'|'error', message }

  const bottomRef = useRef(null);
  const inFlight = useRef(false);
  const abortControllerRef = useRef(null);

  const dictation = useDictation(useCallback((t) => setInput((v) => (v ? `${v} ${t}` : t)), []));

  const refreshHealth = useCallback(() => {
    getHealth()
      .then((h) => {
        setHealth({ status: h.aiConfigured ? 'ready' : 'nokey', model: h.model });
        if (h.model) setSelectedModel(h.model);
      })
      .catch((e) => setHealth({ status: 'down', message: e.message }));
  }, []);

  useEffect(() => {
    refreshHealth();
    getModels()
      .then((data) => {
        if (data?.models) setAvailableModels(data.models);
        if (data?.currentModel) setSelectedModel(data.currentModel);
      })
      .catch(() => {});
  }, [refreshHealth]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, loading, error]);

  const setMode = (m) => actions.setChat({ messages, mode: m });
  const save = (list) => actions.setChat({ messages: list.slice(-200), mode });
  const chatHistory = (list) =>
    list.filter((m) => !m.kind || m.kind === 'chat').map((m) => ({ role: m.role, text: m.text }));

  // Handle saving API key dynamically
  const handleConnectKey = async (e) => {
    if (e) e.preventDefault();
    const clean = keyInput.trim();
    if (!clean) {
      setSaveStatus({ type: 'error', message: 'Please enter a Gemini API key.' });
      return;
    }
    setSavingKey(true);
    setSaveStatus(null);
    try {
      const res = await saveApiKey(clean, selectedModel);
      setSaveStatus({ type: 'success', message: res.message || 'Connected successfully!' });
      setHealth({ status: 'ready', model: res.model });
      setKeyInput('');
      setTimeout(() => {
        setKeyModalOpen(false);
        setSaveStatus(null);
      }, 1200);
    } catch (err) {
      setSaveStatus({
        type: 'error',
        message: err.message || 'Failed to connect. Please check your API key.',
      });
    } finally {
      setSavingKey(false);
    }
  };

  const handleModelChange = async (newModel) => {
    setSelectedModel(newModel);
    try {
      await updateModelApi(newModel);
      setHealth((h) => ({ ...h, model: newModel }));
    } catch {
      // Ignored if offline
    }
  };

  // Streaming runner: ultra-fast, zero time lags, live token rendering
  const run = useCallback(
    async ({ action, text, baseMessages }) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      setError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const replyId = uid();
      const initialReply = {
        id: replyId,
        role: 'model',
        text: '',
        at: new Date().toISOString(),
        kind: action,
        isStreaming: true,
      };

      const messagesWithPlaceholder = [...baseMessages, initialReply];
      actions.setChat({ messages: messagesWithPlaceholder.slice(-200), mode });

      try {
        const history =
          action === 'chat'
            ? chatHistory(baseMessages.slice(0, -1))
            : chatHistory(baseMessages);

        let accumulated = '';
        const res = await streamChat({
          message: text,
          level,
          mode,
          action,
          history,
          signal: controller.signal,
          onChunk: (fullText) => {
            accumulated = fullText;
            const updated = messagesWithPlaceholder.map((m) =>
              m.id === replyId ? { ...m, text: fullText } : m
            );
            actions.setChat({ messages: updated.slice(-200), mode });
          },
        });

        const finalReplyText = res.reply || accumulated;
        const finalized = messagesWithPlaceholder.map((m) =>
          m.id === replyId ? { ...m, text: finalReplyText, isStreaming: false } : m
        );
        actions.setChat({ messages: finalized.slice(-200), mode });
        actions.recordTutorReply();
      } catch (e) {
        if (e.code === 'ABORTED') {
          // If aborted, keep what has been streamed so far
          const kept = messagesWithPlaceholder.map((m) =>
            m.id === replyId ? { ...m, isStreaming: false } : m
          );
          actions.setChat({ messages: kept.slice(-200), mode });
        } else {
          // Remove empty placeholder and surface error
          const cleanMessages = messagesWithPlaceholder.filter(
            (m) => m.id !== replyId || m.text.length > 0
          );
          actions.setChat({ messages: cleanMessages.slice(-200), mode });
          const msg = e instanceof ApiError ? e.message : 'Something unexpected went wrong.';
          setError({ message: msg, code: e.code, payload: { action, text, baseMessages } });
        }
      } finally {
        inFlight.current = false;
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [level, mode]
  );

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const send = (raw = input) => {
    const text = raw.trim();
    if (!text || loading) return;
    const userMsg = { id: uid(), role: 'user', text, at: new Date().toISOString(), kind: 'chat' };
    const base = [...messages, userMsg];
    save(base);
    setInput('');
    run({ action: 'chat', text, baseMessages: base });
  };

  const lastOf = (role) =>
    [...messages].reverse().find((m) => m.role === role && (!m.kind || m.kind === 'chat'));

  const sideRequest = (action, role) => {
    const target = lastOf(role);
    if (!target || loading) return;
    run({ action, text: target.text, baseMessages: messages });
  };

  const hasTutor = !!lastOf('model');
  const hasUser = !!lastOf('user');
  const blocked = health.status === 'down' || health.status === 'nokey';

  return (
    <div className="mx-auto flex max-w-4xl flex-col px-4 py-6" style={{ minHeight: 'calc(100vh - 5rem)' }}>
      {/* Top Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold">¡Hola Amigo!</h1>
            <span className="chip !bg-teal-100 !text-teal-800 text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Live AI Streaming
            </span>
          </div>
          <p className="text-ink-soft text-sm mt-0.5">
            Your conversational Spanish tutor with zero lag and real-time guidance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status & Key Settings Button */}
          <button
            type="button"
            onClick={() => setKeyModalOpen(true)}
            className={`btn !min-h-10 text-xs flex items-center gap-1.5 border shadow-xs ${
              health.status === 'ready'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
            title="Configure Gemini API Key & Model"
          >
            <Key className="h-3.5 w-3.5" />
            <span>
              {health.status === 'ready'
                ? `Connected (${health.model || 'Gemini'})`
                : 'Connect API Key'}
            </span>
            <Settings2 className="h-3 w-3 ml-0.5 opacity-60" />
          </button>

          <label className="text-sm font-semibold">
            Level
            <select
              className="input !min-h-10 mt-1"
              value={level}
              onChange={(e) => actions.setLevel(e.target.value)}
            >
              {LEVELS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id} · {l.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold">
            Mode
            <select
              className="input !min-h-10 mt-1"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              {MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Backend Down Warning */}
      {health.status === 'down' && (
        <div className="mb-3 flex gap-2 rounded-xl bg-coral-100 p-3 font-semibold text-coral-900" role="alert">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
          <span>
            The backend is not reachable. Start the app with <code>start.bat</code> (or <code>npm start</code>) and keep that window open.
          </span>
        </div>
      )}

      {/* Inline Quick Key Connection Card (when no key configured) */}
      {health.status === 'nokey' && (
        <div className="mb-4 card p-5 border-2 border-teal-600/30 bg-teal-50/50 shadow-sm" role="region" aria-label="API Key Setup">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-700 text-white shadow-xs">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-navy-950">Connect your Gemini API Key</h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Get a free key from Google AI Studio to unlock real-time voice &amp; chat tutoring.
                </p>
              </div>
            </div>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost !min-h-9 !py-1 text-xs shrink-0 flex items-center gap-1 border-teal-300 text-teal-800"
            >
              Get Free Key <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <form onSubmit={handleConnectKey} className="mt-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="Paste your Gemini API key (AIzaSy...)"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="input !pr-10 !min-h-10 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-navy-900"
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={savingKey || !keyInput.trim()}
              className="btn btn-teal !min-h-10 text-sm whitespace-nowrap"
            >
              {savingKey ? <Spinner label="Verifying key…" /> : <><CheckCircle2 className="h-4 w-4" /> Connect Tutor</>}
            </button>
          </form>

          {saveStatus && (
            <p
              className={`mt-2 text-xs font-semibold ${
                saveStatus.type === 'success' ? 'text-emerald-700' : 'text-coral-600'
              }`}
            >
              {saveStatus.message}
            </p>
          )}
        </div>
      )}

      {/* Main Conversation Card */}
      <div className="card flex flex-1 flex-col overflow-hidden">
        <div
          className="flex-1 space-y-4 overflow-y-auto p-4"
          style={{ minHeight: '22rem', maxHeight: '55vh' }}
          aria-live="polite"
          aria-label="Conversation"
        >
          {messages.length === 0 && (
            <div className="grid h-full place-items-center text-center py-8">
              <div>
                <Bot className="mx-auto h-12 w-12 text-teal-700" aria-hidden />
                <p className="mt-3 font-display text-2xl font-bold">¡Hola! Soy tu tutor de español.</p>
                <p className="text-ink-soft text-sm mt-1 max-w-sm mx-auto">
                  Write in Spanish (mistakes are welcome!) or pick a starter below.
                </p>
                {health.status === 'nokey' && (
                  <p className="mt-3 text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg p-2 max-w-md mx-auto">
                    Tip: Enter your API key above to start speaking with ¡Hola Amigo!
                  </p>
                )}
              </div>
            </div>
          )}

          {messages.map((m, idx) => (
            <Bubble
              key={m.id}
              m={m}
              isLastStreaming={loading && m.role === 'model' && idx === messages.length - 1}
            />
          ))}

          {loading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <div className="flex items-center gap-2 pl-10" role="status" aria-label="The tutor is thinking">
              <span className="flex gap-1" aria-hidden>
                <span className="dot h-2 w-2 rounded-full bg-teal-700" />
                <span className="dot h-2 w-2 rounded-full bg-teal-700 [animation-delay:.2s]" />
                <span className="dot h-2 w-2 rounded-full bg-teal-700 [animation-delay:.4s]" />
              </span>
              <Spinner label="¡Hola Amigo! está escribiendo…" />
            </div>
          )}

          {error && (
            <div className="rounded-xl border-2 border-coral-600 bg-coral-100 p-3" role="alert">
              <p className="flex items-start gap-2 font-semibold text-coral-950">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                {error.message}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  className="btn btn-coral !min-h-9 text-xs"
                  onClick={() => run(error.payload)}
                  disabled={loading}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Retry
                </button>
                {error.code === 'AI_INVALID_KEY' && (
                  <button
                    className="btn btn-ghost !min-h-9 text-xs"
                    onClick={() => setKeyModalOpen(true)}
                  >
                    <Key className="h-3.5 w-3.5" /> Update API Key
                  </button>
                )}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input & Action Panel */}
        <div className="border-t border-[#e4dfd0] bg-paper-2/50 p-3">
          {messages.length === 0 && (
            <div className="mb-3 flex flex-wrap gap-2" aria-label="Conversation starters">
              {STARTERS[mode].map((s) => (
                <button
                  key={s}
                  className="chip !bg-white border border-[#d6d0bd] hover:!bg-teal-100 transition-colors"
                  disabled={loading || blocked}
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Quick Helper Buttons */}
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              className="btn btn-ghost !min-h-9 !px-3 !py-1 text-xs"
              disabled={!hasTutor || loading || blocked}
              onClick={() => sideRequest('hint', 'model')}
              title="Get a hint without revealing the full answer"
            >
              <Lightbulb className="h-3.5 w-3.5" aria-hidden /> Hint
            </button>
            <button
              className="btn btn-ghost !min-h-9 !px-3 !py-1 text-xs"
              disabled={!hasTutor || loading || blocked}
              onClick={() => sideRequest('translate', 'model')}
              title="Translate the tutor's last reply into English"
            >
              <Languages className="h-3.5 w-3.5" aria-hidden /> Translate
            </button>
            <button
              className="btn btn-ghost !min-h-9 !px-3 !py-1 text-xs"
              disabled={!hasTutor || loading || blocked}
              onClick={() => sideRequest('explain', 'model')}
              title="Get grammar and vocabulary explanation"
            >
              <BookOpenText className="h-3.5 w-3.5" aria-hidden /> Explain grammar
            </button>
            <button
              className="btn btn-ghost !min-h-9 !px-3 !py-1 text-xs"
              disabled={!hasUser || loading || blocked}
              onClick={() => sideRequest('correct', 'user')}
              title="Correct grammar or spelling in your last message"
            >
              <SpellCheck className="h-3.5 w-3.5" aria-hidden /> Correct my message
            </button>
            <button
              className="btn btn-ghost !min-h-9 !px-3 !py-1 text-xs ml-auto"
              disabled={messages.length === 0}
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Clear
            </button>
          </div>

          {confirmClear && (
            <div
              className="mb-2 flex flex-wrap items-center gap-3 rounded-xl bg-coral-100 p-3"
              role="alertdialog"
              aria-label="Confirm clear conversation"
            >
              <span className="font-semibold text-sm">Delete conversation history from this browser?</span>
              <button
                className="btn btn-coral !min-h-9 text-xs"
                onClick={() => {
                  actions.setChat({ messages: [], mode });
                  setError(null);
                  setConfirmClear(false);
                }}
              >
                Yes, clear it
              </button>
              <button className="btn btn-ghost !min-h-9 text-xs" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </div>
          )}

          {/* Chat Form */}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <label className="sr-only" htmlFor="chat-input">
              Your message in Spanish
            </label>
            <textarea
              id="chat-input"
              rows={1}
              maxLength={1000}
              className="input resize-none"
              placeholder="Escribe en español…  (Enter to send, Shift+Enter for newline)"
              value={input}
              disabled={blocked}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />

            {dictation.supported && (
              <button
                type="button"
                className={`btn !px-3 ${dictation.listening ? 'btn-coral' : 'btn-ghost'}`}
                onClick={dictation.listening ? dictation.stop : dictation.start}
                aria-pressed={dictation.listening}
                aria-label={dictation.listening ? 'Stop microphone' : 'Start microphone'}
                disabled={blocked}
              >
                {dictation.listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            )}

            {loading ? (
              <button
                type="button"
                onClick={stopGeneration}
                className="btn btn-coral !px-4"
                title="Stop generation"
              >
                <Square className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only text-sm">Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!input.trim() || blocked}
              >
                <Send className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">Send</span>
              </button>
            )}
          </form>

          <p className="mt-1 text-xs text-ink-soft">
            {input.length}/1000
            {dictation.listening && ' · Listening… speak Spanish'}
            {!dictation.supported && ' · Voice typing available in Chrome/Edge; text typing works in all browsers.'}
          </p>
        </div>
      </div>

      {/* API Key & Model Settings Modal */}
      {keyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="card w-full max-w-lg p-6 shadow-2xl pop relative bg-white">
            <button
              onClick={() => {
                setKeyModalOpen(false);
                setSaveStatus(null);
              }}
              className="absolute right-4 top-4 text-ink-soft hover:text-navy-900"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-700 text-white">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 id="modal-title" className="text-xl font-bold">
                  Gemini API Configuration
                </h3>
                <p className="text-xs text-ink-soft">Manage your API key and fast model settings</p>
              </div>
            </div>

            <form onSubmit={handleConnectKey} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1" htmlFor="modal-key-input">
                  Google Gemini API Key
                </label>
                <div className="relative">
                  <input
                    id="modal-key-input"
                    type={showKey ? 'text' : 'password'}
                    placeholder="Enter or paste new API key"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="input !pr-10 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-navy-900"
                    aria-label={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  Stored securely in your local environment. Free key at{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-700 underline font-semibold"
                  >
                    aistudio.google.com/apikey
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1" htmlFor="modal-model-select">
                  Active Model
                </label>
                <select
                  id="modal-model-select"
                  className="input text-sm"
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                >
                  {availableModels.length > 0 ? (
                    availableModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.id} {m.badge ? `(${m.badge})` : ''}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra-fast &amp; recommended)</option>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast &amp; reliable)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard stable)</option>
                      <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                    </>
                  )}
                </select>
                <p className="mt-1 text-xs text-ink-soft">
                  Gemini Flash models stream responses instantly with no lag and generous free rate limits.
                </p>
              </div>

              {saveStatus && (
                <div
                  className={`rounded-xl p-3 text-sm font-semibold ${
                    saveStatus.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-coral-50 text-coral-800 border border-coral-200'
                  }`}
                >
                  {saveStatus.message}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn btn-ghost text-sm"
                  onClick={() => {
                    setKeyModalOpen(false);
                    setSaveStatus(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingKey || !keyInput.trim()}
                  className="btn btn-teal text-sm"
                >
                  {savingKey ? <Spinner label="Verifying &amp; Saving…" /> : 'Save &amp; Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
