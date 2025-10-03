import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

let cockroachClient: Client | null = null;

async function getClient(): Promise<Client> {
  if (cockroachClient) return cockroachClient;
  if (process.env.COCKROACH_URL) {
    cockroachClient = new Client({
      connectionString: process.env.COCKROACH_URL,
      ssl: { rejectUnauthorized: false }
    });
  } else {
    cockroachClient = new Client({
      host: process.env.COCKROACH_HOST || 'localhost',
      port: parseInt(process.env.COCKROACH_PORT || '26257'),
      user: process.env.COCKROACH_USER || 'root',
      password: process.env.COCKROACH_PASS || '',
      database: process.env.COCKROACH_DB || 'defaultdb',
      ssl: process.env.COCKROACH_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
  }
  await cockroachClient.connect();
  return cockroachClient;
}

async function checkUsers() {
  try {
    console.log('👥 Checking all users in database...');
    
    const client = await getClient();
    const res = await client.query('SELECT id, username, role FROM users ORDER BY created_at');
    
    console.log('📋 Users in database:');
    console.table(res.rows);
    
    const adminUsers = res.rows.filter(user => user.role === 'admin');
    console.log(`\n🔐 Admin users: ${adminUsers.length}`);
    adminUsers.forEach(user => {
      console.log(`   - ${user.username} (ID: ${user.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    if (cockroachClient) {
      await cockroachClient.end();
    }
  }
}

// Run if called directly
if (require.main === module) {
  checkUsers().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Failed to check users:', error);
    process.exit(1);
  });
}

export default checkUsers;
