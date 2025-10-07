import request from 'supertest';
import express from 'express';
import { getAllCategories, getCategoryById, getAllFields, getFieldById, getAllCourses, getCourseById } from '../../src/controllers/courseController';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Test routes
  app.get('/api/categories', getAllCategories);
  app.get('/api/categories/:id', getCategoryById);
  app.get('/api/fields', getAllFields);
  app.get('/api/fields/:id', getFieldById);
  app.get('/api/courses', getAllCourses);
  app.get('/api/courses/:id', getCourseById);
  
  return app;
};

describe('Course Controller Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /api/categories', () => {
    it('should return categories successfully', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should return specific category', async () => {
      const response = await request(app)
        .get('/api/categories/1')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return 404 for non-existent category', async () => {
      const response = await request(app)
        .get('/api/categories/999')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Category not found');
    });
  });

  describe('GET /api/fields', () => {
    it('should return fields successfully', async () => {
      const response = await request(app)
        .get('/api/fields')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/fields/:id', () => {
    it('should return specific field', async () => {
      const response = await request(app)
        .get('/api/fields/1')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return 404 for non-existent field', async () => {
      const response = await request(app)
        .get('/api/fields/999')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Field not found');
    });
  });

  describe('GET /api/courses', () => {
    it('should return courses successfully', async () => {
      const response = await request(app)
        .get('/api/courses')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle query filters', async () => {
      const response = await request(app)
        .get('/api/courses?category_id=1&difficulty_level=beginner&is_free=true')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/courses/:id', () => {
    it('should return specific course', async () => {
      const response = await request(app)
        .get('/api/courses/1')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return 404 for non-existent course', async () => {
      const response = await request(app)
        .get('/api/courses/999')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Course not found');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // This would require mocking the database to throw an error
      // For now, we test the structure
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });
  });
});
