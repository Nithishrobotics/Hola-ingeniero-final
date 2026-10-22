import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { lessons, lessonSections } from '../data/lessons.js';
import { useProgress } from '../hooks/useProgress.js';
import { Page, PageHeader, ProgressBar, useDocumentTitle } from '../components/ui.jsx';

export default function LearnPage() {
  useDocumentTitle('Learn Spanish');
  const { lessonsDone } = useProgress();
  const done = Object.keys(lessonsDone).length;
  return (
    <>
      <PageHeader title="Learn Spanish" subtitle="Foundations, grammar and everyday Spanish. Each lesson ends with practice questions and instant feedback.">
        <div className="max-w-md"><ProgressBar value={done} max={lessons.length} label="Lessons completed" /><p className="mt-2 text-sm font-semibold">{done} of {lessons.length} lessons completed</p></div>
      </PageHeader>
      <Page>
        {lessonSections.map((section) => (
          <section key={section} className="mb-10" aria-labelledby={`s-${section}`}>
            <h2 id={`s-${section}`} className="mb-4 text-2xl font-extrabold">{section}</h2>
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {lessons.filter((l) => l.section === section).map((l) => {
                const ok = !!lessonsDone[l.id];
                return (
                  <li key={l.id}>
                    <Link to={`/learn/${l.id}`} className="card flex h-full items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                      {ok ? <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-teal-700" aria-label="Completed" /> : <Circle className="mt-0.5 h-6 w-6 shrink-0 text-[#cfc9b5]" aria-label="Not completed" />}
                      <span><span className="block font-display text-lg font-bold text-navy-900">{l.title}</span><span className="text-sm text-ink-soft">{l.objective}</span></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </Page>
    </>
  );
}
