import { describe, it, expect } from 'vitest';
import { app } from '../src/index.js';

describe('Fase 2.5: Observability & Interactive API Documentation (Bonus #4 & #5)', () => {
  // ==========================================
  // GET /health: Health Check & DB Ping (FR-OPS-01, US-SYS-02)
  // ==========================================
  describe('GET /health (FR-OPS-01, US-SYS-02)', () => {
    it('should return 200 OK with healthy status and database connected', async () => {
      const res = await app.request('/health', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.status).toBe('healthy');
      expect(body.services).toEqual({
        database: 'connected',
      });
      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  // ==========================================
  // GET /openapi.json: OpenAPI 3.0 Specification
  // ==========================================
  describe('GET /openapi.json (OpenAPI 3.0 Specification)', () => {
    it('should return valid OpenAPI 3.0 JSON specification', async () => {
      const res = await app.request('/openapi.json', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const spec = (await res.json()) as any;
      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info).toMatchObject({
        title: 'Hirose Maintenance Log API',
        version: '1.0.0',
      });

      // Verify all registered API modules are documented in paths
      expect(spec.paths).toHaveProperty('/health');
      expect(spec.paths).toHaveProperty('/api/auth/login');
      expect(spec.paths).toHaveProperty('/api/machines');
      expect(spec.paths).toHaveProperty('/api/requests');
      expect(spec.paths).toHaveProperty('/api/users');

      // Verify BearerAuth security scheme registration
      expect(spec.components?.securitySchemes?.BearerAuth).toBeDefined();
      expect(spec.components.securitySchemes.BearerAuth).toMatchObject({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      });
    });
  });

  // ==========================================
  // GET /docs: Interactive Swagger UI (FR-OPS-03, US-SYS-03)
  // ==========================================
  describe('GET /docs (Swagger UI Interactive Documentation)', () => {
    it('should serve HTML Swagger UI on /docs', async () => {
      const res = await app.request('/docs', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const contentType = res.headers.get('content-type') || '';
      expect(contentType).toContain('text/html');

      const html = await res.text();
      expect(html).toContain('swagger-ui');
    });
  });

  // ==========================================
  // GET /: Root Endpoint
  // ==========================================
  describe('GET / (Root API info)', () => {
    it('should return online status and link to /docs', async () => {
      const res = await app.request('/', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.status).toBe('online');
      expect(body.docs).toBe('/docs');
    });
  });
});
