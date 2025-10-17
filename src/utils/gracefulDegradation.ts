import { Request, Response, NextFunction } from 'express';
import { circuitBreakers } from './circuitBreaker';
import { dbManager } from './databaseManager';
import { cacheManager } from './cacheManager';
import { logger } from './logger';

/**
 * Graceful Degradation Service
 * Provides fallback mechanisms when services are unavailable
 */
export class GracefulDegradationService {
  private static instance: GracefulDegradationService;
  private fallbackData: Map<string, any> = new Map();
  private lastUpdateTime: Map<string, Date> = new Map();

  private constructor() {}

  public static getInstance(): GracefulDegradationService {
    if (!GracefulDegradationService.instance) {
      GracefulDegradationService.instance = new GracefulDegradationService();
    }
    return GracefulDegradationService.instance;
  }

  /**
   * Get categories with database circuit breaker and fallback
   */
  async getCategoriesWithFallback(): Promise<any[]> {
    try {
      return await circuitBreakers.database.execute(async () => {
        const result = await dbManager.query(`
          SELECT id, name, slug, description, icon_url, banner_image, is_active, sort_order, created_at, updated_at
          FROM categories 
          WHERE is_active = true 
          ORDER BY sort_order ASC, name ASC
        `);
        return result.rows;
      }, () => {
        // Fallback to cached data or static data
        return this.getFallbackCategories();
      });
    } catch (error) {
      logger.error('Failed to get categories, using fallback', error as Error);
      return this.getFallbackCategories();
    }
  }

  /**
   * Get fields with database circuit breaker and fallback
   */
  async getFieldsWithFallback(): Promise<any[]> {
    try {
      return await circuitBreakers.database.execute(async () => {
        const result = await dbManager.query(`
          SELECT f.id, f.name, f.slug, f.description, f.icon_url, f.banner_image, f.is_active, f.sort_order,
                 c.name as category_name, c.slug as category_slug,
                 COUNT(co.id) as course_count
          FROM fields f
          LEFT JOIN categories c ON f.category_id = c.id
          LEFT JOIN courses co ON f.id = co.field_id AND co.is_published = true
          WHERE f.is_active = true
          GROUP BY f.id, c.name, c.slug
          ORDER BY f.sort_order ASC, f.name ASC
        `);
        return result.rows;
      }, () => {
        return this.getFallbackFields();
      });
    } catch (error) {
      logger.error('Failed to get fields, using fallback', error as Error);
      return this.getFallbackFields();
    }
  }

  /**
   * Get courses with database circuit breaker and fallback
   */
  async getCoursesWithFallback(filters: any = {}): Promise<any[]> {
    try {
      return await circuitBreakers.database.execute(async () => {
        let query = `
          SELECT c.id, c.title, c.slug, c.description, c.short_description, c.banner_image, c.thumbnail_image,
                 c.duration_hours, c.difficulty_level, c.price, c.is_free, c.is_published,
                 f.name as field_name, f.slug as field_slug,
                 cat.name as category_name, cat.slug as category_slug,
                 u.username as instructor_name, u.email as instructor_email,
                 c.rating, c.total_ratings, c.enrolled_students,
                 c.created_at, c.updated_at
          FROM courses c
          LEFT JOIN fields f ON c.field_id = f.id
          LEFT JOIN categories cat ON f.category_id = cat.id
          LEFT JOIN users u ON c.instructor_id = u.id
          WHERE c.is_published = true
        `;
        
        const params: any[] = [];
        let paramCount = 0;

        if (filters.category_id) {
          query += ` AND cat.id = $${++paramCount}`;
          params.push(filters.category_id);
        }

        if (filters.field_id) {
          query += ` AND f.id = $${++paramCount}`;
          params.push(filters.field_id);
        }

        if (filters.difficulty_level) {
          query += ` AND c.difficulty_level = $${++paramCount}`;
          params.push(filters.difficulty_level);
        }

        if (filters.is_free !== undefined) {
          query += ` AND c.is_free = $${++paramCount}`;
          params.push(filters.is_free);
        }

        if (filters.search) {
          query += ` AND (c.title ILIKE $${++paramCount} OR c.description ILIKE $${++paramCount})`;
          const searchTerm = `%${filters.search}%`;
          params.push(searchTerm, searchTerm);
        }

        query += ` ORDER BY c.created_at DESC`;

        if (filters.limit) {
          query += ` LIMIT $${++paramCount}`;
          params.push(filters.limit);
        }

        const result = await dbManager.query(query, params);
        return result.rows;
      }, () => {
        return this.getFallbackCourses();
      });
    } catch (error) {
      logger.error('Failed to get courses, using fallback', error as Error);
      return this.getFallbackCourses();
    }
  }

  /**
   * Cache data for fallback scenarios
   */
  async cacheFallbackData(): Promise<void> {
    try {
      // Cache categories
      const categories = await this.getCategoriesWithFallback();
      this.fallbackData.set('categories', categories);
      this.lastUpdateTime.set('categories', new Date());

      // Cache fields
      const fields = await this.getFieldsWithFallback();
      this.fallbackData.set('fields', fields);
      this.lastUpdateTime.set('fields', new Date());

      // Cache courses
      const courses = await this.getCoursesWithFallback();
      this.fallbackData.set('courses', courses);
      this.lastUpdateTime.set('courses', new Date());

      logger.info('Fallback data cached successfully');
    } catch (error) {
      logger.error('Failed to cache fallback data', error as Error);
    }
  }

  /**
   * Get fallback categories (static data)
   */
  private getFallbackCategories(): any[] {
    const cached = this.fallbackData.get('categories');
    if (cached && this.isDataFresh('categories', 300000)) { // 5 minutes
      return cached;
    }

    // Static fallback data
    return [
      {
        id: 1,
        name: 'General Education',
        slug: 'general-education',
        description: 'Basic education courses for fundamental learning',
        icon_url: '/icons/general.svg',
        banner_image: '/banners/general.jpg',
        is_active: true,
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Engineering',
        slug: 'engineering',
        description: 'Technical and engineering courses',
        icon_url: '/icons/engineering.svg',
        banner_image: '/banners/engineering.jpg',
        is_active: true,
        sort_order: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  /**
   * Get fallback fields (static data)
   */
  private getFallbackFields(): any[] {
    const cached = this.fallbackData.get('fields');
    if (cached && this.isDataFresh('fields', 300000)) { // 5 minutes
      return cached;
    }

    return [
      {
        id: 1,
        name: 'Computer Science',
        slug: 'computer-science',
        description: 'Programming and computer science courses',
        category_name: 'Engineering',
        category_slug: 'engineering',
        course_count: 0,
        is_active: true,
        sort_order: 1
      }
    ];
  }

  /**
   * Get fallback courses (static data)
   */
  private getFallbackCourses(): any[] {
    const cached = this.fallbackData.get('courses');
    if (cached && this.isDataFresh('courses', 300000)) { // 5 minutes
      return cached;
    }

    return [
      {
        id: 1,
        title: 'Introduction to Programming',
        slug: 'intro-programming',
        description: 'Learn the basics of programming',
        short_description: 'Programming fundamentals',
        difficulty_level: 'beginner',
        price: 0,
        is_free: true,
        is_published: true,
        field_name: 'Computer Science',
        category_name: 'Engineering',
        instructor_name: 'System',
        rating: 4.5,
        total_ratings: 0,
        enrolled_students: 0
      }
    ];
  }

  /**
   * Check if cached data is still fresh
   */
  private isDataFresh(key: string, maxAge: number): boolean {
    const lastUpdate = this.lastUpdateTime.get(key);
    if (!lastUpdate) return false;
    
    return Date.now() - lastUpdate.getTime() < maxAge;
  }

  /**
   * Get system health status
   */
  getHealthStatus(): any {
    return {
      database: circuitBreakers.database.getStats(),
      cache: circuitBreakers.cache.getStats(),
      auth: circuitBreakers.auth.getStats(),
      fallbackData: {
        categories: this.fallbackData.has('categories'),
        fields: this.fallbackData.has('fields'),
        courses: this.fallbackData.has('courses')
      },
      lastCacheUpdate: {
        categories: this.lastUpdateTime.get('categories'),
        fields: this.lastUpdateTime.get('fields'),
        courses: this.lastUpdateTime.get('courses')
      }
    };
  }
}

// Singleton instance
export const gracefulDegradation = GracefulDegradationService.getInstance();

/**
 * Middleware for graceful degradation
 */
export const gracefulDegradationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Add graceful degradation service to request
  (req as any).gracefulDegradation = gracefulDegradation;
  
  // Add circuit breaker stats to response headers
  const stats = gracefulDegradation.getHealthStatus();
  res.set('X-System-Health', JSON.stringify({
    database: stats.database.state,
    cache: stats.cache.state,
    auth: stats.auth.state
  }));
  
  next();
};

/**
 * Health check endpoint with circuit breaker status
 */
export const healthCheckWithCircuitBreakers = async (req: Request, res: Response): Promise<void> => {
  const health = gracefulDegradation.getHealthStatus();
  
  const isHealthy = 
    health.database.state === 'CLOSED' || health.database.state === 'HALF_OPEN' &&
    health.cache.state === 'CLOSED' || health.cache.state === 'HALF_OPEN' &&
    health.auth.state === 'CLOSED' || health.auth.state === 'HALF_OPEN';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: health.database.state === 'CLOSED' ? 'healthy' : 'degraded',
        ...health.database
      },
      cache: {
        status: health.cache.state === 'CLOSED' ? 'healthy' : 'degraded',
        ...health.cache
      },
      auth: {
        status: health.auth.state === 'CLOSED' ? 'healthy' : 'degraded',
        ...health.auth
      }
    },
    fallbackData: health.fallbackData,
    message: isHealthy ? 'All systems operational' : 'Some services are degraded, using fallback mechanisms'
  });
};
