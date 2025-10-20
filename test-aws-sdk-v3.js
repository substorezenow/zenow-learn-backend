#!/usr/bin/env node

/**
 * AWS SDK v3 Test for R2
 * Test if migrating to AWS SDK v3 resolves the issue
 */

const dotenv = require('dotenv');
dotenv.config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testWithAWSv3() {
  log('\n🔍 Testing R2 with AWS SDK v3', 'cyan');
  log('=' .repeat(50), 'cyan');

  // Check if AWS SDK v3 is installed
  try {
    const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
    log('✅ AWS SDK v3 is available', 'green');
  } catch (error) {
    log('❌ AWS SDK v3 not installed', 'red');
    log('\n💡 Install AWS SDK v3:', 'yellow');
    log('npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner', 'cyan');
    return false;
  }

  const { S3Client, ListBucketsCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

  const config = {
    endpoint: process.env.R2_ENDPOINT,
    accessKey: process.env.R2_ACCESS_KEY,
    secretKey: process.env.R2_SECRET_KEY,
    bucket: process.env.R2_BUCKET
  };

  log('\n📋 Configuration:', 'blue');
  log(`Endpoint: ${config.endpoint}`, 'white');
  log(`Access Key: ***${config.accessKey.slice(-4)}`, 'white');
  log(`Secret Key: ***${config.secretKey.slice(-4)}`, 'white');
  log(`Bucket: ${config.bucket}`, 'white');

  // Create S3 client with AWS SDK v3
  const s3Client = new S3Client({
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    region: "auto",
    forcePathStyle: true,
  });

  try {
    // Test 1: List buckets
    log('\n🔍 Test 1: List Buckets with AWS SDK v3', 'blue');
    const listBucketsCommand = new ListBucketsCommand({});
    const bucketsResult = await s3Client.send(listBucketsCommand);
    
    log('✅ Successfully authenticated with AWS SDK v3', 'green');
    log(`📋 Found ${bucketsResult.Buckets?.length || 0} buckets:`, 'green');
    
    bucketsResult.Buckets?.forEach((bucket, index) => {
      const isTargetBucket = bucket.Name === config.bucket;
      const marker = isTargetBucket ? '🎯' : '  ';
      const color = isTargetBucket ? 'green' : 'white';
      log(`${marker} ${index + 1}. ${bucket.Name}`, color);
    });

    // Test 2: Check bucket access
    log('\n🔍 Test 2: Check Bucket Access', 'blue');
    const bucketExists = bucketsResult.Buckets?.some(bucket => bucket.Name === config.bucket);
    
    if (!bucketExists) {
      log(`❌ Bucket '${config.bucket}' not found`, 'red');
      return false;
    }

    log(`✅ Bucket '${config.bucket}' exists`, 'green');

    // Test 3: List objects in bucket
    log('\n🔍 Test 3: List Objects in Bucket', 'blue');
    const listObjectsCommand = new ListObjectsV2Command({
      Bucket: config.bucket,
      MaxKeys: 5
    });
    
    const objectsResult = await s3Client.send(listObjectsCommand);
    log('✅ Bucket access successful', 'green');
    log(`📋 Found ${objectsResult.KeyCount || 0} objects`, 'green');

    log('\n🎉 AWS SDK v3 works perfectly!', 'green');
    log('\n💡 Solution: Migrate to AWS SDK v3', 'yellow');
    log('1. Install AWS SDK v3:', 'white');
    log('   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner', 'cyan');
    log('2. Update your R2 configuration to use v3 API', 'white');
    log('3. Remove AWS SDK v2:', 'white');
    log('   npm uninstall aws-sdk @types/aws-sdk', 'cyan');
    
    return true;

  } catch (error) {
    log(`\n❌ AWS SDK v3 test failed: ${error.message}`, 'red');
    log(`Error code: ${error.name}`, 'red');
    
    if (error.name === 'AccessDenied') {
      log('\n💡 Still getting Access Denied with AWS SDK v3', 'yellow');
      log('This suggests the issue is not SDK version related', 'white');
      log('Possible causes:', 'white');
      log('1. Network/proxy issues', 'white');
      log('2. Account-specific restrictions', 'white');
      log('3. Different environment in this project', 'white');
    }
    
    return false;
  }
}

// Run the test
if (require.main === module) {
  testWithAWSv3()
    .then(success => {
      if (success) {
        log('\n✅ AWS SDK v3 resolves the issue!', 'green');
        process.exit(0);
      } else {
        log('\n❌ AWS SDK v3 also fails', 'red');
        process.exit(1);
      }
    })
    .catch(error => {
      log(`\n💥 Unexpected error: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { testWithAWSv3 };
