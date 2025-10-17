import { EventEmitter } from 'events';
import { logger } from './logger';

/**
 * Process Crash Prevention System
 * Prevents the entire application from crashing due to uncaught exceptions
 */
export class CrashPreventionSystem extends EventEmitter {
  private static instance: CrashPreventionSystem;
  private crashCount = 0;
  private maxCrashes = 5;
  private crashWindow = 60000; // 1 minute
  private crashTimestamps: number[] = [];
  private isShuttingDown = false;

  private constructor() {
    super();
    this.setupCrashHandlers();
  }

  public static getInstance(): CrashPreventionSystem {
    if (!CrashPreventionSystem.instance) {
      CrashPreventionSystem.instance = new CrashPreventionSystem();
    }
    return CrashPreventionSystem.instance;
  }

  /**
   * Setup comprehensive crash handlers
   */
  private setupCrashHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.handleUncaughtException(error);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.handleUnhandledRejection(reason, promise);
    });

    // Handle warnings
    process.on('warning', (warning: Error) => {
      this.handleWarning(warning);
    });

    // Handle process exit
    process.on('exit', (code: number) => {
      this.handleProcessExit(code);
    });

    // Handle SIGTERM (termination signal)
    process.on('SIGTERM', () => {
      this.handleGracefulShutdown('SIGTERM');
    });

    // Handle SIGINT (interrupt signal)
    process.on('SIGINT', () => {
      this.handleGracefulShutdown('SIGINT');
    });

    // Handle SIGUSR1 (user-defined signal)
    process.on('SIGUSR1', () => {
      this.handleGracefulShutdown('SIGUSR1');
    });

    // Handle SIGHUP (hangup signal)
    process.on('SIGHUP', () => {
      this.handleGracefulShutdown('SIGHUP');
    });

    logger.info('Crash prevention system initialized');
  }

  /**
   * Handle uncaught exceptions - prevent process crash
   */
  private handleUncaughtException(error: Error): void {
    this.crashCount++;
    this.crashTimestamps.push(Date.now());

    // Clean old crash timestamps
    this.crashTimestamps = this.crashTimestamps.filter(
      timestamp => Date.now() - timestamp < this.crashWindow
    );

    logger.error('Uncaught Exception - Preventing Process Crash', error, {
      crashCount: this.crashCount,
      recentCrashes: this.crashTimestamps.length,
      maxCrashes: this.maxCrashes,
      stack: error.stack
    });

    // Emit crash event for monitoring
    this.emit('crash', {
      type: 'uncaughtException',
      error: error.message,
      stack: error.stack,
      crashCount: this.crashCount
    });

    // Check if we should restart or continue
    if (this.shouldRestartProcess()) {
      logger.error('Too many crashes, initiating graceful restart');
      this.initiateGracefulRestart();
    } else {
      logger.warn('Continuing operation despite uncaught exception');
      // Don't exit - let the process continue
    }
  }

  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection(reason: any, promise: Promise<any>): void {
    logger.error('Unhandled Promise Rejection', new Error(reason), {
      reason: reason,
      promise: promise.toString()
    });

    this.emit('rejection', {
      type: 'unhandledRejection',
      reason: reason,
      promise: promise
    });

    // Don't exit on unhandled rejections
    logger.warn('Continuing operation despite unhandled promise rejection');
  }

  /**
   * Handle warnings
   */
  private handleWarning(warning: Error): void {
    logger.warn('Process Warning', {
      name: warning.name,
      message: warning.message
    });

    this.emit('warning', {
      type: 'warning',
      warning: warning.message
    });
  }

  /**
   * Handle process exit
   */
  private handleProcessExit(code: number): void {
    logger.info('Process exiting', {
      exitCode: code,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    });

    this.emit('exit', {
      type: 'exit',
      code: code,
      uptime: process.uptime()
    });
  }

  /**
   * Handle graceful shutdown
   */
  private handleGracefulShutdown(signal: string): void {
    if (this.isShuttingDown) {
      logger.warn('Already shutting down, ignoring signal', { signal });
      return;
    }

    this.isShuttingDown = true;
    logger.info('Graceful shutdown initiated', { signal });

    this.emit('shutdown', {
      type: 'shutdown',
      signal: signal,
      uptime: process.uptime()
    });

    // Give time for cleanup
    setTimeout(() => {
      logger.info('Graceful shutdown completed');
      process.exit(0);
    }, 5000); // 5 seconds for cleanup
  }

  /**
   * Check if process should restart due to too many crashes
   */
  private shouldRestartProcess(): boolean {
    return this.crashTimestamps.length >= this.maxCrashes;
  }

  /**
   * Initiate graceful restart
   */
  private initiateGracefulRestart(): void {
    logger.error('Initiating graceful restart due to excessive crashes');
    
    // Emit restart event
    this.emit('restart', {
      type: 'restart',
      reason: 'excessive_crashes',
      crashCount: this.crashCount
    });

    // Give time for cleanup before restart
    setTimeout(() => {
      process.exit(1); // Exit with error code to trigger restart
    }, 2000);
  }

  /**
   * Get crash statistics
   */
  getCrashStats(): any {
    return {
      totalCrashes: this.crashCount,
      recentCrashes: this.crashTimestamps.length,
      maxCrashes: this.maxCrashes,
      crashWindow: this.crashWindow,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      isShuttingDown: this.isShuttingDown
    };
  }

  /**
   * Reset crash counter
   */
  resetCrashCounter(): void {
    this.crashCount = 0;
    this.crashTimestamps = [];
    logger.info('Crash counter reset');
  }

  /**
   * Set maximum crashes before restart
   */
  setMaxCrashes(maxCrashes: number): void {
    this.maxCrashes = maxCrashes;
    logger.info('Max crashes updated', { maxCrashes });
  }

  /**
   * Set crash window duration
   */
  setCrashWindow(windowMs: number): void {
    this.crashWindow = windowMs;
    logger.info('Crash window updated', { windowMs });
  }
}

// Singleton instance
export const crashPrevention = CrashPreventionSystem.getInstance();

/**
 * Service Isolation Manager
 * Isolates services to prevent cascading failures
 */
export class ServiceIsolationManager {
  private static instance: ServiceIsolationManager;
  private isolatedServices: Map<string, boolean> = new Map();
  private serviceHealth: Map<string, { healthy: boolean; lastCheck: Date }> = new Map();

  private constructor() {}

  public static getInstance(): ServiceIsolationManager {
    if (!ServiceIsolationManager.instance) {
      ServiceIsolationManager.instance = new ServiceIsolationManager();
    }
    return ServiceIsolationManager.instance;
  }

  /**
   * Isolate a service to prevent it from affecting others
   */
  isolateService(serviceName: string, reason: string): void {
    this.isolatedServices.set(serviceName, true);
    this.serviceHealth.set(serviceName, { healthy: false, lastCheck: new Date() });
    
    logger.warn('Service isolated', {
      service: serviceName,
      reason: reason,
      timestamp: new Date().toISOString()
    });

    crashPrevention.emit('serviceIsolated', {
      service: serviceName,
      reason: reason
    });
  }

  /**
   * Restore a service
   */
  restoreService(serviceName: string): void {
    this.isolatedServices.set(serviceName, false);
    this.serviceHealth.set(serviceName, { healthy: true, lastCheck: new Date() });
    
    logger.info('Service restored', {
      service: serviceName,
      timestamp: new Date().toISOString()
    });

    crashPrevention.emit('serviceRestored', {
      service: serviceName
    });
  }

  /**
   * Check if a service is isolated
   */
  isServiceIsolated(serviceName: string): boolean {
    return this.isolatedServices.get(serviceName) || false;
  }

  /**
   * Get service health status
   */
  getServiceHealth(serviceName: string): { healthy: boolean; lastCheck: Date } | null {
    return this.serviceHealth.get(serviceName) || null;
  }

  /**
   * Get all service statuses
   */
  getAllServiceStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};
    
    this.isolatedServices.forEach((isolated, service) => {
      const health = this.serviceHealth.get(service);
      statuses[service] = {
        isolated: isolated,
        healthy: health?.healthy || false,
        lastCheck: health?.lastCheck || null
      };
    });

    return statuses;
  }
}

// Singleton instance
export const serviceIsolation = ServiceIsolationManager.getInstance();

/**
 * Memory Leak Prevention
 * Monitors memory usage and prevents memory-related crashes
 */
export class MemoryLeakPrevention {
  private static instance: MemoryLeakPrevention;
  private memoryThreshold = 500 * 1024 * 1024; // 500MB
  private checkInterval: NodeJS.Timeout | null = null;
  private memoryHistory: number[] = [];
  private maxHistoryLength = 10;

  private constructor() {
    this.startMemoryMonitoring();
  }

  public static getInstance(): MemoryLeakPrevention {
    if (!MemoryLeakPrevention.instance) {
      MemoryLeakPrevention.instance = new MemoryLeakPrevention();
    }
    return MemoryLeakPrevention.instance;
  }

  /**
   * Start monitoring memory usage
   */
  private startMemoryMonitoring(): void {
    this.checkInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Check every 30 seconds

    logger.info('Memory leak prevention started');
  }

  /**
   * Check current memory usage
   */
  private checkMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    
    this.memoryHistory.push(heapUsed);
    
    // Keep only recent history
    if (this.memoryHistory.length > this.maxHistoryLength) {
      this.memoryHistory.shift();
    }

    // Check for memory threshold
    if (heapUsed > this.memoryThreshold) {
      logger.error('Memory threshold exceeded', undefined, {
        heapUsed: heapUsed,
        threshold: this.memoryThreshold,
        memoryUsage: memUsage
      });

      this.handleMemoryPressure();
    }

    // Check for memory leak pattern (increasing trend)
    if (this.memoryHistory.length >= 5) {
      const trend = this.calculateMemoryTrend();
      if (trend > 0.1) { // 10% increase trend
        logger.warn('Potential memory leak detected', {
          trend: trend,
          memoryHistory: this.memoryHistory
        });

        this.handleMemoryLeak();
      }
    }
  }

  /**
   * Calculate memory usage trend
   */
  private calculateMemoryTrend(): number {
    if (this.memoryHistory.length < 2) return 0;
    
    const first = this.memoryHistory[0];
    const last = this.memoryHistory[this.memoryHistory.length - 1];
    
    return (last - first) / first;
  }

  /**
   * Handle memory pressure
   */
  private handleMemoryPressure(): void {
    logger.warn('Handling memory pressure');
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      logger.info('Forced garbage collection');
    }

    // Emit memory pressure event
    crashPrevention.emit('memoryPressure', {
      heapUsed: process.memoryUsage().heapUsed,
      threshold: this.memoryThreshold
    });
  }

  /**
   * Handle potential memory leak
   */
  private handleMemoryLeak(): void {
    logger.warn('Handling potential memory leak');
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    // Emit memory leak event
    crashPrevention.emit('memoryLeak', {
      trend: this.calculateMemoryTrend(),
      memoryHistory: this.memoryHistory
    });
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): any {
    const memUsage = process.memoryUsage();
    return {
      current: memUsage,
      threshold: this.memoryThreshold,
      history: this.memoryHistory,
      trend: this.calculateMemoryTrend(),
      uptime: process.uptime()
    };
  }

  /**
   * Set memory threshold
   */
  setMemoryThreshold(threshold: number): void {
    this.memoryThreshold = threshold;
    logger.info('Memory threshold updated', { threshold });
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logger.info('Memory leak prevention stopped');
  }
}

// Singleton instance
export const memoryLeakPrevention = MemoryLeakPrevention.getInstance();
