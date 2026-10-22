import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { scenarios } from '../data/scenarios.js';
import { actions } from '../hooks/useProgress.js';
import { EmptyState, Page, PracticeSet, SpeakButton, useDocumentTitle, useToast } from '../components/ui.jsx';

const POINTS = { best: 2, ok: 1, bad: 0 };

function RolePlay({ scenario }) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const max = scenario.roleplay.length * 2;
  const s = scenario.roleplay[step];

  const pick = (c) => {
    if (choice) return; // one answer per step
    setChoice(c); setScore((x) => x + POINTS[c.quality]);
  };
  const next = () => {
    if (step + 1 >= scenario.roleplay.length) {
      setDone(true);
      actions.recordScenario(scenario, score, max);
      toast('Role-play saved!', 'success');
      return;
    }
    setStep(step + 1); setChoice(null);
  };
  const restart = () => { setStep(0); setChoice(null); setScore(0); setDone(false); };

  if (done) return (
    <div className="pop rounded-2xl bg-teal-100 p-6 text-center">
      <p className="font-display text-3xl font-extrabold">{score} / {max} points</p>
      <p className="mt-1">{score === max ? '¡Excelente! Every reply was natural.' : 'Nice work. Try again to find the best replies.'}</p>
      <div className="mt-4 flex justify-center gap-3"><button className="btn btn-ghost" onClick={restart}>Play again</button><Link to="/campus" className="btn btn-primary">More scenarios</Link></div>
    </div>
  );

  const tone = (q) => (q === 'best' ? 'border-teal-700 bg-teal-100' : q === 'ok' ? 'border-yellow-600 bg-yellow-50' : 'border-coral-600 bg-coral-100');
  const label = (q) => (q === 'best' ? 'Great choice' : q === 'ok' ? 'Understandable' : 'Needs work');

  return (
    <div>
      <p className="text-sm font-semibold text-ink-soft">Turn {step + 1} of {scenario.roleplay.length}</p>
      <div className="mt-2 flex items-start gap-3"><span className="chip">Them</span><div><p className="font-display text-xl font-bold" lang="es">{s.npcEs} <SpeakButton text={s.npcEs} /></p><p className="text-sm text-ink-soft">{s.npcEn}</p></div></div>
      <p className="mt-5 font-semibold">How do you reply?</p>
      <div className="mt-2 grid gap-2">
        {s.choices.map((c) => {
          const picked = choice === c;
          return (
            <button key={c.es} disabled={!!choice} onClick={() => pick(c)} className={`rounded-xl border-2 p-3 text-left transition ${choice ? (picked ? tone(c.quality) : 'border-[#e4dfd0] bg-white opacity-60') : 'border-[#d6d0bd] bg-white hover:bg-paper-2'}`}>
              <span className="block font-display text-lg font-bold" lang="es">{c.es}</span>
              {choice && <span className="text-sm text-ink-soft">{c.en}</span>}
            </button>
          );
        })}
      </div>
      {choice && (
        <div className="pop mt-4 space-y-3" role="status">
          <div className={`rounded-xl border-2 p-3 ${tone(choice.quality)}`}><p className="font-bold">{label(choice.quality)} · +{POINTS[choice.quality]}</p><p className="text-sm">{choice.feedback}</p></div>
          <div className="flex items-start gap-3 rounded-xl bg-white p-3"><span className="chip">Them</span><div><p className="font-display font-bold" lang="es">{choice.replyEs}</p><p className="text-sm text-ink-soft">{choice.replyEn}</p></div></div>
          <button className="btn btn-teal" onClick={next} autoFocus>{step + 1 >= scenario.roleplay.length ? 'Finish' : 'Next turn'}</button>
        </div>
      )}
    </div>
  );
}

export default function ScenarioPage() {
  const { id } = useParams();
  const scenario = scenarios.find((s) => s.id === id);
  const [tab, setTab] = useState('dialogue');
  const [showEn, setShowEn] = useState(true);
  useDocumentTitle(scenario?.title);
  if (!scenario) return <Page><EmptyState title="Scenario not found" action={<Link to="/campus" className="btn btn-primary">Back to Campus</Link>}>That situation does not exist.</EmptyState></Page>;

  const idx = scenarios.findIndex((s) => s.id === id);
  const prev = scenarios[idx - 1]; const next = scenarios[idx + 1];
  const tabs = [['dialogue', 'Dialogue'], ['vocab', 'Vocabulary'], ['grammar', 'Grammar notes'], ['quiz', 'Comprehension quiz'], ['roleplay', 'Conversation activity']];

  return (
    <Page>
      <Link to="/campus" className="text-sm font-semibold text-teal-700 underline">← Campus Español</Link>
      <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{idx + 1}. {scenario.title}</h1>
      <p className="mt-2 max-w-2xl text-lg text-ink-soft">{scenario.intro}</p>
      <div role="tablist" aria-label="Scenario sections" className="mt-6 flex flex-wrap gap-2">
        {tabs.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`btn !min-h-10 ${tab === k ? 'btn-primary' : 'btn-ghost'}`}>{label}</button>)}
      </div>
      <section className="card mt-4 max-w-3xl p-5 sm:p-6" role="tabpanel">
        {tab === 'dialogue' && (<>
          <button className="btn btn-ghost mb-4 !min-h-9" onClick={() => setShowEn((v) => !v)}>{showEn ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}{showEn ? 'Hide' : 'Show'} English</button>
          <ul className="space-y-3">{scenario.dialogue.map(([who, es, en], i) => (
            <li key={i} className="flex gap-3"><span className="chip h-fit shrink-0">{who}</span><div><p className="font-display text-lg font-bold" lang="es">{es} <SpeakButton text={es} /></p>{showEn && <p className="text-sm text-ink-soft">{en}</p>}</div></li>
          ))}</ul>
        </>)}
        {tab === 'vocab' && <dl className="grid gap-2 sm:grid-cols-2">{scenario.vocab.map(([es, en]) => <div key={es} className="rounded-xl border border-[#e4dfd0] px-3 py-2"><dt className="font-bold" lang="es">{es} <SpeakButton text={es} /></dt><dd className="text-ink-soft">{en}</dd></div>)}</dl>}
        {tab === 'grammar' && <ul className="list-disc space-y-3 pl-5 text-lg">{scenario.grammar.map((g, i) => <li key={i}>{g}</li>)}</ul>}
        {tab === 'quiz' && <PracticeSet key={scenario.id} items={scenario.quiz} />}
        {tab === 'roleplay' && <RolePlay key={scenario.id} scenario={scenario} />}
      </section>
      <div className="mt-6 flex max-w-3xl justify-between">
        {prev ? <Link to={`/campus/${prev.id}`} className="btn btn-ghost">← Previous</Link> : <span />}
        {next ? <Link to={`/campus/${next.id}`} className="btn btn-primary">Next scenario →</Link> : <Link to="/play" className="btn btn-primary">Go to quizzes →</Link>}
      </div>
    </Page>
  );
}
