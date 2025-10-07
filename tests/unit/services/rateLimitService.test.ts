import { RateLimitService } from '../../../src/services/rateLimitService';
import { dbManager } from '../../../src/utils/databaseManager';

// Mock the database manager
jest.mock('../../../src/utils/databaseManager', () => ({
  dbManager: {
    query: jest.fn(),
  },
}));

describe('RateLimitService', () => {
  let rateLimitService: RateLimitService;
  const mockQuery = dbManager.query as jest.MockedFunction<typeof dbManager.query>;

  beforeEach(() => {
    rateLimitService = new RateLimitService();
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow request within limits', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await rateLimitService.checkRateLimit('user123', 'api', '192.168.1.1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 1
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should block request when limit exceeded', async () => {
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ request_count: 100, window_start: new Date(), blocked_until: null }] 
      });

      const result = await rateLimitService.checkRateLimit('user123', 'api', '192.168.1.1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Rate limit exceeded - account blocked');
    });

    it('should handle blocked accounts', async () => {
      const blockedUntil = new Date(Date.now() + 3600000); // 1 hour from now
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ request_count: 50, window_start: new Date(), blocked_until: blockedUntil }] 
      });

      const result = await rateLimitService.checkRateLimit('user123', 'api', '192.168.1.1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Account temporarily blocked');
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const result = await rateLimitService.checkRateLimit('user123', 'api', '192.168.1.1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(999);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for specific endpoint', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await rateLimitService.resetRateLimit('user123', 'api');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM rate_limits WHERE identifier = $1 AND endpoint = $2',
        ['user123', 'api']
      );
    });

    it('should reset all rate limits for user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await rateLimitService.resetRateLimit('user123');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM rate_limits WHERE identifier = $1',
        ['user123']
      );
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return rate limit status', async () => {
      const mockStatus = {
        request_count: 25,
        window_start: new Date(Date.now() - 30000),
        blocked_until: null
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockStatus] });

      const result = await rateLimitService.getRateLimitStatus('user123', 'api');

      expect(result.count).toBe(25);
      expect(result.blocked).toBe(false);
    });

    it('should return default status for new user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await rateLimitService.getRateLimitStatus('user123', 'api');

      expect(result.count).toBe(0);
      expect(result.blocked).toBe(false);
    });
  });
});
