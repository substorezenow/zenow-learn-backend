import { EventEmitter } from 'events';

/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by monitoring service health and failing fast
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing fast, not calling service
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening circuit
  recoveryTimeout: number;     // Time to wait before trying again (ms)
  monitoringPeriod: number;   // Time window for failure counting (ms)
  expectedVolume: number;      // Minimum requests needed for circuit to open
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  totalRequests: number;
  failureRate: number;
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime?: Date;
  private nextAttemptTime?: Date;
  private totalRequests: number = 0;
  private config: CircuitBreakerConfig;
  private monitoringWindow: Date[] = [];

  constructor(
    private name: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    super();
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 30000, // 30 seconds
      monitoringPeriod: 60000, // 1 minute
      expectedVolume: 10,
      ...config
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.emit('stateChange', { from: CircuitState.OPEN, to: CircuitState.HALF_OPEN });
      } else {
        this.emit('circuitOpen', { name: this.name, nextAttempt: this.nextAttemptTime });
        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    this.totalRequests++;
    this.monitoringWindow.push(new Date());

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.failures = 0;
      this.emit('stateChange', { from: CircuitState.HALF_OPEN, to: CircuitState.CLOSED });
      this.emit('circuitClosed', { name: this.name });
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.shouldOpenCircuit()) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
      this.emit('stateChange', { from: CircuitState.CLOSED, to: CircuitState.OPEN });
      this.emit('circuitOpen', { name: this.name, nextAttempt: this.nextAttemptTime });
    }
  }

  private shouldOpenCircuit(): boolean {
    // Clean old monitoring data
    this.cleanMonitoringWindow();
    
    // Need minimum volume of requests
    if (this.monitoringWindow.length < this.config.expectedVolume) {
      return false;
    }

    // Check failure threshold
    const recentFailures = this.monitoringWindow.length - this.successes;
    return recentFailures >= this.config.failureThreshold;
  }

  private shouldAttemptReset(): boolean {
    return this.nextAttemptTime ? Date.now() >= this.nextAttemptTime.getTime() : false;
  }

  private cleanMonitoringWindow(): void {
    const cutoff = new Date(Date.now() - this.config.monitoringPeriod);
    this.monitoringWindow = this.monitoringWindow.filter(time => time > cutoff);
  }

  getStats(): CircuitBreakerStats {
    this.cleanMonitoringWindow();
    const failureRate = this.totalRequests > 0 ? (this.failures / this.totalRequests) * 100 : 0;

    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      totalRequests: this.totalRequests,
      failureRate
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    this.totalRequests = 0;
    this.monitoringWindow = [];
    this.emit('circuitReset', { name: this.name });
  }
}

/**
 * Circuit Breaker Manager - Singleton for managing multiple circuit breakers
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private breakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {}

  public static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  public getBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(name, config);
      this.breakers.set(name, breaker);
    }
    return this.breakers.get(name)!;
  }

  public getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }

  public resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }
}

// Singleton instance
export const circuitBreakerManager = CircuitBreakerManager.getInstance();

// Predefined circuit breakers for common services
export const circuitBreakers = {
  database: circuitBreakerManager.getBreaker('database', {
    failureThreshold: 3,
    recoveryTimeout: 15000,
    monitoringPeriod: 30000,
    expectedVolume: 5
  }),
  
  cache: circuitBreakerManager.getBreaker('cache', {
    failureThreshold: 5,
    recoveryTimeout: 10000,
    monitoringPeriod: 60000,
    expectedVolume: 10
  }),
  
  auth: circuitBreakerManager.getBreaker('auth', {
    failureThreshold: 3,
    recoveryTimeout: 20000,
    monitoringPeriod: 30000,
    expectedVolume: 5
  }),
  
  externalApi: circuitBreakerManager.getBreaker('externalApi', {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 120000,
    expectedVolume: 20
  })
};
