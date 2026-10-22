import { HttpError } from './validate.js';

export function notFound(_req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'That API route does not exist.' } });
}

// Central error handler: never leaks stack traces or secrets.
export function errorHandler(err, req, res, _next) {
  if (res.headersSent) return;

  let status = 500;
  let code = 'SERVER_ERROR';
  let message = 'Something went wrong on the server. Please try again.';

  if (err instanceof HttpError) {
    ({ status, code } = err);
    message = err.message;
  } else if (err?.type === 'entity.too.large') {
    status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'That request is too large.';
  } else if (err instanceof SyntaxError && 'body' in err) {
    status = 400; code = 'BAD_JSON'; message = 'The request was not valid JSON.';
  } else if (err?.message === 'CORS_BLOCKED') {
    status = 403; code = 'CORS_BLOCKED'; message = 'This origin is not allowed to call the API.';
  }

  // Log type and route only — never bodies, headers or keys.
  console.error(`[error] ${req.method} ${req.path} -> ${status} ${code}`);
  res.status(status).json({ error: { code, message } });
}

export function requestTimeout(ms) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(503).json({ error: { code: 'REQUEST_TIMEOUT', message: 'The request took too long. Please try again.' } });
      }
    }, ms);
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
  };
}

export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) console.log(`[api] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}
