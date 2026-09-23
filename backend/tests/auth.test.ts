import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../src/types/context.js';
import { app } from '../src/index.js';
import { authMiddleware } from '../src/middlewares/auth.middleware.js';
import { requireRoles } from '../src/middlewares/rbac.middleware.js';
import { generateTestToken, loginAndGetToken } from './helpers.js';

describe('Fase 2.1: Authentication & RBAC Middleware Test Suite', () => {
  describe('POST /api/auth/login (US-AUTH-01, US-AUTH-02, TEST-RBAC-18)', () => {
    it('should successfully log in as an Operator with valid credentials', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'operator1',
          password: 'Password123!',
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data).toHaveProperty('token');
      expect(data.user).toMatchObject({
        username: 'operator1',
        role: 'Operator',
      });
    });

    it('should successfully log in as a Supervisor with valid credentials', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'supervisor1',
          password: 'Password123!',
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.user.role).toBe('Supervisor');
    });

    it('should successfully log in as an Admin with valid credentials', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin1',
          password: 'Password123!',
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.user.role).toBe('Admin');
    });

    it('should successfully log in using email address instead of username', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'operator1@hirose.co.id',
          password: 'Password123!',
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.user.username).toBe('operator1');
    });

    it('should reject login with wrong password (401 Unauthorized)', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'operator1',
          password: 'WrongPassword!',
        }),
      });

      expect(res.status).toBe(401);
      const data = (await res.json()) as any;
      expect(data.error).toBe('Invalid credentials');
    });

    it('should reject login for non-existent user (401 Unauthorized)', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'nonexistent_user',
          password: 'Password123!',
        }),
      });

      expect(res.status).toBe(401);
      const data = (await res.json()) as any;
      expect(data.error).toBe('Invalid credentials');
    });

    it('should reject login for deactivated user (US-AUTH-02 / TEST-RBAC-18: 403 Forbidden)', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'inactive_user',
          password: 'Password123!',
        }),
      });

      expect(res.status).toBe(403);
      const data = (await res.json()) as any;
      expect(data.error).toBe('Account is deactivated');
    });

    it('should reject malformed body with Zod validation (400 Bad Request)', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: '',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me (FR-AUTH-06)', () => {
    it('should return current user profile when valid token is provided', async () => {
      const { token } = await loginAndGetToken('operator1');

      const res = await app.request('/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.user).toMatchObject({
        username: 'operator1',
        email: 'operator1@hirose.co.id',
        role: 'Operator',
        is_active: true,
      });
    });

    it('should reject request when Authorization header is missing (401)', async () => {
      const res = await app.request('/api/auth/me', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const data = (await res.json()) as any;
      expect(data.error).toContain('Missing or malformed token');
    });

    it('should reject request when token signature is invalid (401)', async () => {
      const res = await app.request('/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid.token.signature',
        },
      });

      expect(res.status).toBe(401);
      const data = (await res.json()) as any;
      expect(data.error).toContain('Invalid or expired token');
    });
  });

  describe('POST /api/auth/logout (US-AUTH-03)', () => {
    it('should return 200 OK on logout', async () => {
      const res = await app.request('/api/auth/logout', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.message).toBe('Logged out successfully');
    });
  });

  describe('RBAC Middleware Guard Enforcement', () => {
    const rbacTestApp = new OpenAPIHono<AppEnv>();
    rbacTestApp.get(
      '/test/admin-only',
      authMiddleware,
      requireRoles(['Admin']),
      (c) => c.json({ message: 'Welcome Admin' })
    );

    it('should forbid Operator from accessing Admin-only endpoint (403 Forbidden)', async () => {
      const { token } = await loginAndGetToken('operator1');

      const res = await rbacTestApp.request('/test/admin-only', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(403);
      const data = (await res.json()) as any;
      expect(data.error).toContain('Insufficient role permissions');
    });

    it('should allow Admin to access Admin-only endpoint (200 OK)', async () => {
      const { token } = await loginAndGetToken('admin1');

      const res = await rbacTestApp.request('/test/admin-only', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.message).toBe('Welcome Admin');
    });
  });

  describe('Structured JSON Logging (US-SYS-02 / Bonus #4)', () => {
    it('should output structured JSON log for HTTP requests', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await app.request('/', { method: 'GET' });

      expect(logSpy).toHaveBeenCalled();
      const lastCallArg = logSpy.mock.calls[logSpy.mock.calls.length - 1][0];
      const parsedLog = JSON.parse(lastCallArg);

      expect(parsedLog).toHaveProperty('timestamp');
      expect(parsedLog).toHaveProperty('level');
      expect(parsedLog).toHaveProperty('method', 'GET');
      expect(parsedLog).toHaveProperty('path', '/');
      expect(parsedLog).toHaveProperty('status', 200);
      expect(parsedLog).toHaveProperty('latency');

      logSpy.mockRestore();
    });
  });
});
