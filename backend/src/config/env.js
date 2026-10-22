import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
// Root .env is the main one; backend/.env is also accepted. Existing OS variables win.
dotenv.config({ path: path.resolve(here, '../../../.env'), quiet: true });
dotenv.config({ path: path.resolve(here, '../../.env'), quiet: true });

export const PLACEHOLDERS = new Set(['', 'PASTE_YOUR_KEY_HERE', 'YOUR_API_KEY', 'your_key_here']);

export function persistEnv(key, model) {
  if (process.env.NODE_ENV === 'test') return;
  const rootEnv = path.resolve(here, '../../../.env');
  const example = path.resolve(here, '../../../.env.example');
  let content = '';

  if (fs.existsSync(rootEnv)) {
    content = fs.readFileSync(rootEnv, 'utf8');
  } else if (fs.existsSync(example)) {
    content = fs.readFileSync(example, 'utf8');
  } else {
    content = '# ¡Hola Ingeniero! Environment Configuration\n';
  }

  if (key !== undefined) {
    if (/^GEMINI_API_KEY=.*$/m.test(content)) {
      content = content.replace(/^GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY=${key}`);
    } else {
      content += `\nGEMINI_API_KEY=${key}`;
    }
  }

  if (model !== undefined) {
    if (/^GEMINI_MODEL=.*$/m.test(content)) {
      content = content.replace(/^GEMINI_MODEL=.*$/m, `GEMINI_MODEL=${model}`);
    } else {
      content += `\nGEMINI_MODEL=${model}`;
    }
  }

  fs.writeFileSync(rootEnv, content.trim() + '\n', 'utf8');
}

export function loadConfig(env = process.env) {
  let apiKey = (env.GEMINI_API_KEY || '').trim();
  const port = Number.parseInt(env.PORT || '5000', 10);
  let model = (env.GEMINI_MODEL || 'gemini-3.5-flash').trim();
  const warnings = [];

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT in your .env file must be a number between 1 and 65535.');
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) {
    throw new Error('GEMINI_MODEL in your .env file contains invalid characters.');
  }
  if (PLACEHOLDERS.has(apiKey)) {
    warnings.push('GEMINI_API_KEY is not set. The AI tutor is disabled; all other modules still work.');
  }

  const extraOrigins = (env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const allowedOrigins = [
    'http://localhost:5173', 'http://127.0.0.1:5173',
    `http://localhost:${port}`, `http://127.0.0.1:${port}`,
    ...extraOrigins,
  ];

  return {
    port,
    get model() { return model; },
    get aiConfigured() { return !PLACEHOLDERS.has(apiKey); },
    getApiKey: () => apiKey,
    setApiKey(newKey) { apiKey = (newKey || '').trim(); },
    setModel(newModel) { model = (newModel || '').trim(); },
    saveToEnv(newKey, newModel) { persistEnv(newKey, newModel); },
    allowedOrigins,
    requestTimeoutMs: 25000,
    maxMessageChars: 1000,
    maxHistoryMessages: 12,
    maxHistoryCharsEach: 1500,
    warnings,
  };
}
