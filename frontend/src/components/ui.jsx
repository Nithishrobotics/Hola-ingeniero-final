import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, XCircle, Volume2 } from 'lucide-react';
import { onBadgeUnlocked } from '../hooks/useProgress.js';
import { canSpeak, speak } from '../hooks/useSpeech.js';

// ---------- Toasts ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  useEffect(() => onBadgeUnlocked((badges) => badges.forEach((b) => push(`Badge unlocked: ${b.title}`, 'success'))), [push]);

  const icons = { success: CheckCircle2, error: XCircle, warn: TriangleAlert, info: Info };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.type] ?? Info;
          const tone = t.type === 'success' ? 'border-teal-600' : t.type === 'error' ? 'border-coral-600' : 'border-navy-700';
          return (
            <div key={t.id} className={`card pop flex items-start gap-3 border-l-4 p-3 ${tone}`}>
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <p className="text-sm font-semibold">{t.message}</p>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Small building blocks ----------
export function ProgressBar({ value, max = 100, label, tone = 'teal' }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-navy-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full transition-all duration-500 ${tone === 'coral' ? 'bg-coral-500' : 'bg-teal-600'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-soft" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy-100 border-t-teal-700" aria-hidden />
      {label}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#cfc9b5] bg-white/60 p-8 text-center">
      {Icon && <Icon className="mx-auto mb-3 h-8 w-8 text-teal-700" aria-hidden />}
      <p className="font-display text-lg font-bold text-navy-900">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-ink-soft">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="trace border-b border-[#e4dfd0] bg-paper-2/60">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-extrabold sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-lg text-ink-soft">{subtitle}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </header>
  );
}

export function Page({ children }) {
  return <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>;
}

export function SpeakButton({ text, lang }) {
  if (!canSpeak()) return null;
  return (
    <button type="button" className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-100" onClick={() => speak(text, lang)} aria-label={`Listen to: ${text}`}>
      <Volume2 className="h-4 w-4" aria-hidden />
    </button>
  );
}

export function GrammarTable({ table }) {
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-[#e4dfd0]">
      <p className="bg-paper-2 px-3 py-2 font-display text-sm font-bold text-navy-900">{table.title}</p>
      <table className="grammar">
        <thead><tr>{table.head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
        <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j === 0 ? 'font-semibold' : ''}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

// ---------- Multiple-choice practice with instant feedback (lessons + campus quizzes) ----------
export function PracticeSet({ items, onComplete }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const item = items[index];
  const correct = submitted && picked === item.answer;

  const check = () => {
    if (picked === null || submitted) return; // guards against double clicks
    setSubmitted(true);
    if (picked === item.answer) setScore((s) => s + 1);
  };
  const next = () => {
    if (index + 1 >= items.length) { setDone(true); onComplete?.(score); return; }
    setIndex(index + 1); setPicked(null); setSubmitted(false);
  };
  const restart = () => { setIndex(0); setPicked(null); setSubmitted(false); setScore(0); setDone(false); };

  if (done) {
    return (
      <div className="pop rounded-2xl bg-teal-100 p-6 text-center">
        <p className="font-display text-2xl font-extrabold text-navy-900">{score} / {items.length} correct</p>
        <p className="mt-1 text-ink-soft">{score === items.length ? '¡Perfecto! Excellent work.' : 'Good effort. Review the explanations and try again.'}</p>
        <button className="btn btn-ghost mt-4" onClick={restart}>Practise again</button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink-soft">Question {index + 1} of {items.length}</p>
      <p className="font-display text-xl font-bold text-navy-900">{item.prompt}</p>
      <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Answer choices">
        {item.options.map((opt, i) => {
          let style = 'border-[#d6d0bd] bg-white hover:bg-paper-2';
          if (picked === i && !submitted) style = 'border-navy-900 bg-navy-100';
          if (submitted && i === item.answer) style = 'border-teal-700 bg-teal-100';
          if (submitted && picked === i && i !== item.answer) style = 'border-coral-600 bg-coral-100';
          return (
            <button key={i} type="button" role="radio" aria-checked={picked === i} disabled={submitted}
              onClick={() => setPicked(i)}
              className={`flex min-h-11 items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-left font-medium transition ${style}`}>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-xs font-bold" aria-hidden>{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          );
        })}
      </div>
      {submitted && (
        <div className={`pop mt-4 rounded-xl p-4 ${correct ? 'bg-teal-100' : 'bg-coral-100'}`} role="status">
          <p className="font-bold">{correct ? '✓ Correct!' : `✗ Not quite. The answer is: ${item.options[item.answer]}`}</p>
          <p className="mt-1 text-sm">{item.why}</p>
        </div>
      )}
      <div className="mt-4 flex gap-3">
        {!submitted
          ? <button className="btn btn-primary" onClick={check} disabled={picked === null}>Check answer</button>
          : <button className="btn btn-teal" onClick={next}>{index + 1 >= items.length ? 'See result' : 'Next question'}</button>}
      </div>
    </div>
  );
}

export function useDocumentTitle(title) {
  useEffect(() => { document.title = title ? `${title} · ¡Hola Ingeniero!` : '¡Hola Ingeniero!'; }, [title]);
}

