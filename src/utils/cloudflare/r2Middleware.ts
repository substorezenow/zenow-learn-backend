import { Request, Response, NextFunction } from 'express';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import pMap from "p-map";
import { LRUCache } from "lru-cache";

// R2 client (modular v3 SDK)
const r2 = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
  region: "auto",
});

// Cache presigned URLs for their TTL
const cache = new LRUCache({
  max: 1000,
  ttl: 1000 * 60 * 60,
});

// Extract object key from stored URL
function extractKey(url: string): string | null {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) return null;
  
  if (url.includes(`/${bucket}/`)) {
    const marker = `/${bucket}/`;
    const parts = url.split(marker);
    return parts.length === 2 ? parts[1] : null;
  }
  return null;
}

// Get or generate-and-cache a presigned URL
async function getCachedSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const cached = cache.get(key);
  if (cached) return cached as string;
  
  const bucket = process.env.R2_BUCKET;
  if (!bucket) {
    throw new Error('R2_BUCKET environment variable is not set');
  }
  
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  const url = await getSignedUrl(r2, cmd, { expiresIn });
  cache.set(key, url);
  return url;
}

// Middleware factory with optional overrides
export default function signR2UrlsMiddleware(opts: {
  fields?: string[];
  maxTotalUrls?: number;
  concurrency?: number;
  expiry?: number;
} = {}) {
  const {
    fields = [
      "profileImage",
      "coverImage",
      "fileUrl",
      "thumbnailUrl",
      "video",
      "image",
      "bannerImage",
      "trailerThumbnail",
      "icon_url",
      "banner_image",
      "thumbnail_image",
      "content_url",
      "avatar",
      "logo",
      "attachment",
      "document",
      "media"
    ],
    maxTotalUrls = 50,
    concurrency = 5,
    expiry = 3600,
  } = opts;

  return (req: Request, res: Response, next: NextFunction): void => {
    const origJson = res.json.bind(res);

    res.json = (payload: any) => {
      try {
        const data = payload?.data;
        if (data && typeof data === "object") {
          // Normalize to array
          const items = Array.isArray(data) ? data : [data];

          // Collect all [item, field] pairs that need signing
          const toSign: Array<{ item: any; field: string; key: string }> = [];
          for (const item of items) {
            for (const field of fields) {
              const url = item[field];
              if (typeof url === "string") {
                const key = extractKey(url);
                if (key) toSign.push({ item, field, key });
              }
            }
          }

          // If too many URLs, skip signing to avoid overload
          if (toSign.length > maxTotalUrls) {
            console.warn(
              `signR2Urls: ${toSign.length} URLs to sign exceeds limit ${maxTotalUrls}, skipping.`
            );
          } else {
            // Process signing asynchronously without blocking response
            pMap(
              toSign,
              async ({ item, field, key }) => {
                try {
                  item[field] = await getCachedSignedUrl(key, expiry);
                } catch (e) {
                  console.error(`Failed to sign R2 URL for key=${key}:`, e);
                }
              },
              { concurrency }
            ).catch(e => console.error("signR2UrlsMiddleware error:", e));
          }
        }
      } catch (e) {
        console.error("signR2UrlsMiddleware error:", e);
      }
      return origJson(payload);
    };

    next();
  };
}

/**
 * Middleware specifically for course-related endpoints
 */
export const signCourseUrlsMiddleware = signR2UrlsMiddleware({
  fields: [
    "banner_image",
    "thumbnail_image",
    "icon_url",
    "banner_image",
    "content_url",
    "video_url",
    "attachment_url"
  ],
  maxTotalUrls: 30,
  concurrency: 3,
  expiry: 3600
});

/**
 * Middleware for user profile endpoints
 */
export const signProfileUrlsMiddleware = signR2UrlsMiddleware({
  fields: [
    "profileImage",
    "avatar",
    "coverImage",
    "logo"
  ],
  maxTotalUrls: 10,
  concurrency: 2,
  expiry: 1800
});

/**
 * Middleware for category/field endpoints
 */
export const signCategoryUrlsMiddleware = signR2UrlsMiddleware({
  fields: [
    "icon_url",
    "banner_image"
  ],
  maxTotalUrls: 20,
  concurrency: 3,
  expiry: 3600
});

/**
 * Clear the middleware cache
 */
export function clearMiddlewareCache(): void {
  cache.clear();
}

/**
 * Get middleware cache statistics
 */
export function getMiddlewareCacheStats(): { size: number; max: number; ttl: number } {
  return {
    size: cache.size,
    max: cache.max,
    ttl: cache.ttl
  };
}
