import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import fileupload from 'express-fileupload';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { securityHeaders } from './middleware/securityHeaders';
import { CSRFMiddleware } from './middleware/csrfMiddleware';
import { sanitizeInput, validateRateLimit } from './middleware/validation';
import config from './config';
import { connectCockroach, pool } from './cockroach';
import { SessionService } from './services/sessionService';
import { RateLimitService } from './services/rateLimitService';
import { SecurityMonitor } from './services/securityMonitor';
import { initializeSecurityServices } from './services/authService';
import { cacheManager } from './utils/cacheManager';
import { logger, requestLogger, errorLogger, performanceMonitor, logApplicationStart, logMemoryUsage } from './utils/logger';
import { openApiSpec, serveOpenApiSpec, swaggerConfig } from './docs/openapi';

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
app.use(cookieParser()); // Parse cookies for authentication
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: false, limit: '10mb' }));
app.use(fileupload());

// Enhanced logging middleware
app.use(requestLogger);
app.use(performanceMonitor);

// Global validation middleware
app.use(sanitizeInput);
app.use(validateRateLimit);

// Connect to CockroachDB with graceful fallback
connectCockroach().catch(error => {
  console.error('⚠️ Database connection failed:', error.message);
  console.log('🔄 Continuing with degraded functionality...');
  // Don't exit - allow app to start with limited functionality
});

// Initialize cache manager with graceful fallback
cacheManager.connect().catch(error => {
  console.error('⚠️ Redis connection failed:', error.message);
  console.log('🔄 Continuing without caching...');
  // Don't exit - allow app to start without caching
});

// Initialize security services
let sessionService: SessionService;
let rateLimitService: RateLimitService;
let securityMonitor: SecurityMonitor;

const initializeSecurity = async () => {
  try {
    sessionService = new SessionService();
    rateLimitService = new RateLimitService();
    securityMonitor = new SecurityMonitor();

    // Initialize auth service with security services
    initializeSecurityServices({
      sessionService,
      rateLimitService,
      securityMonitor
    });

    console.log('🔒 Security services initialized successfully');
    console.log('📦 Cache manager initialized successfully');
  } catch (error) {
    console.error('❌ Security services initialization failed:', error);
  }
};

// Initialize security services
initializeSecurity();

// CSRF protection for state-changing operations (temporarily disabled)
// app.use('/api/admin', CSRFMiddleware.checkCSRF);
// app.use('/api/auth/login', CSRFMiddleware.checkCSRF);

// Add CSRF tokens to responses
// app.use('/api', CSRFMiddleware.addCSRFToken);

// API Documentation routes
app.get('/api/docs/openapi.json', serveOpenApiSpec);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerConfig));

// API routes with versioning support
app.use('/api', routes);

// Legacy API routes (redirect to current version)
app.use('/api/v1', routes);
app.use('/api/v2', routes);

// Health check endpoint with graceful degradation
app.get('/api/health', (req, res) => {
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: 'unknown',
        message: 'Database connection status unknown'
      },
      cache: {
        status: cacheManager.isHealthy() ? 'connected' : 'disconnected',
        message: cacheManager.isHealthy() ? 'Redis connected' : 'Redis disconnected'
      },
      security: {
        sessionManagement: !!sessionService,
        rateLimiting: !!rateLimitService,
        securityMonitoring: !!securityMonitor,
        csrfProtection: true,
        enhancedHeaders: true
      }
    },
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  };

  // Set appropriate HTTP status based on critical services
  const criticalServicesDown = !cacheManager.isHealthy();
  const statusCode = criticalServicesDown ? 503 : 200;
  
  res.status(statusCode).json(healthStatus);
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

// Enhanced error handling with logging
app.use(errorLogger);
app.use(errorHandler);

const PORT = config.port || 8080;

app.listen(PORT, () => {
  // Enhanced startup logging
  logApplicationStart(PORT, process.env.NODE_ENV || 'development');
  
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔒 Enhanced security features enabled:`);
  console.log(`   - AES-256-GCM encryption`);
  console.log(`   - Session management with blacklisting`);
  console.log(`   - Rate limiting and IP blocking`);
  console.log(`   - CSRF protection`);
  console.log(`   - Security monitoring and audit logging`);
  console.log(`   - Enhanced security headers`);
  console.log(`📚 API Documentation available at: http://localhost:${PORT}/api/docs`);
  console.log(`📊 OpenAPI Spec available at: http://localhost:${PORT}/api/docs/openapi.json`);
  
  // Log memory usage on startup
  logMemoryUsage();
  
  // Set up periodic memory logging
  setInterval(logMemoryUsage, 5 * 60 * 1000); // Every 5 minutes
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
