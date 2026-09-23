import { describe, it, expect } from 'vitest';
import { app } from '../src/index.js';
import { loginAndGetToken } from './helpers.js';
import { getActiveMachines } from '../src/modules/machines/machines.service.js';

describe('Fase 2.2: Master Mesin (Read-Only Helper Endpoint) Test Suite', () => {
  describe('Authentication & Access Control (FR-MCH-01, US-MCH-01)', () => {
    it('should reject request when Authorization header is missing (401 Unauthorized)', async () => {
      const res = await app.request('/api/machines', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const data = (await res.json()) as any;
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Missing or malformed token');
    });

    it('should reject request when token signature is invalid (401 Unauthorized)', async () => {
      const res = await app.request('/api/machines', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid.token.signature',
        },
      });

      expect(res.status).toBe(401);
      const data = (await res.json()) as any;
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid or expired token');
    });

    it('should allow Operator to fetch active machines list (200 OK)', async () => {
      const { token } = await loginAndGetToken('operator1');

      const res = await app.request('/api/machines', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(7);
    });

    it('should allow Supervisor to fetch active machines list (200 OK)', async () => {
      const { token } = await loginAndGetToken('supervisor1');

      const res = await app.request('/api/machines', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(7);
    });

    it('should allow Admin to fetch active machines list (200 OK)', async () => {
      const { token } = await loginAndGetToken('admin1');

      const res = await app.request('/api/machines', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Payload Structure & Data Integrity (FR-MCH-01, FR-MCH-03)', () => {
    it('should return machines matching the expected schema (id, code, name, location)', async () => {
      const { token } = await loginAndGetToken('operator1');

      const res = await app.request('/api/machines', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      const firstMachine = body.data[0];

      expect(firstMachine).toHaveProperty('id');
      expect(typeof firstMachine.id).toBe('number');
      expect(firstMachine).toHaveProperty('code');
      expect(typeof firstMachine.code).toBe('string');
      expect(firstMachine).toHaveProperty('name');
      expect(typeof firstMachine.name).toBe('string');
      expect(firstMachine).toHaveProperty('location');
      expect(typeof firstMachine.location).toBe('string');

      // Verify internal fields like created_at, updated_at, is_active are omitted from helper dropdown
      expect(firstMachine).not.toHaveProperty('is_active');
      expect(firstMachine).not.toHaveProperty('created_at');
      expect(firstMachine).not.toHaveProperty('updated_at');
    });

    it('should include seeded Hirose precision stamping and molding machines', async () => {
      const { token } = await loginAndGetToken('operator1');

      const res = await app.request('/api/machines', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const body = (await res.json()) as any;
      const codes = body.data.map((m: any) => m.code);

      expect(codes).toContain('MCH-STAMP-01');
      expect(codes).toContain('MCH-STAMP-02');
      expect(codes).toContain('MCH-MOLD-01');
      expect(codes).toContain('MCH-MOLD-02');
      expect(codes).toContain('MCH-PLAT-01');
      expect(codes).toContain('MCH-ASSY-01');
      expect(codes).toContain('MCH-ASSY-02');
    });

    it('service layer getActiveMachines() should query active machines directly', async () => {
      const machinesList = await getActiveMachines();
      expect(Array.isArray(machinesList)).toBe(true);
      expect(machinesList.length).toBeGreaterThanOrEqual(7);

      for (const m of machinesList) {
        expect(m.code).toBeDefined();
        expect(m.name).toBeDefined();
        expect(m.location).toBeDefined();
      }
    });
  });
});
