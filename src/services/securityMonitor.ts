import { dbManager } from '../utils/databaseManager';

// Enterprise-grade security monitoring service
export class SecurityMonitor {
  private suspiciousActivities: Map<string, { count: number; lastSeen: number; patterns: string[] }> = new Map();
  private readonly SUSPICIOUS_THRESHOLD = 5;
  private readonly MONITORING_WINDOW = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.initializeMonitoring();
  }

  // Log security event
  async logSecurityEvent(
    eventType: string,
    data: any,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await dbManager.query(
        `INSERT INTO security_events (event_type, event_data, severity, ip_address, user_agent, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [eventType, JSON.stringify(data), severity, ip, userAgent]
      );

      // Check for suspicious patterns
      await this.analyzeSuspiciousActivity(eventType, data, ip);
    } catch (error) {
      console.error('Security event logging failed:', error);
    }
  }

  // Analyze suspicious activity patterns
  private async analyzeSuspiciousActivity(eventType: string, data: any, ip?: string): Promise<void> {
    if (!ip) return;

    const now = Date.now();
    const key = `${ip}:${eventType}`;
    
    const existing = this.suspiciousActivities.get(key) || {
      count: 0,
      lastSeen: 0,
      patterns: []
    };

    // Reset if outside monitoring window
    if (now - existing.lastSeen > this.MONITORING_WINDOW) {
      existing.count = 0;
      existing.patterns = [];
    }

    existing.count++;
    existing.lastSeen = now;
    existing.patterns.push(eventType);

    this.suspiciousActivities.set(key, existing);

    // Check if threshold exceeded
    if (existing.count >= this.SUSPICIOUS_THRESHOLD) {
      await this.handleSuspiciousActivity(ip, eventType, existing);
    }
  }

  // Handle suspicious activity
  private async handleSuspiciousActivity(
    ip: string, 
    eventType: string, 
    activity: { count: number; patterns: string[] }
  ): Promise<void> {
    try {
      // Log critical security event
      await this.logSecurityEvent(
        'SUSPICIOUS_ACTIVITY_DETECTED',
        {
          ip,
          eventType,
          count: activity.count,
          patterns: activity.patterns,
          timestamp: new Date().toISOString()
        },
        'HIGH',
        ip
      );

      // Implement automatic response based on severity
      if (activity.count >= this.SUSPICIOUS_THRESHOLD * 2) {
        await this.blockSuspiciousIP(ip, 'Excessive suspicious activity');
      }

      // Reset counter after handling
      this.suspiciousActivities.delete(`${ip}:${eventType}`);
    } catch (error) {
      console.error('Suspicious activity handling failed:', error);
    }
  }

  // Block suspicious IP
  private async blockSuspiciousIP(ip: string, reason: string): Promise<void> {
    try {
      await dbManager.query(
        `INSERT INTO blocked_ips (ip_address, reason, blocked_at, expires_at) 
         VALUES ($1, $2, NOW(), NOW() + INTERVAL '24 hours') 
         ON CONFLICT (ip_address) DO UPDATE SET 
         reason = $2, blocked_at = NOW(), expires_at = NOW() + INTERVAL '24 hours'`,
        [ip, reason]
      );

      await this.logSecurityEvent(
        'IP_BLOCKED',
        { ip, reason, timestamp: new Date().toISOString() },
        'CRITICAL',
        ip
      );
    } catch (error) {
      console.error('IP blocking failed:', error);
    }
  }

  // Check if IP is blocked
  async isIPBlocked(ip: string): Promise<boolean> {
    try {
      const result = await dbManager.query(
        'SELECT 1 FROM blocked_ips WHERE ip_address = $1 AND expires_at > NOW()',
        [ip]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('IP block check failed:', error);
      return false;
    }
  }

  // Get security dashboard data
  async getSecurityDashboard(): Promise<any> {
    try {
      const [
        recentEvents,
        blockedIPs,
        suspiciousActivities,
        topEventTypes
      ] = await Promise.all([
        dbManager.query(`
          SELECT event_type, severity, ip_address, created_at 
          FROM security_events 
          WHERE created_at > NOW() - INTERVAL '24 hours' 
          ORDER BY created_at DESC 
          LIMIT 50
        `),
        dbManager.query(`
          SELECT ip_address, reason, blocked_at, expires_at 
          FROM blocked_ips 
          WHERE expires_at > NOW() 
          ORDER BY blocked_at DESC 
          LIMIT 20
        `),
        dbManager.query(`
          SELECT ip_address, COUNT(*) as event_count, 
                 array_agg(DISTINCT event_type) as event_types
          FROM security_events 
          WHERE created_at > NOW() - INTERVAL '24 hours' 
          GROUP BY ip_address 
          HAVING COUNT(*) > 10 
          ORDER BY event_count DESC 
          LIMIT 10
        `),
        dbManager.query(`
          SELECT event_type, COUNT(*) as count, severity 
          FROM security_events 
          WHERE created_at > NOW() - INTERVAL '24 hours' 
          GROUP BY event_type, severity 
          ORDER BY count DESC 
          LIMIT 10
        `)
      ]);

      return {
        recentEvents: recentEvents.rows,
        blockedIPs: blockedIPs.rows,
        suspiciousActivities: suspiciousActivities.rows,
        topEventTypes: topEventTypes.rows,
        summary: {
          totalEvents24h: recentEvents.rows.length,
          blockedIPsCount: blockedIPs.rows.length,
          suspiciousIPsCount: suspiciousActivities.rows.length
        }
      };
    } catch (error) {
      console.error('Security dashboard data fetch failed:', error);
      return null;
    }
  }

  // Initialize monitoring processes
  private initializeMonitoring(): void {
    // Clean up old suspicious activities
    setInterval(() => {
      const now = Date.now();
      for (const [key, activity] of this.suspiciousActivities.entries()) {
        if (now - activity.lastSeen > this.MONITORING_WINDOW) {
          this.suspiciousActivities.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Run every 5 minutes

    // Clean up expired blocked IPs
    setInterval(async () => {
      try {
        await dbManager.query('DELETE FROM blocked_ips WHERE expires_at < NOW()');
      } catch (error) {
        console.error('Blocked IP cleanup failed:', error);
      }
    }, 60 * 60 * 1000); // Run every hour
  }
}
