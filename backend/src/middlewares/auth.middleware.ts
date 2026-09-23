import { createMiddleware } from 'hono/factory';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { env } from '../config/env.js';
import type { AppEnv, AuthUser } from '../types/context.js';

interface JwtTokenPayload {
  sub?: string | number;
  userId?: number;
  username?: string;
  role?: string;
}

/**
 * Authentication Middleware
 * Extracts and verifies JWT bearer token, validates active user status against database,
 * and attaches authenticated user information to Hono context.
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { error: 'Unauthorized: Missing or malformed token' },
      401
    );
  }

  const token = authHeader.substring(7).trim();

  let payload: JwtTokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtTokenPayload;
  } catch {
    return c.json(
      { error: 'Unauthorized: Invalid or expired token' },
      401
    );
  }

  const userId = Number(payload.userId ?? payload.sub);
  if (!userId || isNaN(userId)) {
    return c.json(
      { error: 'Unauthorized: Invalid token payload' },
      401
    );
  }

  // Verify against database to enforce real-time account status (active/deactivated)
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      role: true,
    },
  });

  if (!user) {
    return c.json(
      { error: 'Unauthorized: User not found' },
      401
    );
  }

  // US-AUTH-02: Deactivated users are forbidden from accessing protected endpoints
  if (!user.is_active) {
    return c.json(
      { error: 'Forbidden: Account is deactivated' },
      403
    );
  }

  const authUser: AuthUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    role_id: user.role_id,
    role: user.role.name,
    is_active: user.is_active,
  };

  c.set('user', authUser);

  await next();
});
