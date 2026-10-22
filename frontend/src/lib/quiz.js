import { seededRandom } from './dates.js';

export function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickQuestions(bank, mode, rng = Math.random) {
  const pool = bank.filter(mode.filter);
  return shuffle(pool, rng).slice(0, mode.count);
}

export function dailyQuestions(bank, key, count = 5) {
  return shuffle(bank, seededRandom(`daily-${key}`)).slice(0, count);
}

const stripPunct = (s) => s.toLowerCase().replace(/[¿?¡!.,;:]/g, '').replace(/\s+/g, ' ').trim();
const stripAccents = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Fill-in: accents matter, but a missing accent is accepted with a note (many keyboards make accents hard).
export function gradeFill(question, input) {
  const typed = stripPunct(input ?? '');
  if (!typed) return { correct: false, note: '' };
  if (question.accepted.some((a) => stripPunct(a) === typed)) return { correct: true, note: '' };
  if (question.accepted.some((a) => stripAccents(stripPunct(a)) === stripAccents(typed))) {
    return { correct: true, note: `Correct — remember the accent: ${question.accepted[0]}` };
  }
  return { correct: false, note: '' };
}

export function gradeOrder(question, tokens) {
  const built = stripPunct(tokens.join(' '));
  return [question.answer, ...(question.alts ?? [])].some((a) => stripPunct(a) === built);
}

export function gradeMatch(question, selections) {
  // selections: { [spanish]: englishChosen }
  return question.pairs.every(([es, en]) => selections[es] === en);
}

export const orderTokens = (question) => stripPunct(question.answer).split(' ');

export const pointsFor = (correct, hintUsed) => (correct ? (hintUsed ? 5 : 10) : 0);

export function hintFor(question) {
  switch (question.type) {
    case 'mcq': return { kind: 'eliminate' };
    case 'fill': {
      const a = question.accepted[0];
      return { kind: 'text', text: `Starts with “${a[0]}” and has ${a.length} letters.` };
    }
    case 'order': return { kind: 'text', text: `The first word is “${orderTokens(question)[0]}”.` };
    case 'match': return { kind: 'text', text: `${question.pairs[0][0]} → ${question.pairs[0][1]}` };
    default: return { kind: 'text', text: '' };
  }
}

// For the mcq hint: indices of two wrong options to hide.
export function eliminateTwo(question, rng = Math.random) {
  const wrong = question.options.map((_, i) => i).filter((i) => i !== question.answer);
  return shuffle(wrong, rng).slice(0, Math.min(2, wrong.length - 1));
}

export function scoreSummary(results) {
  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const points = results.reduce((s, r) => s + r.points, 0);
  return { total, correct, wrong: total - correct, points, accuracy: total ? Math.round((correct / total) * 100) : 0 };
}
