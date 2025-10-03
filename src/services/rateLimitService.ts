import { Pool } from 'pg';

// Enterprise-grade rate limiting service
export class RateLimitService {
  private pool: Pool;
  private memoryCache: Map<string, { count: number; resetTime: number }> = new Map();
  
  // Rate limit configurations
  private readonly RATE_LIMITS = {
    login: { requests: 5, window: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
    api: { requests: 100, window: 60 * 1000 }, // 100 requests per minute
    admin: { requests: 200, window: 60 * 1000 }, // 200 requests per minute for admin
    password_reset: { requests: 3, window: 60 * 60 * 1000 }, // 3 attempts per hour
  };

  constructor(pool: Pool) {
    this.pool = pool;
    this.initializeCleanup();
  }

  // Check rate limit for endpoint
  async checkRateLimit(
    identifier: string, 
    endpoint: string, 
    ip?: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number; reason?: string }> {
    try {
      const config = this.RATE_LIMITS[endpoint as keyof typeof this.RATE_LIMITS] || this.RATE_LIMITS.api;
      const key = `${identifier}:${endpoint}`;
      
      // Check memory cache first
      const cached = this.memoryCache.get(key);
      const now = Date.now();
      
      if (cached && now < cached.resetTime) {
        if (cached.count >= config.requests) {
          await this.logRateLimitViolation(identifier, endpoint, ip);
          return {
            allowed: false,
            remaining: 0,
            resetTime: cached.resetTime,
            reason: 'Rate limit exceeded'
          };
        }
        
        cached.count++;
        return {
          allowed: true,
          remaining: config.requests - cached.count,
          resetTime: cached.resetTime
        };
      }

      // Check database
      const result = await this.pool.query(
        `SELECT request_count, window_start, blocked_until 
         FROM rate_limits 
         WHERE identifier = $1 AND endpoint = $2`,
        [identifier, endpoint]
      );

      if (result.rows.length > 0) {
        const record = result.rows[0];
        const windowStart = new Date(record.window_start).getTime();
        const blockedUntil = record.blocked_until ? new Date(record.blocked_until).getTime() : 0;
        
        // Check if still blocked
        if (blockedUntil > now) {
          await this.logRateLimitViolation(identifier, endpoint, ip);
          return {
            allowed: false,
            remaining: 0,
            resetTime: blockedUntil,
            reason: 'Account temporarily blocked'
          };
        }
        
        // Check if within window
        if (now - windowStart < config.window) {
          if (record.request_count >= config.requests) {
            // Block for extended period
            const blockUntil = now + (config.window * 2);
            await this.pool.query(
              `UPDATE rate_limits 
               SET blocked_until = $1, request_count = request_count + 1 
               WHERE identifier = $2 AND endpoint = $3`,
              [new Date(blockUntil), identifier, endpoint]
            );
            
            await this.logRateLimitViolation(identifier, endpoint, ip);
            return {
              allowed: false,
              remaining: 0,
              resetTime: blockUntil,
              reason: 'Rate limit exceeded - account blocked'
            };
          }
          
          // Update count
          await this.pool.query(
            `UPDATE rate_limits 
             SET request_count = request_count + 1 
             WHERE identifier = $1 AND endpoint = $2`,
            [identifier, endpoint]
          );
          
          const remaining = config.requests - record.request_count - 1;
          const resetTime = windowStart + config.window;
          
          // Update cache
          this.memoryCache.set(key, {
            count: record.request_count + 1,
            resetTime: resetTime
          });
          
          return {
            allowed: true,
            remaining: Math.max(0, remaining),
            resetTime: resetTime
          };
        }
      }

      // Create new record
      const resetTime = now + config.window;
      await this.pool.query(
        `INSERT INTO rate_limits (identifier, endpoint, request_count, window_start) 
         VALUES ($1, $2, 1, $3) 
         ON CONFLICT (identifier, endpoint) 
         DO UPDATE SET request_count = 1, window_start = $3, blocked_until = NULL`,
        [identifier, endpoint, new Date(now)]
      );

      // Update cache
      this.memoryCache.set(key, {
        count: 1,
        resetTime: resetTime
      });

      return {
        allowed: true,
        remaining: config.requests - 1,
        resetTime: resetTime
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remaining: 999,
        resetTime: Date.now() + 60000
      };
    }
  }

  // Log rate limit violations
  private async logRateLimitViolation(identifier: string, endpoint: string, ip?: string): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO security_events (event_type, event_data, ip_address) 
         VALUES ($1, $2, $3)`,
        ['RATE_LIMIT_EXCEEDED', JSON.stringify({
          identifier,
          endpoint,
          timestamp: new Date().toISOString()
        }), ip]
      );
    } catch (error) {
      console.error('Rate limit violation logging failed:', error);
    }
  }

  // Reset rate limit for identifier
  async resetRateLimit(identifier: string, endpoint?: string): Promise<void> {
    try {
      if (endpoint) {
        await this.pool.query(
          'DELETE FROM rate_limits WHERE identifier = $1 AND endpoint = $2',
          [identifier, endpoint]
        );
        this.memoryCache.delete(`${identifier}:${endpoint}`);
      } else {
        await this.pool.query(
          'DELETE FROM rate_limits WHERE identifier = $1',
          [identifier]
        );
        // Clear all cache entries for this identifier
        for (const key of this.memoryCache.keys()) {
          if (key.startsWith(`${identifier}:`)) {
            this.memoryCache.delete(key);
          }
        }
      }
    } catch (error) {
      console.error('Rate limit reset failed:', error);
    }
  }

  // Get rate limit status
  async getRateLimitStatus(identifier: string, endpoint: string): Promise<any> {
    try {
      const result = await this.pool.query(
        `SELECT request_count, window_start, blocked_until 
         FROM rate_limits 
         WHERE identifier = $1 AND endpoint = $2`,
        [identifier, endpoint]
      );

      if (result.rows.length === 0) {
        return { count: 0, blocked: false };
      }

      const record = result.rows[0];
      const now = Date.now();
      const windowStart = new Date(record.window_start).getTime();
      const blockedUntil = record.blocked_until ? new Date(record.blocked_until).getTime() : 0;
      
      return {
        count: record.request_count,
        blocked: blockedUntil > now,
        blockedUntil: blockedUntil > now ? blockedUntil : null,
        windowStart: windowStart
      };
    } catch (error) {
      console.error('Rate limit status check failed:', error);
      return { count: 0, blocked: false };
    }
  }

  // Initialize cleanup process
  private initializeCleanup(): void {
    setInterval(() => {
      try {
        // Clean expired cache entries
        const now = Date.now();
        for (const [key, value] of this.memoryCache.entries()) {
          if (now >= value.resetTime) {
            this.memoryCache.delete(key);
          }
        }
      } catch (error) {
        console.error('Rate limit cleanup failed:', error);
      }
    }, 60 * 1000); // Run every minute
  }
}
