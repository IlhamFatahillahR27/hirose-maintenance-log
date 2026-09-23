import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { app } from '../src/index.js';

export interface TokenPayload {
  userId: number;
  username: string;
  role: string;
}

/**
 * Generates a signed JWT token directly for testing purposes
 */
export function generateTestToken(payload: TokenPayload, expiresIn = '1h'): string {
  return jwt.sign(
    {
      sub: payload.userId,
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
    },
    env.JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Performs a login request against the app and returns the JWT access token
 */
export async function loginAndGetToken(
  username: string,
  password = 'Password123!'
): Promise<{ token: string; user: any; status: number }> {
  const res = await app.request('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  const status = res.status;
  const data = (await res.json()) as any;

  return {
    token: data.token,
    user: data.user,
    status,
  };
}
