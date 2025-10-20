/**
 * Cloudflare Worker Proxy URL Generator
 * Generates URLs for files served through Cloudflare Worker proxy
 */

/**
 * Generate URL for file served through Cloudflare Worker proxy
 * @param {string} filePath - Path to file in R2 bucket
 * @param {string} customDomain - Custom domain for the worker proxy
 * @returns {string} Full URL for the file
 */
export function getWorkerProxyUrl(filePath: string, customDomain?: string): string {
  const domain = customDomain || process.env.R2_WORKER_DOMAIN || 'https://files.yourdomain.com';
  
  // Remove leading slash if present
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  
  return `${domain}/${cleanPath}`;
}

/**
 * Generate multiple URLs for files served through Cloudflare Worker proxy
 * @param {string[]} filePaths - Array of file paths
 * @param {string} customDomain - Custom domain for the worker proxy
 * @returns {string[]} Array of full URLs
 */
export function getWorkerProxyUrls(filePaths: string[], customDomain?: string): string[] {
  return filePaths.map(path => getWorkerProxyUrl(path, customDomain));
}

/**
 * Check if a URL is a worker proxy URL
 * @param {string} url - URL to check
 * @returns {boolean} True if URL is a worker proxy URL
 */
export function isWorkerProxyUrl(url: string): boolean {
  const workerDomain = process.env.R2_WORKER_DOMAIN || 'https://files.yourdomain.com';
  return url.startsWith(workerDomain);
}

/**
 * Extract file path from worker proxy URL
 * @param {string} url - Worker proxy URL
 * @returns {string} File path in R2 bucket
 */
export function extractFilePathFromWorkerUrl(url: string): string {
  const workerDomain = process.env.R2_WORKER_DOMAIN || 'https://files.yourdomain.com';
  
  if (!url.startsWith(workerDomain)) {
    throw new Error('URL is not a worker proxy URL');
  }
  
  return url.replace(workerDomain, '').replace(/^\//, '');
}

/**
 * Convert signed URL to worker proxy URL
 * @param {string} signedUrl - Signed URL from R2
 * @param {string} customDomain - Custom domain for the worker proxy
 * @returns {string} Worker proxy URL
 */
export function convertSignedUrlToWorkerUrl(signedUrl: string, customDomain?: string): string {
  try {
    const url = new URL(signedUrl);
    const pathParts = url.pathname.split('/');
    
    // Extract file path after bucket name
    const bucketIndex = pathParts.findIndex(part => part === process.env.R2_BUCKET);
    if (bucketIndex === -1) {
      throw new Error('Cannot extract file path from signed URL');
    }
    
    const filePath = pathParts.slice(bucketIndex + 1).join('/');
    return getWorkerProxyUrl(filePath, customDomain);
  } catch (error) {
    console.error('Error converting signed URL to worker URL:', error);
    return signedUrl; // Return original URL if conversion fails
  }
}

/**
 * Middleware to convert signed URLs to worker proxy URLs in responses
 * @param {string} customDomain - Custom domain for the worker proxy
 * @returns {Function} Express middleware function
 */
export function convertToWorkerProxyMiddleware(customDomain?: string) {
  return (req: any, res: any, next: any) => {
    const originalJson = res.json.bind(res);
    
    res.json = (payload: any) => {
      if (payload?.data && typeof payload.data === 'object') {
        const items = Array.isArray(payload.data) ? payload.data : [payload.data];
        
        items.forEach((item: any) => {
          if (item && typeof item === 'object') {
            // Convert common file URL fields
            const urlFields = [
              'banner_image', 'thumbnail_image', 'icon_url', 'content_url',
              'video_url', 'attachment_url', 'profileImage', 'coverImage',
              'avatar', 'logo', 'image', 'video', 'fileUrl'
            ];
            
            urlFields.forEach(field => {
              if (item[field] && typeof item[field] === 'string') {
                // Check if it's a signed URL and convert to worker proxy URL
                if (item[field].includes('amazonaws.com') || item[field].includes('r2.cloudflarestorage.com')) {
                  try {
                    item[field] = convertSignedUrlToWorkerUrl(item[field], customDomain);
                  } catch (error) {
                    console.error(`Error converting ${field} URL:`, error);
                  }
                }
              }
            });
          }
        });
      }
      
      return originalJson(payload);
    };
    
    next();
  };
}

export default {
  getWorkerProxyUrl,
  getWorkerProxyUrls,
  isWorkerProxyUrl,
  extractFilePathFromWorkerUrl,
  convertSignedUrlToWorkerUrl,
  convertToWorkerProxyMiddleware
};
