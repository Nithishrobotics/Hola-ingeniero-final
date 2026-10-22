import { useMemo, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { eliminateTwo, gradeFill, gradeMatch, gradeOrder, hintFor, orderTokens, pointsFor, shuffle } from '../lib/quiz.js';

// Shows ONE question. The correct answer is never shown until it is submitted (or a hint is requested).
export default function QuestionView({ question, onResult, onNext, isLast, index, total }) {
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [hintUsed, setHintUsed] = useState(false);

  const [choice, setChoice] = useState(null);       // mcq
  const [text, setText] = useState('');             // fill
  const [chosenIdx, setChosenIdx] = useState([]);   // order (indices into bank)
  const [pairs, setPairs] = useState({});           // match

  const bank = useMemo(() => (question.type === 'order' ? shuffle(orderTokens(question)) : []), [question]);
  const matchOptions = useMemo(() => (question.type === 'match' ? shuffle(question.pairs.map((p) => p[1])) : []), [question]);
  const eliminated = useMemo(() => (hintUsed && question.type === 'mcq' ? eliminateTwo(question) : []), [hintUsed, question]);

  const ready =
    question.type === 'mcq' ? choice !== null :
    question.type === 'fill' ? text.trim().length > 0 :
    question.type === 'order' ? chosenIdx.length === bank.length :
    Object.keys(pairs).length === question.pairs.length && Object.values(pairs).every(Boolean);

  const submit = () => {
    if (submitted || !ready) return; // ignore repeated clicks
    let correct = false; let note = '';
    if (question.type === 'mcq') correct = choice === question.answer;
    if (question.type === 'fill') ({ correct, note } = gradeFill(question, text));
    if (question.type === 'order') correct = gradeOrder(question, chosenIdx.map((i) => bank[i]));
    if (question.type === 'match') correct = gradeMatch(question, pairs);
    const r = { correct, note, hintUsed, points: pointsFor(correct, hintUsed) };
    setResult(r); setSubmitted(true);
    onResult(r);
  };

  const hint = hintFor(question);
  const showCorrect = () => {
    if (question.type === 'mcq') return question.options[question.answer];
    if (question.type === 'fill') return question.accepted[0];
    if (question.type === 'order') return question.answer.replace(/^./, (c) => c.toUpperCase());
    return question.pairs.map(([a, b]) => `${a} = ${b}`).join(' · ');
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm font-semibold text-ink-soft"><span>Question {index + 1} of {total}</span><span className="chip">{question.type === 'mcq' ? 'Multiple choice' : question.type === 'fill' ? 'Fill in the blank' : question.type === 'order' ? 'Build the sentence' : 'Matching'}</span></div>
      <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{question.prompt}</h2>

      {question.type === 'mcq' && (
        <div className="mt-5 grid gap-2" role="radiogroup" aria-label="Answer choices">
          {question.options.map((opt, i) => {
            const hidden = eliminated.includes(i);
            let style = 'border-[#d6d0bd] bg-white hover:bg-paper-2';
            if (choice === i && !submitted) style = 'border-navy-900 bg-navy-100';
            if (submitted && i === question.answer) style = 'border-teal-700 bg-teal-100';
            if (submitted && choice === i && i !== question.answer) style = 'border-coral-600 bg-coral-100';
            return (
              <button key={i} type="button" role="radio" aria-checked={choice === i} disabled={submitted || hidden} onClick={() => setChoice(i)}
                className={`flex min-h-12 items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-left text-lg font-medium transition ${style} ${hidden ? 'opacity-30 line-through' : ''}`}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-xs font-bold" aria-hidden>{String.fromCharCode(65 + i)}</span>{opt}
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'fill' && (
        <div className="mt-5">
          <label className="mb-1 block text-sm font-semibold" htmlFor="fill">Type your answer in Spanish</label>
          <input id="fill" className="input text-lg" value={text} disabled={submitted} autoComplete="off" autoCapitalize="off" spellCheck={false}
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <p className="mt-1 text-xs text-ink-soft">Tip: accents matter (á é í ó ú ñ). A missing accent is accepted but flagged.</p>
        </div>
      )}

      {question.type === 'order' && (
        <div className="mt-5">
          <div className="min-h-14 rounded-xl border-2 border-dashed border-[#cfc9b5] bg-white p-2" aria-label="Your sentence">
            {chosenIdx.length === 0 && <span className="px-2 text-ink-soft">Tap the words in order…</span>}
            <div className="flex flex-wrap gap-2">
              {chosenIdx.map((bi, pos) => (
                <button key={pos} type="button" disabled={submitted} onClick={() => setChosenIdx(chosenIdx.filter((_, p) => p !== pos))} className="btn btn-primary !min-h-10 !px-3 !py-1" aria-label={`Remove ${bank[bi]}`}>{bank[bi]}</button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Word bank">
            {bank.map((w, bi) => (
              <button key={bi} type="button" disabled={submitted || chosenIdx.includes(bi)} onClick={() => setChosenIdx([...chosenIdx, bi])} className="btn btn-ghost !min-h-10 !px-3 !py-1">{w}</button>
            ))}
          </div>
          {!submitted && chosenIdx.length > 0 && <button type="button" className="mt-2 text-sm font-semibold underline" onClick={() => setChosenIdx([])}>Clear</button>}
        </div>
      )}

      {question.type === 'match' && (
        <div className="mt-5 grid gap-2">
          {question.pairs.map(([es]) => {
            const right = submitted && pairs[es] === question.pairs.find((p) => p[0] === es)[1];
            return (
              <div key={es} className={`flex items-center gap-3 rounded-xl border-2 bg-white p-2 ${submitted ? (right ? 'border-teal-700' : 'border-coral-600') : 'border-[#d6d0bd]'}`}>
                <span className="w-1/2 font-display text-lg font-bold" lang="es">{es}</span>
                <select className="input !min-h-10 w-1/2" aria-label={`Meaning of ${es}`} disabled={submitted} value={pairs[es] ?? ''} onChange={(e) => setPairs({ ...pairs, [es]: e.target.value })}>
                  <option value="">Choose…</option>
                  {matchOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {hintUsed && hint.kind === 'text' && !submitted && <p className="pop mt-4 rounded-xl bg-navy-100 p-3 text-sm font-semibold" role="status">Hint: {hint.text}</p>}

      {submitted && (
        <div className={`pop mt-5 rounded-xl p-4 ${result.correct ? 'bg-teal-100' : 'bg-coral-100'}`} role="status">
          <p className="text-lg font-bold">{result.correct ? `✓ Correct! +${result.points} XP` : `✗ Not quite. Correct answer: ${showCorrect()}`}</p>
          {result.note && <p className="mt-1 text-sm font-semibold">{result.note}</p>}
          {question.why && <p className="mt-1 text-sm">{question.why}</p>}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!submitted
          ? (<>
              <button className="btn btn-primary" onClick={submit} disabled={!ready}>Submit answer</button>
              <button className="btn btn-ghost" onClick={() => setHintUsed(true)} disabled={hintUsed}><Lightbulb className="h-4 w-4" aria-hidden />{hintUsed ? 'Hint used (½ points)' : 'Hint (½ points)'}</button>
            </>)
          : <button className="btn btn-teal" onClick={onNext} autoFocus>{isLast ? 'See results' : 'Next question'}</button>}
      </div>
    </div>
  );
}
