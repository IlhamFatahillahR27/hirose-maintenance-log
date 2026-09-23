import jwt from 'jsonwebtoken';
import { eq, or } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { env } from '../../config/env.js';
import { comparePassword } from '../../utils/password.js';

export interface LoginResultSuccess {
  success: true;
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

export interface LoginResultError {
  success: false;
  status: 400 | 401 | 403;
  error: string;
}

export type LoginResult = LoginResultSuccess | LoginResultError;

/**
 * Authenticates user credentials, validates account active status,
 * and issues a signed JWT token upon success.
 */
export async function loginUser(
  identifier: string,
  plainTextPassword: string
): Promise<LoginResult> {
  const trimmedIdentifier = identifier.trim();

  // Find user by username or email
  const user = await db.query.users.findFirst({
    where: or(
      eq(users.username, trimmedIdentifier),
      eq(users.email, trimmedIdentifier)
    ),
    with: {
      role: true,
    },
  });

  // US-AUTH-01: Generic error message to prevent username enumeration
  if (!user) {
    return {
      success: false,
      status: 401,
      error: 'Invalid credentials',
    };
  }

  // Verify password hash
  const isValidPassword = await comparePassword(
    plainTextPassword,
    user.password_hash
  );

  if (!isValidPassword) {
    return {
      success: false,
      status: 401,
      error: 'Invalid credentials',
    };
  }

  // US-AUTH-02 / TEST-RBAC-18: Reject deactivated accounts
  if (!user.is_active) {
    return {
      success: false,
      status: 403,
      error: 'Account is deactivated',
    };
  }

  // Issue 8-hour JWT token
  const token = jwt.sign(
    {
      sub: user.id,
      userId: user.id,
      username: user.username,
      role: user.role.name,
    },
    env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return {
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role.name,
    },
  };
}
