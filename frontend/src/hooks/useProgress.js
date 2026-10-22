import { useSyncExternalStore } from 'react';
import * as P from '../lib/progress.js';

function load() {
  try {
    return P.sanitize(JSON.parse(localStorage.getItem(P.STORAGE_KEY)));
  } catch {
    return P.defaultState();
  }
}

let state = load();
let storageOk = true;
const listeners = new Set();
const badgeListeners = new Set();

function commit(next) {
  if (next === state) return;
  const before = Object.keys(state.badges);
  state = next;
  try {
    localStorage.setItem(P.STORAGE_KEY, JSON.stringify(state));
    storageOk = true;
  } catch {
    storageOk = false; // private mode or full storage: app keeps working in memory
  }
  listeners.forEach((l) => l());
  const fresh = Object.keys(next.badges).filter((b) => !before.includes(b));
  if (fresh.length) badgeListeners.forEach((l) => l(fresh.map((id) => P.BADGES.find((b) => b.id === id)).filter(Boolean)));
}

const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb); };
export const onBadgeUnlocked = (cb) => { badgeListeners.add(cb); return () => badgeListeners.delete(cb); };
export const isStorageOk = () => storageOk;

export const actions = {
  setLevel: (level) => commit(P.setLevel(state, level)),
  completeLesson: (lesson) => commit(P.completeLesson(state, lesson)),
  uncompleteLesson: (id) => commit(P.uncompleteLesson(state, id)),
  toggleLearned: (word) => commit(P.toggleLearned(state, word)),
  recordQuiz: (attempt) => commit(P.recordQuiz(state, attempt)),
  recordDaily: (r) => commit(P.recordDaily(state, r)),
  recordScenario: (sc, score, max) => commit(P.recordScenario(state, sc, score, max)),
  recordTutorReply: () => commit(P.recordTutorReply(state)),
  setChat: (chat) => commit(P.setChat(state, chat)),
  resetAll: () => commit(P.resetAll()),
};

export function useProgress() {
  return useSyncExternalStore(subscribe, () => state);
}
