import AWS from 'aws-sdk';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Configure and initialize the AWS S3 client for Cloudflare R2
 */
const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  signatureVersion: "v4",
  s3ForcePathStyle: true,
  region: "auto", // Required for R2
  maxRetries: 3,
  retryDelayOptions: {
    customBackoff: function(retryCount: number) {
      return Math.pow(2, retryCount) * 1000; // Exponential backoff
    }
  }
});

/**
 * Determine MIME type based on file extension
 * @param {string} file - Filename with extension
 * @returns {string} MIME type
 */
function getMime(file: string): string {
  return file.endsWith(".m3u8")
    ? "application/vnd.apple.mpegurl"
    : file.endsWith(".ts")
    ? "video/MP2T"
    : file.endsWith(".jpg")
    ? "image/jpeg"
    : file.endsWith(".jpeg")
    ? "image/jpeg"
    : file.endsWith(".png")
    ? "image/png"
    : file.endsWith(".webp")
    ? "image/webp"
    : file.endsWith(".mp4")
    ? "video/mp4"
    : file.endsWith(".mov")
    ? "video/quicktime"
    : file.endsWith(".avi")
    ? "video/x-msvideo"
    : file.endsWith(".pdf")
    ? "application/pdf"
    : file.endsWith(".doc")
    ? "application/msword"
    : file.endsWith(".docx")
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : file.endsWith(".zip")
    ? "application/zip"
    : file.endsWith(".txt")
    ? "text/plain"
    : file.endsWith(".json")
    ? "application/json"
    : "application/octet-stream";
}

/**
 * Validate R2 configuration
 * @returns {boolean} True if configuration is valid
 */
function validateConfig(): boolean {
  const required = ['R2_ENDPOINT', 'R2_ACCESS_KEY', 'R2_SECRET_KEY', 'R2_BUCKET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required R2 environment variables:', missing.join(', '));
    return false;
  }
  
  return true;
}

/**
 * Test R2 connection
 * @returns {Promise<boolean>} True if connection is successful
 */
async function testConnection(): Promise<boolean> {
  try {
    if (!validateConfig()) {
      console.error('❌ R2 configuration validation failed');
      return false;
    }
    
    console.log('🔍 Testing R2 connection...');
    console.log(`📋 Endpoint: ${process.env.R2_ENDPOINT}`);
    console.log(`📋 Bucket: ${process.env.R2_BUCKET}`);
    console.log(`📋 Access Key: ${process.env.R2_ACCESS_KEY ? '***' + process.env.R2_ACCESS_KEY.slice(-4) : 'Not set'}`);
    
    // First try to list buckets to test credentials
    const result = await s3.listBuckets().promise();
    console.log('✅ Successfully authenticated with R2');
    
    // Check if our specific bucket exists
    const bucketExists = result.Buckets?.some(bucket => bucket.Name === process.env.R2_BUCKET);
    
    if (!bucketExists) {
      console.error(`❌ Bucket '${process.env.R2_BUCKET}' not found`);
      console.log('📋 Available buckets:', result.Buckets?.map(b => b.Name).join(', ') || 'None');
      return false;
    }
    
    // Test bucket access by trying to list objects
    try {
      await s3.listObjectsV2({ Bucket: process.env.R2_BUCKET!, MaxKeys: 1 }).promise();
      console.log('✅ Successfully connected to Cloudflare R2 bucket');
      return true;
    } catch (bucketError: any) {
      console.error('❌ Failed to access R2 bucket:', bucketError.message);
      if (bucketError.code === 'AccessDenied') {
        console.error('💡 This might be a permissions issue. Check:');
        console.error('   1. R2 API token has proper permissions');
        console.error('   2. Bucket exists and is accessible');
        console.error('   3. R2 credentials are correct');
      }
      return false;
    }
  } catch (error: any) {
    console.error('❌ Failed to connect to Cloudflare R2:', error.message);
    if (error.code === 'AccessDenied') {
      console.error('💡 Access Denied - Check your R2 credentials and permissions');
    } else if (error.code === 'NetworkingError') {
      console.error('💡 Network Error - Check your internet connection and R2 endpoint');
    } else if (error.code === 'InvalidAccessKeyId') {
      console.error('💡 Invalid Access Key - Check your R2_ACCESS_KEY');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.error('💡 Signature Mismatch - Check your R2_SECRET_KEY');
    }
    return false;
  }
}

export {
  s3,
  getMime,
  validateConfig,
  testConnection
};
