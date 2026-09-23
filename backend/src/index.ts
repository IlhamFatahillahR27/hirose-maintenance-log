import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { env } from './config/env.js';

const app = new Hono();

app.get('/', (c) => {
  return c.json({
    message: 'Hirose Maintenance Log API Server',
    version: '1.0.0',
    status: 'online',
  });
});

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`🚀 Hirose Maintenance Log API is running on http://localhost:${info.port}`);
  }
);

export default app;
