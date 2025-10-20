# Cloudflare Worker R2 Proxy Setup Guide

## 🚀 Overview

This guide sets up a Cloudflare Worker to serve files from your R2 bucket through your custom domain, providing a clean, fast, and secure way to serve static files.

## 📋 Prerequisites

- Cloudflare account with R2 enabled
- Custom domain managed by Cloudflare
- R2 bucket with files to serve

## 🔧 Setup Instructions

### Step 1: Create Cloudflare Worker

#### Option A: Using C3 (Recommended)
```bash
npm create cloudflare@latest -- r2-proxy
```

For setup, select:
- **What would you like to start with?**: `Hello World example`
- **Which template would you like to use?**: `Worker only`
- **Which language do you want to use?**: `JavaScript`
- **Do you want to use git for version control?**: `Yes`
- **Do you want to deploy your application?**: `No`

Then move into the directory:
```bash
cd r2-proxy
```

#### Option B: Manual Creation
1. **Go to Cloudflare Dashboard**
   - Navigate to [Workers & Pages](https://dash.cloudflare.com/)
   - Click "Create application" → "Create Worker"

2. **Configure Worker**
   - **Name**: `r2-proxy` (or your preferred name)
   - **Subdomain**: Choose a subdomain for your worker
   - Click "Create Worker"

### Step 2: Create R2 Bucket

```bash
npx wrangler r2 bucket create <YOUR_BUCKET_NAME>
```

Verify the bucket was created:
```bash
npx wrangler r2 bucket list
```

### Step 3: Bind R2 Bucket to Worker

#### Option A: Using wrangler.toml (Recommended for C3)
Add the following to your `wrangler.toml` file:

```toml
[[r2_buckets]]
binding = 'R2_BUCKET'  # JavaScript variable name
bucket_name = '<YOUR_BUCKET_NAME>'
```

#### Option B: Using Dashboard
1. **In Worker Settings**
   - Go to "Settings" → "Variables"
   - Under "R2 Bucket Bindings", click "Add binding"
   - **Variable name**: `R2_BUCKET`
   - **R2 bucket**: Select your bucket
   - Click "Save"

### Step 4: Deploy Worker Script

#### Option A: Using C3/Wrangler
Replace the content in `src/index.js` with the content from `cloudflare-worker-r2-proxy.js`, then deploy:

```bash
npx wrangler deploy
```

#### Option B: Using Dashboard
1. **Replace Default Code**
   - Copy the content from `cloudflare-worker-r2-proxy.js`
   - Paste it into the worker editor
   - Click "Save and deploy"

### Step 5: Configure Custom Domain

#### Option A: Using Cloudflare Workers Custom Domain

1. **In Worker Settings**
   - Go to "Settings" → "Triggers"
   - Under "Custom Domains", click "Add Custom Domain"
   - **Domain**: `test-r2-proxy.substore.in` (or your preferred subdomain)
   - Click "Add Custom Domain"

#### Option B: Using DNS CNAME Record

1. **In Cloudflare DNS**
   - Go to your domain's DNS settings
   - Add a CNAME record:
     - **Name**: `files` (or your preferred subdomain)
     - **Target**: `your-worker.your-account.workers.dev`
     - **Proxy status**: Proxied (orange cloud)
   - Click "Save"

### Step 5: Test Setup

1. **Upload a test file to R2**
   ```bash
   # Example: Upload index.html to your R2 bucket
   aws s3 cp index.html s3://your-bucket-name/index.html
   ```

2. **Test access**
   ```bash
   # Test your custom domain
   curl https://test-r2-proxy.substore.in/
   curl https://test-r2-proxy.substore.in/path/to/file.jpg
   ```

## 🎯 Usage Examples

### Serving Different File Types

```bash
# Serve HTML file
https://test-r2-proxy.substore.in/index.html

# Serve images
https://test-r2-proxy.substore.in/images/logo.png
https://test-r2-proxy.substore.in/banners/main.jpg

# Serve videos
https://test-r2-proxy.substore.in/videos/intro.mp4

# Serve documents
https://test-r2-proxy.substore.in/docs/manual.pdf
```

### Integration with Backend

Update your backend to use the custom domain:

```typescript
// In your backend code
const CUSTOM_DOMAIN = 'https://test-r2-proxy.substore.in';

// Instead of signed URLs, use direct URLs
const imageUrl = `${CUSTOM_DOMAIN}/images/${filename}`;
const videoUrl = `${CUSTOM_DOMAIN}/videos/${filename}`;
```

## 🔒 Security Features

### Built-in Security

- **Method Restriction**: Only GET requests allowed
- **File Path Validation**: Prevents directory traversal
- **CORS Headers**: Proper CORS configuration
- **Cache Headers**: Optimized caching for different file types

### Additional Security (Optional)

Add authentication by modifying the worker:

```javascript
// Add at the beginning of fetch function
const authHeader = request.headers.get('Authorization');
if (!authHeader || !isValidToken(authHeader)) {
  return new Response('Unauthorized', { status: 401 });
}
```

## 📊 Performance Optimizations

### Caching Strategy

- **Images**: 1 year cache (CSS, JS, images)
- **Videos**: 1 day cache
- **Other files**: 1 hour cache
- **ETags**: Proper ETag handling for efficient caching

### CDN Benefits

- **Global Distribution**: Files served from edge locations
- **Automatic Compression**: Cloudflare handles compression
- **DDoS Protection**: Built-in DDoS protection
- **SSL/TLS**: Automatic HTTPS

## 🔧 Configuration Options

### Environment Variables

Add these in Worker Settings → Variables:

```env
# Optional: Custom cache settings
CACHE_TTL_IMAGES=31536000
CACHE_TTL_VIDEOS=86400
CACHE_TTL_DEFAULT=3600

# Optional: Authentication
AUTH_TOKEN=your-secret-token
```

### Custom Headers

Modify the worker to add custom headers:

```javascript
// Add custom headers
headers.set('X-Custom-Header', 'Your Value');
headers.set('X-Served-By', 'Cloudflare-Worker');
```

## 🚨 Troubleshooting

### Common Issues

1. **404 Errors**
   - Check if file exists in R2 bucket
   - Verify file path is correct
   - Check R2 bucket binding

2. **CORS Issues**
   - Verify CORS headers in worker
   - Check browser console for errors

3. **Cache Issues**
   - Clear Cloudflare cache
   - Check cache headers

### Debug Mode

Add logging to worker for debugging:

```javascript
console.log('Request URL:', request.url);
console.log('File path:', filePath);
console.log('Object found:', object !== null);
```

## 📈 Monitoring

### Cloudflare Analytics

- **Workers Analytics**: Monitor requests, errors, CPU time
- **Cache Analytics**: Monitor cache hit rates
- **Security Analytics**: Monitor threats and attacks

### Custom Metrics

Add custom metrics to worker:

```javascript
// Track file requests
ctx.waitUntil(env.ANALYTICS.writeDataPoint({
  blobs: [filePath, request.headers.get('user-agent')],
  doubles: [Date.now()],
  indexes: [url.hostname]
}));
```

## 🎉 Benefits

✅ **Cost Effective**: No egress charges for Cloudflare  
✅ **Fast**: Global CDN with edge caching  
✅ **Secure**: Built-in security features  
✅ **Simple**: No complex configuration needed  
✅ **Scalable**: Handles high traffic automatically  
✅ **Custom Domain**: Clean, branded URLs  
✅ **HTTPS**: Automatic SSL/TLS  
✅ **Cache Control**: Optimized caching strategy  

## 📞 Support

For issues:

1. Check Cloudflare Worker logs
2. Verify R2 bucket permissions
3. Test with curl/Postman
4. Check DNS configuration
5. Review Cloudflare documentation

---

**Your files are now served through a fast, secure, and scalable Cloudflare Worker! 🚀**
