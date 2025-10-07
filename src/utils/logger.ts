import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

/**
 * Enhanced structured logging service with comprehensive monitoring
 * Maintains exact same input/output interfaces while adding enterprise features
 */
export class LoggerService {
  private static instance: LoggerService;
  private logger: winston.Logger;
  private metrics: Map<string, number> = new Map();

  private constructor() {
    // Create transports array
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ];

    // Only add file transports if we can write to the logs directory
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Try to create logs directory
      if (!fs.existsSync('logs')) {
        fs.mkdirSync('logs', { recursive: true });
      }
      
      // Test if we can write to the logs directory
      const testFile = path.join('logs', 'test-write.tmp');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      // If we can write, add file transports
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      );
      
      console.log('✅ File logging enabled - logs directory accessible');
    } catch (error: any) {
      console.log('⚠️ File logging disabled - logs directory not accessible:', error.message);
      console.log('📝 Using console logging only (suitable for Cloud Run)');
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta,
            service: 'zenow-learn-backend',
            version: process.env.npm_package_version || '1.0.0'
          });
        })
      ),
      defaultMeta: {
        service: 'zenow-learn-backend',
        environment: process.env.NODE_ENV || 'development'
      },
      transports
    });
  }

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  /**
   * Log info message with structured data
   */
  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Log error message with structured data
   */
  public error(message: string, error?: Error, meta?: any): void {
    this.logger.error(message, {
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      ...meta
    });
  }

  /**
   * Log warning message with structured data
   */
  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log debug message with structured data
   */
  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log security event with enhanced context
   */
  public security(eventType: string, data: any, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'): void {
    this.logger.warn('Security Event', {
      eventType,
      severity,
      securityEvent: true,
      ...data
    });
  }

  /**
   * Log performance metrics
   */
  public performance(operation: string, duration: number, meta?: any): void {
    this.logger.info('Performance Metric', {
      operation,
      duration,
      performanceMetric: true,
      ...meta
    });
  }

  /**
   * Log database query with performance data
   */
  public databaseQuery(query: string, duration: number, params?: any[]): void {
    this.logger.debug('Database Query', {
      query: query.substring(0, 200), // Truncate long queries
      duration,
      params: params ? params.length : 0,
      databaseQuery: true
    });
  }

  /**
   * Log API request with comprehensive context
   */
  public apiRequest(req: Request, res: Response, duration: number): void {
    this.logger.info('API Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: (req as any).user?.id,
      apiRequest: true
    });
  }

  /**
   * Increment counter metric
   */
  public incrementCounter(metric: string, value: number = 1): void {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
  }

  /**
   * Set gauge metric
   */
  public setGauge(metric: string, value: number): void {
    this.metrics.set(metric, value);
  }

  /**
   * Get all metrics
   */
  public getMetrics(): Map<string, number> {
    return new Map(this.metrics);
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics.clear();
  }
}

// Singleton instance
export const logger = LoggerService.getInstance();

/**
 * Enhanced request logging middleware
 * Maintains exact same interface while adding comprehensive logging
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Log request start
  logger.info('Request Started', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): any {
    const duration = Date.now() - startTime;
    
    // Log API request with performance data
    logger.apiRequest(req, res, duration);
    
    // Increment request counter
    logger.incrementCounter('requests_total');
    logger.incrementCounter(`requests_${req.method.toLowerCase()}_total`);
    logger.incrementCounter(`requests_status_${res.statusCode}_total`);
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow Request', {
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode
      });
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Enhanced error logging middleware
 * Maintains exact same interface while adding comprehensive error tracking
 */
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  // Log error with comprehensive context
  logger.error('Request Error', err, {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Increment error counter
  logger.incrementCounter('errors_total');
  logger.incrementCounter(`errors_${err.name}_total`);

  next(err);
};

/**
 * Performance monitoring middleware
 * New middleware - doesn't change existing interfaces
 */
export const performanceMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Log performance metrics
    logger.performance(`${req.method} ${req.url}`, duration, {
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length')
    });

    // Set performance gauges
    logger.setGauge('request_duration_ms', duration);
    logger.setGauge('request_duration_ms_max', Math.max(logger.getMetrics().get('request_duration_ms_max') || 0, duration));
  });

  next();
};

/**
 * Database query logger
 * New utility - doesn't change existing interfaces
 */
export const logDatabaseQuery = (query: string, duration: number, params?: any[]): void => {
  logger.databaseQuery(query, duration, params);
  
  // Increment query counters
  logger.incrementCounter('database_queries_total');
  logger.incrementCounter('database_query_duration_total', duration);
  
  // Log slow queries
  if (duration > 1000) {
    logger.warn('Slow Database Query', {
      query: query.substring(0, 200),
      duration,
      params: params ? params.length : 0
    });
  }
};

/**
 * Security event logger
 * New utility - doesn't change existing interfaces
 */
export const logSecurityEvent = (
  eventType: string,
  data: any,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
): void => {
  logger.security(eventType, data, severity);
  
  // Increment security counters
  logger.incrementCounter('security_events_total');
  logger.incrementCounter(`security_events_${severity.toLowerCase()}_total`);
  logger.incrementCounter(`security_events_${eventType}_total`);
};

/**
 * Health check logger
 * New utility - doesn't change existing interfaces
 */
export const logHealthCheck = (status: 'healthy' | 'unhealthy', details: any): void => {
  logger.info('Health Check', {
    status,
    healthCheck: true,
    ...details
  });
  
  logger.setGauge('health_status', status === 'healthy' ? 1 : 0);
};

/**
 * Application startup logger
 * New utility - doesn't change existing interfaces
 */
export const logApplicationStart = (port: number, environment: string): void => {
  logger.info('Application Started', {
    port,
    environment,
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    pid: process.pid,
    applicationStart: true
  });
  
  logger.setGauge('application_uptime', Date.now());
};

/**
 * Graceful shutdown logger
 * New utility - doesn't change existing interfaces
 */
export const logApplicationShutdown = (signal: string): void => {
  logger.info('Application Shutting Down', {
    signal,
    uptime: process.uptime(),
    applicationShutdown: true
  });
};

/**
 * Memory usage logger
 * New utility - doesn't change existing interfaces
 */
export const logMemoryUsage = (): void => {
  const memUsage = process.memoryUsage();
  
  logger.info('Memory Usage', {
    rss: memUsage.rss,
    heapTotal: memUsage.heapTotal,
    heapUsed: memUsage.heapUsed,
    external: memUsage.external,
    arrayBuffers: memUsage.arrayBuffers,
    memoryUsage: true
  });
  
  // Set memory gauges
  logger.setGauge('memory_rss_mb', Math.round(memUsage.rss / 1024 / 1024));
  logger.setGauge('memory_heap_used_mb', Math.round(memUsage.heapUsed / 1024 / 1024));
  logger.setGauge('memory_heap_total_mb', Math.round(memUsage.heapTotal / 1024 / 1024));
};

/**
 * CPU usage logger
 * New utility - doesn't change existing interfaces
 */
export const logCPUUsage = (): void => {
  const cpuUsage = process.cpuUsage();
  
  logger.info('CPU Usage', {
    user: cpuUsage.user,
    system: cpuUsage.system,
    cpuUsage: true
  });
  
  logger.setGauge('cpu_user_microseconds', cpuUsage.user);
  logger.setGauge('cpu_system_microseconds', cpuUsage.system);
};

// Export the logger instance for backward compatibility
export default logger;
