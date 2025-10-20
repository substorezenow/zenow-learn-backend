#!/usr/bin/env node

/**
 * R2 Configuration Comparison Script
 * Tests the exact same credentials that work in other projects
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

async function testWorkingCredentials() {
  log('\n🔍 Testing R2 Credentials That Work in Other Projects', 'cyan');
  log('=' .repeat(60), 'cyan');

  const config = {
    endpoint: process.env.R2_ENDPOINT,
    accessKey: process.env.R2_ACCESS_KEY,
    secretKey: process.env.R2_SECRET_KEY,
    bucket: process.env.R2_BUCKET
  };

  log('\n📋 Current Configuration:', 'blue');
  log(`Endpoint: ${config.endpoint}`, 'white');
  log(`Access Key: ***${config.accessKey.slice(-4)}`, 'white');
  log(`Secret Key: ***${config.secretKey.slice(-4)}`, 'white');
  log(`Bucket: ${config.bucket}`, 'white');

  // Test 1: Try different S3 client configurations
  log('\n🔍 Test 1: Different S3 Client Configurations', 'blue');
  
  const configs = [
    {
      name: 'Standard R2 Config',
      config: {
        endpoint: config.endpoint,
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
        signatureVersion: "v4",
        s3ForcePathStyle: true,
        region: "auto"
      }
    },
    {
      name: 'Without s3ForcePathStyle',
      config: {
        endpoint: config.endpoint,
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
        signatureVersion: "v4",
        region: "auto"
      }
    },
    {
      name: 'With us-east-1 region',
      config: {
        endpoint: config.endpoint,
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
        signatureVersion: "v4",
        s3ForcePathStyle: true,
        region: "us-east-1"
      }
    },
    {
      name: 'With retry configuration',
      config: {
        endpoint: config.endpoint,
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
        signatureVersion: "v4",
        s3ForcePathStyle: true,
        region: "auto",
        maxRetries: 0,
        retryDelayOptions: {
          customBackoff: function(retryCount) {
            return 0;
          }
        }
      }
    }
  ];

  let workingConfig = null;

  for (const testConfig of configs) {
    log(`\nTesting: ${testConfig.name}`, 'white');
    try {
      const s3 = new AWS.S3(testConfig.config);
      const result = await s3.listBuckets().promise();
      log(`✅ SUCCESS with ${testConfig.name}`, 'green');
      log(`Found ${result.Buckets?.length || 0} buckets`, 'green');
      
      if (!workingConfig) {
        workingConfig = testConfig;
      }
      
      // List buckets to see what's available
      result.Buckets?.forEach((bucket, index) => {
        const isTargetBucket = bucket.Name === config.bucket;
        const marker = isTargetBucket ? '🎯' : '  ';
        const color = isTargetBucket ? 'green' : 'white';
        log(`${marker} ${index + 1}. ${bucket.Name}`, color);
      });
      
    } catch (error) {
      log(`❌ Failed: ${error.code || error.message}`, 'red');
    }
  }

  if (!workingConfig) {
    log('\n❌ All configurations failed', 'red');
    log('\n💡 Possible Issues:', 'yellow');
    log('1. Network connectivity issues', 'white');
    log('2. Cloudflare R2 service outage', 'white');
    log('3. Account-specific restrictions', 'white');
    log('4. Different AWS SDK version in other project', 'white');
    return false;
  }

  // Test 2: Check if bucket exists with working config
  log('\n🔍 Test 2: Check Bucket Access with Working Config', 'blue');
  const s3 = new AWS.S3(workingConfig.config);
  
  try {
    const bucketsResult = await s3.listBuckets().promise();
    const bucketExists = bucketsResult.Buckets?.some(bucket => bucket.Name === config.bucket);
    
    if (!bucketExists) {
      log(`❌ Bucket '${config.bucket}' not found`, 'red');
      log('\n💡 Available buckets:', 'yellow');
      bucketsResult.Buckets?.forEach((bucket, index) => {
        log(`${index + 1}. ${bucket.Name}`, 'white');
      });
      
      log('\n💡 Solutions:', 'yellow');
      log('1. Update R2_BUCKET in .env to use an existing bucket', 'white');
      log('2. Create the bucket:', 'white');
      log(`   npx wrangler r2 bucket create ${config.bucket}`, 'cyan');
      return false;
    }

    log(`✅ Bucket '${config.bucket}' exists`, 'green');

    // Test 3: Test bucket operations
    log('\n🔍 Test 3: Test Bucket Operations', 'blue');
    
    try {
      // Test list objects
      const listResult = await s3.listObjectsV2({ 
        Bucket: config.bucket, 
        MaxKeys: 5 
      }).promise();
      log('✅ List objects: OK', 'green');
      log(`📋 Found ${listResult.KeyCount || 0} objects`, 'green');
      
      // Test upload
      const testKey = `test-${Date.now()}.txt`;
      await s3.putObject({
        Bucket: config.bucket,
        Key: testKey,
        Body: 'Test file content',
        ContentType: 'text/plain'
      }).promise();
      log('✅ Upload: OK', 'green');
      
      // Test download
      const getResult = await s3.getObject({
        Bucket: config.bucket,
        Key: testKey
      }).promise();
      log('✅ Download: OK', 'green');
      
      // Clean up
      await s3.deleteObject({
        Bucket: config.bucket,
        Key: testKey
      }).promise();
      log('✅ Delete: OK', 'green');
      
    } catch (bucketError) {
      log(`❌ Bucket operations failed: ${bucketError.message}`, 'red');
      if (bucketError.code === 'AccessDenied') {
        log('💡 Bucket access denied - check bucket permissions', 'yellow');
      }
      return false;
    }

    // Test 4: Update configuration
    log('\n🔍 Test 4: Update Project Configuration', 'blue');
    log('✅ All tests passed!', 'green');
    log('\n📋 Working Configuration:', 'green');
    log(`Working config: ${workingConfig.name}`, 'cyan');
    
    log('\n💡 To fix your project:', 'yellow');
    log('1. Update your R2 configuration to use the working settings', 'white');
    log('2. Check if your other project uses different AWS SDK version', 'white');
    log('3. Compare package.json dependencies between projects', 'white');
    
    return true;

  } catch (error) {
    log(`\n❌ Unexpected error: ${error.message}`, 'red');
    return false;
  }
}

// Run the test
if (require.main === module) {
  testWorkingCredentials()
    .then(success => {
      if (success) {
        log('\n🎉 Credentials are working! Issue is configuration-specific.', 'green');
        process.exit(0);
      } else {
        log('\n❌ Configuration issue found.', 'red');
        process.exit(1);
      }
    })
    .catch(error => {
      log(`\n💥 Unexpected error: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { testWorkingCredentials };
