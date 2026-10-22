import { foundations } from './lessonsFoundations.js';
import { grammar } from './lessonsGrammar.js';
import { everyday } from './lessonsEveryday.js';

export const lessons = [...foundations, ...grammar, ...everyday];
export const lessonSections = ['Foundations', 'Grammar', 'Everyday Spanish'];
export const getLesson = (id) => lessons.find((l) => l.id === id);
