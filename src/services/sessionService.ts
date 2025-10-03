import { Pool } from 'pg';

// Enterprise-grade session management service
export class SessionService {
  private pool: Pool;
  private sessionCache: Map<string, { userId: string; expiresAt: number; lastActivity: number }> = new Map();
  private blacklistedSessions: Set<string> = new Set();
  private readonly MAX_CONCURRENT_SESSIONS = 3;
  private readonly SESSION_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours

  constructor(pool: Pool) {
    this.pool = pool;
    this.initializeSessionCleanup();
  }

  // Create new session with advanced validation
  async createSession(userId: string, sessionId: string, fingerprintHash: string): Promise<boolean> {
    try {
      // Check concurrent session limit
      await this.enforceSessionLimit(userId);
      
      // Check if session is blacklisted
      if (this.blacklistedSessions.has(sessionId)) {
        throw new Error('Session blacklisted');
      }

      const expiresAt = Date.now() + this.SESSION_TIMEOUT;
      
      // Store in database
      await this.pool.query(
        `INSERT INTO user_sessions (session_id, user_id, fingerprint_hash, expires_at, created_at, last_activity) 
         VALUES ($1, $2, $3, $4, NOW(), NOW()) 
         ON CONFLICT (session_id) DO UPDATE SET 
         expires_at = $4, last_activity = NOW(), fingerprint_hash = $3`,
        [sessionId, userId, fingerprintHash, new Date(expiresAt)]
      );

      // Cache session info
      this.sessionCache.set(sessionId, {
        userId,
        expiresAt,
        lastActivity: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Session creation failed:', error);
      return false;
    }
  }

  // Validate session with comprehensive checks
  async validateSession(sessionId: string, fingerprintHash: string): Promise<{ valid: boolean; userId?: string; reason?: string }> {
    try {
      // Check blacklist first
      if (this.blacklistedSessions.has(sessionId)) {
        return { valid: false, reason: 'Session blacklisted' };
      }

      // Check cache first
      const cachedSession = this.sessionCache.get(sessionId);
      if (cachedSession) {
        if (Date.now() > cachedSession.expiresAt) {
          this.sessionCache.delete(sessionId);
          this.blacklistedSessions.add(sessionId);
          return { valid: false, reason: 'Session expired' };
        }
        
        // Update last activity
        cachedSession.lastActivity = Date.now();
        return { valid: true, userId: cachedSession.userId };
      }

      // Check database
      const result = await this.pool.query(
        `SELECT user_id, expires_at, fingerprint_hash FROM user_sessions 
         WHERE session_id = $1 AND expires_at > NOW()`,
        [sessionId]
      );

      if (result.rows.length === 0) {
        return { valid: false, reason: 'Session not found or expired' };
      }

      const session = result.rows[0];
      
      // Validate fingerprint
      if (session.fingerprint_hash !== fingerprintHash) {
        await this.blacklistSession(sessionId, 'Fingerprint mismatch');
        return { valid: false, reason: 'Session validation failed' };
      }

      // Update last activity
      await this.pool.query(
        'UPDATE user_sessions SET last_activity = NOW() WHERE session_id = $1',
        [sessionId]
      );

      // Cache the session
      this.sessionCache.set(sessionId, {
        userId: session.user_id,
        expiresAt: new Date(session.expires_at).getTime(),
        lastActivity: Date.now()
      });

      return { valid: true, userId: session.user_id };
    } catch (error) {
      console.error('Session validation failed:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }

  // Blacklist session (for security violations)
  async blacklistSession(sessionId: string, reason: string): Promise<void> {
    try {
      this.blacklistedSessions.add(sessionId);
      this.sessionCache.delete(sessionId);
      
      // Log security event
      await this.logSecurityEvent('SESSION_BLACKLISTED', {
        sessionId,
        reason,
        timestamp: new Date().toISOString()
      });

      // Remove from database
      await this.pool.query(
        'DELETE FROM user_sessions WHERE session_id = $1',
        [sessionId]
      );
    } catch (error) {
      console.error('Session blacklisting failed:', error);
    }
  }

  // Enforce concurrent session limit
  private async enforceSessionLimit(userId: string): Promise<void> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count FROM user_sessions 
       WHERE user_id = $1 AND expires_at > NOW()`,
      [userId]
    );

    const activeSessions = parseInt(result.rows[0].count);
    
    if (activeSessions >= this.MAX_CONCURRENT_SESSIONS) {
      // Remove oldest sessions
      await this.pool.query(
        `DELETE FROM user_sessions 
         WHERE user_id = $1 AND session_id IN (
           SELECT session_id FROM user_sessions 
           WHERE user_id = $1 AND expires_at > NOW() 
           ORDER BY last_activity ASC 
           LIMIT $2
         )`,
        [userId, activeSessions - this.MAX_CONCURRENT_SESSIONS + 1]
      );
    }
  }

  // Log security events
  private async logSecurityEvent(eventType: string, data: any): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO security_events (event_type, event_data, created_at) 
         VALUES ($1, $2, NOW())`,
        [eventType, JSON.stringify(data)]
      );
    } catch (error) {
      console.error('Security event logging failed:', error);
    }
  }

  // Initialize automatic session cleanup
  private initializeSessionCleanup(): void {
    setInterval(async () => {
      try {
        // Clean expired sessions from cache
        const now = Date.now();
        for (const [sessionId, session] of this.sessionCache.entries()) {
          if (now > session.expiresAt) {
            this.sessionCache.delete(sessionId);
          }
        }

        // Clean expired sessions from database
        await this.pool.query(
          'DELETE FROM user_sessions WHERE expires_at < NOW()'
        );

        // Clean old security events (keep last 30 days)
        await this.pool.query(
          'DELETE FROM security_events WHERE created_at < NOW() - INTERVAL \'30 days\''
        );
      } catch (error) {
        console.error('Session cleanup failed:', error);
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  // Get active sessions for user
  async getActiveSessions(userId: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT session_id, created_at, last_activity, expires_at 
       FROM user_sessions 
       WHERE user_id = $1 AND expires_at > NOW() 
       ORDER BY last_activity DESC`,
      [userId]
    );
    return result.rows;
  }

  // Revoke all sessions for user
  async revokeAllUserSessions(userId: string): Promise<void> {
    const result = await this.pool.query(
      'SELECT session_id FROM user_sessions WHERE user_id = $1',
      [userId]
    );

    for (const row of result.rows) {
      this.blacklistedSessions.add(row.session_id);
    }

    await this.pool.query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [userId]
    );
  }
}
