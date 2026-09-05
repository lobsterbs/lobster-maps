import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — copy .env.example to .env first');
  }

  const sqlPath = path.join(__dirname, 'postgis.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  // Plain string (not the {text, values} form) uses pg's simple query
  // protocol, which supports multiple semicolon-separated statements in
  // one call — needed since postgis.sql has three (CREATE EXTENSION,
  // ALTER TABLE, CREATE INDEX).
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(sql);
    console.log('postgis.sql applied.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Failed to apply postgis.sql:', err);
  process.exitCode = 1;
});
