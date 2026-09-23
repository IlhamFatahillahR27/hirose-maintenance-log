import { serve } from '@hono/node-server';
import { OpenAPIHono } from '@hono/zod-openapi';
import { env } from './config/env.js';
import type { AppEnv } from './types/context.js';
import { loggerMiddleware } from './middlewares/logger.middleware.js';
import { authRoutes } from './modules/auth/auth.routes.js';

export const app = new OpenAPIHono<AppEnv>({
  defaultHook: (result, c) => {
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const errorMessage = firstIssue
        ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
        : 'Validation failed';

      return c.json(
        {
          error: errorMessage,
          issues: result.error.issues,
        },
        400
      );
    }
  },
});

// 1. Global Structured Logging (US-SYS-02 / Bonus #4)
app.use('*', loggerMiddleware);

// 2. Health & Root Endpoints
app.get('/', (c) => {
  return c.json({
    message: 'Hirose Maintenance Log API Server',
    version: '1.0.0',
    status: 'online',
  });
});

// 3. API Module Routes
app.route('/api/auth', authRoutes);

// 4. Global Error Handlers
app.notFound((c) => {
  return c.json({ error: `Not Found: ${c.req.method} ${c.req.path}` }, 404);
});

app.onError((err, c) => {
  console.error('Unhandled Server Error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

// 5. Start HTTP Server (when not running inside test environment)
if (process.env.NODE_ENV !== 'test') {
  serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    (info) => {
      console.log(`🚀 Hirose Maintenance Log API is running on http://localhost:${info.port}`);
    }
  );
}

export default app;
