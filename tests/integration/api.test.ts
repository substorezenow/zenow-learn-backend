import request from 'supertest';
import { app } from '../src/index';
import { Pool } from 'pg';

describe('API Health Check', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = (global as any).testPool;
  });

  it('should return health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('security');
    expect(response.body.security).toHaveProperty('sessionManagement');
    expect(response.body.security).toHaveProperty('rateLimiting');
    expect(response.body.security).toHaveProperty('securityMonitoring');
  });
});

describe('Categories API', () => {
  let pool: Pool;
  let authToken: string;

  beforeAll(async () => {
    pool = (global as any).testPool;
    
    // Create test category
    await pool.query(`
      INSERT INTO categories (name, slug, description, is_active, sort_order)
      VALUES ('Test Category', 'test-category', 'Test description', true, 1)
    `);
  });

  it('should get all categories', async () => {
    const response = await request(app)
      .get('/api/categories')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.count).toBeGreaterThan(0);
  });

  it('should get category by ID', async () => {
    const result = await pool.query('SELECT id FROM categories WHERE slug = $1', ['test-category']);
    const categoryId = result.rows[0].id;

    const response = await request(app)
      .get(`/api/categories/${categoryId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id', categoryId);
    expect(response.body.data).toHaveProperty('name', 'Test Category');
  });

  it('should return 404 for non-existent category', async () => {
    const response = await request(app)
      .get('/api/categories/99999')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Category not found');
  });
});

describe('Authentication API', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = (global as any).testPool;
    
    // Create test user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    
    await pool.query(`
      INSERT INTO users (username, password, role, is_active)
      VALUES ('testuser', $1, 'student', true)
    `, [hashedPassword]);
  });

  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'newuser',
        password: 'newpassword'
      })
      .expect(201);

    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('username', 'newuser');
  });

  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testpassword'
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(typeof response.body.token).toBe('string');
  });

  it('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'wrongpassword'
      })
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate token', async () => {
    // First login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testpassword'
      });

    const token = loginResponse.body.token;

    // Test token validation
    const response = await request(app)
      .get('/api/auth/validate')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.valid).toBe(true);
    expect(response.body.user).toHaveProperty('username', 'testuser');
  });
});

describe('Admin API', () => {
  let pool: Pool;
  let adminToken: string;

  beforeAll(async () => {
    pool = (global as any).testPool;
    
    // Create admin user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('adminpassword', 10);
    
    await pool.query(`
      INSERT INTO users (username, password, role, is_active)
      VALUES ('admin', $1, 'admin', true)
    `, [hashedPassword]);

    // Login as admin
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'adminpassword'
      });

    adminToken = loginResponse.body.token;
  });

  it('should create a new category', async () => {
    const response = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Admin Test Category',
        slug: 'admin-test-category',
        description: 'Admin created category',
        is_active: true,
        sort_order: 1
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('name', 'Admin Test Category');
    expect(response.body.message).toBe('Category created successfully');
  });

  it('should get admin statistics', async () => {
    const response = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('total_categories');
    expect(response.body.data).toHaveProperty('total_fields');
    expect(response.body.data).toHaveProperty('published_courses');
  });

  it('should reject unauthorized admin requests', async () => {
    const response = await request(app)
      .post('/api/admin/categories')
      .send({
        name: 'Unauthorized Category',
        slug: 'unauthorized-category'
      })
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('Error Handling', () => {
  it('should handle invalid JSON', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('invalid json')
      .expect(400);
  });

  it('should handle non-existent routes', async () => {
    const response = await request(app)
      .get('/api/non-existent-route')
      .expect(404);
  });
});
