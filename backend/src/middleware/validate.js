import { ACTIONS, LEVELS, MODES } from '../services/prompt.service.js';

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Returns a cleaned request object or throws HttpError(400).
export function validateChatBody(body, limits) {
  if (!isPlainObject(body)) throw new HttpError(400, 'BAD_REQUEST', 'Request body must be a JSON object.');

  const { message, level = 'A1', mode = 'everyday', action = 'chat', history = [] } = body;

  if (typeof message !== 'string' || message.trim().length === 0) {
    throw new HttpError(400, 'EMPTY_MESSAGE', 'Please type a message before sending.');
  }
  if (message.length > limits.maxMessageChars) {
    throw new HttpError(400, 'MESSAGE_TOO_LONG', `Messages can be at most ${limits.maxMessageChars} characters.`);
  }
  if (!LEVELS.includes(level)) throw new HttpError(400, 'BAD_LEVEL', 'Level must be A1, A2 or B1.');
  if (!MODES.includes(mode)) throw new HttpError(400, 'BAD_MODE', 'Unknown conversation mode.');
  if (!ACTIONS.includes(action)) throw new HttpError(400, 'BAD_ACTION', 'Unknown tutor action.');
  if (!Array.isArray(history)) throw new HttpError(400, 'BAD_HISTORY', 'History must be a list.');

  const cleanHistory = [];
  for (const item of history.slice(-limits.maxHistoryMessages)) {
    if (!isPlainObject(item) || !['user', 'model'].includes(item.role) || typeof item.text !== 'string') {
      throw new HttpError(400, 'BAD_HISTORY', 'Each history item needs a role (user/model) and text.');
    }
    const text = item.text.trim().slice(0, limits.maxHistoryCharsEach);
    if (text) cleanHistory.push({ role: item.role, text });
  }

  // Gemini requires the conversation to start with a user turn.
  while (cleanHistory.length && cleanHistory[0].role !== 'user') cleanHistory.shift();

  return { message: message.trim(), level, mode, action, history: cleanHistory };
}
