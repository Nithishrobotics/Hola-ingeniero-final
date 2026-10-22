import { Link } from 'react-router-dom';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { scenarios } from '../data/scenarios.js';
import { useProgress } from '../hooks/useProgress.js';
import { Page, PageHeader, ProgressBar, useDocumentTitle } from '../components/ui.jsx';

export default function CampusPage() {
  useDocumentTitle('Campus Español');
  const { scenarioDone } = useProgress();
  const done = Object.keys(scenarioDone).length;
  return (
    <>
      <PageHeader title="Campus Español" subtitle="Fifteen university situations. Read the dialogue, learn the words, then role-play and choose your own replies. Works without any API key.">
        <div className="max-w-md"><ProgressBar value={done} max={scenarios.length} label="Scenarios completed" /><p className="mt-2 text-sm font-semibold">{done} of {scenarios.length} completed</p></div>
      </PageHeader>
      <Page>
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((s, i) => {
            const r = scenarioDone[s.id];
            return (
              <li key={s.id}><Link to={`/campus/${s.id}`} className="card flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <span className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-lg bg-navy-900 font-display font-bold text-white">{i + 1}</span>{r ? <span className="chip"><CheckCircle2 className="h-4 w-4" aria-hidden />{r.score}/{r.max}</span> : <MessageCircle className="h-5 w-5 text-teal-700" aria-label="Not started" />}</span>
                <h2 className="mt-3 text-xl font-bold">{s.title}</h2><p className="mt-1 text-sm text-ink-soft">{s.intro}</p>
              </Link></li>
            );
          })}
        </ol>
      </Page>
    </>
  );
}
