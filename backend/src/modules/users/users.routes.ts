import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { AppEnv } from '../../types/context.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireRoles } from '../../middlewares/rbac.middleware.js';
import {
  CreateUserRequestSchema,
  UpdateUserStatusRequestSchema,
  UsersListResponseSchema,
  SingleUserResponseSchema,
  ErrorResponseSchema,
} from './users.schema.js';
import {
  getAllUsers,
  createUser,
  updateUserStatus,
  HttpError,
} from './users.service.js';

export const usersRoutes = new OpenAPIHono<AppEnv>();

const UserIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive('User ID must be a positive integer')
    .openapi({
      param: {
        name: 'id',
        in: 'path',
      },
      example: 1,
      description: 'Target user identifier',
    }),
});

// ==========================================
// 1. GET /api/users (List All Users - Admin Only)
// ==========================================
export const getUsersRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Users'],
  summary: 'Get all users list (FR-USR-01, US-USR-01, TEST-RBAC-15)',
  description:
    'Returns a list of all registered users without password hashes. Restricted strictly to Admin role.',
  middleware: [authMiddleware, requireRoles(['Admin'])] as const,
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UsersListResponseSchema,
        },
      },
      description: 'List of users retrieved successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Forbidden - Only Admin can access user management',
    },
  },
});

usersRoutes.openapi(getUsersRoute, async (c) => {
  try {
    const data = await getAllUsers();
    return c.json({ data }, 200);
  } catch (err: any) {
    if (err instanceof HttpError) {
      return c.json({ error: err.message }, err.status as any);
    }
    throw err;
  }
});

// ==========================================
// 2. POST /api/users (Create User - Admin Only)
// ==========================================
export const createUserRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Users'],
  summary: 'Create a new user (FR-USR-02, US-USR-02)',
  description:
    'Creates a new factory user with hashed password and active status. Restricted strictly to Admin role.',
  middleware: [authMiddleware, requireRoles(['Admin'])] as const,
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateUserRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: SingleUserResponseSchema,
        },
      },
      description: 'User created successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Bad request - validation error',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Forbidden - Only Admin can create users',
    },
    409: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Conflict - Username or email already registered',
    },
  },
});

usersRoutes.openapi(createUserRoute, async (c) => {
  const body = c.req.valid('json');

  try {
    const data = await createUser(body);
    return c.json({ data }, 201);
  } catch (err: any) {
    if (err instanceof HttpError) {
      return c.json({ error: err.message }, err.status as any);
    }
    throw err;
  }
});

// ==========================================
// 3. PATCH /api/users/:id/status (Toggle User Active Status)
// ==========================================
export const updateUserStatusRoute = createRoute({
  method: 'patch',
  path: '/{id}/status',
  tags: ['Users'],
  summary: 'Activate or deactivate user (FR-USR-04, US-USR-03, TEST-RBAC-17)',
  description:
    'Toggles the active status of a user (soft-deactivation). Deactivated users are immediately prevented from logging in. Admin cannot deactivate their own account. Restricted strictly to Admin role.',
  middleware: [authMiddleware, requireRoles(['Admin'])] as const,
  security: [{ BearerAuth: [] }],
  request: {
    params: UserIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateUserStatusRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SingleUserResponseSchema,
        },
      },
      description: 'User status updated successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Bad request - e.g. attempted self-deactivation',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Forbidden - Only Admin can toggle user status',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User not found',
    },
  },
});

usersRoutes.openapi(updateUserStatusRoute, async (c) => {
  const currentUser = c.get('user');
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  try {
    const data = await updateUserStatus(currentUser.id, id, body);
    return c.json({ data }, 200);
  } catch (err: any) {
    if (err instanceof HttpError) {
      return c.json({ error: err.message }, err.status as any);
    }
    throw err;
  }
});
