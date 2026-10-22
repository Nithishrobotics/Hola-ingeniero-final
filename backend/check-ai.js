// Run:  npm run check:ai --prefix backend
// Sends ONE tiny real request to Gemini to verify your key + model. Prints only success or a friendly error.
import { loadConfig } from './src/config/env.js';
import { createGeminiService } from './src/services/gemini.service.js';

const config = loadConfig();
console.log(`Model: ${config.model}`);
if (!config.aiConfigured) { console.error('No API key found. Put GEMINI_API_KEY in the .env file in the project root.'); process.exit(1); }
try {
  const reply = await createGeminiService(config).generateReply({ message: 'Hola', level: 'A1', mode: 'everyday', action: 'chat', history: [] });
  console.log('SUCCESS. The tutor answered:\n' + reply);
} catch (err) {
  console.error(`FAILED [${err.code ?? 'ERROR'}]: ${err.message}`);
  process.exit(2);
}
