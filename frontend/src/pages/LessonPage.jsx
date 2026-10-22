import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle2, Target } from 'lucide-react';
import { getLesson, lessons } from '../data/lessons.js';
import { useProgress, actions } from '../hooks/useProgress.js';
import { GrammarTable, Page, PracticeSet, SpeakButton, EmptyState, useDocumentTitle } from '../components/ui.jsx';
import { useToast } from '../components/ui.jsx';

export default function LessonPage() {
  const { id } = useParams();
  const lesson = getLesson(id);
  const { lessonsDone } = useProgress();
  const toast = useToast();
  useDocumentTitle(lesson?.title);

  if (!lesson) return <Page><EmptyState title="Lesson not found" action={<Link className="btn btn-primary" to="/learn">Back to lessons</Link>}>That lesson does not exist.</EmptyState></Page>;

  const idx = lessons.findIndex((l) => l.id === id);
  const prev = lessons[idx - 1];
  const next = lessons[idx + 1];
  const completed = !!lessonsDone[lesson.id];

  const toggle = () => {
    if (completed) { actions.uncompleteLesson(lesson.id); toast('Lesson marked as not completed.', 'info'); }
    else { actions.completeLesson(lesson); toast(`Lesson completed! +25 XP`, 'success'); }
  };

  return (
    <Page>
      <nav className="mb-4 text-sm" aria-label="Breadcrumb"><Link to="/learn" className="font-semibold text-teal-700 underline">Learn Spanish</Link> / {lesson.section}</nav>
      <article className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-extrabold">{lesson.title}</h1>
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-teal-100 p-4 font-semibold text-[#0b4f49]"><Target className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><span><span className="block text-xs">Learning objective</span>{lesson.objective}</span></p>

        <section className="mt-8" aria-labelledby="exp"><h2 id="exp" className="text-2xl font-extrabold">Explanation</h2>
          <div className="prose-es mt-3 text-lg">{lesson.explanation.split('\n').map((p, i) => <p key={i}>{p}</p>)}</div>
        </section>

        {lesson.tables.map((t, i) => <GrammarTable key={i} table={t} />)}

        <section className="mt-8" aria-labelledby="ex"><h2 id="ex" className="text-2xl font-extrabold">Examples</h2>
          <ul className="mt-3 grid gap-2">
            {lesson.examples.map(([es, en], i) => (
              <li key={i} className="card flex items-start justify-between gap-2 p-3">
                <span><span className="block font-display text-lg font-bold text-navy-900" lang="es">{es}</span><span className="text-ink-soft">{en}</span></span>
                <SpeakButton text={es} />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8" aria-labelledby="vocab"><h2 id="vocab" className="text-2xl font-extrabold">Important vocabulary</h2>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {lesson.vocab.map(([es, en]) => (
              <div key={es} className="flex items-baseline justify-between gap-3 rounded-xl border border-[#e4dfd0] bg-white px-3 py-2"><dt className="font-bold text-navy-900" lang="es">{es}</dt><dd className="text-right text-ink-soft">{en}</dd></div>
            ))}
          </dl>
        </section>

        <section className="card mt-10 p-5 sm:p-6" aria-labelledby="prac"><h2 id="prac" className="mb-4 text-2xl font-extrabold">Practice</h2><PracticeSet key={lesson.id} items={lesson.practice} /></section>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <button className={`btn ${completed ? 'btn-ghost' : 'btn-teal'}`} onClick={toggle}><CheckCircle2 className="h-5 w-5" aria-hidden />{completed ? 'Completed ✓ (click to undo)' : 'Mark as completed'}</button>
          <div className="flex gap-2">
            {prev ? <Link to={`/learn/${prev.id}`} className="btn btn-ghost"><ChevronLeft className="h-4 w-4" aria-hidden />Previous</Link> : <span />}
            {next ? <Link to={`/learn/${next.id}`} className="btn btn-primary">Next<ChevronRight className="h-4 w-4" aria-hidden /></Link> : <Link to="/play" className="btn btn-primary">Go to quizzes</Link>}
          </div>
        </div>
      </article>
    </Page>
  );
}
