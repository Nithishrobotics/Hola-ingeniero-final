import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createChatController,
  createStreamController,
  createConfigController,
  createHealthController,
} from '../controllers/chat.controller.js';

export function createApiRouter({ config, aiService }) {
  const router = Router();

  const chatLimiter = rateLimit({
    windowMs: 60_000,
    limit: config.chatRateLimit ?? 15,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'You are sending messages too fast. Wait a few seconds and try again.',
        },
      });
    },
  });

  const configController = createConfigController({ config, aiService });

  router.get('/health', createHealthController({ config }));
  router.post('/chat', chatLimiter, createChatController({ config, aiService }));
  router.post('/chat/stream', chatLimiter, createStreamController({ config, aiService }));
  router.post('/config/key', configController.setKey);
  router.get('/config/models', configController.getModels);
  router.post('/config/model', configController.setModel);

  return router;
}
