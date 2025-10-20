// Cloudflare R2 utilities for managing object storage operations
import { s3, getMime, validateConfig, testConnection } from './r2Config';
import { 
  getSignedUrl,
  uploadFolderToR2,
  updateObjectInR2,
  uploadFileToR2,
  uploadBufferToR2,
  deleteObjectFromR2,
  deleteMultipleObjectsFromR2,
  deleteFolderFromR2,
  listObjectsInR2,
  objectExistsInR2,
  getObjectMetadata,
  copyObjectInR2
} from './r2Operations';
import {
  getCachedSignedUrl,
  processFieldPath,
  signUrlsInPayload,
  signUrlsInSingleObject,
  signR2Urls,
  clearUrlCache,
  getCacheStats,
  testArrayPathSigning
} from './signR2Urls';
import {
  default as signR2UrlsMiddleware,
  signCourseUrlsMiddleware,
  signProfileUrlsMiddleware,
  signCategoryUrlsMiddleware,
  clearMiddlewareCache,
  getMiddlewareCacheStats
} from './r2Middleware';
import r2Routes from './r2Routes';
import {
  getWorkerProxyUrl,
  getWorkerProxyUrls,
  isWorkerProxyUrl,
  extractFilePathFromWorkerUrl,
  convertSignedUrlToWorkerUrl,
  convertToWorkerProxyMiddleware
} from './workerProxy';

/**
 * Cloudflare R2 utilities for managing object storage operations
 */
export {
  // R2 Configuration
  s3,
  getMime,
  validateConfig,
  testConnection,
  
  // R2 Operations
  getSignedUrl,
  uploadFolderToR2,
  uploadFileToR2,
  uploadBufferToR2,
  updateObjectInR2,
  deleteObjectFromR2,
  deleteMultipleObjectsFromR2,
  deleteFolderFromR2,
  listObjectsInR2,
  objectExistsInR2,
  getObjectMetadata,
  copyObjectInR2,
  
  // URL Signing
  getCachedSignedUrl,
  processFieldPath,
  signUrlsInPayload,
  signUrlsInSingleObject,
  signR2Urls,
  clearUrlCache,
  getCacheStats,
  testArrayPathSigning,
  
  // Middleware
  signR2UrlsMiddleware,
  signCourseUrlsMiddleware,
  signProfileUrlsMiddleware,
  signCategoryUrlsMiddleware,
  clearMiddlewareCache,
  getMiddlewareCacheStats,
  
  // Routes
  r2Routes,
  
  // Worker Proxy Utilities
  getWorkerProxyUrl,
  getWorkerProxyUrls,
  isWorkerProxyUrl,
  extractFilePathFromWorkerUrl,
  convertSignedUrlToWorkerUrl,
  convertToWorkerProxyMiddleware
};

/**
 * Initialize R2 utilities
 * Call this function to test connection and validate configuration
 */
export async function initializeR2(): Promise<boolean> {
  try {
    console.log('🔧 Initializing Cloudflare R2 utilities...');
    
    // Validate configuration
    if (!validateConfig()) {
      console.error('❌ R2 configuration validation failed');
      return false;
    }
    
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ R2 connection test failed');
      return false;
    }
    
    console.log('✅ Cloudflare R2 utilities initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize R2 utilities:', error);
    return false;
  }
}

/**
 * Get R2 service status
 */
export async function getR2Status(): Promise<{
  configured: boolean;
  connected: boolean;
  cacheStats: any;
  middlewareCacheStats: any;
}> {
  const configured = validateConfig();
  const connected = configured ? await testConnection() : false;
  
  return {
    configured,
    connected,
    cacheStats: getCacheStats(),
    middlewareCacheStats: getMiddlewareCacheStats()
  };
}

/**
 * Clear all R2 caches
 */
export function clearAllR2Caches(): void {
  clearUrlCache();
  clearMiddlewareCache();
  console.log('✅ All R2 caches cleared');
}

/**
 * R2 utility class for easy access to all functions
 */
export class R2Utils {
  // Configuration
  static get s3() { return s3; }
  static getMime = getMime;
  static validateConfig = validateConfig;
  static testConnection = testConnection;
  
  // Operations
  static getSignedUrl = getSignedUrl;
  static uploadFolderToR2 = uploadFolderToR2;
  static uploadFileToR2 = uploadFileToR2;
  static uploadBufferToR2 = uploadBufferToR2;
  static updateObjectInR2 = updateObjectInR2;
  static deleteObjectFromR2 = deleteObjectFromR2;
  static deleteMultipleObjectsFromR2 = deleteMultipleObjectsFromR2;
  static deleteFolderFromR2 = deleteFolderFromR2;
  static listObjectsInR2 = listObjectsInR2;
  static objectExistsInR2 = objectExistsInR2;
  static getObjectMetadata = getObjectMetadata;
  static copyObjectInR2 = copyObjectInR2;
  
  // URL Signing
  static getCachedSignedUrl = getCachedSignedUrl;
  static processFieldPath = processFieldPath;
  static signUrlsInPayload = signUrlsInPayload;
  static signUrlsInSingleObject = signUrlsInSingleObject;
  static signR2Urls = signR2Urls;
  static clearUrlCache = clearUrlCache;
  static getCacheStats = getCacheStats;
  static testArrayPathSigning = testArrayPathSigning;
  
  // Middleware
  static signR2UrlsMiddleware = signR2UrlsMiddleware;
  static signCourseUrlsMiddleware = signCourseUrlsMiddleware;
  static signProfileUrlsMiddleware = signProfileUrlsMiddleware;
  static signCategoryUrlsMiddleware = signCategoryUrlsMiddleware;
  static clearMiddlewareCache = clearMiddlewareCache;
  static getMiddlewareCacheStats = getMiddlewareCacheStats;
  
  // Routes
  static get routes() { return r2Routes; }
  
  // Utility functions
  static initialize = initializeR2;
  static getStatus = getR2Status;
  static clearAllCaches = clearAllR2Caches;
}

export default R2Utils;
