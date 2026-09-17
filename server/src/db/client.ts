import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL is not set — database features will be disabled or fall back.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://lobster:password@localhost:5432/lobster_maps',
});


export const db = drizzle(pool, { schema });
