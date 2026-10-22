import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RotateCcw, Trophy } from 'lucide-react';
import { questions, quizModes } from '../data/questions.js';
import { dailyQuestions, pickQuestions, scoreSummary } from '../lib/quiz.js';
import { dayKey } from '../lib/dates.js';
import { actions, useProgress } from '../hooks/useProgress.js';
import { selectStats } from '../lib/progress.js';
import QuestionView from '../components/QuestionView.jsx';
import { EmptyState, Page, ProgressBar, useDocumentTitle } from '../components/ui.jsx';

function Results({ summary, results, qs, title, onRetry, isDaily, dailyBonus }) {
  return (
    <div className="pop mx-auto max-w-2xl">
      <div className="card p-6 text-center">
        <Trophy className="mx-auto h-10 w-10 text-coral-600" aria-hidden />
        <h2 className="mt-2 text-3xl font-extrabold">{title}: results</h2>
        <p className="mt-3 font-display text-6xl font-extrabold text-teal-700">{summary.accuracy}%</p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-teal-100 p-3"><dt className="text-sm font-semibold">Correct</dt><dd className="text-2xl font-extrabold">{summary.correct}</dd></div>
          <div className="rounded-xl bg-coral-100 p-3"><dt className="text-sm font-semibold">Incorrect</dt><dd className="text-2xl font-extrabold">{summary.wrong}</dd></div>
          <div className="rounded-xl bg-navy-100 p-3"><dt className="text-sm font-semibold">Points</dt><dd className="text-2xl font-extrabold">{summary.points}</dd></div>
        </dl>
        {summary.total >= 5 && summary.correct === summary.total && <p className="mt-3 font-semibold text-teal-700">Perfect score bonus: +20 XP</p>}
        {isDaily && dailyBonus && <p className="mt-1 font-semibold text-teal-700">Daily challenge bonus: +15 XP</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="btn btn-primary" onClick={onRetry}><RotateCcw className="h-4 w-4" aria-hidden />{isDaily ? 'Practise again (no bonus)' : 'Retry quiz'}</button>
          <Link to="/play" className="btn btn-ghost">All quizzes</Link>
        </div>
      </div>
      <h3 className="mt-8 text-xl font-extrabold">Review</h3>
      <ul className="mt-3 space-y-2">
        {qs.map((q, i) => (
          <li key={q.id} className="card flex items-start gap-3 p-3"><span className={`mt-0.5 font-bold ${results[i].correct ? 'text-teal-700' : 'text-coral-600'}`} aria-label={results[i].correct ? 'Correct' : 'Incorrect'}>{results[i].correct ? '✓' : '✗'}</span><span><span className="block font-semibold">{q.prompt}</span>{q.why && <span className="text-sm text-ink-soft">{q.why}</span>}</span></li>
        ))}
      </ul>
    </div>
  );
}

export default function QuizPage() {
  const { mode: modeId } = useParams();
  const isDaily = modeId === 'daily';
  const mode = isDaily ? { id: 'daily', title: 'Daily challenge' } : quizModes.find((m) => m.id === modeId);
  useDocumentTitle(mode?.title);
  const state = useProgress();
  const alreadyDailyDone = isDaily && selectStats(state).dailyDone;

  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [finished, setFinished] = useState(false);
  const recorded = useRef(new Set());

  const today = dayKey();
  const qs = useMemo(() => {
    if (!mode) return [];
    return isDaily ? dailyQuestions(questions, today) : pickQuestions(questions, mode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeId, round]);
  const [startedAt] = useState(() => Date.now());
  const attemptId = `${modeId}-${startedAt}-${round}`;

  if (!mode) return <Page><EmptyState title="Quiz not found" action={<Link to="/play" className="btn btn-primary">Back to quizzes</Link>}>That quiz does not exist.</EmptyState></Page>;

  const onResult = (r) => setResults((prev) => (prev.length === index ? [...prev, r] : prev));

  const onNext = () => {
    if (index + 1 < qs.length) { setIndex(index + 1); return; }
    // Finish: record exactly once per attempt id
    if (!recorded.current.has(attemptId)) {
      recorded.current.add(attemptId);
      const summary = scoreSummary(results);
      actions.recordQuiz({ id: attemptId, mode: modeId, title: mode.title, correct: summary.correct, total: summary.total, points: summary.points });
      if (isDaily && !alreadyDailyDone) actions.recordDaily({ key: today, correct: summary.correct, total: summary.total, points: 0 });
    }
    setFinished(true);
  };

  const retry = () => { setRound((r) => r + 1); setIndex(0); setResults([]); setFinished(false); };

  return (
    <Page>
      <div className="mx-auto max-w-2xl">
        <Link to="/play" className="text-sm font-semibold text-teal-700 underline">← All quizzes</Link>
        <h1 className="mb-4 mt-2 text-xl font-extrabold text-ink-soft">{mode.title}</h1>
        {!finished ? (
          <div className="card p-5 sm:p-7">
            <div className="mb-4"><ProgressBar value={index + (results.length > index ? 1 : 0)} max={qs.length} label="Quiz progress" /></div>
            <QuestionView key={`${attemptId}-${index}`} question={qs[index]} index={index} total={qs.length} isLast={index + 1 === qs.length} onResult={onResult} onNext={onNext} />
          </div>
        ) : (
          <Results summary={scoreSummary(results)} results={results} qs={qs} title={mode.title} onRetry={retry} isDaily={isDaily} dailyBonus={isDaily && !alreadyDailyDone} />
        )}
      </div>
    </Page>
  );
}
