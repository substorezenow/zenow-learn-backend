import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigrations() {
  let client: Client | null = null;

  try {
    // Connect to database using the same logic as the main app
    if (process.env.COCKROACH_URL) {
      client = new Client({
        connectionString: process.env.COCKROACH_URL,
        ssl: { rejectUnauthorized: false },
      });
    } else {
      client = new Client({
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

    await client.connect();
    console.log('✅ Connected to CockroachDB');

    // Get migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📁 Found ${migrationFiles.length} migration files`);

    // Run each migration
    for (const file of migrationFiles) {
      // Skip data insertion migration if it already exists
      if (file === '002_insert_sample_data.sql') {
        console.log(`⏭️ Skipping migration: ${file} (data already exists)`);
        continue;
      }
      
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`🔄 Running migration: ${file}`);
      
      try {
        await client.query(sql);
        console.log(`✅ Migration ${file} completed successfully`);
      } catch (error) {
        console.error(`❌ Error running migration ${file}:`, error);
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

export default runMigrations;
