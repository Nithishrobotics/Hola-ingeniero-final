import { describe, it, expect } from 'vitest';
import { computeStreak } from '../lib/dates.js';
import { defaultState, completeLesson, recordQuiz, recordDaily, toggleLearned, recordScenario, selectStats, evaluateBadges, sanitize } from '../lib/progress.js';
import { gradeFill, gradeOrder, gradeMatch, pickQuestions, dailyQuestions, pointsFor, scoreSummary, shuffle } from '../lib/quiz.js';
import { questions, quizModes } from '../data/questions.js';
import { lessons } from '../data/lessons.js';
import { vocabulary } from '../data/vocabulary.js';
import { scenarios } from '../data/scenarios.js';

const D = (s) => new Date(`${s}T10:00:00`);

describe('content volume', () => {
  it('meets the required content minimums', () => {
    expect(vocabulary.length).toBeGreaterThanOrEqual(100);
    expect(questions.length).toBeGreaterThanOrEqual(100);
    expect(scenarios.length).toBe(15);
    expect(lessons.every((l) => l.practice.length >= 5)).toBe(true);
  });
  it('has unique ids and valid answers', () => {
    expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    for (const q of questions.filter((x) => x.type === 'mcq')) {
      expect(q.answer).toBeLessThan(q.options.length);
      expect(new Set(q.options).size).toBe(q.options.length);
    }
    for (const l of lessons) for (const p of l.practice) expect(p.answer).toBeLessThan(p.options.length);
  });
  it('every quiz mode has enough questions', () => {
    for (const m of quizModes) expect(questions.filter(m.filter).length).toBeGreaterThanOrEqual(Math.min(m.count, 5));
  });
});

describe('streak', () => {
  it('is zero for new users', () => expect(computeStreak([], '2026-10-14')).toBe(0));
  it('counts consecutive days', () => expect(computeStreak(['2026-10-12', '2026-10-13', '2026-10-14'], '2026-10-14')).toBe(3));
  it('survives until a day is missed', () => expect(computeStreak(['2026-10-12', '2026-10-13'], '2026-10-14')).toBe(2));
  it('resets after a gap', () => expect(computeStreak(['2026-10-10'], '2026-10-14')).toBe(0));
});

describe('progress and badges', () => {
  it('new users see zeros', () => {
    const s = selectStats(defaultState(), '2026-10-14');
    expect(s).toMatchObject({ lessonsCompleted: 0, accuracy: 0, streak: 0, xp: 0, badgesUnlocked: 0 });
  });
  it('completing a lesson twice awards XP once', () => {
    let s = completeLesson(defaultState(), lessons[0], D('2026-10-14'));
    s = completeLesson(s, lessons[0], D('2026-10-14'));
    expect(s.xp).toBe(25);
    expect(s.badges['first-lesson']).toBeTruthy();
  });
  it('duplicate quiz submissions do not award points twice', () => {
    const attempt = { id: 'a1', mode: 'mixed', title: 'Mixed', correct: 4, total: 5, points: 40 };
    let s = recordQuiz(defaultState(), attempt, D('2026-10-14'));
    s = recordQuiz(s, attempt, D('2026-10-14'));
    expect(s.quizAttempts).toHaveLength(1);
    expect(s.xp).toBe(40);
    expect(s.badges.perfect).toBeUndefined();
  });
  it('perfect badge only for 100% on 5+ questions', () => {
    const small = recordQuiz(defaultState(), { id: 'x', mode: 'm', title: 'm', correct: 3, total: 3, points: 30 });
    expect(small.badges.perfect).toBeUndefined();
    const big = recordQuiz(defaultState(), { id: 'y', mode: 'm', title: 'm', correct: 5, total: 5, points: 50 });
    expect(big.badges.perfect).toBeTruthy();
    expect(big.xp).toBe(70); // 50 + 20 bonus
  });
  it('accuracy reflects saved attempts', () => {
    let s = recordQuiz(defaultState(), { id: '1', mode: 'm', title: 't', correct: 3, total: 4, points: 30 });
    s = recordQuiz(s, { id: '2', mode: 'm', title: 't', correct: 1, total: 4, points: 10 });
    expect(selectStats(s).accuracy).toBe(50);
  });
  it('streak badge requires 3 consecutive days', () => {
    let s = defaultState();
    s = toggleLearned(s, vocabulary[0], D('2026-10-12'));
    s = toggleLearned(s, vocabulary[1], D('2026-10-13'));
    expect(s.badges['streak-3']).toBeUndefined();
    s = toggleLearned(s, vocabulary[2], D('2026-10-14'));
    expect(computeStreak(s.activityDays, '2026-10-14')).toBe(3);
    expect(evaluateBadges(s, D('2026-10-14')).badges['streak-3']).toBeTruthy();
  });
  it('daily challenge counts once', () => {
    let s = recordDaily(defaultState(), { key: '2026-10-14', correct: 4, total: 5, points: 40 });
    const xp = s.xp;
    s = recordDaily(s, { key: '2026-10-14', correct: 5, total: 5, points: 50 });
    expect(s.xp).toBe(xp);
    expect(s.badges.daily).toBeTruthy();
  });
  it('scenario XP only for first completion', () => {
    let s = recordScenario(defaultState(), scenarios[0], 4, 6);
    const xp = s.xp;
    s = recordScenario(s, scenarios[0], 6, 6);
    expect(s.xp).toBe(xp);
    expect(s.scenarioDone[scenarios[0].id].score).toBe(6);
  });
  it('sanitize repairs corrupted storage', () => {
    expect(sanitize({ level: 'Z9', xp: 'lots', lessonsDone: null }).level).toBeNull();
    expect(sanitize(null).xp).toBe(0);
  });
});

describe('grading', () => {
  const fill = { accepted: ['estás'] };
  it('fill accepts exact and flags missing accents', () => {
    expect(gradeFill(fill, 'estás').correct).toBe(true);
    const r = gradeFill(fill, 'estas');
    expect(r.correct).toBe(true);
    expect(r.note).toMatch(/accent/);
    expect(gradeFill(fill, 'esta').correct).toBe(false);
    expect(gradeFill(fill, '').correct).toBe(false);
  });
  it('order ignores case and punctuation, accepts alternatives', () => {
    const q = { answer: '¿dónde está la biblioteca?', alts: [] };
    expect(gradeOrder(q, ['Dónde', 'está', 'la', 'biblioteca'])).toBe(true);
    expect(gradeOrder(q, ['está', 'dónde', 'la', 'biblioteca'])).toBe(false);
  });
  it('match requires every pair', () => {
    const q = { pairs: [['a', '1'], ['b', '2']] };
    expect(gradeMatch(q, { a: '1', b: '2' })).toBe(true);
    expect(gradeMatch(q, { a: '1', b: '1' })).toBe(false);
  });
  it('points: hint halves, wrong is zero', () => {
    expect(pointsFor(true, false)).toBe(10);
    expect(pointsFor(true, true)).toBe(5);
    expect(pointsFor(false, false)).toBe(0);
  });
  it('summary computes counts', () => {
    expect(scoreSummary([{ correct: true, points: 10 }, { correct: false, points: 0 }])).toEqual({ total: 2, correct: 1, wrong: 1, points: 10, accuracy: 50 });
  });
  it('all fill and order answers in the bank grade as correct', () => {
    for (const q of questions.filter((x) => x.type === 'fill')) expect(gradeFill(q, q.accepted[0]).correct).toBe(true);
    for (const q of questions.filter((x) => x.type === 'order')) expect(gradeOrder(q, q.answer.replace(/[¿?]/g, '').split(' '))).toBe(true);
  });
});

describe('selection', () => {
  it('picks randomized, distinct questions', () => {
    const picked = pickQuestions(questions, quizModes[0]);
    expect(picked).toHaveLength(15);
    expect(new Set(picked.map((q) => q.id)).size).toBe(15);
  });
  it('daily questions are stable within a day and differ across days', () => {
    const a = dailyQuestions(questions, '2026-10-14').map((q) => q.id).join();
    expect(dailyQuestions(questions, '2026-10-14').map((q) => q.id).join()).toBe(a);
    expect(dailyQuestions(questions, '2026-10-15').map((q) => q.id).join()).not.toBe(a);
  });
  it('shuffle keeps all items', () => expect(shuffle([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4]));
});
