import express from 'express';
import { dbManager } from '../utils/databaseManager';
import { cacheManager } from '../utils/cacheManager';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Check database health
    const dbHealthy = await dbManager.healthCheck();
    const dbStatus = dbManager.getConnectionStatus();
    const dbStats = dbManager.getPoolStats();
    
    // Check cache health
    const cacheHealthy = cacheManager.isHealthy();
    
    const healthStatus = {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          connected: dbStatus.connected,
          attempts: dbStatus.attempts,
          retryCount: dbStatus.retryCount,
          poolStats: dbStats
        },
        cache: {
          status: cacheHealthy ? 'healthy' : 'unavailable',
          connected: cacheHealthy
        }
      },
      security: {
        sessionManagement: true,
        rateLimiting: true,
        securityMonitoring: true,
        csrfProtection: true,
        enhancedHeaders: true
      }
    };
    
    const statusCode = dbHealthy ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      services: {
        database: { status: 'unhealthy', error: (error as Error).message },
        cache: { status: 'unknown' }
      }
    });
  }
});

export default router;
