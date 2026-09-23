import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types/context.js';

/**
 * Role-Based Access Control (RBAC) Middleware Factory
 * Restricts route access to users with specified role(s).
 *
 * @param allowedRoles Array of permissible role names, e.g. ['Admin'], ['Supervisor', 'Admin']
 */
export function requireRoles(allowedRoles: string[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json(
        { error: 'Unauthorized: Authentication required' },
        401
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        { error: 'Forbidden: Insufficient role permissions' },
        403
      );
    }

    await next();
  });
}
