// All AI calls go through our own backend.
export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const UNREACHABLE = 'Cannot reach the backend. Make sure the app was started with start.bat (or "npm start") and that the terminal window is still open.';

async function request(path, options = {}, timeoutMs = 35000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      ...options,
      signal: options.signal || controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    let data = null;
    try { data = await res.json(); } catch { /* non-JSON response */ }
    if (!res.ok) {
      if (!data?.error && res.status >= 500) throw new ApiError('BACKEND_UNREACHABLE', UNREACHABLE);
      throw new ApiError(data?.error?.code ?? `HTTP_${res.status}`, data?.error?.message ?? `The server answered with an error (${res.status}).`);
    }
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err?.name === 'AbortError') throw new ApiError('CLIENT_TIMEOUT', 'The request took too long or was cancelled.');
    throw new ApiError('BACKEND_UNREACHABLE', UNREACHABLE);
  } finally {
    clearTimeout(timer);
  }
}

export const getHealth = () => request('/api/health', {}, 6000);
export const sendChat = (payload) => request('/api/chat', { method: 'POST', body: JSON.stringify(payload) });
export const saveApiKey = (apiKey, model) => request('/api/config/key', { method: 'POST', body: JSON.stringify({ apiKey, model }) });
export const getModels = () => request('/api/config/models');
export const setModel = (model) => request('/api/config/model', { method: 'POST', body: JSON.stringify({ model }) });

/**
 * Streams chat responses using Server-Sent Events (SSE).
 * Eliminates time lags by streaming tokens in real time (< 400ms first token).
 */
export async function streamChat({ message, level, mode, action, history, apiKey, onChunk, signal }) {
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    attempt++;
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-api-key'] = apiKey;

    let res;
    try {
      res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message, level, mode, action, history }),
        signal,
      });
    } catch {
      if (signal?.aborted) throw new ApiError('ABORTED', 'Generation stopped.');
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      throw new ApiError('NETWORK_ERROR', UNREACHABLE);
    }

    if (!res.ok) {
      let errData = null;
      try { errData = await res.json(); } catch { /* ignore */ }
      const code = errData?.error?.code ?? `HTTP_${res.status}`;
      const msg = errData?.error?.message ?? 'The server responded with an error.';
      throw new ApiError(code, msg);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      // Fallback if reader not supported
      const data = await res.json();
      return data;
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulatedText = '';
    let completedPayload = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.error) {
              throw new ApiError(parsed.error.code, parsed.error.message);
            }
            if (parsed.chunk) {
              accumulatedText += parsed.chunk;
              onChunk?.(accumulatedText, parsed.chunk);
            }
            if (parsed.done) {
              completedPayload = parsed;
            }
          } catch (e) {
            if (e instanceof ApiError) throw e;
          }
        }
      }

      return {
        reply: accumulatedText || completedPayload?.reply || '',
        model: completedPayload?.model,
      };
    } catch (err) {
      if (signal?.aborted) throw new ApiError('ABORTED', 'Generation stopped.');
      if (err instanceof ApiError) throw err;
      throw new ApiError('STREAM_ERROR', 'Connection interrupted while streaming.');
    }
  }
}
