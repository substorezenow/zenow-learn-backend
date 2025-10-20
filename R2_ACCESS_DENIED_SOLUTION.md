# 🚨 Cloudflare R2 Access Denied - SOLUTION

## ✅ Issue Confirmed
The R2 connection test confirms **Access Denied** error, which means:

1. **R2 API Token Permissions Issue** - Most likely cause
2. **Invalid Credentials** - Possible cause  
3. **Account/Bucket Configuration** - Less likely

## 🔧 IMMEDIATE SOLUTION

### Step 1: Check R2 API Token Permissions

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com/profile/api-tokens
   - Look for your R2 API token

2. **Verify Token Permissions**
   Your token needs these **exact permissions**:
   ```
   Account: R2:Object:Read
   Account: R2:Object:Write  
   Account: R2:Object:Delete
   Account: R2:Bucket:Read
   ```

3. **If Token is Missing Permissions**
   - **Delete the old token**
   - **Create a new token** with correct permissions

### Step 2: Create New R2 API Token

1. **In Cloudflare Dashboard**
   - Go to "My Profile" → "API Tokens"
   - Click "Create Token"

2. **Use Custom Token Template**
   - Click "Custom token"
   - Fill in the form:

   **Token Name**: `R2-Full-Access`
   
   **Permissions**:
   ```
   Account - R2:Object:Read
   Account - R2:Object:Write
   Account - R2:Object:Delete
   Account - R2:Bucket:Read
   ```

   **Account Resources**:
   ```
   Include - All accounts
   ```

   **Zone Resources**:
   ```
   Include - All zones
   ```

3. **Create Token**
   - Click "Continue to summary"
   - Click "Create Token"
   - **Copy the token immediately** (you won't see it again)

### Step 3: Update Environment Variables

Replace your current R2 credentials in `.env`:

```env
# OLD (Current - Not Working)
R2_ACCESS_KEY=0c7df4ef05f0bc321187328d813cb3ef
R2_SECRET_KEY=3d4eadc22ede754a8b824ad301ec992cecaf2e4baff57955d6db87dae893d019

# NEW (Replace with your new token)
R2_ACCESS_KEY=your_new_access_key_here
R2_SECRET_KEY=your_new_secret_key_here
```

**Note**: The new token will have both access key and secret key.

### Step 4: Verify Bucket Exists

1. **Check in Cloudflare Dashboard**
   - Go to "R2 Object Storage"
   - Verify bucket `testapp` exists

2. **If Bucket Doesn't Exist**
   ```bash
   # Install Wrangler CLI
   npm install -g wrangler
   
   # Login to Cloudflare
   wrangler login
   
   # Create bucket
   wrangler r2 bucket create testapp
   ```

### Step 5: Test the Fix

```bash
cd zenow-learn-backend
npm run test:r2
```

## 🔍 Alternative Solutions

### Option A: Use Wrangler CLI to Generate Token

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Generate R2 API token
wrangler r2 api-token create --name "R2-Full-Access"
```

### Option B: Check Account ID

Your endpoint URL should match your account ID:
```env
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

To find your Account ID:
1. Go to Cloudflare Dashboard
2. Look at the right sidebar
3. Copy the Account ID
4. Update `R2_ENDPOINT` if different

### Option C: Verify R2 is Enabled

1. **Check Account Plan**
   - Ensure your Cloudflare account has R2 enabled
   - R2 is available on all plans

2. **Check Service Status**
   - Visit: https://www.cloudflarestatus.com/
   - Ensure R2 service is operational

## 🚀 Quick Fix Commands

```bash
# 1. Test current configuration
npm run test:r2

# 2. Check environment variables
grep -E "R2_" .env

# 3. Install Wrangler CLI
npm install -g wrangler

# 4. Login and create bucket
wrangler login
wrangler r2 bucket create testapp

# 5. Generate new API token
wrangler r2 api-token create --name "R2-Full-Access"
```

## 📋 Verification Checklist

- [ ] New R2 API token created with correct permissions
- [ ] Token has R2:Object:Read permission
- [ ] Token has R2:Object:Write permission  
- [ ] Token has R2:Object:Delete permission
- [ ] Token has R2:Bucket:Read permission
- [ ] Updated `.env` file with new credentials
- [ ] Bucket `testapp` exists in Cloudflare dashboard
- [ ] Account ID in endpoint URL is correct
- [ ] R2 service is enabled in account

## 🎯 Expected Result

After applying the fix, running `npm run test:r2` should show:

```
✅ Authentication successful
✅ Bucket 'testapp' found
✅ Bucket access successful
✅ Upload test successful
✅ Signed URL generation successful
🎉 All R2 tests passed!
```

## 🆘 Still Having Issues?

If the problem persists after following these steps:

1. **Double-check token permissions** in Cloudflare dashboard
2. **Verify bucket exists** and is accessible
3. **Check account ID** in endpoint URL
4. **Contact Cloudflare support** if needed

---

**The most common cause is incorrect API token permissions. Creating a new token with the exact permissions listed above should resolve the issue.**
