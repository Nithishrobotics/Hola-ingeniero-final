import { Link } from 'react-router-dom';
import { BookOpen, Cpu, Gamepad2, GraduationCap, Bot, Flame, Target, Trophy, Star, ArrowRight, Sparkles, Clock } from 'lucide-react';
import { useProgress } from '../hooks/useProgress.js';
import { BADGES, selectStats } from '../lib/progress.js';
import { dayKey, seededRandom } from '../lib/dates.js';
import { lessons } from '../data/lessons.js';
import { vocabulary } from '../data/vocabulary.js';
import { EmptyState, ProgressBar, SpeakButton, useDocumentTitle } from '../components/ui.jsx';

const modules = [
  { to: '/learn', icon: BookOpen, title: 'Learn Spanish', text: 'Alphabet to grammar to everyday talk, with practice after every lesson.', tag: `${lessons.length} lessons` },
  { to: '/tech', icon: Cpu, title: 'Tech Español', text: 'Engineering vocabulary with flashcards, search and review.', tag: `${vocabulary.length} terms` },
  { to: '/play', icon: Gamepad2, title: 'Play & Practice', text: 'Quizzes, daily challenges, points and badges.', tag: '110 questions' },
  { to: '/campus', icon: GraduationCap, title: 'Campus Español', text: 'Role-play university situations with branching replies.', tag: '15 scenarios' },
  { to: '/tutor', icon: Bot, title: '¡Hola Amigo! AI tutor', text: 'Chat with a Gemini-powered tutor that corrects you kindly.', tag: 'Live AI' },
];

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="card p-4">
      <Icon className="h-5 w-5 text-teal-700" aria-hidden />
      <p className="mt-2 font-display text-3xl font-extrabold text-navy-900">{value}</p>
      <p className="text-sm font-semibold">{label}</p>
      {hint && <p className="text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export default function HomePage() {
  useDocumentTitle('');
  const state = useProgress();
  const stats = selectStats(state);
  const today = dayKey();
  const wordOfDay = vocabulary[Math.floor(seededRandom(`word-${today}`)() * vocabulary.length)];
  const nextLessons = lessons.filter((l) => !state.lessonsDone[l.id]).slice(0, 3);
  const typeIcon = { lesson: BookOpen, vocab: Cpu, quiz: Gamepad2, scenario: GraduationCap, daily: Target };

  return (
    <>
      <section className="trace relative overflow-hidden bg-navy-900 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="chip !bg-navy-800 !text-teal-400">Spanish for engineers</p>
            <h1 className="mt-4 text-5xl font-extrabold leading-[1.05] !text-white sm:text-7xl">¡Hola Ingeniero!</h1>
            <p className="mt-3 font-display text-2xl font-bold text-teal-400">Aprende. Practica. Progresa.</p>
            <p className="mt-5 max-w-xl text-lg text-navy-100">Learn Spanish through the world you already live in: code, circuits, campus life and technical interviews.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/learn" className="btn btn-coral">Start learning <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <Link to="/tutor" className="btn border-white/30 bg-white/10 text-white hover:bg-white/20"><Bot className="h-4 w-4" aria-hidden />Meet your AI tutor</Link>
            </div>
          </div>
          <figure className="rounded-2xl border border-white/15 bg-navy-950/70 p-5 font-mono text-sm shadow-2xl" aria-label="Example of Spanish in code">
            <div className="mb-3 flex gap-1.5" aria-hidden><span className="h-3 w-3 rounded-full bg-coral-500" /><span className="h-3 w-3 rounded-full bg-yellow-400" /><span className="h-3 w-3 rounded-full bg-teal-400" /></div>
            <p className="text-navy-100/70">// Un bucle repite una instrucción</p>
            <p className="text-navy-100/50">// A loop repeats an instruction</p>
            <p className="mt-2"><span className="text-coral-500">para</span> (i = 0; i &lt; 10; i++) {'{'}</p>
            <p className="pl-4"><span className="text-teal-400">decir</span>(<span className="text-yellow-300">"Hola, ingeniero"</span>);</p>
            <p>{'}'}</p>
            <figcaption className="mt-4 border-t border-white/10 pt-3 text-navy-100">
              <span className="text-teal-400">el bucle</span> = loop · <span className="text-teal-400">la variable</span> = variable
            </figcaption>
          </figure>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-12">
        <section aria-labelledby="mods">
          <h2 id="mods" className="text-3xl font-extrabold">Five modules, one goal</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ to, icon: Icon, title, text, tag }, i) => (
              <Link key={to} to={to} className={`card group p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${i === 4 ? 'lg:col-span-1 border-teal-600' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy-900 text-teal-400"><Icon className="h-5 w-5" aria-hidden /></span>
                  <span className="chip">{tag}</span>
                </div>
                <h3 className="mt-4 text-xl font-bold">{title}</h3>
                <p className="mt-1 text-ink-soft">{text}</p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="dash" className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 id="dash" className="text-3xl font-extrabold">Your dashboard</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={BookOpen} label="Lessons completed" value={`${stats.lessonsCompleted}/${lessons.length}`} />
              <StatCard icon={Target} label="Quiz accuracy" value={`${stats.accuracy}%`} hint={stats.quizzesTaken ? `${stats.quizzesTaken} quizzes` : 'No quizzes yet'} />
              <StatCard icon={Flame} label="Day streak" value={stats.streak} hint={stats.streak ? 'Keep it going!' : 'Study today to start'} />
              <StatCard icon={Star} label="Experience" value={`${stats.xp} XP`} />
            </div>
            <div className="card mt-4 p-4">
              <p className="mb-2 text-sm font-semibold">Course progress</p>
              <ProgressBar value={stats.lessonsCompleted} max={lessons.length} label="Lessons completed" />
              <p className="mt-2 text-sm text-ink-soft">{stats.wordsLearned} tech words learned · {stats.scenariosDone}/15 campus scenarios · {stats.badgesUnlocked}/{BADGES.length} badges</p>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold">Recently studied</h2>
            <div className="mt-5">
              {state.recent.length === 0
                ? <EmptyState icon={Clock} title="Nothing here yet" action={<Link to="/learn/alfabeto" className="btn btn-primary">Start with the alphabet</Link>}>Your last topics will appear here.</EmptyState>
                : (
                  <ul className="card divide-y divide-[#ece7d6]">
                    {state.recent.map((r) => {
                      const Icon = typeIcon[r.type] ?? BookOpen;
                      const href = r.type === 'lesson' ? `/learn/${r.id}` : r.type === 'scenario' ? `/campus/${r.id}` : r.type === 'vocab' ? '/tech' : r.type === 'daily' ? '/play/daily' : `/play/${r.id}`;
                      return <li key={`${r.type}-${r.id}`}><Link to={href} className="flex items-center gap-3 p-3 hover:bg-paper-2"><Icon className="h-5 w-5 text-teal-700" aria-hidden /><span className="font-semibold">{r.title}</span></Link></li>;
                    })}
                  </ul>
                )}
            </div>
          </div>
        </section>

        <section aria-labelledby="today" className="grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <h2 id="today" className="flex items-center gap-2 text-2xl font-extrabold"><Sparkles className="h-6 w-6 text-coral-600" aria-hidden />Vocabulary of the day</h2>
            <p className="mt-4 font-display text-4xl font-extrabold text-teal-700">{wordOfDay.es} <SpeakButton text={wordOfDay.es} /></p>
            <p className="text-lg font-semibold">{wordOfDay.en}</p>
            <p className="mt-3 border-l-4 border-teal-400 pl-3 italic">{wordOfDay.exampleEs}</p>
            <p className="pl-4 text-sm text-ink-soft">{wordOfDay.exampleEn}</p>
            <span className="chip mt-4">{wordOfDay.category}</span>
          </div>
          <div className="card flex flex-col justify-between bg-navy-900 p-6 !text-white">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-extrabold !text-white"><Trophy className="h-6 w-6 text-coral-500" aria-hidden />Daily challenge</h2>
              <p className="mt-3 text-navy-100">Five new mixed questions every day. Finish it for a +15 XP bonus and the Daily challenger badge.</p>
            </div>
            <div className="mt-6">
              {stats.dailyDone
                ? <p className="rounded-xl bg-teal-600/30 p-3 font-semibold text-teal-400">✓ Completed today. Come back tomorrow!</p>
                : <Link to="/play/daily" className="btn btn-coral">Take today’s challenge <ArrowRight className="h-4 w-4" aria-hidden /></Link>}
            </div>
          </div>
        </section>

        <section aria-labelledby="feat">
          <div className="flex items-end justify-between"><h2 id="feat" className="text-3xl font-extrabold">Featured lessons</h2><Link className="font-semibold text-teal-700 underline" to="/learn">All lessons</Link></div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {nextLessons.length === 0 && <EmptyState icon={Trophy} title="All lessons complete!">Amazing. Revisit any lesson from the Learn page.</EmptyState>}
            {nextLessons.map((l) => (
              <Link key={l.id} to={`/learn/${l.id}`} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <span className="chip">{l.section}</span>
                <h3 className="mt-3 text-xl font-bold">{l.title}</h3>
                <p className="mt-1 text-ink-soft">{l.objective}</p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="badges">
          <h2 id="badges" className="text-3xl font-extrabold">Achievements</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BADGES.map((b) => {
              const got = !!state.badges[b.id];
              return (
                <li key={b.id} className={`card flex items-start gap-3 p-4 ${got ? '' : 'opacity-60'}`}>
                  <Trophy className={`mt-0.5 h-6 w-6 shrink-0 ${got ? 'text-coral-600' : 'text-ink-soft'}`} aria-hidden />
                  <div><p className="font-bold">{b.title}</p><p className="text-sm text-ink-soft">{b.desc}</p><p className="mt-1 text-xs font-semibold">{got ? 'Unlocked' : 'Locked'}</p></div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
