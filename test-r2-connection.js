#!/usr/bin/env node

/**
 * Cloudflare R2 Connection Test Script
 * This script helps diagnose R2 connection issues
 */

const AWS = require('aws-sdk');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testR2Connection() {
  log('\n🔍 Testing Cloudflare R2 Connection...', 'cyan');
  log('=' .repeat(50), 'cyan');

  // Check environment variables
  log('\n📋 Environment Variables:', 'blue');
  const requiredVars = ['R2_ENDPOINT', 'R2_ACCESS_KEY', 'R2_SECRET_KEY', 'R2_BUCKET'];
  let allVarsPresent = true;

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      if (varName.includes('KEY')) {
        log(`  ${varName}: ***${value.slice(-4)}`, 'green');
      } else {
        log(`  ${varName}: ${value}`, 'green');
      }
    } else {
      log(`  ${varName}: ❌ Not set`, 'red');
      allVarsPresent = false;
    }
  });

  if (!allVarsPresent) {
    log('\n❌ Missing required environment variables', 'red');
    log('💡 Please check your .env file and ensure all R2 variables are set', 'yellow');
    return false;
  }

  // Initialize S3 client
  log('\n🔧 Initializing S3 client...', 'blue');
  const s3 = new AWS.S3({
    endpoint: process.env.R2_ENDPOINT,
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
    signatureVersion: "v4",
    s3ForcePathStyle: true,
    region: "auto",
    maxRetries: 3,
    retryDelayOptions: {
      customBackoff: function(retryCount) {
        return Math.pow(2, retryCount) * 1000;
      }
    }
  });

  try {
    // Test 1: List buckets (tests authentication)
    log('\n🔍 Test 1: Testing authentication...', 'blue');
    const bucketsResult = await s3.listBuckets().promise();
    log('✅ Authentication successful', 'green');
    log(`📋 Found ${bucketsResult.Buckets?.length || 0} buckets`, 'green');

    // Test 2: Check if our bucket exists
    log('\n🔍 Test 2: Checking bucket existence...', 'blue');
    const bucketExists = bucketsResult.Buckets?.some(bucket => bucket.Name === process.env.R2_BUCKET);
    
    if (!bucketExists) {
      log(`❌ Bucket '${process.env.R2_BUCKET}' not found`, 'red');
      log('📋 Available buckets:', 'yellow');
      bucketsResult.Buckets?.forEach(bucket => {
        log(`  - ${bucket.Name}`, 'white');
      });
      log('\n💡 Solutions:', 'yellow');
      log('  1. Create the bucket in Cloudflare dashboard', 'white');
      log('  2. Check bucket name spelling in .env file', 'white');
      log('  3. Ensure bucket is in the same account', 'white');
      return false;
    }
    log(`✅ Bucket '${process.env.R2_BUCKET}' found`, 'green');

    // Test 3: Test bucket access
    log('\n🔍 Test 3: Testing bucket access...', 'blue');
    try {
      const objectsResult = await s3.listObjectsV2({ 
        Bucket: process.env.R2_BUCKET, 
        MaxKeys: 1 
      }).promise();
      log('✅ Bucket access successful', 'green');
      log(`📋 Bucket contains ${objectsResult.KeyCount || 0} objects`, 'green');
    } catch (bucketError) {
      log(`❌ Bucket access failed: ${bucketError.message}`, 'red');
      if (bucketError.code === 'AccessDenied') {
        log('\n💡 Access Denied Solutions:', 'yellow');
        log('  1. Check R2 API token permissions', 'white');
        log('  2. Ensure token has R2:Object:Read permission', 'white');
        log('  3. Verify bucket policy allows access', 'white');
        log('  4. Check if bucket is public or private', 'white');
      }
      return false;
    }

    // Test 4: Test upload (optional)
    log('\n🔍 Test 4: Testing upload capability...', 'blue');
    try {
      const testKey = `test-connection-${Date.now()}.txt`;
      const testContent = 'R2 connection test file';
      
      await s3.putObject({
        Bucket: process.env.R2_BUCKET,
        Key: testKey,
        Body: testContent,
        ContentType: 'text/plain'
      }).promise();
      
      log('✅ Upload test successful', 'green');
      
      // Clean up test file
      await s3.deleteObject({
        Bucket: process.env.R2_BUCKET,
        Key: testKey
      }).promise();
      
      log('✅ Cleanup successful', 'green');
    } catch (uploadError) {
      log(`❌ Upload test failed: ${uploadError.message}`, 'red');
      if (uploadError.code === 'AccessDenied') {
        log('\n💡 Upload Access Denied Solutions:', 'yellow');
        log('  1. Check R2 API token has R2:Object:Write permission', 'white');
        log('  2. Verify bucket policy allows uploads', 'white');
        log('  3. Check if bucket has upload restrictions', 'white');
      }
      return false;
    }

    // Test 5: Test signed URL generation
    log('\n🔍 Test 5: Testing signed URL generation...', 'blue');
    try {
      const testKey = 'test-signed-url.txt';
      const signedUrl = s3.getSignedUrl('getObject', {
        Bucket: process.env.R2_BUCKET,
        Key: testKey,
        Expires: 3600
      });
      
      if (signedUrl && signedUrl.includes(process.env.R2_ENDPOINT)) {
        log('✅ Signed URL generation successful', 'green');
        log(`📋 Sample URL: ${signedUrl.substring(0, 100)}...`, 'green');
      } else {
        log('❌ Signed URL generation failed', 'red');
        return false;
      }
    } catch (urlError) {
      log(`❌ Signed URL test failed: ${urlError.message}`, 'red');
      return false;
    }

    log('\n🎉 All R2 tests passed!', 'green');
    log('✅ Cloudflare R2 is properly configured and accessible', 'green');
    return true;

  } catch (error) {
    log(`\n❌ R2 connection failed: ${error.message}`, 'red');
    
    if (error.code === 'AccessDenied') {
      log('\n💡 Access Denied Solutions:', 'yellow');
      log('  1. Verify R2 credentials are correct', 'white');
      log('  2. Check R2 API token permissions', 'white');
      log('  3. Ensure token has necessary R2 permissions', 'white');
      log('  4. Verify account has R2 enabled', 'white');
    } else if (error.code === 'NetworkingError') {
      log('\n💡 Network Error Solutions:', 'yellow');
      log('  1. Check internet connection', 'white');
      log('  2. Verify R2 endpoint URL format', 'white');
      log('  3. Check firewall/proxy settings', 'white');
      log('  4. Try different network if possible', 'white');
    } else if (error.code === 'InvalidAccessKeyId') {
      log('\n💡 Invalid Access Key Solutions:', 'yellow');
      log('  1. Check R2_ACCESS_KEY in .env file', 'white');
      log('  2. Verify key is not expired', 'white');
      log('  3. Generate new API token if needed', 'white');
    } else if (error.code === 'SignatureDoesNotMatch') {
      log('\n💡 Signature Mismatch Solutions:', 'yellow');
      log('  1. Check R2_SECRET_KEY in .env file', 'white');
      log('  2. Verify secret key is correct', 'white');
      log('  3. Ensure no extra spaces or characters', 'white');
    } else {
      log('\n💡 General Solutions:', 'yellow');
      log('  1. Check Cloudflare dashboard for R2 status', 'white');
      log('  2. Verify account has R2 enabled', 'white');
      log('  3. Check R2 service status', 'white');
      log('  4. Contact Cloudflare support if needed', 'white');
    }
    
    return false;
  }
}

// Run the test
if (require.main === module) {
  testR2Connection()
    .then(success => {
      if (success) {
        log('\n✅ R2 connection test completed successfully!', 'green');
        process.exit(0);
      } else {
        log('\n❌ R2 connection test failed!', 'red');
        process.exit(1);
      }
    })
    .catch(error => {
      log(`\n💥 Unexpected error: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { testR2Connection };
