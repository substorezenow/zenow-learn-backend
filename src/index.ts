import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import fileupload from 'express-fileupload';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { securityHeaders } from './middleware/securityHeaders';
import { CSRFMiddleware } from './middleware/csrfMiddleware';
import config from './config';
import { connectCockroach, pool } from './cockroach';
import { SessionService } from './services/sessionService';
import { RateLimitService } from './services/rateLimitService';
import { SecurityMonitor } from './services/securityMonitor';
import { initializeSecurityServices } from './services/authService';

const app = express();

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(securityHeaders);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: false, limit: '10mb' }));
app.use(fileupload());

// Connect to CockroachDB
connectCockroach();

// Initialize security services
let sessionService: SessionService;
let rateLimitService: RateLimitService;
let securityMonitor: SecurityMonitor;

const initializeSecurity = async () => {
  try {
    if (!pool) {
      console.error('❌ Database pool not available');
      return;
    }

    sessionService = new SessionService(pool);
    rateLimitService = new RateLimitService(pool);
    securityMonitor = new SecurityMonitor(pool);

    // Initialize auth service with security services
    initializeSecurityServices({
      sessionService,
      rateLimitService,
      securityMonitor
    });

    console.log('🔒 Security services initialized successfully');
  } catch (error) {
    console.error('❌ Security services initialization failed:', error);
  }
};

// Initialize security services
initializeSecurity();

// CSRF protection for state-changing operations
app.use('/api/admin', CSRFMiddleware.checkCSRF);
app.use('/api/auth/login', CSRFMiddleware.checkCSRF);

// Add CSRF tokens to responses
app.use('/api', CSRFMiddleware.addCSRFToken);

// API routes
app.use('/api', routes);

// Health check endpoint with security info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    security: {
      sessionManagement: !!sessionService,
      rateLimiting: !!rateLimitService,
      securityMonitoring: !!securityMonitor,
      csrfProtection: true,
      enhancedHeaders: true
    }
  });
});

// Security dashboard endpoint (admin only)
app.get('/api/admin/security-dashboard', async (req, res) => {
  try {
    if (!securityMonitor) {
      return res.status(503).json({ error: 'Security monitoring not available' });
    }
    
    const dashboardData = await securityMonitor.getSecurityDashboard();
    return res.json(dashboardData);
  } catch (error) {
    console.error('Security dashboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch security data' });
  }
});

// Error handler
app.use(errorHandler);

const PORT = config.port || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔒 Enhanced security features enabled:`);
  console.log(`   - AES-256-GCM encryption`);
  console.log(`   - Session management with blacklisting`);
  console.log(`   - Rate limiting and IP blocking`);
  console.log(`   - CSRF protection`);
  console.log(`   - Security monitoring and audit logging`);
  console.log(`   - Enhanced security headers`);
});
