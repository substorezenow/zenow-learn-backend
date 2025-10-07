import { SessionService } from '../../../src/services/sessionService';
import { dbManager } from '../../../src/utils/databaseManager';

// Mock the database manager
jest.mock('../../../src/utils/databaseManager', () => ({
  dbManager: {
    query: jest.fn(),
  },
}));

describe('SessionService', () => {
  let sessionService: SessionService;
  const mockQuery = dbManager.query as jest.MockedFunction<typeof dbManager.query>;

  beforeEach(() => {
    sessionService = new SessionService();
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create session successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await sessionService.createSession('user123', 'session123', 'fingerprint123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_sessions'),
        expect.arrayContaining(['session123', 'user123', 'fingerprint123'])
      );
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const result = await sessionService.createSession('user123', 'session123', 'fingerprint123');
      expect(result).toBe(false);
    });
  });

  describe('validateSession', () => {
    it('should validate session successfully', async () => {
      const mockSession = {
        user_id: 'user123',
        expires_at: new Date(Date.now() + 3600000),
        fingerprint_hash: 'fingerprint123'
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockSession] });

      const result = await sessionService.validateSession('session123', 'fingerprint123');

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user123');
    });

    it('should reject invalid fingerprint', async () => {
      const mockSession = {
        user_id: 'user123',
        expires_at: new Date(Date.now() + 3600000),
        fingerprint_hash: 'different_fingerprint'
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockSession] });

      const result = await sessionService.validateSession('session123', 'fingerprint123');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Session validation failed');
    });

    it('should reject expired session', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await sessionService.validateSession('session123', 'fingerprint123');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Session not found or expired');
    });
  });

  describe('blacklistSession', () => {
    it('should blacklist session successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await sessionService.blacklistSession('session123', 'Security violation');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO security_events'),
        expect.arrayContaining(['SESSION_BLACKLISTED'])
      );
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions', async () => {
      const mockSessions = [
        { session_id: 'session1', created_at: '2024-01-01', last_activity: '2024-01-01', expires_at: '2024-01-02' }
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockSessions });

      const result = await sessionService.getActiveSessions('user123');

      expect(result).toEqual(mockSessions);
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all user sessions', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ session_id: 'session1' }, { session_id: 'session2' }] })
        .mockResolvedValueOnce({ rows: [] });

      await sessionService.revokeAllUserSessions('user123');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM user_sessions WHERE user_id = $1',
        ['user123']
      );
    });
  });
});
