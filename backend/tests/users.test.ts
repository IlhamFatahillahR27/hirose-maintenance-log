import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../src/index.js';
import { loginAndGetToken } from './helpers.js';

describe('Fase 2.4: User Management API & RBAC Test Suite', () => {
  let operatorToken: string;
  let supervisorToken: string;
  let adminToken: string;
  let adminUser: any;

  let createdUserId: number;

  beforeAll(async () => {
    const opLogin = await loginAndGetToken('operator1', 'Password123!');
    expect(opLogin.status).toBe(200);
    operatorToken = opLogin.token;

    const spLogin = await loginAndGetToken('supervisor1', 'Password123!');
    expect(spLogin.status).toBe(200);
    supervisorToken = spLogin.token;

    const admLogin = await loginAndGetToken('admin1', 'Password123!');
    expect(admLogin.status).toBe(200);
    adminToken = admLogin.token;
    adminUser = admLogin.user;
  });

  // ==========================================
  // TEST-RBAC-15: Admin Access Users List
  // ==========================================
  describe('GET /api/users (FR-USR-01, US-USR-01, TEST-RBAC-15)', () => {
    it('TEST-RBAC-15: Admin accesses user list -> 200 OK without exposing password hashes', async () => {
      const res = await app.request('/api/users', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBeGreaterThanOrEqual(3);

      for (const u of body.data) {
        expect(u).toHaveProperty('id');
        expect(u).toHaveProperty('username');
        expect(u).toHaveProperty('email');
        expect(u).toHaveProperty('role');
        expect(u).toHaveProperty('is_active');
        expect(u).toHaveProperty('created_at');
        // NFR-SEC-01 & US-USR-01: Zero password leak
        expect(u).not.toHaveProperty('password');
        expect(u).not.toHaveProperty('password_hash');
      }

      expect(body).toHaveProperty('pagination');
      expect(body.pagination.total_records).toBeGreaterThanOrEqual(3);
    });

    it('should support pagination on GET /api/users with page and limit parameters', async () => {
      const res = await app.request('/api/users?page=1&limit=2', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data.length).toBeLessThanOrEqual(2);
      expect(body.pagination).toMatchObject({
        current_page: 1,
        limit: 2,
      });
      expect(body.pagination.total_records).toBeGreaterThanOrEqual(3);
      expect(body.pagination.total_pages).toBe(
        Math.ceil(body.pagination.total_records / 2)
      );
    });

    it('should support server-side search by username on GET /api/users', async () => {
      const res = await app.request('/api/users?search=supervisor', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data.length).toBeGreaterThan(0);
      for (const u of body.data) {
        expect(
          u.username.toLowerCase().includes('supervisor') ||
            u.email.toLowerCase().includes('supervisor')
        ).toBe(true);
      }
    });

    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await app.request('/api/users', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // TEST-RBAC-16: Operator / Supervisor Access Users List
  // ==========================================
  describe('RBAC Guard: Operator & Supervisor Access (TEST-RBAC-16)', () => {
    it('TEST-RBAC-16: Operator access to users list -> 403 Forbidden', async () => {
      const res = await app.request('/api/users', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${operatorToken}`,
        },
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as any;
      expect(body.error).toContain('Insufficient role permissions');
    });

    it('TEST-RBAC-16: Supervisor access to users list -> 403 Forbidden', async () => {
      const res = await app.request('/api/users', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${supervisorToken}`,
        },
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as any;
      expect(body.error).toContain('Insufficient role permissions');
    });
  });

  // ==========================================
  // POST /api/users: Create User (US-USR-02)
  // ==========================================
  describe('POST /api/users (FR-USR-02, US-USR-02)', () => {
    const newUsername = `test_operator_${Date.now()}`;
    const newEmail = `${newUsername}@hirose.co.id`;
    const newPassword = 'Password123!';

    it('should allow Admin to create a new user (201 Created)', async () => {
      const res = await app.request('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          password: newPassword,
          role: 'Operator',
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.data).toBeDefined();
      expect(body.data.username).toBe(newUsername);
      expect(body.data.email).toBe(newEmail);
      expect(body.data.role).toBe('Operator');
      expect(body.data.is_active).toBe(true);
      expect(body.data).not.toHaveProperty('password');
      expect(body.data).not.toHaveProperty('password_hash');

      createdUserId = body.data.id;
    });

    it('should allow the newly created user to log in immediately', async () => {
      const loginRes = await loginAndGetToken(newUsername, newPassword);
      expect(loginRes.status).toBe(200);
      expect(loginRes.user.username).toBe(newUsername);
      expect(loginRes.user.role).toBe('Operator');
    });

    it('should reject creating user with duplicate username (409 Conflict)', async () => {
      const res = await app.request('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          username: newUsername,
          email: `different_email_${Date.now()}@hirose.co.id`,
          password: newPassword,
          role: 'Operator',
        }),
      });

      expect(res.status).toBe(409);
      const body = (await res.json()) as any;
      expect(body.error).toContain('Username is already taken');
    });

    it('should reject creating user with duplicate email (409 Conflict)', async () => {
      const res = await app.request('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          username: `different_user_${Date.now()}`,
          email: newEmail,
          password: newPassword,
          role: 'Operator',
        }),
      });

      expect(res.status).toBe(409);
      const body = (await res.json()) as any;
      expect(body.error).toContain('Email is already registered');
    });

    it('should reject user creation by Operator (403 Forbidden)', async () => {
      const res = await app.request('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({
          username: `unauthorized_op_${Date.now()}`,
          email: `unauthorized_op_${Date.now()}@hirose.co.id`,
          password: newPassword,
          role: 'Operator',
        }),
      });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // PATCH /api/users/:id/status: Deactivate / Activate (US-USR-03, TEST-RBAC-17)
  // ==========================================
  describe('PATCH /api/users/:id/status (FR-USR-04, US-USR-03, TEST-RBAC-17)', () => {
    it('TEST-RBAC-17: Admin deactivates user (is_active: false) -> 200 OK', async () => {
      const res = await app.request(`/api/users/${createdUserId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          is_active: false,
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data.id).toBe(createdUserId);
      expect(body.data.is_active).toBe(false);
    });

    it('deactivated user is immediately rejected from logging in (US-AUTH-02 / TEST-RBAC-18: 403 Forbidden)', async () => {
      // Find username of createdUserId
      const usersRes = await app.request('/api/users', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const usersData = (await usersRes.json()) as any;
      const targetUser = usersData.data.find((u: any) => u.id === createdUserId);

      const loginRes = await loginAndGetToken(targetUser.username, 'Password123!');
      expect(loginRes.status).toBe(403);
    });

    it('should allow Admin to reactivate user (is_active: true) -> 200 OK', async () => {
      const res = await app.request(`/api/users/${createdUserId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          is_active: true,
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data.is_active).toBe(true);
    });

    it('defensive guard: Admin cannot deactivate their own account (400 Bad Request)', async () => {
      const res = await app.request(`/api/users/${adminUser.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          is_active: false,
        }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as any;
      expect(body.error).toContain('Cannot deactivate your own admin account');
    });

    it('should reject status update by Operator (403 Forbidden)', async () => {
      const res = await app.request(`/api/users/${createdUserId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({
          is_active: false,
        }),
      });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent user ID', async () => {
      const res = await app.request('/api/users/999999/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          is_active: false,
        }),
      });

      expect(res.status).toBe(404);
      const body = (await res.json()) as any;
      expect(body.error).toBe('User not found');
    });
  });

  // ==========================================
  // PUT /api/users/:id (FR-USR-03, BRD 3.2: Update User)
  // ==========================================
  describe('PUT /api/users/:id (FR-USR-03, BRD 3.2)', () => {
    it('should allow Admin to update user email and role -> 200 OK', async () => {
      const res = await app.request(`/api/users/${createdUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          email: 'updated_user@hirose.co.id',
          role: 'Supervisor',
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data.email).toBe('updated_user@hirose.co.id');
      expect(body.data.role).toBe('Supervisor');
    });

    it('should reject user update by Operator -> 403 Forbidden', async () => {
      const res = await app.request(`/api/users/${createdUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({
          role: 'Admin',
        }),
      });

      expect(res.status).toBe(403);
    });

    it('should return 404 when updating non-existent user', async () => {
      const res = await app.request('/api/users/999999', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          role: 'Operator',
        }),
      });

      expect(res.status).toBe(404);
    });
  });
});

