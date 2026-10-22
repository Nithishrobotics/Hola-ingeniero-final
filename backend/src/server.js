import { loadConfig } from './config/env.js';
import { createApp } from './app.js';
import { createGeminiService } from './services/gemini.service.js';

let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(`\n[config] ${err.message}\n`);
  process.exit(1);
}

const app = createApp({ config, aiService: createGeminiService(config) });

const server = app.listen(config.port, () => {
  console.log(`[api] Backend running at http://localhost:${config.port}`);
  console.log(`[api] AI tutor: ${config.aiConfigured ? `enabled (model: ${config.model})` : 'DISABLED (no API key)'}`);
  config.warnings.forEach((w) => console.warn(`[api] Note: ${w}`));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`\n[api] Port ${config.port} is already in use. Close the other copy of the app or change PORT in .env.\n`);
  else console.error(`[api] Could not start: ${err.code || 'unknown error'}`);
  process.exit(1);
});

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
