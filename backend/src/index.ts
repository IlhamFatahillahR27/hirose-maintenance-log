import { serve } from '@hono/node-server';
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { sql } from 'drizzle-orm';
import { db } from './db/index.js';
import { env } from './config/env.js';
import type { AppEnv } from './types/context.js';
import { loggerMiddleware } from './middlewares/logger.middleware.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { machinesRoutes } from './modules/machines/machines.routes.js';
import { requestsRoutes } from './modules/requests/requests.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';

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

// 1. Global Structured Logging & CORS
app.use('*', cors());
app.use('*', loggerMiddleware);

// 2. Register Bearer Authentication Security Scheme for OpenAPI
app.openAPIRegistry.registerComponent('securitySchemes', 'BearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Enter your signed JWT access token (obtained from POST /api/auth/login)',
});

// 3. Health Check & Root Endpoints (FR-OPS-01, US-SYS-02 / Bonus #4)
export const HealthResponseSchema = z
  .object({
    status: z.enum(['healthy', 'unhealthy']).openapi({ example: 'healthy' }),
    timestamp: z.string().openapi({ example: '2026-09-23T10:00:00.000Z' }),
    services: z.object({
      database: z.string().openapi({ example: 'connected' }),
    }),
    error: z.string().optional().openapi({ example: 'Connection timeout' }),
  })
  .openapi('HealthResponse');

export const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['System'],
  summary: 'System health check & database ping (FR-OPS-01, US-SYS-02)',
  description:
    'Checks the readiness of the application server and executes a ping query (SELECT 1) against the PostgreSQL database.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: HealthResponseSchema,
        },
      },
      description: 'System is healthy and database is connected',
    },
    503: {
      content: {
        'application/json': {
          schema: HealthResponseSchema,
        },
      },
      description: 'System is unhealthy or database is disconnected',
    },
  },
});

app.openapi(healthRoute, async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json(
      {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
        },
      },
      200
    );
  } catch (err: any) {
    return c.json(
      {
        status: 'unhealthy' as const,
        timestamp: new Date().toISOString(),
        services: {
          database: 'disconnected',
        },
        error: err.message,
      },
      503
    );
  }
});

app.get('/', (c) => {
  return c.json({
    message: 'Hirose Maintenance Log API Server',
    version: '1.0.0',
    status: 'online',
    docs: '/docs',
  });
});

// 4. OpenAPI 3.0 Documentation & Swagger UI (FR-OPS-03, US-SYS-03 / Bonus #5)
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Hirose Maintenance Log API',
    version: '1.0.0',
    description:
      'Precision Manufacturing Factory Maintenance Request Log REST API with Strict Relational RBAC (Operator, Supervisor, Admin).',
  },
  servers: [
    {
      url: '/',
      description: 'Current host (Reverse Proxy / Nginx)',
    },
    {
      url: `http://localhost:${env.PORT}`,
      description: 'Direct backend server',
    },
  ],
});

app.get('/docs', swaggerUI({ url: '/openapi.json' }));

// 5. API Module Routes
app.route('/api/auth', authRoutes);
app.route('/api/machines', machinesRoutes);
app.route('/api/requests', requestsRoutes);
app.route('/api/users', usersRoutes);

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
