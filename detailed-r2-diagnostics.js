#!/usr/bin/env node

/**
 * Enhanced Cloudflare R2 Diagnostic Script
 * This script performs detailed diagnostics to identify the exact issue
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

async function detailedR2Diagnostics() {
  log('\n🔍 Enhanced Cloudflare R2 Diagnostics', 'cyan');
  log('=' .repeat(60), 'cyan');

  // Step 1: Validate Environment Variables
  log('\n📋 Step 1: Environment Variables Validation', 'blue');
  const config = {
    endpoint: process.env.R2_ENDPOINT,
    accessKey: process.env.R2_ACCESS_KEY,
    secretKey: process.env.R2_SECRET_KEY,
    bucket: process.env.R2_BUCKET
  };

  log(`Endpoint: ${config.endpoint}`, 'white');
  log(`Access Key: ${config.accessKey ? '***' + config.accessKey.slice(-4) : 'NOT SET'}`, 'white');
  log(`Secret Key: ${config.secretKey ? '***' + config.secretKey.slice(-4) : 'NOT SET'}`, 'white');
  log(`Bucket: ${config.bucket}`, 'white');

  // Extract Account ID from endpoint
  const accountIdMatch = config.endpoint?.match(/https:\/\/([a-f0-9]+)\.r2\.cloudflarestorage\.com/);
  const accountId = accountIdMatch ? accountIdMatch[1] : null;
  log(`Account ID: ${accountId || 'COULD NOT EXTRACT'}`, 'white');

  if (!accountId) {
    log('❌ Invalid endpoint format. Expected: https://ACCOUNT_ID.r2.cloudflarestorage.com', 'red');
    return false;
  }

  // Step 2: Test Different Endpoint Formats
  log('\n📋 Step 2: Testing Endpoint Formats', 'blue');
  
  const endpointFormats = [
    `https://${accountId}.r2.cloudflarestorage.com`,
    `https://${accountId}.r2.dev`,
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2`
  ];

  for (const endpoint of endpointFormats) {
    log(`Testing: ${endpoint}`, 'white');
    try {
      const testS3 = new AWS.S3({
        endpoint: endpoint,
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
        signatureVersion: "v4",
        s3ForcePathStyle: true,
        region: "auto"
      });

      const result = await testS3.listBuckets().promise();
      log(`✅ SUCCESS with ${endpoint}`, 'green');
      log(`Found ${result.Buckets?.length || 0} buckets`, 'green');
      
      // Use this working endpoint
      config.endpoint = endpoint;
      break;
    } catch (error) {
      log(`❌ Failed: ${error.code || error.message}`, 'red');
    }
  }

  // Step 3: Initialize Working S3 Client
  log('\n📋 Step 3: Initialize Working S3 Client', 'blue');
  const s3 = new AWS.S3({
    endpoint: config.endpoint,
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
    signatureVersion: "v4",
    s3ForcePathStyle: true,
    region: "auto",
    maxRetries: 3
  });

  try {
    // Step 4: List All Buckets
    log('\n📋 Step 4: List All Available Buckets', 'blue');
    const bucketsResult = await s3.listBuckets().promise();
    log(`✅ Successfully authenticated`, 'green');
    log(`📋 Found ${bucketsResult.Buckets?.length || 0} buckets:`, 'green');
    
    bucketsResult.Buckets?.forEach((bucket, index) => {
      const isTargetBucket = bucket.Name === config.bucket;
      const marker = isTargetBucket ? '🎯' : '  ';
      const color = isTargetBucket ? 'green' : 'white';
      log(`${marker} ${index + 1}. ${bucket.Name}`, color);
    });

    // Step 5: Check Target Bucket
    log('\n📋 Step 5: Check Target Bucket', 'blue');
    const bucketExists = bucketsResult.Buckets?.some(bucket => bucket.Name === config.bucket);
    
    if (!bucketExists) {
      log(`❌ Bucket '${config.bucket}' not found`, 'red');
      log('\n💡 Solutions:', 'yellow');
      log('1. Create the bucket:', 'white');
      log(`   npx wrangler r2 bucket create ${config.bucket}`, 'cyan');
      log('2. Or update R2_BUCKET in .env to use an existing bucket', 'white');
      log('3. Check bucket name spelling', 'white');
      return false;
    }

    log(`✅ Bucket '${config.bucket}' exists`, 'green');

    // Step 6: Test Bucket Permissions
    log('\n📋 Step 6: Test Bucket Permissions', 'blue');
    
    // Test READ permission
    try {
      const listResult = await s3.listObjectsV2({ 
        Bucket: config.bucket, 
        MaxKeys: 1 
      }).promise();
      log('✅ READ permission: OK', 'green');
      log(`📋 Bucket contains ${listResult.KeyCount || 0} objects`, 'green');
    } catch (readError) {
      log(`❌ READ permission failed: ${readError.message}`, 'red');
      if (readError.code === 'AccessDenied') {
        log('💡 Token needs R2:Object:Read permission', 'yellow');
      }
      return false;
    }

    // Test WRITE permission
    try {
      const testKey = `test-permissions-${Date.now()}.txt`;
      await s3.putObject({
        Bucket: config.bucket,
        Key: testKey,
        Body: 'Permission test file',
        ContentType: 'text/plain'
      }).promise();
      log('✅ WRITE permission: OK', 'green');
      
      // Clean up
      await s3.deleteObject({
        Bucket: config.bucket,
        Key: testKey
      }).promise();
      log('✅ DELETE permission: OK', 'green');
    } catch (writeError) {
      log(`❌ WRITE permission failed: ${writeError.message}`, 'red');
      if (writeError.code === 'AccessDenied') {
        log('💡 Token needs R2:Object:Write permission', 'yellow');
      }
      return false;
    }

    // Step 7: Test Signed URL Generation
    log('\n📋 Step 7: Test Signed URL Generation', 'blue');
    try {
      const testKey = 'test-signed-url.txt';
      const signedUrl = s3.getSignedUrl('getObject', {
        Bucket: config.bucket,
        Key: testKey,
        Expires: 3600
      });
      
      if (signedUrl && signedUrl.includes(config.endpoint)) {
        log('✅ Signed URL generation: OK', 'green');
        log(`📋 Sample URL: ${signedUrl.substring(0, 80)}...`, 'green');
      } else {
        log('❌ Signed URL generation failed', 'red');
        return false;
      }
    } catch (urlError) {
      log(`❌ Signed URL test failed: ${urlError.message}`, 'red');
      return false;
    }

    // Step 8: Update .env with Working Configuration
    log('\n📋 Step 8: Configuration Summary', 'blue');
    log('✅ All tests passed!', 'green');
    log('\n📋 Working Configuration:', 'green');
    log(`R2_ENDPOINT=${config.endpoint}`, 'cyan');
    log(`R2_ACCESS_KEY=${config.accessKey}`, 'cyan');
    log(`R2_SECRET_KEY=${config.secretKey}`, 'cyan');
    log(`R2_BUCKET=${config.bucket}`, 'cyan');
    
    log('\n💡 If your .env file has different values, update it with the working configuration above.', 'yellow');
    
    return true;

  } catch (error) {
    log(`\n❌ Unexpected error: ${error.message}`, 'red');
    log(`Error code: ${error.code}`, 'red');
    
    if (error.code === 'AccessDenied') {
      log('\n💡 Access Denied - Detailed Solutions:', 'yellow');
      log('1. Check API token permissions in Cloudflare Dashboard:', 'white');
      log('   - Go to Profile → API Tokens', 'cyan');
      log('   - Verify token has R2 permissions', 'cyan');
      log('2. Required permissions:', 'white');
      log('   - R2:Object:Read', 'cyan');
      log('   - R2:Object:Write', 'cyan');
      log('   - R2:Object:Delete', 'cyan');
      log('   - R2:Bucket:Read', 'cyan');
      log('3. Create new token if needed:', 'white');
      log('   - Delete old token', 'cyan');
      log('   - Create new token with correct permissions', 'cyan');
    } else if (error.code === 'NetworkingError') {
      log('\n💡 Network Error Solutions:', 'yellow');
      log('1. Check internet connection', 'white');
      log('2. Verify Cloudflare service status', 'white');
      log('3. Try different network if possible', 'white');
    }
    
    return false;
  }
}

// Run the diagnostics
if (require.main === module) {
  detailedR2Diagnostics()
    .then(success => {
      if (success) {
        log('\n🎉 R2 diagnostics completed successfully!', 'green');
        log('✅ Your R2 configuration is working correctly.', 'green');
        process.exit(0);
      } else {
        log('\n❌ R2 diagnostics found issues that need to be resolved.', 'red');
        process.exit(1);
      }
    })
    .catch(error => {
      log(`\n💥 Unexpected error during diagnostics: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { detailedR2Diagnostics };
