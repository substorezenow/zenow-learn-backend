import { SecurityMonitor } from '../../../src/services/securityMonitor';
import { dbManager } from '../../../src/utils/databaseManager';

// Mock the database manager
jest.mock('../../../src/utils/databaseManager', () => ({
  dbManager: {
    query: jest.fn(),
  },
}));

describe('SecurityMonitor', () => {
  let securityMonitor: SecurityMonitor;
  const mockQuery = dbManager.query as jest.MockedFunction<typeof dbManager.query>;

  beforeEach(() => {
    securityMonitor = new SecurityMonitor();
    jest.clearAllMocks();
  });

  describe('logSecurityEvent', () => {
    it('should log security event successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await securityMonitor.logSecurityEvent(
        'LOGIN_ATTEMPT',
        { username: 'testuser' },
        'MEDIUM',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO security_events'),
        expect.arrayContaining([
          'LOGIN_ATTEMPT',
          JSON.stringify({ username: 'testuser' }),
          'MEDIUM',
          '192.168.1.1',
          'Mozilla/5.0'
        ])
      );
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      // Should not throw
      await expect(
        securityMonitor.logSecurityEvent('TEST_EVENT', {}, 'LOW')
      ).resolves.not.toThrow();
    });
  });

  describe('isIPBlocked', () => {
    it('should return true for blocked IP', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ blocked: true }] });

      const result = await securityMonitor.isIPBlocked('192.168.1.1');
      expect(result).toBe(true);
    });

    it('should return false for non-blocked IP', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await securityMonitor.isIPBlocked('192.168.1.1');
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const result = await securityMonitor.isIPBlocked('192.168.1.1');
      expect(result).toBe(false);
    });
  });

  describe('getSecurityDashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      const mockData = {
        recentEvents: [{ event_type: 'LOGIN', severity: 'MEDIUM' }],
        blockedIPs: [{ ip_address: '192.168.1.1' }],
        suspiciousActivities: [{ ip_address: '192.168.1.2', event_count: 15 }],
        topEventTypes: [{ event_type: 'LOGIN', count: 10 }]
      };

      mockQuery
        .mockResolvedValueOnce({ rows: mockData.recentEvents })
        .mockResolvedValueOnce({ rows: mockData.blockedIPs })
        .mockResolvedValueOnce({ rows: mockData.suspiciousActivities })
        .mockResolvedValueOnce({ rows: mockData.topEventTypes });

      const result = await securityMonitor.getSecurityDashboard();

      expect(result).toEqual({
        ...mockData,
        summary: {
          totalEvents24h: 1,
          blockedIPsCount: 1,
          suspiciousIPsCount: 1
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const result = await securityMonitor.getSecurityDashboard();
      expect(result).toBeNull();
    });
  });
});
