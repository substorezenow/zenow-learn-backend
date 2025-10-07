import { SessionService } from '../../src/services/sessionService';
import { SecurityMonitor } from '../../src/services/securityMonitor';
import { RateLimitService } from '../../src/services/rateLimitService';
import { Pool } from 'pg';

describe('SessionService Unit Tests', () => {
  let sessionService: SessionService;
  let pool: Pool;

  beforeAll(async () => {
    pool = (global as any).testPool;
    sessionService = new SessionService(pool);
  });

  it('should create a session successfully', async () => {
    const userId = 'test-user-id';
    const sessionId = 'test-session-id';
    const fingerprintHash = 'test-fingerprint-hash';

    const result = await sessionService.createSession(userId, sessionId, fingerprintHash);
    expect(result).toBe(true);
  });

  it('should validate a valid session', async () => {
    const userId = 'test-user-id';
    const sessionId = 'test-session-id-2';
    const fingerprintHash = 'test-fingerprint-hash-2';

    await sessionService.createSession(userId, sessionId, fingerprintHash);
    
    const validation = await sessionService.validateSession(sessionId, fingerprintHash);
    expect(validation.valid).toBe(true);
    expect(validation.userId).toBe(userId);
  });

  it('should reject invalid session', async () => {
    const validation = await sessionService.validateSession('invalid-session', 'invalid-fingerprint');
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBeDefined();
  });

  it('should blacklist session', async () => {
    const userId = 'test-user-id';
    const sessionId = 'test-session-id-3';
    const fingerprintHash = 'test-fingerprint-hash-3';

    await sessionService.createSession(userId, sessionId, fingerprintHash);
    await sessionService.blacklistSession(sessionId, 'Test blacklist');

    const validation = await sessionService.validateSession(sessionId, fingerprintHash);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('Session blacklisted');
  });
});

describe('SecurityMonitor Unit Tests', () => {
  let securityMonitor: SecurityMonitor;
  let pool: Pool;

  beforeAll(async () => {
    pool = (global as any).testPool;
    securityMonitor = new SecurityMonitor(pool);
  });

  it('should log security event', async () => {
    await securityMonitor.logSecurityEvent(
      'TEST_EVENT',
      { test: 'data' },
      'LOW',
      '127.0.0.1',
      'test-agent'
    );

    // Verify event was logged
    const result = await pool.query(
      'SELECT * FROM security_events WHERE event_type = $1',
      ['TEST_EVENT']
    );
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('should check if IP is blocked', async () => {
    const isBlocked = await securityMonitor.isIPBlocked('127.0.0.1');
    expect(typeof isBlocked).toBe('boolean');
  });

  it('should get security dashboard data', async () => {
    const dashboard = await securityMonitor.getSecurityDashboard();
    expect(dashboard).toHaveProperty('recentEvents');
    expect(dashboard).toHaveProperty('blockedIPs');
    expect(dashboard).toHaveProperty('suspiciousActivities');
    expect(dashboard).toHaveProperty('summary');
  });
});

describe('RateLimitService Unit Tests', () => {
  let rateLimitService: RateLimitService;
  let pool: Pool;

  beforeAll(async () => {
    pool = (global as any).testPool;
    rateLimitService = new RateLimitService(pool);
  });

  it('should allow request within rate limit', async () => {
    const result = await rateLimitService.checkRateLimit('127.0.0.1', 'test-endpoint', '127.0.0.1');
    expect(result.allowed).toBe(true);
  });

  it('should block request exceeding rate limit', async () => {
    const identifier = 'test-identifier';
    const endpoint = 'test-endpoint';

    // Make multiple requests to exceed rate limit
    for (let i = 0; i < 10; i++) {
      await rateLimitService.checkRateLimit(identifier, endpoint, identifier);
    }

    const result = await rateLimitService.checkRateLimit(identifier, endpoint, identifier);
    expect(result.allowed).toBe(false);
  });
});

describe('AuthService Unit Tests', () => {
  const authService = require('../../src/services/authService');

  it('should register a new user', async () => {
    const userData = {
      username: 'testuser123',
      password: 'testpassword123'
    };

    const user = await authService.register(userData);
    expect(user).toHaveProperty('username', userData.username);
    expect(user).toHaveProperty('id');
  });

  it('should reject duplicate username', async () => {
    const userData = {
      username: 'duplicateuser',
      password: 'testpassword'
    };

    await authService.register(userData);

    await expect(authService.register(userData)).rejects.toThrow('User already exists');
  });

  it('should login with valid credentials', async () => {
    const userData = {
      username: 'logintestuser',
      password: 'logintestpassword'
    };

    await authService.register(userData);

    const token = await authService.login({
      username: userData.username,
      password: userData.password
    });

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should reject invalid credentials', async () => {
    await expect(authService.login({
      username: 'nonexistent',
      password: 'wrongpassword'
    })).rejects.toThrow('Invalid credentials');
  });
});
