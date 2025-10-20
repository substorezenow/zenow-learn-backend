import fs from 'fs';
import { s3, getMime } from './r2Config';

/**
 * Get R2 bucket name with validation
 */
function getBucketName(): string {
  const bucket = getBucketName();
  if (!bucket) {
    throw new Error('R2_BUCKET environment variable is not set');
  }
  return bucket;
}

/**
 * Get a signed URL for retrieving an object from R2
 * @param {string} key - Object key in R2 bucket
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {string} Signed URL
 */
function getSignedUrl(key: string, expiresIn: number = 3600): string {
  return s3.getSignedUrl("getObject", {
    Bucket: getBucketName(),
    Key: key,
    Expires: expiresIn,
  });
}

/**
 * Upload a folder of files to R2
 * @param {string} localDir - Local directory path
 * @param {string} remoteDir - Remote directory path in R2
 * @returns {Promise<void>}
 */
async function uploadFolderToR2(localDir: string, remoteDir: string): Promise<void> {
  const files = fs.readdirSync(localDir);
  
  for (const file of files) {
    const filePath = `${localDir}/${file}`;
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively upload subdirectories
      await uploadFolderToR2(filePath, `${remoteDir}/${file}`);
    } else {
      const fileStream = fs.createReadStream(filePath);
      await s3
        .upload({
          Bucket: getBucketName(),
          Key: `${remoteDir}/${file}`,
          Body: fileStream,
          ContentType: getMime(file),
        })
        .promise();
    }
  }
}

/**
 * Upload a local file to R2
 * @param {string} filePath - Path to the local file
 * @param {string} key - Object key in R2 bucket
 * @param {string} contentType - Content type (optional)
 * @param {Object} metadata - Additional metadata (optional)
 * @returns {Promise<Object>} - Response from S3 API
 */
async function uploadFileToR2(
  filePath: string, 
  key: string, 
  contentType?: string, 
  metadata?: Record<string, string>
): Promise<any> {
  const fileStream = fs.createReadStream(filePath);
  
  const effectiveContentType = contentType || getMime(filePath);
  
  const uploadParams: any = {
    Bucket: getBucketName(),
    Key: key,
    Body: fileStream,
    ContentType: effectiveContentType
  };
  
  if (metadata) {
    uploadParams.Metadata = metadata;
  }
  
  return s3.upload(uploadParams).promise();
}

/**
 * Upload buffer data to R2
 * @param {Buffer} buffer - Buffer data to upload
 * @param {string} key - Object key in R2 bucket
 * @param {string} contentType - Content type
 * @param {Object} metadata - Additional metadata (optional)
 * @returns {Promise<Object>} - Response from S3 API
 */
async function uploadBufferToR2(
  buffer: Buffer,
  key: string,
  contentType: string,
  metadata?: Record<string, string>
): Promise<any> {
  const uploadParams: any = {
    Bucket: getBucketName(),
    Key: key,
    Body: buffer,
    ContentType: contentType
  };
  
  if (metadata) {
    uploadParams.Metadata = metadata;
  }
  
  return s3.upload(uploadParams).promise();
}

/**
 * Update an existing object in R2 with new content
 * @param {string} key - Object key in R2 bucket
 * @param {Buffer|Uint8Array|Blob|string|ReadableStream} content - New content
 * @param {string} contentType - MIME type (optional)
 * @param {Object} metadata - Additional metadata (optional)
 * @returns {Promise<Object>} - Response from S3 API
 */
async function updateObjectInR2(
  key: string, 
  content: any, 
  contentType?: string, 
  metadata?: Record<string, string>
): Promise<any> {
  // Check if object exists first
  try {
    await s3.headObject({
      Bucket: getBucketName(),
      Key: key
    }).promise();
  } catch (error: any) {
    if (error.code === 'NotFound') {
      throw new Error(`Object with key '${key}' does not exist in bucket`);
    }
    throw error;
  }

  const uploadParams: any = {
    Bucket: getBucketName(),
    Key: key,
    Body: content,
  };

  if (contentType) {
    uploadParams.ContentType = contentType;
  }

  if (metadata) {
    uploadParams.Metadata = metadata;
  }

  return s3.putObject(uploadParams).promise();
}

/**
 * Delete a single object from R2
 * @param {string} key - Object key in R2 bucket
 * @returns {Promise<void>}
 */
async function deleteObjectFromR2(key: string): Promise<void> {
  await s3
    .deleteObject({
      Bucket: getBucketName(),
      Key: key,
    })
    .promise();
}

/**
 * Delete multiple objects from R2 in a single request
 * @param {string[]} keys - Array of object keys to delete
 * @returns {Promise<{Deleted: Array, Errors: Array}>}
 */
async function deleteMultipleObjectsFromR2(keys: string[]): Promise<{Deleted: any[], Errors: any[]}> {
  const deleteParams = {
    Bucket: getBucketName(),
    Delete: {
      Objects: keys.map(key => ({ Key: key })),
      Quiet: false
    }
  };

  const result = await s3.deleteObjects(deleteParams).promise();
  return {
    Deleted: result.Deleted || [],
    Errors: result.Errors || []
  };
}

/**
 * Delete all objects with a common prefix (folder) from R2
 * @param {string} prefix - Prefix/folder path in R2
 * @returns {Promise<{DeletedCount: number, Errors: Array}>}
 */
async function deleteFolderFromR2(prefix: string): Promise<{DeletedCount: number, Errors: any[]}> {
  const folderPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
  
  const listParams = {
    Bucket: getBucketName(),
    Prefix: folderPrefix
  };
  
  try {
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    
    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      return { DeletedCount: 0, Errors: [] };
    }
    
    const deleteParams = {
      Bucket: getBucketName(),
      Delete: {
        Objects: listedObjects.Contents
          .filter(({ Key }) => Key !== undefined)
          .map(({ Key }) => ({ Key: Key! })),
        Quiet: false
      }
    };
    
    const result = await s3.deleteObjects(deleteParams).promise();
    return {
      DeletedCount: result.Deleted?.length || 0,
      Errors: result.Errors || []
    };
  } catch (error) {
    console.error(`❌ Error deleting folder ${folderPrefix}:`, error);
    throw error;
  }
}

/**
 * List objects in R2 bucket with optional prefix
 * @param {string} prefix - Optional prefix to filter objects
 * @param {number} maxKeys - Maximum number of keys to return
 * @returns {Promise<any>} - List of objects
 */
async function listObjectsInR2(prefix?: string, maxKeys?: number): Promise<any> {
  const params: any = {
    Bucket: getBucketName(),
  };
  
  if (prefix) {
    params.Prefix = prefix;
  }
  
  if (maxKeys) {
    params.MaxKeys = maxKeys;
  }
  
  return s3.listObjectsV2(params).promise();
}

/**
 * Check if an object exists in R2
 * @param {string} key - Object key in R2 bucket
 * @returns {Promise<boolean>} - True if object exists
 */
async function objectExistsInR2(key: string): Promise<boolean> {
  try {
    await s3.headObject({
      Bucket: getBucketName(),
      Key: key
    }).promise();
    return true;
  } catch (error: any) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * Get object metadata from R2
 * @param {string} key - Object key in R2 bucket
 * @returns {Promise<any>} - Object metadata
 */
async function getObjectMetadata(key: string): Promise<any> {
  return s3.headObject({
    Bucket: getBucketName(),
    Key: key
  }).promise();
}

/**
 * Copy an object within R2 bucket
 * @param {string} sourceKey - Source object key
 * @param {string} destinationKey - Destination object key
 * @returns {Promise<any>} - Copy operation result
 */
async function copyObjectInR2(sourceKey: string, destinationKey: string): Promise<any> {
  return s3.copyObject({
    Bucket: getBucketName(),
    CopySource: `${getBucketName()}/${sourceKey}`,
    Key: destinationKey
  }).promise();
}

export {
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
};
