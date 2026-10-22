import { useProgress, actions } from '../hooks/useProgress.js';
import { LEVELS } from '../lib/progress.js';
import { useToast } from './ui.jsx';

export default function Onboarding() {
  const { level } = useProgress();
  const toast = useToast();
  if (level) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-navy-950/80 p-4" role="dialog" aria-modal="true" aria-labelledby="ob-title">
      <div className="card pop w-full max-w-xl p-6 sm:p-8">
        <p className="font-display text-sm font-bold text-teal-700">¡Bienvenido!</p>
        <h2 id="ob-title" className="mt-1 text-3xl font-extrabold">What is your Spanish level?</h2>
        <p className="mt-2 text-ink-soft">This tunes the AI tutor and your recommendations. You can change it any time in Settings.</p>
        <div className="mt-6 grid gap-3">
          {LEVELS.map((l) => (
            <button key={l.id} className="flex items-center gap-4 rounded-2xl border-2 border-[#d6d0bd] bg-white p-4 text-left transition hover:border-teal-700 hover:bg-teal-100"
              onClick={() => { actions.setLevel(l.id); toast(`Level saved: ${l.id} ${l.name}`, 'success'); }}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-900 font-display text-lg font-extrabold text-white">{l.id}</span>
              <span><span className="block font-display text-lg font-bold text-navy-900">{l.name}</span><span className="text-ink-soft">{l.blurb}</span></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
