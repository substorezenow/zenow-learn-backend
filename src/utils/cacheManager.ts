import Redis from 'redis';

// Enhanced Redis cache manager with automatic fallback
export class CacheManager {
  private static instance: CacheManager;
  private redis: Redis.RedisClientType | null = null;
  private isConnected = false;
  private readonly DEFAULT_TTL = 3600; // 1 hour in seconds

  private constructor() {}

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected && this.redis) {
      return;
    }

    try {
      this.redis = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.warn('Redis connection failed after 10 retries, disabling cache');
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.redis.on('error', (err) => {
        console.warn('Redis error:', err);
        this.isConnected = false;
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.redis.on('disconnect', () => {
        console.warn('Redis disconnected');
        this.isConnected = false;
      });

      await this.redis.connect();
    } catch (error) {
      console.warn('Redis connection failed, continuing without cache:', error);
      this.isConnected = false;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.redis) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('Redis get error:', error);
      return null;
    }
  }

  public async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      await this.redis.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('Redis set error:', error);
      return false;
    }
  }

  public async del(key: string): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.warn('Redis delete error:', error);
      return false;
    }
  }

  public async delPattern(pattern: string): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
      return true;
    } catch (error) {
      console.warn('Redis delete pattern error:', error);
      return false;
    }
  }

  public async exists(key: string): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.warn('Redis exists error:', error);
      return false;
    }
  }

  public async flush(): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      await this.redis.flushAll();
      return true;
    } catch (error) {
      console.warn('Redis flush error:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
      console.log('🔌 Redis connection closed');
    }
  }

  public isHealthy(): boolean {
    return this.isConnected && this.redis !== null;
  }

  // Cache key generators
  public static generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  // Specific cache methods for different data types
  public async cacheCategories(categories: any[]): Promise<void> {
    await this.set('categories:all', categories, 1800); // 30 minutes
  }

  public async getCachedCategories(): Promise<any[] | null> {
    return await this.get('categories:all');
  }

  public async cacheFields(fields: any[]): Promise<void> {
    await this.set('fields:all', fields, 1800); // 30 minutes
  }

  public async getCachedFields(): Promise<any[] | null> {
    return await this.get('fields:all');
  }

  public async cacheCourses(courses: any[], filters?: any): Promise<void> {
    const key = filters ? `courses:filtered:${JSON.stringify(filters)}` : 'courses:all';
    await this.set(key, courses, 900); // 15 minutes
  }

  public async getCachedCourses(filters?: any): Promise<any[] | null> {
    const key = filters ? `courses:filtered:${JSON.stringify(filters)}` : 'courses:all';
    return await this.get(key);
  }

  public async cacheCourse(courseId: number, course: any): Promise<void> {
    await this.set(`course:${courseId}`, course, 1800); // 30 minutes
  }

  public async getCachedCourse(courseId: number): Promise<any | null> {
    return await this.get(`course:${courseId}`);
  }

  public async invalidateCourseCache(courseId?: number): Promise<void> {
    if (courseId) {
      await this.del(`course:${courseId}`);
    }
    await this.delPattern('courses:*');
  }

  public async invalidateCategoryCache(): Promise<void> {
    await this.del('categories:all');
    await this.delPattern('fields:*');
    await this.delPattern('courses:*');
  }

  public async invalidateFieldCache(): Promise<void> {
    await this.del('fields:all');
    await this.delPattern('courses:*');
  }
}

// Singleton instance
export const cacheManager = CacheManager.getInstance();
