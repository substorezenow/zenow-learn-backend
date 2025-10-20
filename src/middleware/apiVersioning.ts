import { Request, Response, NextFunction } from 'express';

// API version configuration
export interface ApiVersion {
  version: string;
  deprecated: boolean;
  sunsetDate?: string;
  changelog?: string[];
}

export const API_VERSIONS: Record<string, ApiVersion> = {
  'v1': {
    version: 'v1',
    deprecated: false,
    changelog: [
      'Initial API version',
      'Basic CRUD operations for categories, fields, and courses',
      'Authentication and authorization',
      'Admin management endpoints'
    ]
  },
  'v2': {
    version: 'v2',
    deprecated: false,
    changelog: [
      'Enhanced error handling',
      'Improved response format',
      'Added caching support',
      'Better validation',
      'Connection pooling optimization'
    ]
  }
};

// Current API version
export const CURRENT_API_VERSION = 'v2';

// Version middleware
export const apiVersionMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Extract version from URL path or Accept header
  let version = CURRENT_API_VERSION; // Default to current version
  
  // Check URL path for version (e.g., /api/v1/categories)
  const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
  if (pathMatch) {
    version = pathMatch[1];
  }
  
  // Check Accept header for version (e.g., application/vnd.api+json;version=1)
  const acceptHeader = req.get('Accept');
  if (acceptHeader) {
    const versionMatch = acceptHeader.match(/version=(\d+)/);
    if (versionMatch) {
      version = `v${versionMatch[1]}`;
    }
  }
  
  // Check custom header
  const customVersion = req.get('X-API-Version');
  if (customVersion) {
    version = customVersion;
  }
  
  // Only validate version if it was explicitly specified
  // Allow non-versioned paths to use default version
  if (version !== CURRENT_API_VERSION && !API_VERSIONS[version]) {
    res.status(400).json({
      success: false,
      error: `Unsupported API version: ${version}`,
      code: 'UNSUPPORTED_VERSION',
      supportedVersions: Object.keys(API_VERSIONS),
      currentVersion: CURRENT_API_VERSION,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  // Add version info to request
  req.apiVersion = version;
  req.apiVersionInfo = API_VERSIONS[version];
  
  // Add version headers to response
  res.set({
    'X-API-Version': version,
    'X-API-Current-Version': CURRENT_API_VERSION,
    'X-API-Deprecated': API_VERSIONS[version].deprecated.toString()
  });
  
  // Add deprecation warning if version is deprecated
  if (API_VERSIONS[version].deprecated) {
    res.set('X-API-Deprecation-Warning', `API version ${version} is deprecated. Please upgrade to ${CURRENT_API_VERSION}`);
    
    if (API_VERSIONS[version].sunsetDate) {
      res.set('X-API-Sunset-Date', API_VERSIONS[version].sunsetDate!);
    }
  }
  
  next();
};

// Version-specific route handler
export const createVersionedRoutes = (versions: Record<string, any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const version = req.apiVersion || CURRENT_API_VERSION;
    
    if (versions[version]) {
      return versions[version](req, res, next);
    }
    
    // Fallback to current version
    if (versions[CURRENT_API_VERSION]) {
      return versions[CURRENT_API_VERSION](req, res, next);
    }
    
    next();
  };
};

// API info endpoint
export const getApiInfo = (req: Request, res: Response): void => {
  const version = req.apiVersion || CURRENT_API_VERSION;
  const versionInfo = API_VERSIONS[version];
  
  res.json({
    success: true,
    data: {
      currentVersion: CURRENT_API_VERSION,
      requestedVersion: version,
      versionInfo,
      allVersions: API_VERSIONS,
      endpoints: {
        categories: `/api/${version}/categories`,
        fields: `/api/${version}/fields`,
        courses: `/api/${version}/courses`,
        admin: `/api/${version}/admin`,
        auth: `/api/${version}/auth`
      },
      documentation: {
        openapi: `/api/${version}/docs`,
        changelog: `/api/${version}/changelog`
      }
    },
    timestamp: new Date().toISOString()
  });
};

// Changelog endpoint
export const getChangelog = (req: Request, res: Response): void => {
  const version = req.apiVersion || CURRENT_API_VERSION;
  const versionInfo = API_VERSIONS[version];
  
  res.json({
    success: true,
    data: {
      version: versionInfo.version,
      changelog: versionInfo.changelog,
      deprecated: versionInfo.deprecated,
      sunsetDate: versionInfo.sunsetDate
    },
    timestamp: new Date().toISOString()
  });
};

// Version comparison utility
export const compareVersions = (version1: string, version2: string): number => {
  const v1Parts = version1.replace('v', '').split('.').map(Number);
  const v2Parts = version2.replace('v', '').split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
};

// Check if version is supported
export const isVersionSupported = (version: string): boolean => {
  return version in API_VERSIONS;
};

// Get latest version
export const getLatestVersion = (): string => {
  const versions = Object.keys(API_VERSIONS);
  return versions.reduce((latest, current) => {
    return compareVersions(current, latest) > 0 ? current : latest;
  }, versions[0]);
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
      apiVersionInfo?: ApiVersion;
    }
  }
}
