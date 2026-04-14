import pkg from 'pg';
import { config } from './index.js';

const { Pool } = pkg;

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (error: Error & { code?: string }) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
  if (error.code) {
    console.error('PostgreSQL error code:', error.code);
  }
});

pool.on('connect', () => {
  console.log(
    `PostgreSQL connected: ${config.db.host}:${config.db.port}/${config.db.name}`
  );
});

export async function verifyDatabaseConnection() {
  const client = await pool.connect();

  try {
    const result = await client.query<{ now: Date }>('SELECT NOW() AS now');
    return result.rows[0];
  } finally {
    client.release();
  }
}

export default pool;
