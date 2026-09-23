import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../src/index.js';
import { loginAndGetToken } from './helpers.js';

describe('Fase 3: Automated Testing RBAC (Vitest) - Full 18-Point Permission Matrix (Bonus #6)', () => {
  let operatorToken: string;
  let operatorUser: any;
  let supervisorToken: string;
  let supervisorUser: any;
  let adminToken: string;
  let adminUser: any;

  let createdRequestId: number;
  let approvedRequestId: number;
  let requestToDeleteId: number;

  beforeAll(async () => {
    // Authenticate test users
    const opLogin = await loginAndGetToken('operator1', 'Password123!');
    expect(opLogin.status).toBe(200);
    operatorToken = opLogin.token;
    operatorUser = opLogin.user;

    const spLogin = await loginAndGetToken('supervisor1', 'Password123!');
    expect(spLogin.status).toBe(200);
    supervisorToken = spLogin.token;
    supervisorUser = spLogin.user;

    const admLogin = await loginAndGetToken('admin1', 'Password123!');
    expect(admLogin.status).toBe(200);
    adminToken = admLogin.token;
    adminUser = admLogin.user;
  });

  // ==========================================
  // TEST-RBAC-01: Operator Create Request
  // ==========================================
  it('TEST-RBAC-01: Operator creates request -> 201 Created (default Submitted status, creator ID bound)', async () => {
    const res = await app.request('/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        machine_id: 1,
        problem_description: 'High-speed punch head misalignment during continuous cycle',
        priority: 'High',
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data).toBeDefined();
    expect(body.data.status).toBe('Submitted');
    expect(body.data.priority).toBe('High');
    expect(body.data.created_by).toBe(operatorUser.id);
    expect(body.data.reviewed_by).toBeNull();
    expect(body.data.reviewed_at).toBeNull();

    createdRequestId = body.data.id;
  });

  // ==========================================
  // TEST-RBAC-02: Operator View Requests (Own Only)
  // ==========================================
  it('TEST-RBAC-02: Operator views requests -> 200 OK (strictly filtered to own requests)', async () => {
    const res = await app.request('/api/requests?limit=50', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${operatorToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThan(0);

    // Verify every single request returned belongs to this operator
    for (const req of body.data) {
      expect(req.created_by).toBe(operatorUser.id);
    }
  });

  // ==========================================
  // TEST-RBAC-03: Operator View Other's Request
  // ==========================================
  it('TEST-RBAC-03: Operator views another user request by ID -> 403 Forbidden', async () => {
    // Admin creates a request owned by admin
    const adminReqRes = await app.request('/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        machine_id: 2,
        problem_description: 'Precision stamping oil circuit pressure fluctuation observed by admin',
        priority: 'Medium',
      }),
    });
    expect(adminReqRes.status).toBe(201);
    const adminReqData = (await adminReqRes.json()) as any;
    const adminRequestId = adminReqData.data.id;

    // Operator tries to view this admin-created request
    const opViewRes = await app.request(`/api/requests/${adminRequestId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${operatorToken}`,
      },
    });

    expect(opViewRes.status).toBe(403);
    const opViewBody = (await opViewRes.json()) as any;
    expect(opViewBody.error).toContain('Forbidden');
  });

  // ==========================================
  // TEST-RBAC-04: Operator Edit Own Request while Submitted
  // ==========================================
  it('TEST-RBAC-04: Operator edits own request while Submitted -> 200 OK', async () => {
    const updatedDesc = 'High-speed punch head misalignment: re-calibrated clearance to 0.02mm';
    const res = await app.request(`/api/requests/${createdRequestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        problem_description: updatedDesc,
        priority: 'Critical',
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.id).toBe(createdRequestId);
    expect(body.data.problem_description).toBe(updatedDesc);
    expect(body.data.priority).toBe('Critical');
  });

  // ==========================================
  // TEST-RBAC-05: Operator Edit Own Request when Already Approved
  // ==========================================
  it('TEST-RBAC-05: Operator edits own request when already Approved -> 403 Forbidden', async () => {
    // Supervisor approves createdRequestId
    const reviewRes = await app.request(`/api/requests/${createdRequestId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        status: 'Approved',
        reviewer_notes: 'Approved for urgent toolroom maintenance',
      }),
    });
    expect(reviewRes.status).toBe(200);
    approvedRequestId = createdRequestId;

    // Operator attempts to edit the now-Approved request
    const editRes = await app.request(`/api/requests/${approvedRequestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        problem_description: 'Attempting to modify already approved ticket',
      }),
    });

    expect(editRes.status).toBe(403);
    const editBody = (await editRes.json()) as any;
    expect(editBody.error).toContain('Cannot edit request that has already been reviewed');
  });

  // ==========================================
  // TEST-RBAC-06: Operator Review Request
  // ==========================================
  it('TEST-RBAC-06: Operator attempts review (approve/reject) -> 403 Forbidden', async () => {
    const res = await app.request(`/api/requests/${createdRequestId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        status: 'Approved',
        reviewer_notes: 'Unauthorized approval attempt by operator',
      }),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.error).toContain('Insufficient role permissions');
  });

  // ==========================================
  // TEST-RBAC-07: Operator Delete Request
  // ==========================================
  it('TEST-RBAC-07: Operator attempts to delete request -> 403 Forbidden', async () => {
    const res = await app.request(`/api/requests/${createdRequestId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${operatorToken}`,
      },
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.error).toContain('Insufficient role permissions');
  });

  // ==========================================
  // TEST-RBAC-08: Supervisor View Requests
  // ==========================================
  it('TEST-RBAC-08: Supervisor views requests -> 200 OK (sees all requests across the factory)', async () => {
    const res = await app.request('/api/requests?limit=10', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${supervisorToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination.total_records).toBeGreaterThan(1);

    // Verify presence of creator and machine details
    const first = body.data[0];
    expect(first).toHaveProperty('machine');
    expect(first).toHaveProperty('creator');
  });

  // ==========================================
  // TEST-RBAC-09: Supervisor Approve Request
  // ==========================================
  it('TEST-RBAC-09: Supervisor approves request -> 200 OK (status Approved, reviewer recorded)', async () => {
    // Create fresh request by Operator
    const newReqRes = await app.request('/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        machine_id: 3,
        problem_description: 'Precision plastic molding cavity heater temperature instability',
        priority: 'High',
      }),
    });
    expect(newReqRes.status).toBe(201);
    const newReqData = (await newReqRes.json()) as any;
    const reqId = newReqData.data.id;

    // Supervisor approves
    const reviewRes = await app.request(`/api/requests/${reqId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        status: 'Approved',
        reviewer_notes: 'Approved. Maintenance technician assigned for shift 2.',
      }),
    });

    expect(reviewRes.status).toBe(200);
    const reviewBody = (await reviewRes.json()) as any;
    expect(reviewBody.data.status).toBe('Approved');
    expect(reviewBody.data.reviewed_by).toBe(supervisorUser.id);
    expect(reviewBody.data.reviewed_at).not.toBeNull();
    expect(reviewBody.data.reviewer_notes).toBe('Approved. Maintenance technician assigned for shift 2.');
  });

  // ==========================================
  // TEST-RBAC-10: Supervisor Reject Request
  // ==========================================
  it('TEST-RBAC-10: Supervisor rejects request -> 200 OK (status Rejected, reviewer & notes recorded)', async () => {
    // Create fresh request by Operator
    const newReqRes = await app.request('/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        machine_id: 4,
        problem_description: 'Minor cosmetic blemish on conveyor guide rail',
        priority: 'Low',
      }),
    });
    expect(newReqRes.status).toBe(201);
    const newReqData = (await newReqRes.json()) as any;
    const reqId = newReqData.data.id;

    // Supervisor rejects
    const reviewRes = await app.request(`/api/requests/${reqId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        status: 'Rejected',
        reviewer_notes: 'Rejected. Cosmetic issue does not affect connector pin specs.',
      }),
    });

    expect(reviewRes.status).toBe(200);
    const reviewBody = (await reviewRes.json()) as any;
    expect(reviewBody.data.status).toBe('Rejected');
    expect(reviewBody.data.reviewed_by).toBe(supervisorUser.id);
    expect(reviewBody.data.reviewer_notes).toContain('Rejected');
  });

  // ==========================================
  // TEST-RBAC-11: Supervisor Edit Request of Another User
  // ==========================================
  it('TEST-RBAC-11: Supervisor attempts to edit request created by someone else -> 403 Forbidden', async () => {
    // Attempting to edit operator-created request
    const res = await app.request(`/api/requests/${createdRequestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        problem_description: 'Supervisor unauthorized edit attempt',
      }),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.error).toContain('Supervisors cannot edit maintenance requests created by others');
  });

  // ==========================================
  // TEST-RBAC-12: Supervisor Delete Request
  // ==========================================
  it('TEST-RBAC-12: Supervisor attempts to delete request -> 403 Forbidden', async () => {
    const res = await app.request(`/api/requests/${createdRequestId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${supervisorToken}`,
      },
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.error).toContain('Insufficient role permissions');
  });

  // ==========================================
  // TEST-RBAC-13: Admin Edit Any Request at Any Status
  // ==========================================
  it('TEST-RBAC-13: Admin edits any request at any status -> 200 OK (administrative override)', async () => {
    const adminCorrection = 'Admin administrative override: verified stamping ram tolerance';
    const res = await app.request(`/api/requests/${approvedRequestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        problem_description: adminCorrection,
        priority: 'High',
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.id).toBe(approvedRequestId);
    expect(body.data.problem_description).toBe(adminCorrection);
  });

  // ==========================================
  // TEST-RBAC-14: Admin Delete Request
  // ==========================================
  it('TEST-RBAC-14: Admin deletes request -> 200 OK and subsequent GET returns 404', async () => {
    // Create temporary request to delete
    const tempRes = await app.request('/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        machine_id: 1,
        problem_description: 'Temporary duplicate request to be deleted by admin',
        priority: 'Low',
      }),
    });
    expect(tempRes.status).toBe(201);
    const tempData = (await tempRes.json()) as any;
    requestToDeleteId = tempData.data.id;

    // Admin deletes
    const deleteRes = await app.request(`/api/requests/${requestToDeleteId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(deleteRes.status).toBe(200);
    const deleteBody = (await deleteRes.json()) as any;
    expect(deleteBody.message).toContain('deleted successfully');
    expect(deleteBody.id).toBe(requestToDeleteId);

    // Verify GET now returns 404
    const verifyRes = await app.request(`/api/requests/${requestToDeleteId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    expect(verifyRes.status).toBe(404);
  });

  // ==========================================
  // TEST-RBAC-15: Admin Access Users List
  // ==========================================
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
  });

  // ==========================================
  // TEST-RBAC-16: Operator & Supervisor Access Users List
  // ==========================================
  it('TEST-RBAC-16: Operator and Supervisor access to user list -> 403 Forbidden', async () => {
    // Operator access attempt
    const opRes = await app.request('/api/users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${operatorToken}`,
      },
    });
    expect(opRes.status).toBe(403);
    const opBody = (await opRes.json()) as any;
    expect(opBody.error).toContain('Insufficient role permissions');

    // Supervisor access attempt
    const spRes = await app.request('/api/users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${supervisorToken}`,
      },
    });
    expect(spRes.status).toBe(403);
    const spBody = (await spRes.json()) as any;
    expect(spBody.error).toContain('Insufficient role permissions');
  });

  // ==========================================
  // TEST-RBAC-17: Admin Deactivate User
  // ==========================================
  let deactivatedUserId: number;
  let deactivatedUsername: string;

  it('TEST-RBAC-17: Admin deactivates user (is_active: false) -> 200 OK', async () => {
    // Admin creates a temporary user to deactivate
    deactivatedUsername = `rbac_deact_test_${Date.now()}`;
    const createRes = await app.request('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        username: deactivatedUsername,
        email: `${deactivatedUsername}@hirose.co.id`,
        password: 'Password123!',
        role: 'Operator',
      }),
    });
    expect(createRes.status).toBe(201);
    const createData = (await createRes.json()) as any;
    deactivatedUserId = createData.data.id;

    // Admin deactivates the user
    const deactivateRes = await app.request(`/api/users/${deactivatedUserId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        is_active: false,
      }),
    });

    expect(deactivateRes.status).toBe(200);
    const deactivateBody = (await deactivateRes.json()) as any;
    expect(deactivateBody.data.id).toBe(deactivatedUserId);
    expect(deactivateBody.data.is_active).toBe(false);
  });

  // ==========================================
  // TEST-RBAC-18: Deactivated User Login Attempt
  // ==========================================
  it('TEST-RBAC-18: Deactivated user attempts login -> 403 Forbidden (US-AUTH-02)', async () => {
    // Attempt login with newly deactivated user
    const loginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: deactivatedUsername,
        password: 'Password123!',
      }),
    });

    expect(loginRes.status).toBe(403);
    const loginBody = (await loginRes.json()) as any;
    expect(loginBody.error).toContain('Account is deactivated');

    // Also verify seeded 'inactive_user' is rejected
    const seededInactiveRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'inactive_user',
        password: 'Password123!',
      }),
    });

    expect(seededInactiveRes.status).toBe(403);
    const seededBody = (await seededInactiveRes.json()) as any;
    expect(seededBody.error).toContain('Account is deactivated');
  });

  // ==========================================
  // US-SYS-01 & Bonus #2: Pagination, Filtering & ILIKE Search
  // ==========================================
  describe('US-SYS-01 & Bonus #2: Server-Side Pagination, Filtering, and Search', () => {
    it('should support pagination with page and limit parameters', async () => {
      const res = await app.request('/api/requests?page=1&limit=5', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data.length).toBeLessThanOrEqual(5);
      expect(body.pagination).toMatchObject({
        current_page: 1,
        limit: 5,
      });
      expect(body.pagination.total_records).toBeGreaterThan(0);
      expect(body.pagination.total_pages).toBe(
        Math.ceil(body.pagination.total_records / 5)
      );
    });

    it('should filter requests by status', async () => {
      const res = await app.request('/api/requests?status=Approved&limit=10', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${supervisorToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      for (const item of body.data) {
        expect(item.status).toBe('Approved');
      }
    });

    it('should filter requests by priority', async () => {
      const res = await app.request('/api/requests?priority=Critical&limit=10', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${supervisorToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      for (const item of body.data) {
        expect(item.priority).toBe('Critical');
      }
    });

    it('should perform server-side ILIKE search on machine code', async () => {
      const res = await app.request('/api/requests?search=MCH-STAMP&limit=10', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.data.length).toBeGreaterThan(0);
      for (const item of body.data) {
        const matchesCode = item.machine?.code.includes('MCH-STAMP');
        const matchesName = item.machine?.name.toLowerCase().includes('stamp');
        const matchesDesc = item.problem_description.toLowerCase().includes('stamp');
        expect(matchesCode || matchesName || matchesDesc).toBe(true);
      }
    });

    it('should return 400 Bad Request on invalid request body', async () => {
      const res = await app.request('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({
          machine_id: 'invalid-id',
          problem_description: '',
          priority: 'NonExistentPriority',
        }),
      });

      expect(res.status).toBe(400);
    });
  });
});
