export const dayKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toUtcDays = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};

// Streak = consecutive active days ending today (or yesterday, so the streak is not lost until a day is missed).
export function computeStreak(activeDays, todayKey = dayKey()) {
  if (!activeDays?.length) return 0;
  const set = new Set(activeDays.map(toUtcDays));
  const today = toUtcDays(todayKey);
  let cursor = set.has(today) ? today : set.has(today - 1) ? today - 1 : null;
  if (cursor === null) return 0;
  let streak = 0;
  while (set.has(cursor)) { streak += 1; cursor -= 1; }
  return streak;
}

// Small deterministic RNG so the "daily" items are the same all day.
export function seededRandom(seedString) {
  let h = 1779033703 ^ seedString.length;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(h ^ seedString.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
