#!/usr/bin/env node

/**
 * Hardcoded R2 Test
 * Test with hardcoded credentials to isolate environment issues
 */

const AWS = require('aws-sdk');

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

async function testHardcodedCredentials() {
  log('\n🔍 Testing R2 with Hardcoded Credentials', 'cyan');
  log('=' .repeat(50), 'cyan');

  // Hardcoded credentials from your .env
  const config = {
    endpoint: 'https://74d02b9a9a706d9d2a82cf625dbbbb0f.r2.cloudflarestorage.com',
    accessKey: '0c7df4ef05f0bc321187328d813cb3ef',
    secretKey: '3d4eadc22ede754a8b824ad301ec992cecaf2e4baff57955d6db87dae893d019',
    bucket: 'testapp'
  };

  log('\n📋 Hardcoded Configuration:', 'blue');
  log(`Endpoint: ${config.endpoint}`, 'white');
  log(`Access Key: ***${config.accessKey.slice(-4)}`, 'white');
  log(`Secret Key: ***${config.secretKey.slice(-4)}`, 'white');
  log(`Bucket: ${config.bucket}`, 'white');

  const s3 = new AWS.S3({
    endpoint: config.endpoint,
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
    signatureVersion: "v4",
    s3ForcePathStyle: true,
    region: "auto"
  });

  try {
    log('\n🔍 Testing authentication...', 'blue');
    const result = await s3.listBuckets().promise();
    
    log('✅ SUCCESS with hardcoded credentials!', 'green');
    log(`📋 Found ${result.Buckets?.length || 0} buckets:`, 'green');
    
    result.Buckets?.forEach((bucket, index) => {
      const isTargetBucket = bucket.Name === config.bucket;
      const marker = isTargetBucket ? '🎯' : '  ';
      const color = isTargetBucket ? 'green' : 'white';
      log(`${marker} ${index + 1}. ${bucket.Name}`, color);
    });

    // Test bucket access
    const bucketExists = result.Buckets?.some(bucket => bucket.Name === config.bucket);
    if (bucketExists) {
      log(`✅ Bucket '${config.bucket}' exists`, 'green');
      
      // Test bucket operations
      try {
        const listResult = await s3.listObjectsV2({ 
          Bucket: config.bucket, 
          MaxKeys: 1 
        }).promise();
        log('✅ Bucket access successful', 'green');
      } catch (bucketError) {
        log(`❌ Bucket access failed: ${bucketError.message}`, 'red');
      }
    } else {
      log(`❌ Bucket '${config.bucket}' not found`, 'red');
    }

    log('\n🎉 Hardcoded credentials work!', 'green');
    log('\n💡 This confirms the issue is with environment variable loading', 'yellow');
    log('Solutions:', 'white');
    log('1. Check .env file location and format', 'white');
    log('2. Verify dotenv.config() is called correctly', 'white');
    log('3. Check for environment variable conflicts', 'white');
    log('4. Try loading .env manually', 'white');
    
    return true;

  } catch (error) {
    log(`\n❌ Hardcoded credentials also failed: ${error.message}`, 'red');
    log(`Error code: ${error.code}`, 'red');
    
    log('\n💡 This suggests a deeper issue:', 'yellow');
    log('1. Network/proxy restrictions', 'white');
    log('2. Account-specific access controls', 'white');
    log('3. Cloudflare R2 service issues', 'white');
    log('4. Different project context', 'white');
    
    return false;
  }
}

// Run the test
if (require.main === module) {
  testHardcodedCredentials()
    .then(success => {
      if (success) {
        log('\n✅ Issue is environment variable loading!', 'green');
        process.exit(0);
      } else {
        log('\n❌ Issue is deeper than environment variables', 'red');
        process.exit(1);
      }
    })
    .catch(error => {
      log(`\n💥 Unexpected error: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { testHardcodedCredentials };
