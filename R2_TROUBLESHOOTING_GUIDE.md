# 🔧 Cloudflare R2 Configuration Fix Guide

## 🚨 Current Issue
The backend is showing `AccessDenied` error when trying to connect to Cloudflare R2. This is typically caused by:

1. **Incorrect R2 credentials**
2. **Missing R2 permissions**
3. **Wrong bucket configuration**
4. **Invalid endpoint URL**

## 🔍 Diagnosis Steps

### Step 1: Run R2 Connection Test
```bash
cd zenow-learn-backend
npm run test:r2
```

This will run a comprehensive test that checks:
- Environment variables
- Authentication
- Bucket existence
- Bucket access
- Upload permissions
- Signed URL generation

### Step 2: Check Current Configuration
Your current R2 configuration:
```env
R2_ENDPOINT=https://74d02b9a9a706d9d2a82cf625dbbbb0f.r2.cloudflarestorage.com
R2_ACCESS_KEY=0c7df4ef05f0bc321187328d813cb3ef
R2_SECRET_KEY=3d4eadc22ede754a8b824ad301ec992cecaf2e4baff57955d6db87dae893d019
R2_BUCKET=testapp
```

## 🛠️ Solutions

### Solution 1: Verify R2 API Token Permissions

1. **Go to Cloudflare Dashboard**
   - Navigate to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Go to "My Profile" → "API Tokens"

2. **Check Token Permissions**
   Your R2 API token needs these permissions:
   - `R2:Object:Read` - To read objects from buckets
   - `R2:Object:Write` - To upload objects to buckets
   - `R2:Object:Delete` - To delete objects from buckets
   - `R2:Bucket:Read` - To list buckets

3. **Create New Token (if needed)**
   - Click "Create Token"
   - Use "Custom token" template
   - Set permissions:
     ```
     Account: R2:Object:Read, R2:Object:Write, R2:Object:Delete, R2:Bucket:Read
     Zone Resources: Include - All zones
     ```
   - Set TTL to appropriate value
   - Copy the new token and update `.env`

### Solution 2: Verify Bucket Configuration

1. **Check Bucket Exists**
   - Go to Cloudflare Dashboard
   - Navigate to "R2 Object Storage"
   - Verify bucket `testapp` exists

2. **Check Bucket Settings**
   - Ensure bucket is not deleted
   - Check bucket region
   - Verify bucket permissions

3. **Create Bucket (if needed)**
   ```bash
   # Using Wrangler CLI
   npx wrangler r2 bucket create testapp
   ```

### Solution 3: Fix Environment Variables

Update your `.env` file with correct values:

```env
# Cloudflare R2 Configuration
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY=your_r2_access_key_id
R2_SECRET_KEY=your_r2_secret_access_key
R2_BUCKET=your-r2-bucket-name

# Optional: Custom domain for public URLs
GET_R2_ENDPOINT=https://your-custom-domain.com

# Cloudflare Worker Proxy Domain
R2_WORKER_DOMAIN=https://test-r2-proxy.substore.in
```

### Solution 4: Test with Minimal Configuration

Create a test script to verify basic connectivity:

```javascript
const AWS = require('aws-sdk');
require('dotenv').config();

const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  signatureVersion: "v4",
  s3ForcePathStyle: true,
  region: "auto"
});

async function test() {
  try {
    const result = await s3.listBuckets().promise();
    console.log('✅ Success:', result.Buckets);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
```

## 🔧 Common Issues & Fixes

### Issue 1: AccessDenied Error
**Cause**: API token doesn't have proper permissions
**Fix**: 
1. Check token permissions in Cloudflare dashboard
2. Create new token with correct permissions
3. Update `.env` file

### Issue 2: Bucket Not Found
**Cause**: Bucket doesn't exist or wrong name
**Fix**:
1. Verify bucket name in Cloudflare dashboard
2. Create bucket if it doesn't exist
3. Update `R2_BUCKET` in `.env`

### Issue 3: Invalid Endpoint
**Cause**: Wrong endpoint URL format
**Fix**:
1. Use format: `https://ACCOUNT_ID.r2.cloudflarestorage.com`
2. Get Account ID from Cloudflare dashboard
3. Update `R2_ENDPOINT` in `.env`

### Issue 4: Signature Mismatch
**Cause**: Wrong secret key or access key
**Fix**:
1. Verify credentials in Cloudflare dashboard
2. Regenerate API token if needed
3. Update `.env` file

## 🚀 Quick Fix Commands

### 1. Test Current Configuration
```bash
npm run test:r2
```

### 2. Check Environment Variables
```bash
grep -E "R2_" .env
```

### 3. Verify Bucket Access
```bash
npx wrangler r2 bucket list
```

### 4. Create New Bucket (if needed)
```bash
npx wrangler r2 bucket create testapp
```

## 📋 Verification Checklist

- [ ] R2 API token has correct permissions
- [ ] Bucket exists and is accessible
- [ ] Environment variables are correct
- [ ] Endpoint URL format is correct
- [ ] Account ID is correct
- [ ] No extra spaces in credentials
- [ ] R2 service is enabled in account

## 🆘 Still Having Issues?

If the problem persists:

1. **Check Cloudflare Status**: Visit [Cloudflare Status](https://www.cloudflarestatus.com/)
2. **Contact Support**: Use Cloudflare support channels
3. **Check Logs**: Review detailed error logs
4. **Test with curl**: Use direct API calls to verify

## 📞 Support Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 API Reference](https://developers.cloudflare.com/r2/api/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

---

**After fixing the configuration, restart your backend server to apply the changes.**
