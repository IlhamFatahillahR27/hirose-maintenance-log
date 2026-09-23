import { createMiddleware } from 'hono/factory';

/**
 * Structured JSON Logger Middleware (US-SYS-02 / Bonus #4)
 * Logs all HTTP requests as structured JSON objects with timestamp, level, method, path, status, and latency.
 */
export const loggerMiddleware = createMiddleware(async (c, next) => {
  const start = Date.now();
  await next();
  const latency = Date.now() - start;

  const status = c.res.status;
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    method: c.req.method,
    path: c.req.path,
    status,
    latency: `${latency}ms`,
  };

  console.log(JSON.stringify(logEntry));
});
