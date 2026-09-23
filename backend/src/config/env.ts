import * as dotenv from 'dotenv';

// Load .env locally inside backend directory
dotenv.config();

export const env = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT) || 5432,
  DB_NAME: process.env.DB_NAME || 'hirose_maintenance',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  DATABASE_URL: process.env.DATABASE_URL, // Opsional jika ada
  JWT_SECRET: process.env.JWT_SECRET || 'supersecretjwtkey_hirose_maintenance_log_2026',
};
