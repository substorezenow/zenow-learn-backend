import { Pool, PoolClient } from 'pg';

// Enhanced database connection manager with connection pooling
export class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: Pool | null = null;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected && this.pool) {
      return;
    }

    try {
      if (process.env.COCKROACH_URL) {
        this.pool = new Pool({
          connectionString: process.env.COCKROACH_URL,
          ssl: { rejectUnauthorized: false },
          max: 20, // Maximum number of clients in the pool
          min: 5,  // Minimum number of clients in the pool
          idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
          connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
          maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
        });
      } else {
        this.pool = new Pool({
          host: process.env.COCKROACH_HOST || 'localhost',
          port: parseInt(process.env.COCKROACH_PORT || '26257'),
          user: process.env.COCKROACH_USER || 'root',
          password: process.env.COCKROACH_PASS || '',
          database: process.env.COCKROACH_DB || 'defaultdb',
          ssl: process.env.COCKROACH_SSL === 'true' ? { rejectUnauthorized: false } : false,
          max: 20,
          min: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
          maxUses: 7500,
        });
      }

      // Test the connection
      const client = await this.pool.connect();
      console.log('✅ Database pool connected successfully');
      client.release();
      this.isConnected = true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  public getPool(): Pool {
    if (!this.pool || !this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    // Ensure connection is established
    if (!this.isConnected || !this.pool) {
      await this.connect();
    }
    
    const start = Date.now();
    
    try {
      const result = await this.pool!.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries in development
      if (process.env.NODE_ENV === 'development' && duration > 1000) {
        console.warn(`🐌 Slow query (${duration}ms):`, text.substring(0, 100));
      }
      
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    // Ensure connection is established
    if (!this.isConnected || !this.pool) {
      await this.connect();
    }
    return await this.pool!.connect();
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('🔌 Database pool closed');
    }
  }

  // Health check method
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.pool || !this.isConnected) {
        return false;
      }
      
      const result = await this.query('SELECT 1 as health_check');
      return result.rows[0]?.health_check === 1;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Get pool statistics
  public getPoolStats(): any {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

// Singleton instance
export const dbManager = DatabaseManager.getInstance();

// Legacy compatibility - lazy pool export
export const pool = {
  query: async (text: string, params?: any[]) => {
    return await dbManager.query(text, params);
  },
  connect: async () => {
    return await dbManager.connect();
  },
  end: async () => {
    return await dbManager.close();
  }
};
