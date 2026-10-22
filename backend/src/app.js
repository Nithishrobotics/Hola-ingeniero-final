import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFound, requestLogger, requestTimeout } from './middleware/errors.js';
import { createApiRouter } from './routes/index.js';

export function createApp({ config, aiService }) {
  const app = express();
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({
    origin(origin, cb) {
      // No Origin header = same-origin or tools like curl. Otherwise must be allow-listed.
      if (!origin || config.allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('CORS_BLOCKED'));
    },
    methods: ['GET', 'POST'],
  }));
  app.use(requestLogger);
  app.use(requestTimeout(config.requestTimeoutMs + 5000));
  app.use(express.json({ limit: '20kb' }));

  app.use('/api', createApiRouter({ config, aiService }));
  app.use('/api', notFound);

  // Optional: serve the built frontend (npm run serve)
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()));
  }

  app.use(errorHandler);
  return app;
}
