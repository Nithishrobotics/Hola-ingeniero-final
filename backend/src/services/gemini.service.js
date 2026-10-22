import { GoogleGenAI } from '@google/genai';
import { HttpError } from '../middleware/validate.js';
import { PLACEHOLDERS } from '../config/env.js';
import { buildSystemInstruction, buildTaskPrompt } from './prompt.service.js';

// Fast fallback order for resilience and zero interruption
export const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

export function getCandidateModels(preferredModel) {
  const list = [];
  if (preferredModel && !list.includes(preferredModel)) list.push(preferredModel);
  for (const m of FALLBACK_MODELS) {
    if (!list.includes(m)) list.push(m);
  }
  return list;
}

// Turns any SDK/network failure into a safe, honest, user-facing error.
export function mapGeminiError(err) {
  const status = Number(err?.status ?? err?.code ?? err?.error?.code);
  const text = `${err?.message ?? ''}`.toLowerCase();

  if (err?.name === 'AbortError' || text.includes('timed out') || text.includes('aborted')) {
    return new HttpError(504, 'AI_TIMEOUT', 'The AI took too long to answer. Please try again.');
  }
  if (status === 429 || text.includes('resource_exhausted') || text.includes('quota')) {
    return new HttpError(429, 'AI_QUOTA', 'The free Gemini quota is used up for now. Wait a minute (or until tomorrow for daily limits) and try again.');
  }
  if (status === 401 || status === 403 || text.includes('api key not valid') || text.includes('api_key_invalid') || text.includes('permission_denied') || text.includes('unregistered callers')) {
    return new HttpError(502, 'AI_INVALID_KEY', 'Google rejected the API key. Please check your Gemini API key in the settings and try again.');
  }
  if (status === 404 || text.includes('is not found') || text.includes('not supported for generatecontent')) {
    return new HttpError(502, 'AI_MODEL_NOT_FOUND', 'The selected model is not available for your key. Try switching models in settings.');
  }
  if (status === 400 && text.includes('location')) {
    return new HttpError(502, 'AI_REGION', 'The Gemini API is not available in your region for this key.');
  }
  if (status >= 500 && status < 600) {
    return new HttpError(503, 'AI_UPSTREAM', 'Google’s AI service is having trouble. Please try again shortly.');
  }
  if (['fetch failed', 'enotfound', 'econnrefused', 'econnreset', 'etimedout', 'network'].some((s) => text.includes(s))) {
    return new HttpError(503, 'AI_NETWORK', 'Could not reach Google’s AI service. Check your internet connection.');
  }
  return new HttpError(502, 'AI_FAILED', err?.message || 'The AI request failed. Please try again.');
}

export function createGeminiService(config) {
  const clientCache = new Map();

  const getClient = (overrideKey) => {
    const key = (overrideKey || config.getApiKey() || '').trim();
    if (!key || PLACEHOLDERS.has(key)) {
      throw new HttpError(503, 'AI_NOT_CONFIGURED', 'The AI tutor needs a Gemini API key. Click the Key icon or connect your key in the tutor page.');
    }
    if (!clientCache.has(key)) {
      clientCache.set(key, new GoogleGenAI({ apiKey: key }));
    }
    return clientCache.get(key);
  };

  return {
    async validateKey(apiKey, requestedModel = config.model) {
      const cleanKey = (apiKey || '').trim();
      if (!cleanKey || PLACEHOLDERS.has(cleanKey)) {
        throw new HttpError(400, 'KEY_REQUIRED', 'Please provide a valid Gemini API key.');
      }
      const client = new GoogleGenAI({ apiKey: cleanKey });
      const modelsToTry = getCandidateModels(requestedModel);
      let workingModel = null;
      let lastErr = null;

      for (const m of modelsToTry) {
        try {
          const res = await client.models.generateContent({
            model: m,
            contents: [{ role: 'user', parts: [{ text: '¡Hola!' }] }],
            config: { maxOutputTokens: 10 },
          });
          if (res?.text) {
            workingModel = m;
            break;
          }
        } catch (err) {
          lastErr = err;
          const mapped = mapGeminiError(err);
          // If key is invalid, fail immediately
          if (mapped.code === 'AI_INVALID_KEY') throw mapped;
        }
      }

      if (!workingModel) {
        throw mapGeminiError(lastErr);
      }
      return { valid: true, model: workingModel };
    },

    async generateReply({ message, level, mode, action, history, apiKey, model: reqModel }) {
      const client = getClient(apiKey);
      const contents = [
        ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: buildTaskPrompt({ action, message }) }] },
      ];

      const modelsToTry = getCandidateModels(reqModel || config.model);
      let lastError = null;

      for (let i = 0; i < modelsToTry.length; i++) {
        const model = modelsToTry[i];
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
        try {
          const response = await client.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: buildSystemInstruction({ level, mode }),
              temperature: 0.7,
              maxOutputTokens: 1024,
              abortSignal: controller.signal,
            },
          });
          const text = (response?.text ?? '').trim();
          if (!text) {
            throw new HttpError(502, 'AI_EMPTY', 'The AI returned an empty answer. Try rephrasing.');
          }
          return text;
        } catch (err) {
          lastError = err;
          const mapped = mapGeminiError(err);
          const canFallback = ['AI_MODEL_NOT_FOUND', 'AI_QUOTA', 'AI_UPSTREAM'].includes(mapped.code);
          if (canFallback && i < modelsToTry.length - 1) {
            console.warn(`[gemini] Model ${model} failed with ${mapped.code}. Retrying with ${modelsToTry[i + 1]}...`);
            continue;
          }
          if (err instanceof HttpError) throw err;
          throw mapped;
        } finally {
          clearTimeout(timer);
        }
      }

      throw mapGeminiError(lastError);
    },

    async generateReplyStream({ message, level, mode, action, history, apiKey, model: reqModel, signal, onChunk }) {
      const client = getClient(apiKey);
      const contents = [
        ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: buildTaskPrompt({ action, message }) }] },
      ];

      const modelsToTry = getCandidateModels(reqModel || config.model);
      let lastError = null;

      for (let i = 0; i < modelsToTry.length; i++) {
        const model = modelsToTry[i];
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);

        const onAbort = () => controller.abort();
        if (signal) signal.addEventListener('abort', onAbort, { once: true });

        try {
          const responseStream = await client.models.generateContentStream({
            model,
            contents,
            config: {
              systemInstruction: buildSystemInstruction({ level, mode }),
              temperature: 0.7,
              maxOutputTokens: 1024,
              abortSignal: controller.signal,
            },
          });

          let receivedAny = false;
          for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
              receivedAny = true;
              onChunk(text);
            }
          }

          if (!receivedAny) {
            throw new HttpError(502, 'AI_EMPTY', 'The AI returned an empty answer. Try rephrasing.');
          }

          return { model };
        } catch (err) {
          lastError = err;
          const mapped = mapGeminiError(err);
          if (signal?.aborted || err?.name === 'AbortError') {
            throw mapped;
          }
          const canFallback = ['AI_MODEL_NOT_FOUND', 'AI_QUOTA', 'AI_UPSTREAM'].includes(mapped.code);
          if (canFallback && i < modelsToTry.length - 1) {
            console.warn(`[gemini stream] Model ${model} failed with ${mapped.code}. Retrying with ${modelsToTry[i + 1]}...`);
            continue;
          }
          if (err instanceof HttpError) throw err;
          throw mapped;
        } finally {
          clearTimeout(timer);
          if (signal) signal.removeEventListener('abort', onAbort);
        }
      }

      throw mapGeminiError(lastError);
    },
  };
}
