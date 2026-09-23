import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { AppEnv } from '../../types/context.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireRoles } from '../../middlewares/rbac.middleware.js';
import {
  CreateRequestSchema,
  UpdateRequestSchema,
  ReviewRequestSchema,
  RequestQuerySchema,
  RequestsListResponseSchema,
  SingleRequestResponseSchema,
  DeleteResponseSchema,
  ErrorResponseSchema,
} from './requests.schema.js';
import {
  createRequest,
  listRequests,
  getRequestById,
  updateRequest,
  reviewRequest,
  deleteRequest,
  HttpError,
} from './requests.service.js';

export const requestsRoutes = new OpenAPIHono<AppEnv>();

const RequestIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive('Request ID must be a positive integer')
    .openapi({
      param: {
        name: 'id',
        in: 'path',
      },
      example: 1,
      description: 'Maintenance request identifier',
    }),
});

// ==========================================
// 1. POST /api/requests (Create Request)
// ==========================================
export const createRequestRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Requests'],
  summary: 'Create a new maintenance request (US-REQ-01, TEST-RBAC-01)',
  description:
    'Creates a new maintenance request. Initial status is automatically locked to "Submitted" and created_by is assigned to the authenticated user.',
  middleware: [authMiddleware] as const,
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: SingleRequestResponseSchema,
        },
      },
      description: 'Request created successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Bad request - validation error or invalid machine',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - missing or invalid token',
    },
  },
});

requestsRoutes.openapi(createRequestRoute, async (c) => {
  const currentUser = c.get('user');
  const body = c.req.valid('json');

  try {
    const data = await createRequest(currentUser, body);
    return c.json({ data }, 201);
  } catch (err: any) {
    if (err instanceof HttpError) {
      return c.json({ error: err.message }, err.status as any);
    }
    throw err;
  }
});

// ==========================================
// 2. GET /api/requests (List with Pagination & Search)
// ==========================================
export const getRequestsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Requests'],
  summary: 'List maintenance requests (US-REQ-02, US-REQ-05, US-SYS-01)',
  description:
    'Returns a paginated list of maintenance requests. Operator role is automatically restricted to viewing only their own requests. Supports multi-column ILIKE search and status/priority filters.',
  middleware: [authMiddleware] as const,
  security: [{ BearerAuth: [] }],
  request: {
    query: RequestQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: RequestsListResponseSchema,
        },
      },
      description: 'Paginated list of maintenance requests retrieved successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
  },
});

requestsRoutes.openapi(getRequestsRoute, async (c) => {
  const currentUser = c.get('user');
  const query = c.req.valid('query');

  try {
    const result = await listRequests(currentUser, query);
    return c.json(result, 200);
  } catch (err: any) {
    if (err instanceof HttpError) {
      return c.json({ error: err.message }, err.status as any);
    }
    throw err;
  }
});

// ==========================================
// 3. GET /api/requests/:id (Get Single Request)
// ==========================================
export const getRequestByIdRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Requests'],
  summary: 'Get maintenance request details by ID (US-REQ-04, TEST-RBAC-03)',
  description:
    'Retrieves detailed information for a single request. If an Operator tries to view a request created by another user, 403 Forbidden is returned.',
  middleware: [authMiddleware] as const,
  security: [{ BearerAuth: [] }],
  request: {
    params: RequestIdParamSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SingleRequestResponseSchema,
        },
      },
      description: 'Maintenance request details retrieved successfully',
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
      description: 'Forbidden - Operator cannot view other users requests',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Not found',
    },
  },
});

requestsRoutes.openapi(getRequestByIdRoute, async (c) => {
  const currentUser = c.get('user');
  const { id } = c.req.valid('param');

  try {
    const data = await getRequestById(currentUser, id);
    if (!data) {
      return c.json({ error: 'Maintenance request not found' }, 404);
    }
    return c.json({ data }, 200);
  } catch (err: any) {
    if (err instanceof HttpError) {
      return c.json({ error: err.message }, err.status as any);
    }
    throw err;
  }
});

// ==========================================
// 4. PUT /api/requests/:id (Update Request)
// ==========================================
export const updateRequestRoute = createRoute({
  method: 'put',
  path: '/{id}',
  tags: ['Requests'],
  summary: 'Update maintenance request (US-REQ-03, US-REQ-04, US-REQ-08, US-REQ-09)',
  description:
    'Updates request details. Operators can only update their own request while still Submitted. Supervisors cannot edit requests made by others. Admins can update any request at any status.',
  middleware: [authMiddleware] as const,
  security: [{ BearerAuth: [] }],
  request: {
    params: RequestIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SingleRequestResponseSchema,
        },
      },
      description: 'Maintenance request updated successfully',
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
      description: 'Forbidden - RBAC or status transition violation',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Not found',
    },
  },
});

requestsRoutes.openapi(updateRequestRoute, async (c) => {
  const currentUser = c.get('user');
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  try {
    const data = await updateRequest(currentUser, id, body);
    if (!data) {
      return c.json({ error: 'Maintenance request not found' }, 404);
    }
    return c.json({ data }, 200);
  } catch (err: any) {
    if (err instanceof HttpError) {
      return c.json({ error: err.message }, err.status as any);
    }
    throw err;
  }
});

// ==========================================
// 5. PATCH /api/requests/:id/review (Approve / Reject)
// ==========================================
export const reviewRequestRoute = createRoute({
  method: 'patch',
  path: '/{id}/review',
  tags: ['Requests'],
  summary: 'Review maintenance request - Approve or Reject (US-REQ-06, US-REQ-07, US-REQ-08)',
  description:
    'Approves or rejects a maintenance request with optional reviewer notes. Restricted strictly to Supervisor and Admin roles.',
  middleware: [authMiddleware, requireRoles(['Supervisor', 'Admin'])] as const,
  security: [{ BearerAuth: [] }],
  request: {
    params: RequestIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: ReviewRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SingleRequestResponseSchema,
        },
      },
      description: 'Maintenance request reviewed successfully',
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
      description: 'Forbidden - Operator cannot review requests',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Not found',
    },
  },
});

requestsRoutes.openapi(reviewRequestRoute, async (c) => {
  const currentUser = c.get('user');
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  try {
    const data = await reviewRequest(currentUser, id, body);
    if (!data) {
      return c.json({ error: 'Maintenance request not found' }, 404);
    }
    return c.json({ data }, 200);
  } catch (err: any) {
    if (err instanceof HttpError) {
      return c.json({ error: err.message }, err.status as any);
    }
    throw err;
  }
});

// ==========================================
// 6. DELETE /api/requests/:id (Delete Request)
// ==========================================
export const deleteRequestRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Requests'],
  summary: 'Delete maintenance request (US-REQ-10, TEST-RBAC-14)',
  description:
    'Permanently deletes a maintenance request. Restricted strictly to Admin role.',
  middleware: [authMiddleware, requireRoles(['Admin'])] as const,
  security: [{ BearerAuth: [] }],
  request: {
    params: RequestIdParamSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: DeleteResponseSchema,
        },
      },
      description: 'Maintenance request deleted successfully',
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
      description: 'Forbidden - Only Admin can delete requests',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Not found',
    },
  },
});

requestsRoutes.openapi(deleteRequestRoute, async (c) => {
  const currentUser = c.get('user');
  const { id } = c.req.valid('param');

  try {
    const result = await deleteRequest(currentUser, id);
    if (!result) {
      return c.json({ error: 'Maintenance request not found' }, 404);
    }
    return c.json(
      {
        message: 'Maintenance request deleted successfully',
        id: result.id,
      },
      200
    );
  } catch (err: any) {
    if (err instanceof HttpError) {
      return c.json({ error: err.message }, err.status as any);
    }
    throw err;
  }
});
