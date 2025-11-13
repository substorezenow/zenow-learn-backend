import { Pool, PoolClient } from 'pg';

// Enhanced database connection manager with connection pooling and retry logic
export class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: Pool | null = null;
  private isConnected = false;
  private retryCount = 0;
  // Deprecated: retries are now infinite; kept for compatibility
  private maxRetries = Number.POSITIVE_INFINITY;
  private retryDelay = 1000; // Start with 1 second
  private maxRetryDelay = 300000; // Max 5 minutes
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private connectionAttempts = 0;

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

    await this.connectWithRetry();
  }

  private async connectWithRetry(): Promise<void> {
    // Retry indefinitely with exponential backoff until a successful connection
    while (true) {
      this.connectionAttempts++;
      try {
        console.log(`🔄 Attempting database connection (attempt ${this.connectionAttempts})...`);

        if (process.env.COCKROACH_URL) {
          this.pool = new Pool({
            connectionString: process.env.COCKROACH_URL,
            ssl: { rejectUnauthorized: false },
            max: 20,
            min: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            maxUses: 7500,
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
            connectionTimeoutMillis: 10000,
            maxUses: 7500,
          });
        }

        // Test the connection with timeout
        const client = await Promise.race([
          this.pool.connect(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 15000)
          )
        ]) as PoolClient;

        console.log('✅ Database pool connected successfully');
        client.release();
        this.isConnected = true;
        this.retryCount = 0; // Reset retry count on successful connection
        this.retryDelay = 1000; // Reset retry delay

        // Start health monitoring
        this.startHealthMonitoring();
        return; // Exit after successful connection
      } catch (error) {
        console.error(`❌ Database connection failed (attempt ${this.connectionAttempts}):`, error);

        // Clean up failed pool
        if (this.pool) {
          try {
            await this.pool.end();
          } catch (cleanupError) {
            console.error('Error cleaning up failed pool:', cleanupError);
          }
          this.pool = null;
        }

        this.isConnected = false;

        // Increment retry count and wait before next attempt
        this.retryCount++;
        console.log(`🔄 Retrying in ${Math.round(this.retryDelay)}ms... (retry #${this.retryCount})`);
        await this.sleep(this.retryDelay);

        // Exponential backoff with jitter up to maxRetryDelay
        this.retryDelay = Math.min(
          this.retryDelay * 2 + Math.random() * 1000,
          this.maxRetryDelay
        );
        // Loop continues for next attempt
      }
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private startHealthMonitoring(): void {
    // Clear existing interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        if (this.pool && this.isConnected) {
          const client = await this.pool.connect();
          await client.query('SELECT 1');
          client.release();
        }
      } catch (error) {
        console.error('⚠️ Database health check failed:', error);
        this.isConnected = false;
        
        // Attempt to reconnect
        console.log('🔄 Attempting to reconnect to database...');
        try {
          await this.connectWithRetry();
        } catch (reconnectError) {
          console.error('❌ Reconnection failed:', reconnectError);
        }
      }
    }, 30000);
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
      try {
        await this.connect();
      } catch (error) {
        throw new Error(`Database unavailable: ${(error as Error).message}`);
      }
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
      
      // If it's a connection error, mark as disconnected and try to reconnect
      if ((error as any).code === 'ECONNREFUSED' || (error as any).code === 'ENOTFOUND' || (error as Error).message.includes('connection')) {
        this.isConnected = false;
        console.log('🔄 Connection lost, attempting to reconnect...');
        try {
          await this.connect();
          // Retry the query once after reconnection
          return await this.pool!.query(text, params);
        } catch (reconnectError) {
          throw new Error(`Database connection lost and reconnection failed: ${(reconnectError as Error).message}`);
        }
      }
      
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
    // Clear health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
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
      this.isConnected = false;
      return false;
    }
  }

  // Get connection status
  public getConnectionStatus(): { connected: boolean; attempts: number; retryCount: number } {
    return {
      connected: this.isConnected,
      attempts: this.connectionAttempts,
      retryCount: this.retryCount
    };
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
      connected: this.isConnected,
      attempts: this.connectionAttempts,
      retryCount: this.retryCount
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
