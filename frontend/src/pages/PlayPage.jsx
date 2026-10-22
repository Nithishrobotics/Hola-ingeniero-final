import { Link } from 'react-router-dom';
import { Trophy, Target, Play } from 'lucide-react';
import { questions, quizModes } from '../data/questions.js';
import { BADGES, selectStats } from '../lib/progress.js';
import { useProgress } from '../hooks/useProgress.js';
import { EmptyState, Page, PageHeader, useDocumentTitle } from '../components/ui.jsx';

export default function PlayPage() {
  useDocumentTitle('Play & Practice');
  const state = useProgress();
  const stats = selectStats(state);
  const attempts = [...state.quizAttempts].reverse().slice(0, 8);
  return (
    <>
      <PageHeader title="Play & Practice" subtitle={`${questions.length} questions across quizzes, matching, sentence building and conjugation. Earn XP and unlock badges.`}>
        <div className="flex flex-wrap gap-3 font-semibold"><span className="chip">{stats.xp} XP</span><span className="chip">{stats.accuracy}% accuracy</span><span className="chip">{stats.quizzesTaken} quizzes taken</span><span className="chip">{stats.badgesUnlocked}/{BADGES.length} badges</span></div>
      </PageHeader>
      <Page>
        <Link to="/play/daily" className="card mb-8 flex flex-wrap items-center justify-between gap-4 bg-navy-900 p-6 !text-white transition hover:shadow-xl">
          <span className="flex items-center gap-4"><Target className="h-10 w-10 text-coral-500" aria-hidden /><span><span className="block font-display text-2xl font-extrabold">Daily challenge</span><span className="text-navy-100">{stats.dailyDone ? '✓ Done today — you can still practise it.' : '5 questions · +15 XP bonus'}</span></span></span>
          <span className="btn btn-coral"><Play className="h-4 w-4" aria-hidden />{stats.dailyDone ? 'Practise' : 'Start'}</span>
        </Link>
        <h2 className="mb-4 text-2xl font-extrabold">Choose a quiz</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizModes.map((m) => (
            <li key={m.id}><Link to={`/play/${m.id}`} className="card block h-full p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <span className="chip">{Math.min(m.count, questions.filter(m.filter).length)} questions</span>
              <h3 className="mt-3 text-xl font-bold">{m.title}</h3><p className="text-ink-soft">{m.desc}</p>
            </Link></li>
          ))}
        </ul>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <section aria-labelledby="hist"><h2 id="hist" className="mb-4 text-2xl font-extrabold">Saved attempts</h2>
            {attempts.length === 0 ? <EmptyState icon={Target} title="No attempts yet">Finish a quiz and your results will be saved here.</EmptyState> : (
              <ul className="card divide-y divide-[#ece7d6]">{attempts.map((a) => (
                <li key={a.id} className="flex items-center justify-between p-3"><span><span className="block font-semibold">{a.title}</span><span className="text-xs text-ink-soft">{new Date(a.at).toLocaleString()}</span></span><span className="font-display text-lg font-extrabold text-teal-700">{a.correct}/{a.total}</span></li>
              ))}</ul>
            )}
          </section>
          <section aria-labelledby="bdg"><h2 id="bdg" className="mb-4 text-2xl font-extrabold">Badges</h2>
            <ul className="grid gap-2">{BADGES.map((b) => { const got = !!state.badges[b.id]; return (
              <li key={b.id} className={`card flex items-center gap-3 p-3 ${got ? '' : 'opacity-60'}`}><Trophy className={`h-5 w-5 ${got ? 'text-coral-600' : 'text-ink-soft'}`} aria-hidden /><span><span className="block font-bold">{b.title} <span className="text-xs font-semibold">{got ? '· Unlocked' : '· Locked'}</span></span><span className="text-sm text-ink-soft">{b.desc}</span></span></li>); })}</ul>
          </section>
        </div>
      </Page>
    </>
  );
}
