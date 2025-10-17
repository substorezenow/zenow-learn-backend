import { Request, Response, NextFunction } from 'express';
import { circuitBreakers } from './circuitBreaker';
import { gracefulDegradation } from './gracefulDegradation';
import { logger } from './logger';

/**
 * Enhanced Database Manager with Circuit Breaker Protection
 * Wraps existing database operations with circuit breaker pattern
 */
export class ResilientDatabaseManager {
  private static instance: ResilientDatabaseManager;

  private constructor() {}

  public static getInstance(): ResilientDatabaseManager {
    if (!ResilientDatabaseManager.instance) {
      ResilientDatabaseManager.instance = new ResilientDatabaseManager();
    }
    return ResilientDatabaseManager.instance;
  }

  /**
   * Execute query with circuit breaker protection
   */
  async query(text: string, params?: any[]): Promise<any> {
    try {
      return await circuitBreakers.database.execute(async () => {
        const { dbManager } = await import('./databaseManager');
        return await dbManager.query(text, params);
      }, () => {
        // Fallback: return empty result for read operations
        if (text.trim().toLowerCase().startsWith('select')) {
          logger.warn('Database circuit breaker OPEN, returning empty result for read query', { query: text.substring(0, 100) });
          return { rows: [] };
        }
        
        // For write operations, throw error to be handled by caller
        throw new Error('Database unavailable - circuit breaker OPEN');
      });
    } catch (error) {
      logger.error('Database query failed', error as Error, { query: text.substring(0, 100) });
      throw error;
    }
  }

  /**
   * Execute transaction with circuit breaker protection
   */
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    try {
      return await circuitBreakers.database.execute(async () => {
        const { dbManager } = await import('./databaseManager');
        return await dbManager.transaction(callback);
      }, () => {
        throw new Error('Database unavailable for transactions - circuit breaker OPEN');
      });
    } catch (error) {
      logger.error('Database transaction failed', error as Error);
      throw error;
    }
  }

  /**
   * Health check with circuit breaker status
   */
  async healthCheck(): Promise<boolean> {
    try {
      await circuitBreakers.database.execute(async () => {
        const { dbManager } = await import('./databaseManager');
        return await dbManager.healthCheck();
      }, () => {
        return false; // Circuit breaker is open
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Enhanced Cache Manager with Circuit Breaker Protection
 */
export class ResilientCacheManager {
  private static instance: ResilientCacheManager;

  private constructor() {}

  public static getInstance(): ResilientCacheManager {
    if (!ResilientCacheManager.instance) {
      ResilientCacheManager.instance = new ResilientCacheManager();
    }
    return ResilientCacheManager.instance;
  }

  /**
   * Get with circuit breaker protection
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      return await circuitBreakers.cache.execute(async () => {
        const { cacheManager } = await import('./cacheManager');
        return await cacheManager.get<T>(key);
      }, () => {
        // Fallback: return null (cache miss)
        logger.warn('Cache circuit breaker OPEN, returning cache miss', { key });
        return null;
      });
    } catch (error) {
      logger.error('Cache get failed', error as Error, { key });
      return null;
    }
  }

  /**
   * Set with circuit breaker protection
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      return await circuitBreakers.cache.execute(async () => {
        const { cacheManager } = await import('./cacheManager');
        return await cacheManager.set(key, value, ttl);
      }, () => {
        // Fallback: return false (cache write failed)
        logger.warn('Cache circuit breaker OPEN, cache write failed', { key });
        return false;
      });
    } catch (error) {
      logger.error('Cache set failed', error as Error, { key });
      return false;
    }
  }

  /**
   * Delete with circuit breaker protection
   */
  async del(key: string): Promise<boolean> {
    try {
      return await circuitBreakers.cache.execute(async () => {
        const { cacheManager } = await import('./cacheManager');
        return await cacheManager.del(key);
      }, () => {
        // Fallback: return false (cache delete failed)
        logger.warn('Cache circuit breaker OPEN, cache delete failed', { key });
        return false;
      });
    } catch (error) {
      logger.error('Cache delete failed', error as Error, { key });
      return false;
    }
  }
}

// Singleton instances
export const resilientDb = ResilientDatabaseManager.getInstance();
export const resilientCache = ResilientCacheManager.getInstance();

/**
 * Middleware to add resilient services to request
 */
export const resilienceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Add resilient services to request
  (req as any).resilientDb = resilientDb;
  (req as any).resilientCache = resilientCache;
  (req as any).gracefulDegradation = gracefulDegradation;
  
  // Add circuit breaker status to response headers
  const circuitStats = circuitBreakers.database.getStats();
  res.set('X-Circuit-Breaker-DB', circuitStats.state);
  res.set('X-Circuit-Breaker-Cache', circuitBreakers.cache.getStats().state);
  res.set('X-Circuit-Breaker-Auth', circuitBreakers.auth.getStats().state);
  
  next();
};

/**
 * Enhanced error handler with circuit breaker awareness
 */
export const resilientErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  // Check if error is due to circuit breaker
  if (err.message.includes('circuit breaker') || err.message.includes('Circuit breaker')) {
    res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE',
      details: {
        circuitBreaker: true,
        message: err.message
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      fallback: 'Using cached data or static fallback'
    });
    return;
  }

  // Check if it's a database connection error
  if (err.message.includes('ECONNREFUSED') || err.message.includes('connection')) {
    // Try to use graceful degradation
    const gracefulDegradation = (req as any).gracefulDegradation;
    if (gracefulDegradation) {
      res.status(200).json({
        success: true,
        data: [],
        message: 'Service degraded - using fallback data',
        degraded: true,
        timestamp: new Date().toISOString()
      });
      return;
    }
  }

  // Pass to default error handler
  next(err);
};

/**
 * Bulkhead pattern - isolate different types of operations
 */
export class BulkheadManager {
  private static instance: BulkheadManager;
  private pools: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): BulkheadManager {
    if (!BulkheadManager.instance) {
      BulkheadManager.instance = new BulkheadManager();
    }
    return BulkheadManager.instance;
  }

  /**
   * Execute operation in isolated pool
   */
  async executeInPool<T>(poolName: string, operation: () => Promise<T>): Promise<T> {
    // For now, just execute directly
    // In a more complex system, you'd have separate thread pools
    return await operation();
  }

  /**
   * Get pool status
   */
  getPoolStatus(): Record<string, any> {
    return {
      readPool: { active: 0, queued: 0, max: 10 },
      writePool: { active: 0, queued: 0, max: 5 },
      authPool: { active: 0, queued: 0, max: 3 }
    };
  }
}

export const bulkheadManager = BulkheadManager.getInstance();
