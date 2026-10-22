import { computeStreak, dayKey } from './dates.js';

export const STORAGE_KEY = 'hola-ingeniero:v1';
export const LEVELS = [
  { id: 'A1', name: 'Beginner', blurb: 'I know almost no Spanish.' },
  { id: 'A2', name: 'Elementary', blurb: 'I know basic phrases and the present tense.' },
  { id: 'B1', name: 'Intermediate', blurb: 'I can hold simple conversations.' },
];

export const defaultState = () => ({
  version: 1,
  level: null,
  lessonsDone: {},
  vocabLearned: {},
  quizAttempts: [],
  scenarioDone: {},
  xp: 0,
  badges: {},
  activityDays: [],
  recent: [],
  daily: null,
  chatUsed: 0,
  chat: { messages: [], mode: 'everyday' },
});

export function sanitize(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const s = { ...base, ...raw };
  if (!['A1', 'A2', 'B1'].includes(s.level)) s.level = null;
  for (const k of ['lessonsDone', 'vocabLearned', 'scenarioDone', 'badges']) if (typeof s[k] !== 'object' || s[k] === null) s[k] = {};
  for (const k of ['quizAttempts', 'activityDays', 'recent']) if (!Array.isArray(s[k])) s[k] = [];
  s.xp = Number.isFinite(s.xp) ? Math.max(0, s.xp) : 0;
  s.chat = s.chat && Array.isArray(s.chat.messages) ? s.chat : base.chat;
  return s;
}

const touch = (state, now) => {
  const key = dayKey(now);
  return state.activityDays.includes(key) ? state.activityDays : [...state.activityDays, key].slice(-400);
};
const pushRecent = (state, item) => [item, ...state.recent.filter((r) => !(r.type === item.type && r.id === item.id))].slice(0, 6);

// ---------- Badges: unlocked only when their real criteria are met ----------
export const BADGES = [
  { id: 'first-lesson', title: 'First steps', desc: 'Complete your first lesson.', check: (s) => Object.keys(s.lessonsDone).length >= 1 },
  { id: 'lessons-10', title: 'Study habit', desc: 'Complete 10 lessons.', check: (s) => Object.keys(s.lessonsDone).length >= 10 },
  { id: 'words-25', title: 'Word collector', desc: 'Mark 25 tech words as learned.', check: (s) => Object.keys(s.vocabLearned).length >= 25 },
  { id: 'first-quiz', title: 'Quiz starter', desc: 'Finish your first quiz.', check: (s) => s.quizAttempts.length >= 1 },
  { id: 'perfect', title: 'Flawless', desc: 'Score 100% on a quiz of 5+ questions.', check: (s) => s.quizAttempts.some((a) => a.total >= 5 && a.correct === a.total) },
  { id: 'xp-200', title: 'Rising engineer', desc: 'Earn 200 XP.', check: (s) => s.xp >= 200 },
  { id: 'streak-3', title: 'Three-day streak', desc: 'Practise on 3 days in a row.', check: (s, now) => computeStreak(s.activityDays, dayKey(now)) >= 3 },
  { id: 'campus-1', title: 'Campus regular', desc: 'Finish a Campus Español role-play.', check: (s) => Object.keys(s.scenarioDone).length >= 1 },
  { id: 'campus-5', title: 'Campus star', desc: 'Finish 5 role-plays.', check: (s) => Object.keys(s.scenarioDone).length >= 5 },
  { id: 'daily', title: 'Daily challenger', desc: 'Complete a daily challenge.', check: (s) => !!s.daily?.done },
  { id: 'tutor', title: 'Talks to the tutor', desc: 'Get a real answer from the AI tutor.', check: (s) => s.chatUsed >= 1 },
];

export function evaluateBadges(state, now = new Date()) {
  const badges = { ...state.badges };
  let changed = false;
  for (const b of BADGES) {
    if (!badges[b.id] && b.check(state, now)) { badges[b.id] = now.toISOString(); changed = true; }
  }
  return changed ? { ...state, badges } : state;
}

// ---------- Reducers (pure) ----------
export function setLevel(state, level) { return evaluateBadges({ ...state, level }); }

export function completeLesson(state, lesson, now = new Date()) {
  if (state.lessonsDone[lesson.id]) return state;
  const next = {
    ...state,
    lessonsDone: { ...state.lessonsDone, [lesson.id]: now.toISOString() },
    xp: state.xp + 25,
    activityDays: touch(state, now),
    recent: pushRecent(state, { type: 'lesson', id: lesson.id, title: lesson.title, at: now.toISOString() }),
  };
  return evaluateBadges(next, now);
}

export function uncompleteLesson(state, lessonId) {
  if (!state.lessonsDone[lessonId]) return state;
  const { [lessonId]: _drop, ...rest } = state.lessonsDone;
  return { ...state, lessonsDone: rest }; // XP already earned is kept
}

export function toggleLearned(state, word, now = new Date()) {
  const learned = { ...state.vocabLearned };
  if (learned[word.id]) { delete learned[word.id]; return { ...state, vocabLearned: learned }; }
  learned[word.id] = now.toISOString();
  const next = {
    ...state,
    vocabLearned: learned,
    xp: state.xp + 2,
    activityDays: touch(state, now),
    recent: pushRecent(state, { type: 'vocab', id: word.category, title: `Tech Español: ${word.category}`, at: now.toISOString() }),
  };
  return evaluateBadges(next, now);
}

// attempt: { id, mode, title, correct, total, points }. Same attempt id is never counted twice.
export function recordQuiz(state, attempt, now = new Date()) {
  if (state.quizAttempts.some((a) => a.id === attempt.id)) return state;
  const bonus = attempt.total >= 5 && attempt.correct === attempt.total ? 20 : 0;
  const entry = { ...attempt, bonus, at: now.toISOString() };
  const next = {
    ...state,
    quizAttempts: [...state.quizAttempts, entry].slice(-200),
    xp: state.xp + attempt.points + bonus,
    activityDays: touch(state, now),
    recent: pushRecent(state, { type: 'quiz', id: attempt.mode, title: `Quiz: ${attempt.title}`, at: now.toISOString() }),
  };
  return evaluateBadges(next, now);
}

export function recordDaily(state, { key, correct, total, points }, now = new Date()) {
  if (state.daily?.key === key && state.daily.done) return state;
  const next = {
    ...state,
    daily: { key, done: true, correct, total },
    xp: state.xp + points + 15,
    activityDays: touch(state, now),
    recent: pushRecent(state, { type: 'daily', id: key, title: 'Daily challenge', at: now.toISOString() }),
  };
  return evaluateBadges(next, now);
}

export function recordScenario(state, scenario, score, max, now = new Date()) {
  const prev = state.scenarioDone[scenario.id];
  const isNew = !prev;
  const better = !prev || score > prev.score;
  const next = {
    ...state,
    scenarioDone: better ? { ...state.scenarioDone, [scenario.id]: { score, max, at: now.toISOString() } } : state.scenarioDone,
    xp: state.xp + (isNew ? 20 + score * 2 : 0),
    activityDays: touch(state, now),
    recent: pushRecent(state, { type: 'scenario', id: scenario.id, title: `Campus: ${scenario.title}`, at: now.toISOString() }),
  };
  return evaluateBadges(next, now);
}

export function recordTutorReply(state, now = new Date()) {
  return evaluateBadges({ ...state, chatUsed: state.chatUsed + 1, activityDays: touch(state, now) }, now);
}

export function setChat(state, chat) { return { ...state, chat }; }

export function resetAll() { return defaultState(); }

// ---------- Derived stats shown on the dashboard ----------
export function selectStats(state, todayKey = dayKey()) {
  const attempts = state.quizAttempts;
  const answered = attempts.reduce((s, a) => s + a.total, 0);
  const correct = attempts.reduce((s, a) => s + a.correct, 0);
  return {
    lessonsCompleted: Object.keys(state.lessonsDone).length,
    wordsLearned: Object.keys(state.vocabLearned).length,
    quizzesTaken: attempts.length,
    accuracy: answered ? Math.round((correct / answered) * 100) : 0,
    streak: computeStreak(state.activityDays, todayKey),
    xp: state.xp,
    scenariosDone: Object.keys(state.scenarioDone).length,
    badgesUnlocked: Object.keys(state.badges).length,
    dailyDone: state.daily?.key === todayKey && !!state.daily.done,
  };
}
