import { Pool } from 'pg';
import Redis from 'redis';

// Test environment setup
export const setupTestEnvironment = async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.COCKROACH_URL = process.env.TEST_COCKROACH_URL || 'postgresql://test:test@localhost:26257/testdb?sslmode=disable';
  
  // Initialize test database connection
  const pool = new Pool({
    connectionString: process.env.COCKROACH_URL,
    ssl: false,
  });

  // Initialize test Redis connection
  const redis = Redis.createClient({
    url: process.env.TEST_REDIS_URL || 'redis://localhost:6379'
  });

  await redis.connect();

  return { pool, redis };
};

export const cleanupTestEnvironment = async (pool: Pool, redis: Redis) => {
  await pool.end();
  await redis.quit();
};

// Global test setup
beforeAll(async () => {
  const { pool, redis } = await setupTestEnvironment();
  (global as any).testPool = pool;
  (global as any).testRedis = redis;
});

afterAll(async () => {
  const pool = (global as any).testPool;
  const redis = (global as any).testRedis;
  if (pool && redis) {
    await cleanupTestEnvironment(pool, redis);
  }
});

// Clean up after each test
afterEach(async () => {
  const pool = (global as any).testPool;
  if (pool) {
    // Clean up test data
    await pool.query('DELETE FROM security_events');
    await pool.query('DELETE FROM user_sessions');
    await pool.query('DELETE FROM rate_limits');
    await pool.query('DELETE FROM blocked_ips');
    await pool.query('DELETE FROM enrollments');
    await pool.query('DELETE FROM course_reviews');
    await pool.query('DELETE FROM course_progress');
    await pool.query('DELETE FROM course_modules');
    await pool.query('DELETE FROM courses');
    await pool.query('DELETE FROM fields');
    await pool.query('DELETE FROM categories');
    await pool.query('DELETE FROM users WHERE username != \'admin\'');
  }
});
