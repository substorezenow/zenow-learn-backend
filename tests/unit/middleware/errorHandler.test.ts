import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../src/middleware/errorHandler';
import { ValidationError, AppError } from '../../src/middleware/errorHandler';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Test routes
  app.get('/test-success', (req, res) => {
    res.json({ success: true, data: 'test' });
  });

  app.get('/test-validation-error', (req, res, next) => {
    next(new ValidationError('Validation failed', { field: 'email' }));
  });

  app.get('/test-app-error', (req, res, next) => {
    next(new AppError('Custom error', 400, 'CUSTOM_ERROR'));
  });

  app.get('/test-database-error', (req, res, next) => {
    const error = new Error('ECONNREFUSED');
    next(error);
  });

  app.get('/test-redis-error', (req, res, next) => {
    const error = new Error('Redis connection failed');
    next(error);
  });

  app.get('/test-jwt-error', (req, res, next) => {
    const error = new Error('JsonWebTokenError');
    error.name = 'JsonWebTokenError';
    next(error);
  });

  app.get('/test-token-expired', (req, res, next) => {
    const error = new Error('Token expired');
    error.name = 'TokenExpiredError';
    next(error);
  });

  app.get('/test-syntax-error', (req, res, next) => {
    const error = new SyntaxError('Invalid JSON');
    (error as any).body = 'invalid json';
    next(error);
  });

  app.get('/test-unhandled-error', (req, res, next) => {
    next(new Error('Unhandled error'));
  });

  app.use(errorHandler);
  return app;
};

describe('Error Handler Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('ValidationError handling', () => {
    it('should handle ValidationError with 400 status', async () => {
      const response = await request(app)
        .get('/test-validation-error')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { field: 'email' },
        timestamp: expect.any(String),
        path: '/test-validation-error',
        method: 'GET'
      });
    });
  });

  describe('AppError handling', () => {
    it('should handle AppError with custom status and code', async () => {
      const response = await request(app)
        .get('/test-app-error')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Custom error',
        code: 'CUSTOM_ERROR',
        timestamp: expect.any(String),
        path: '/test-app-error',
        method: 'GET'
      });
    });
  });

  describe('Database error handling', () => {
    it('should handle database connection errors', async () => {
      const response = await request(app)
        .get('/test-database-error')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database connection failed',
        code: 'DATABASE_ERROR',
        timestamp: expect.any(String),
        path: '/test-database-error',
        method: 'GET'
      });
    });
  });

  describe('Cache error handling', () => {
    it('should handle Redis connection errors', async () => {
      const response = await request(app)
        .get('/test-redis-error')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Cache service unavailable',
        code: 'CACHE_ERROR',
        timestamp: expect.any(String),
        path: '/test-redis-error',
        method: 'GET'
      });
    });
  });

  describe('JWT error handling', () => {
    it('should handle JsonWebTokenError', async () => {
      const response = await request(app)
        .get('/test-jwt-error')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid token',
        code: 'UNAUTHORIZED',
        timestamp: expect.any(String),
        path: '/test-jwt-error',
        method: 'GET'
      });
    });

    it('should handle TokenExpiredError', async () => {
      const response = await request(app)
        .get('/test-token-expired')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Token expired',
        code: 'UNAUTHORIZED',
        timestamp: expect.any(String),
        path: '/test-token-expired',
        method: 'GET'
      });
    });
  });

  describe('Syntax error handling', () => {
    it('should handle JSON syntax errors', async () => {
      const response = await request(app)
        .get('/test-syntax-error')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid JSON format',
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
        path: '/test-syntax-error',
        method: 'GET'
      });
    });
  });

  describe('Unhandled error handling', () => {
    it('should handle unhandled errors with 500 status', async () => {
      const response = await request(app)
        .get('/test-unhandled-error')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: expect.any(String),
        path: '/test-unhandled-error',
        method: 'GET'
      });
    });
  });

  describe('Success responses', () => {
    it('should not interfere with successful responses', async () => {
      const response = await request(app)
        .get('/test-success')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: 'test'
      });
    });
  });
});
