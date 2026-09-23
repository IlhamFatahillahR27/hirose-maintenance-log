import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import type { AppEnv } from '../../types/context.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import {
  LoginRequestSchema,
  LoginResponseSchema,
  UserProfileResponseSchema,
  LogoutResponseSchema,
  ErrorResponseSchema,
} from './auth.schema.js';
import { loginUser } from './auth.service.js';

export const authRoutes = new OpenAPIHono<AppEnv>();

export const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Authentication'],
  summary: 'User login (US-AUTH-01, US-AUTH-02)',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LoginResponseSchema,
        },
      },
      description: 'Login successful',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Bad Request - Validation error',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - Invalid credentials',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Forbidden - Account deactivated',
    },
  },
});

authRoutes.openapi(loginRoute, async (c) => {
  const body = c.req.valid('json');
  const result = await loginUser(body.username, body.password);

  if (!result.success) {
    return c.json({ error: result.error }, result.status);
  }

  return c.json(
    {
      message: 'Login successful',
      token: result.token,
      user: result.user,
    },
    200
  );
});

export const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  tags: ['Authentication'],
  summary: 'User logout (US-AUTH-03)',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LogoutResponseSchema,
        },
      },
      description: 'Session invalidated',
    },
  },
});

authRoutes.openapi(logoutRoute, (c) => {
  return c.json({ message: 'Logged out successfully' }, 200);
});

export const meRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Authentication'],
  summary: 'Get current user profile (FR-AUTH-06)',
  middleware: [authMiddleware] as const,
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UserProfileResponseSchema,
        },
      },
      description: 'Authenticated user profile',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - Missing or invalid token',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Forbidden - Inactive account',
    },
  },
});

authRoutes.openapi(meRoute, (c) => {
  const user = c.get('user');
  return c.json(
    {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
    },
    200
  );
});
