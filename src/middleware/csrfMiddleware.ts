import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// CSRF protection middleware
export class CSRFMiddleware {
  private static readonly CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
  private static readonly TOKEN_LIFETIME = 60 * 60 * 1000; // 1 hour
  private static tokenCache: Map<string, { token: string; expires: number }> = new Map();

  // Generate CSRF token
  static generateToken(sessionId: string): string {
    const timestamp = Date.now();
    const data = `${sessionId}:${timestamp}:${this.CSRF_SECRET}`;
    const token = crypto.createHash('sha256').update(data).digest('hex');
    
    // Cache token
    this.tokenCache.set(sessionId, {
      token,
      expires: timestamp + this.TOKEN_LIFETIME
    });

    return token;
  }

  // Validate CSRF token
  static validateToken(sessionId: string, token: string): boolean {
    try {
      const cached = this.tokenCache.get(sessionId);
      if (!cached) return false;

      // Check expiration
      if (Date.now() > cached.expires) {
        this.tokenCache.delete(sessionId);
        return false;
      }

      return cached.token === token;
    } catch (error) {
      console.error('CSRF validation failed:', error);
      return false;
    }
  }

  // Middleware to check CSRF token
  static checkCSRF(req: Request, res: Response, next: NextFunction): void {
    // Skip CSRF for GET requests and safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip CSRF for API routes that don't need it
    if (req.path.startsWith('/api/public/')) {
      return next();
    }

    const sessionId = req.headers['x-session-id'] as string;
    const csrfToken = req.headers['x-csrf-token'] as string;

    if (!sessionId || !csrfToken) {
      res.status(403).json({ error: 'CSRF token required' });
      return;
    }

    if (!this.validateToken(sessionId, csrfToken)) {
      res.status(403).json({ error: 'Invalid CSRF token' });
      return;
    }

    next();
  }

  // Middleware to add CSRF token to response
  static addCSRFToken(req: Request, res: Response, next: NextFunction): void {
    const sessionId = req.headers['x-session-id'] as string;
    
    if (sessionId) {
      const token = this.generateToken(sessionId);
      res.setHeader('X-CSRF-Token', token);
    }

    next();
  }

  // Clean expired tokens
  static cleanup(): void {
    const now = Date.now();
    for (const [sessionId, data] of this.tokenCache.entries()) {
      if (now > data.expires) {
        this.tokenCache.delete(sessionId);
      }
    }
  }
}

// Initialize cleanup
setInterval(() => {
  CSRFMiddleware.cleanup();
}, 5 * 60 * 1000); // Run every 5 minutes
