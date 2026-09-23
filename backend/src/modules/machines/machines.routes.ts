import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import type { AppEnv } from '../../types/context.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import {
  MachinesListResponseSchema,
  ErrorResponseSchema,
} from './machines.schema.js';
import { getActiveMachines } from './machines.service.js';

export const machinesRoutes = new OpenAPIHono<AppEnv>();

export const getMachinesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Machines'],
  summary: 'Get active machines list (FR-MCH-01, US-MCH-01)',
  description:
    'Returns a list of active precision machines for dropdown options in maintenance requests and search filters. Accessible by any authenticated role.',
  middleware: [authMiddleware] as const,
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: MachinesListResponseSchema,
        },
      },
      description: 'Active machines retrieved successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized - Missing or invalid JWT token',
    },
  },
});

machinesRoutes.openapi(getMachinesRoute, async (c) => {
  const data = await getActiveMachines();
  return c.json({ data }, 200);
});
