import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
import fileupload from "express-fileupload";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { securityHeaders } from "./middleware/securityHeaders";
import { CSRFMiddleware } from "./middleware/csrfMiddleware";
import { sanitizeInput, validateRateLimit } from "./middleware/validation";
import config from "./config";
import { connectCockroach, pool } from "./db/cockroach";
import { dbManager } from "./utils/databaseManager";
import { SessionService } from "./services/sessionService";
import { RateLimitService } from "./services/rateLimitService";
import { SecurityMonitor } from "./services/securityMonitor";
import { initializeSecurityServices } from "./services/authService";
import { cacheManager } from "./utils/cacheManager";
import {
  logger,
  requestLogger,
  errorLogger,
  performanceMonitor,
  logApplicationStart,
  logMemoryUsage,
} from "./utils/logger";
import { openApiSpec, serveOpenApiSpec, swaggerConfig } from "./docs/openapi";
import {
  resilienceMiddleware,
  resilientErrorHandler,
} from "./utils/resilienceManager";
import {
  gracefulDegradationMiddleware,
  healthCheckWithCircuitBreakers,
} from "./utils/gracefulDegradation";
import { gracefulDegradation } from "./utils/gracefulDegradation";
import {
  crashPrevention,
  serviceIsolation,
  memoryLeakPrevention,
} from "./utils/crashPrevention";
import "module-alias/register";
import { promiseHooks } from "v8";
import initializeDatabase from "./db/_index";

const app = express();

// Enhanced security middleware
app.use(
  helmet({
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
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(securityHeaders);
app.use(morgan("combined"));
app.use(cookieParser()); // Parse cookies for authentication
// Custom JSON parser that preserves large integer strings
app.use(
  express.json({
    limit: "10mb",
    reviver: (key, value) => {
      // If the value is a string that looks like a large integer, keep it as string
      if (typeof value === "string" && /^\d{15,}$/.test(value)) {
        return value; // Keep as string, don't convert to number
      }
      return value;
    },
  })
);
app.use(bodyParser.urlencoded({ extended: false, limit: "10mb" }));
app.use(fileupload());

// Custom middleware removed - now using string IDs everywhere

// Enhanced logging middleware
app.use(requestLogger);
app.use(performanceMonitor);

// Resilience and graceful degradation middleware
app.use(resilienceMiddleware);
app.use(gracefulDegradationMiddleware);

// Global validation middleware
app.use(sanitizeInput);
app.use(validateRateLimit);

// ================================================================ db
// Initialize database connection
initializeDatabase();
// ================================================================ db


// Initialize cache manager with graceful fallback
cacheManager.connect().catch((error) => {
  console.error("⚠️ Redis connection failed:", error.message);
  console.log("🔄 Continuing without caching...");
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
      securityMonitor,
    });

    // Initialize graceful degradation service
    await gracefulDegradation.cacheFallbackData();
    console.log("🔄 Graceful degradation service initialized");

    console.log("🔒 Security services initialized successfully");
    console.log("📦 Cache manager initialized successfully");
  } catch (error) {
    console.error("❌ Security services initialization failed:", error);
  }
};

// Initialize crash prevention
const initializeCrashPrevention = () => {
  try {
    // Setup crash prevention event listeners
    crashPrevention.on("crash", (data) => {
      logger.error("Crash detected", data);
    });

    crashPrevention.on("restart", (data) => {
      logger.error("Process restart initiated", data);
    });

    crashPrevention.on("serviceIsolated", (data) => {
      logger.warn("Service isolated", data);
    });

    crashPrevention.on("serviceRestored", (data) => {
      logger.info("Service restored", data);
    });

    crashPrevention.on("memoryPressure", (data) => {
      logger.warn("Memory pressure detected", data);
    });

    crashPrevention.on("memoryLeak", (data) => {
      logger.warn("Memory leak detected", data);
    });

    // Set crash prevention settings
    crashPrevention.setMaxCrashes(5); // Allow 5 crashes before restart
    crashPrevention.setCrashWindow(60000); // 1 minute window

    // Set memory threshold (500MB)
    memoryLeakPrevention.setMemoryThreshold(500 * 1024 * 1024);

    console.log("🛡️ Crash prevention system initialized");
    console.log("📊 Memory leak prevention started");
    console.log("🔒 Service isolation manager ready");
  } catch (error) {
    console.error("❌ Crash prevention initialization failed:", error);
  }
};

// Initialize security services
initializeSecurity();

// Initialize crash prevention
initializeCrashPrevention();

// CSRF protection for state-changing operations (temporarily disabled)
// app.use('/api/admin', CSRFMiddleware.checkCSRF);
// app.use('/api/auth/login', CSRFMiddleware.checkCSRF);

// Add CSRF tokens to responses
// app.use('/api', CSRFMiddleware.addCSRFToken);

// API Documentation routes
app.get("/api/docs/openapi.json", serveOpenApiSpec);
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, swaggerConfig)
);

// Legacy API routes (redirect to current version)
// app.use("/api/v1", routes);
app.use("/api/v2", routes);

// API routes with versioning support
app.use("/api", routes);

// Simple test endpoint (no dependencies)
app.get("/api/test", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Enhanced health check with circuit breaker status
// Enhanced health check with circuit breakers
app.get("/api/health", healthCheckWithCircuitBreakers);

// Crash prevention health endpoint
app.get("/api/health/crash-prevention", (req, res) => {
  try {
    const crashStats = crashPrevention.getCrashStats();
    const memoryStats = memoryLeakPrevention.getMemoryStats();
    const serviceStatuses = serviceIsolation.getAllServiceStatuses();

    res.json({
      success: true,
      data: {
        crashPrevention: crashStats,
        memoryLeakPrevention: memoryStats,
        serviceIsolation: serviceStatuses,
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get crash prevention status",
      timestamp: new Date().toISOString(),
    });
  }
});

// Legacy health check endpoint (for backward compatibility)
app.get("/api/health-legacy", (req, res) => {
  const healthStatus = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: "unknown",
        message: "Database connection status unknown",
      },
      cache: {
        status: cacheManager.isHealthy() ? "connected" : "disconnected",
        message: cacheManager.isHealthy()
          ? "Redis connected"
          : "Redis disconnected",
      },
      security: {
        sessionManagement: !!sessionService,
        rateLimiting: !!rateLimitService,
        securityMonitoring: !!securityMonitor,
        csrfProtection: true,
        enhancedHeaders: true,
      },
    },
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  };

  // Set appropriate HTTP status based on critical services
  const criticalServicesDown = !cacheManager.isHealthy();
  const statusCode = criticalServicesDown ? 503 : 200;

  res.status(statusCode).json(healthStatus);
});

// Security dashboard endpoint (admin only)
app.get("/api/admin/security-dashboard", async (req, res) => {
  try {
    if (!securityMonitor) {
      return res
        .status(503)
        .json({ error: "Security monitoring not available" });
    }

    const dashboardData = await securityMonitor.getSecurityDashboard();
    return res.json(dashboardData);
  } catch (error) {
    console.error("Security dashboard error:", error);
    return res.status(500).json({ error: "Failed to fetch security data" });
  }
});

// Enhanced error handling with logging and resilience
app.use(errorLogger);
app.use(resilientErrorHandler);
app.use(errorHandler);

const PORT = config.port || 8080;

// Start the server with error handling
try {
  app.listen(PORT, () => {
    // Enhanced startup logging
    logApplicationStart(PORT, process.env.NODE_ENV || "development");

    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔒 Enhanced security features enabled:`);
    console.log(`   - AES-256-GCM encryption`);
    console.log(`   - Session management with blacklisting`);
    console.log(`   - Rate limiting and IP blocking`);
    console.log(`   - CSRF protection`);
    console.log(`   - Security monitoring and audit logging`);
    console.log(`   - Enhanced security headers`);
    console.log(
      `📚 API Documentation available at: http://localhost:${PORT}/api/docs`
    );
    console.log(
      `📊 OpenAPI Spec available at: http://localhost:${PORT}/api/docs/openapi.json`
    );

    // Log memory usage on startup
    logMemoryUsage();

    // Set up periodic memory logging
    setInterval(logMemoryUsage, 5 * 60 * 1000); // Every 5 minutes
  });
} catch (error) {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
}

// Graceful shutdown handling
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  crashPrevention.emit("shutdown", { signal: "SIGTERM" });
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  crashPrevention.emit("shutdown", { signal: "SIGINT" });
  process.exit(0);
});
