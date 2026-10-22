// TEST HELPER ONLY: the real Express app with a MOCKED AI service. Never used by start.bat.
// Usage: node test/mock-server.js [ok|quota|badkey]
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import http from 'node:http';
import { HttpError } from '../src/middleware/validate.js';

const mode = process.argv[2] || 'ok';
const config = loadConfig({ GEMINI_API_KEY: 'MOCK_KEY_FOR_TESTS', PORT: '5000', GEMINI_MODEL: 'mock-model' });
const log = [];
const aiService = {
  async generateReply(input) {
    log.push(input);
    if (mode === 'quota') throw new HttpError(429, 'AI_QUOTA', 'The free Gemini quota is used up for now. Wait a minute and try again.');
    if (mode === 'badkey') throw new HttpError(502, 'AI_INVALID_KEY', 'Google rejected the API key. Check GEMINI_API_KEY in your .env file, then restart the app.');
    return `[MOCK ${input.action}/${input.level}/${input.mode}] ¡Hola! Recibí: "${input.message.slice(0, 40)}". ¿Cómo estás?`;
  },
};
const app = createApp({ config, aiService });
app.listen(5000, () => console.log(`[MOCK AI backend] http://localhost:5000 mode=${mode}`));

// Request log for assertions, on its own port so it can never collide with app routes.
http.createServer((_req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(log)); }).listen(5001);
