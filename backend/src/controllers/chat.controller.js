import { validateChatBody, HttpError } from '../middleware/validate.js';
import { mapGeminiError } from '../services/gemini.service.js';

export function createChatController({ config, aiService }) {
  return async function chat(req, res) {
    const input = validateChatBody(req.body, config);
    const customKey = req.headers['x-api-key'] || req.body?.apiKey;
    const reply = await aiService.generateReply({ ...input, apiKey: customKey });
    res.json({ reply, model: config.model, createdAt: new Date().toISOString() });
  };
}

export function createStreamController({ config, aiService }) {
  return async function chatStream(req, res) {
    const input = validateChatBody(req.body, config);
    const customKey = req.headers['x-api-key'] || req.body?.apiKey;

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let closed = false;
    const abortController = new AbortController();
    req.on('close', () => {
      closed = true;
      abortController.abort();
    });

    try {
      let fullReply = '';
      const result = await aiService.generateReplyStream({
        ...input,
        apiKey: customKey,
        signal: abortController.signal,
        onChunk: (text) => {
          if (!closed) {
            fullReply += text;
            res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
          }
        },
      });

      if (!closed) {
        res.write(`data: ${JSON.stringify({ done: true, reply: fullReply, model: result?.model || config.model })}\n\n`);
        res.end();
      }
    } catch (err) {
      if (!closed) {
        const httpErr = err instanceof HttpError ? err : mapGeminiError(err);
        res.write(`data: ${JSON.stringify({ error: { code: httpErr.code, message: httpErr.message } })}\n\n`);
        res.end();
      }
    }
  };
}

export function createHealthController({ config }) {
  return function health(_req, res) {
    res.json({
      status: 'ok',
      aiConfigured: config.aiConfigured,
      model: config.aiConfigured ? config.model : null,
    });
  };
}

export function createConfigController({ config, aiService }) {
  return {
    async setKey(req, res) {
      const apiKey = (req.body?.apiKey || '').trim();
      const model = (req.body?.model || config.model).trim();
      if (!apiKey) {
        throw new HttpError(400, 'KEY_REQUIRED', 'Gemini API key is required.');
      }

      // Live validation with Gemini
      const testResult = await aiService.validateKey(apiKey, model);
      const workingModel = testResult.model || model;

      // Update in-memory configuration & write to .env
      config.setApiKey(apiKey);
      config.setModel(workingModel);
      config.saveToEnv(apiKey, workingModel);

      res.json({
        ok: true,
        aiConfigured: true,
        model: workingModel,
        message: `Successfully connected to Gemini with model ${workingModel}!`,
      });
    },

    getModels(_req, res) {
      res.json({
        currentModel: config.model,
        aiConfigured: config.aiConfigured,
        models: [
          { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', badge: 'Ultra-fast & verified' },
          { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', badge: 'Lowest latency' },
          { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', badge: 'Fast & stable' },
          { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', badge: 'Auto-updating' },
          { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', badge: 'High demand' },
        ],
      });
    },

    setModel(req, res) {
      const model = (req.body?.model || '').trim();
      if (!model || !/^[a-zA-Z0-9._-]+$/.test(model)) {
        throw new HttpError(400, 'INVALID_MODEL', 'Invalid model name.');
      }
      config.setModel(model);
      config.saveToEnv(undefined, model);
      res.json({ ok: true, model: config.model });
    },
  };
}
