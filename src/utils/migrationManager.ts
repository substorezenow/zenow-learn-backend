import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { dbManager } from './databaseManager';

export interface Migration {
  id: string;
  name: string;
  filename: string;
  executedAt?: Date;
  checksum: string;
}

export class MigrationManager {
  private static instance: MigrationManager;
  private migrationsPath: string;
  private migrationsTable = 'schema_migrations';

  private constructor() {
    this.migrationsPath = path.join(__dirname, '../migrations');
  }

  public static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }

  // Initialize migrations table
  public async initialize(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await dbManager.query(query);
      console.log('✅ Migrations table initialized');
    } catch (error) {
      console.error('❌ Failed to initialize migrations table:', error);
      throw error;
    }
  }

  // Get all migration files
  public getMigrationFiles(): string[] {
    try {
      if (!fs.existsSync(this.migrationsPath)) {
        console.warn('⚠️ Migrations directory does not exist:', this.migrationsPath);
        return [];
      }

      const files = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      return files;
    } catch (error) {
      console.error('❌ Error reading migration files:', error);
      return [];
    }
  }

  // Get executed migrations from database
  public async getExecutedMigrations(): Promise<Migration[]> {
    try {
      const query = `SELECT * FROM ${this.migrationsTable} ORDER BY executed_at ASC`;
      const result = await dbManager.query(query);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching executed migrations:', error);
      return [];
    }
  }

  // Calculate file checksum
  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  // Get pending migrations
  public async getPendingMigrations(): Promise<Migration[]> {
    const files = this.getMigrationFiles();
    const executed = await this.getExecutedMigrations();
    const executedIds = new Set(executed.map(m => m.id));

    const pending: Migration[] = [];

    for (const file of files) {
      const id = file.split('_')[0];
      
      if (!executedIds.has(id)) {
        const filePath = path.join(this.migrationsPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const checksum = this.calculateChecksum(content);

        pending.push({
          id,
          name: file.replace('.sql', ''),
          filename: file,
          checksum
        });
      }
    }

    return pending;
  }

  // Execute a single migration
  public async executeMigration(migration: Migration): Promise<void> {
    const filePath = path.join(this.migrationsPath, migration.filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const checksum = this.calculateChecksum(content);

    if (checksum !== migration.checksum) {
      throw new Error(`Migration checksum mismatch: ${migration.filename}`);
    }

    try {
      // Start transaction
      await dbManager.transaction(async (client) => {
        // Execute migration SQL
        await client.query(content);

        // Record migration execution
        await client.query(
          `INSERT INTO ${this.migrationsTable} (id, name, filename, checksum) VALUES ($1, $2, $3, $4)`,
          [migration.id, migration.name, migration.filename, checksum]
        );
      });

      console.log(`✅ Migration executed: ${migration.name}`);
    } catch (error) {
      console.error(`❌ Migration failed: ${migration.name}`, error);
      throw error;
    }
  }

  // Run all pending migrations
  public async runMigrations(): Promise<void> {
    console.log('🔄 Starting migration process...');

    await this.initialize();
    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📋 Found ${pending.length} pending migrations`);

    for (const migration of pending) {
      try {
        await this.executeMigration(migration);
      } catch (error) {
        console.error(`❌ Migration failed: ${migration.name}`);
        throw error;
      }
    }

    console.log('✅ All migrations completed successfully');
  }

  // Rollback last migration
  public async rollbackLastMigration(): Promise<void> {
    const executed = await this.getExecutedMigrations();
    
    if (executed.length === 0) {
      console.log('ℹ️ No migrations to rollback');
      return;
    }

    const lastMigration = executed[executed.length - 1];
    console.log(`🔄 Rolling back migration: ${lastMigration.name}`);

    // Note: This is a simplified rollback. In production, you'd want
    // to implement proper rollback scripts for each migration.
    try {
      await dbManager.query(
        `DELETE FROM ${this.migrationsTable} WHERE id = $1`,
        [lastMigration.id]
      );
      console.log(`✅ Migration rolled back: ${lastMigration.name}`);
    } catch (error) {
      console.error(`❌ Rollback failed: ${lastMigration.name}`, error);
      throw error;
    }
  }

  // Get migration status
  public async getMigrationStatus(): Promise<{
    total: number;
    executed: number;
    pending: number;
    migrations: Migration[];
  }> {
    const files = this.getMigrationFiles();
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();

    return {
      total: files.length,
      executed: executed.length,
      pending: pending.length,
      migrations: [...executed, ...pending].sort((a, b) => a.id.localeCompare(b.id))
    };
  }

  // Validate migration integrity
  public async validateMigrations(): Promise<boolean> {
    const executed = await this.getExecutedMigrations();
    let isValid = true;

    for (const migration of executed) {
      const filePath = path.join(this.migrationsPath, migration.filename);
      
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Migration file missing: ${migration.filename}`);
        isValid = false;
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const checksum = this.calculateChecksum(content);

      if (checksum !== migration.checksum) {
        console.error(`❌ Migration checksum mismatch: ${migration.filename}`);
        isValid = false;
      }
    }

    return isValid;
  }

  // Create a new migration file
  public createMigration(name: string): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const filename = `${timestamp}_${name}.sql`;
    const filePath = path.join(this.migrationsPath, filename);

    const template = `-- Migration: ${name}
-- Description: ${name.replace(/-/g, ' ')}
-- Created: ${new Date().toISOString()}

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example_table (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
`;

    try {
      fs.writeFileSync(filePath, template);
      console.log(`✅ Migration created: ${filename}`);
      return filename;
    } catch (error) {
      console.error('❌ Failed to create migration:', error);
      throw error;
    }
  }
}

// Singleton instance
export const migrationManager = MigrationManager.getInstance();

// CLI commands
export const runMigrations = async (): Promise<void> => {
  try {
    await migrationManager.runMigrations();
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    process.exit(1);
  }
};

export const rollbackMigration = async (): Promise<void> => {
  try {
    await migrationManager.rollbackLastMigration();
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
};

export const showMigrationStatus = async (): Promise<void> => {
  try {
    const status = await migrationManager.getMigrationStatus();
    console.log('📊 Migration Status:');
    console.log(`   Total: ${status.total}`);
    console.log(`   Executed: ${status.executed}`);
    console.log(`   Pending: ${status.pending}`);
    
    if (status.migrations.length > 0) {
      console.log('\n📋 Migrations:');
      status.migrations.forEach(migration => {
        const status = migration.executedAt ? '✅' : '⏳';
        console.log(`   ${status} ${migration.id}: ${migration.name}`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to get migration status:', error);
    process.exit(1);
  }
};
