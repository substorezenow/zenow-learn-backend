import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { LRUCache } from "lru-cache";

// Setup R2 client (AWS SDK v3)
const r2 = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
  region: "auto",
});

// Cache for presigned URLs
const cache = new LRUCache({
  max: 1000,
  ttl: 1000 * 60 * 60, // 1 hour
});

// Extract R2 key from URL
function extractKey(url: string): string | null {
  const marker = `/${process.env.R2_BUCKET}/`;
  const parts = url.split(marker);
  return parts.length === 2 ? parts[1] : null;
}

// Get or cache presigned URL
export async function getCachedSignedUrl(key: string, expiry: number = 3600): Promise<string> {
  const cached = cache.get(key);
  if (cached) return cached as string;
  
  const cmd = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
  });
  const url = await getSignedUrl(r2, cmd, { expiresIn: expiry });
  cache.set(key, url);
  return url;
}

/**
 * Recursively processes objects and arrays to sign URLs at specified field paths
 * @param {any} obj - The object/array to process
 * @param {string} fieldPath - The path to the field (e.g., "castings.influencerId.profileImage")
 * @param {number} expiry - Expiry in seconds for signed URLs
 */
export async function processFieldPath(obj: any, fieldPath: string, expiry: number = 3600): Promise<void> {
  if (!obj || (typeof obj !== "object")) {
    return;
  }

  const pathParts = fieldPath.split(".");
  
  if (pathParts.length === 1) {
    // Base case: we've reached the final property
    const finalKey = pathParts[0];
    if (Array.isArray(obj)) {
      // If obj is an array, process each item
      for (const item of obj) {
        if (item && typeof item === "object" && typeof item[finalKey] === "string" && !item[finalKey].startsWith("http")) {
          try {
            item[finalKey] = await getCachedSignedUrl(item[finalKey], expiry);
          } catch (err) {
            console.error(`Error signing URL for field "${finalKey}":`, err);
          }
        }
      }
    } else {
      // If obj is an object, process the property directly
      if (typeof obj[finalKey] === "string" && !obj[finalKey].startsWith("http")) {
        try {
          obj[finalKey] = await getCachedSignedUrl(obj[finalKey], expiry);
        } catch (err) {
          console.error(`Error signing URL for field "${finalKey}":`, err);
        }
      }
    }
  } else {
    // Recursive case: continue traversing the path
    const currentKey = pathParts[0];
    const remainingPath = pathParts.slice(1).join(".");
    
    if (Array.isArray(obj)) {
      // If obj is an array, recursively process each item
      for (const item of obj) {
        if (item && typeof item === "object" && item[currentKey]) {
          await processFieldPath(item[currentKey], remainingPath, expiry);
        }
      }
    } else {
      // If obj is an object, continue with the next property
      if (obj[currentKey]) {
        await processFieldPath(obj[currentKey], remainingPath, expiry);
      }
    }
  }
}

/**
 * Signs URLs for provided fields, handling deeply nested paths including arrays
 * @param {object|object[]} data - Object or array of objects
 * @param {string[]} fields - Array of field paths
 * @param {number} expiry - Expiry in seconds for signed URLs
 */
export async function signUrlsInPayload(data: any, fields: string[], expiry: number = 3600): Promise<void> {
  if (!data) return;

  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    
    for (const fieldPath of fields) {
      try {
        await processFieldPath(item, fieldPath, expiry);
      } catch (err) {
        console.error(`Error processing field path "${fieldPath}":`, err);
      }
    }
  }
}

export async function signUrlsInSingleObject(data: any, fields: string[], expiry: number = 3600): Promise<void> {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Expected a single object as input");
  }

  for (const fieldPath of fields) {
    try {
      await processFieldPath(data, fieldPath, expiry);
    } catch (err) {
      console.error(`Error processing field path "${fieldPath}":`, err);
    }
  }
}

/**
 * Simple function to sign a single URL - for backward compatibility
 * @param {string} url - The URL to sign
 * @param {number} expiry - Expiry in seconds
 */
export async function signR2Urls(url: string, expiry: number = 3600): Promise<string> {
  if (!url || typeof url !== "string") {
    return url;
  }
  
  try {
    // If it's already a full URL, return as is
    if (url.startsWith("http")) {
      return url;
    }
    // Use the simple concatenation approach
    return await getCachedSignedUrl(url, expiry);
  } catch (err) {
    console.error(`Error processing URL "${url}":`, err);
    return url; // Return original URL if processing fails
  }
}

/**
 * Clear the URL cache
 */
export function clearUrlCache(): void {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; max: number; ttl: number } {
  return {
    size: cache.size,
    max: cache.max,
    ttl: cache.ttl
  };
}

/**
 * Test function for array path signing
 */
export async function testArrayPathSigning(): Promise<void> {
  const testData = {
    bannerImage: "banners/main.jpg",
    productionHouse: {
      profileImage: "production/profile.jpg",
      coverImage: "production/cover.jpg"
    },
    castings: [
      {
        influencer: {
          profileImage: "influencer1/profile.jpg"
        }
      },
      {
        influencer: {
          profileImage: "influencer2/profile.jpg"
        }
      }
    ]
  };

  console.log('Testing array path signing...');
  console.log('Before:', JSON.stringify(testData, null, 2));
  
  await signUrlsInSingleObject(testData, [
    "bannerImage",
    "productionHouse.profileImage",
    "productionHouse.coverImage",
    "castings.influencer.profileImage"
  ]);
  
  console.log('After:', JSON.stringify(testData, null, 2));
}
