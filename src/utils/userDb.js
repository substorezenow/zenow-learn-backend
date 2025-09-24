const { Client } = require('pg');
let cockroachClient;

async function getClient() {
  if (cockroachClient) return cockroachClient;
  if (process.env.COCKROACH_URL) {
    cockroachClient = new Client({
      connectionString: process.env.COCKROACH_URL,
      ssl: { rejectUnauthorized: false }
    });
  } else {
    cockroachClient = new Client({
      host: process.env.COCKROACH_HOST || 'localhost',
      port: process.env.COCKROACH_PORT || 26257,
      user: process.env.COCKROACH_USER || 'root',
      password: process.env.COCKROACH_PASS || '',
      database: process.env.COCKROACH_DB || 'defaultdb',
      ssl: process.env.COCKROACH_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
  }
  await cockroachClient.connect();
  return cockroachClient;
}

exports.getUserByUsername = async (username) => {
  const client = await getClient();
  const res = await client.query('SELECT * FROM users WHERE username = $1 LIMIT 1', [username]);
  return res.rows[0] || null;
};

exports.createUser = async ({ username, password, role = 'user' }) => {
  const client = await getClient();
  const res = await client.query(
    'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *',
    [username, password, role]
  );
  return res.rows[0];
};
