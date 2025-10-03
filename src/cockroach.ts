import { Pool } from 'pg';

let pool: Pool | null = null;

export function connectCockroach(): void {
  if (process.env.COCKROACH_URL) {
    pool = new Pool({
      connectionString: process.env.COCKROACH_URL,
      ssl: { rejectUnauthorized: false },
    });
  } else {
    pool = new Pool({
      host: process.env.COCKROACH_HOST || 'localhost',
      port: parseInt(process.env.COCKROACH_PORT || '26257'),
      user: process.env.COCKROACH_USER || 'root',
      password: process.env.COCKROACH_PASS || '',
      database: process.env.COCKROACH_DB || 'defaultdb',
      ssl:
        process.env.COCKROACH_SSL === 'true'
          ? { rejectUnauthorized: false }
          : false,
    });
  }
  
  pool
    .connect()
    .then((client) => {
      console.log('Connected to CockroachDB');
      client.release();
    })
    .catch((err) => console.error('CockroachDB connection error:', err));
}

export { pool };
