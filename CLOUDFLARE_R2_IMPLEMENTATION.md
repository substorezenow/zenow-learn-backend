# Cloudflare R2 Implementation Guide for Zenow Learn Backend

## 🚀 Overview

This implementation provides a complete, production-ready Cloudflare R2 integration for the Zenow Learn Backend. It includes all necessary files, configurations, and patterns for file storage, URL signing, and video processing.

## 📁 File Structure

```
src/utils/cloudflare/
├── index.ts              # Main export file with all utilities
├── r2Config.ts           # R2 configuration and connection setup
├── r2Operations.ts       # Core R2 operations (upload, download, delete)
├── signR2Urls.ts        # Advanced URL signing with caching
├── r2Middleware.ts       # Express middleware for automatic URL signing
└── r2Routes.ts          # File upload routes with video processing
```

## 🔧 Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Cloudflare R2 Configuration
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY=your_r2_access_key_id
R2_SECRET_KEY=your_r2_secret_access_key
R2_BUCKET=your-r2-bucket-name

# Optional: Custom domain for public URLs
GET_R2_ENDPOINT=https://your-custom-domain.com

# Optional: For debugging R2 operations
AWS_SDK_LOG_LEVEL=debug
```

### Dependencies

The following packages have been added to `package.json`:

```json
{
  "dependencies": {
    "aws-sdk": "^2.1691.0",
    "@aws-sdk/client-s3": "^3.658.1",
    "@aws-sdk/s3-request-presigner": "^3.658.1",
    "lru-cache": "^10.2.0",
    "p-map": "^7.0.0",
    "multer": "^1.4.5-lts.1",
    "ffmpeg-static": "^5.2.0"
  },
  "devDependencies": {
    "@types/aws-sdk": "^2.7.0",
    "@types/multer": "^1.4.11"
  }
}
```

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp env.example .env
   # Edit .env with your R2 credentials
   ```

3. **Test R2 connection:**
   ```bash
   npm run test:r2
   ```

## 📚 Usage Examples

### 1. Basic File Operations

```typescript
import { uploadFileToR2, getSignedUrl, deleteObjectFromR2 } from './utils/cloudflare';

// Upload a file
const result = await uploadFileToR2(
  '/path/to/local/file.jpg',
  'uploads/images/file.jpg',
  'image/jpeg'
);

// Get signed URL
const signedUrl = getSignedUrl('uploads/images/file.jpg');

// Delete a file
await deleteObjectFromR2('uploads/images/file.jpg');
```

### 2. Video Processing Pipeline

```typescript
import { convertToHLS, extractThumbnail, uploadFolderToR2, getSignedUrl } from './utils/cloudflare/r2Routes';

// Process video
const id = Date.now().toString();
const outputDir = `output/${id}`;
const thumbnailPath = `${outputDir}/thumbnail.jpg`;

await convertToHLS(filePath, outputDir);
await extractThumbnail(filePath, thumbnailPath);
await uploadFolderToR2(outputDir, `videos/${id}`);

// Return URLs
const videoUrl = getSignedUrl(`videos/${id}/output.m3u8`);
const thumbnailUrl = getSignedUrl(`videos/${id}/thumbnail.jpg`);
```

### 3. Complex Data Structure Signing

```typescript
import { signUrlsInSingleObject } from './utils/cloudflare';

const complexData = {
  bannerImage: "banners/main.jpg",
  productionHouse: {
    profileImage: "production/profile.jpg",
    coverImage: "production/cover.jpg"
  },
  castings: [
    {
      influencer: {
        profileImage: "influencer1/profile.jpg"
      }
    }
  ]
};

await signUrlsInSingleObject(complexData, [
  "bannerImage",
  "productionHouse.profileImage",
  "productionHouse.coverImage",
  "castings.influencer.profileImage"
]);
```

## 🌐 API Endpoints

### File Upload Endpoints

- `POST /api/files/upload-video` - Upload and process video files
- `POST /api/files/upload-image` - Upload image files
- `POST /api/files/upload-document` - Upload document files
- `POST /api/files/upload-multiple` - Upload multiple files
- `DELETE /api/files/delete/:key` - Delete a file
- `GET /api/files/info/:key` - Get file information and signed URL

### Example Usage

```bash
# Upload a video
curl -X POST http://localhost:8080/api/files/upload-video \
  -F "video=@sample.mp4"

# Upload an image
curl -X POST http://localhost:8080/api/files/upload-image \
  -F "image=@sample.jpg"

# Upload multiple files
curl -X POST http://localhost:8080/api/files/upload-multiple \
  -F "files=@file1.jpg" \
  -F "files=@file2.pdf"
```

## 🔄 Middleware Integration

The implementation includes automatic URL signing middleware that can be applied to specific routes:

```typescript
// Course-related endpoints
app.use('/api/courses', signCourseUrlsMiddleware);

// Category-related endpoints
app.use('/api/categories', signCategoryUrlsMiddleware);

// Profile-related endpoints
app.use('/api/profiles', signProfileUrlsMiddleware);
```

### Middleware Features

- **Automatic URL Signing**: Converts R2 keys to signed URLs
- **Caching**: LRU cache for signed URLs (1-hour TTL)
- **Concurrency Control**: Throttled signing with configurable limits
- **Error Handling**: Graceful fallback when signing fails
- **Performance**: Skips signing for too many URLs to prevent overload

## 🎯 Integration with Existing Code

### Course Management

The R2 utilities are integrated with the existing course management system:

```typescript
// In course creation/update
const courseData = {
  title: "React Fundamentals",
  banner_image: "courses/react/banner.jpg", // R2 key
  thumbnail_image: "courses/react/thumbnail.jpg" // R2 key
};

// URLs are automatically signed when returned via API
```

### Admin Panel Integration

The admin panel can now handle file uploads seamlessly:

```typescript
// Upload course banner
const bannerResult = await uploadFileToR2(
  bannerFile.path,
  `courses/${courseId}/banner.jpg`
);

// Update course with R2 key
await updateCourse(courseId, {
  banner_image: bannerResult.Key
});
```

## 🔒 Security Features

### File Upload Security

- **File Type Validation**: Only allowed file types are accepted
- **Size Limits**: Configurable file size limits (default: 100MB)
- **Virus Scanning**: Integration points for virus scanning
- **Access Control**: Signed URLs with expiration times

### URL Signing Security

- **Time-Limited URLs**: Signed URLs expire after 1 hour by default
- **Cache Security**: URLs are cached securely with TTL
- **Access Control**: Only authorized users can generate signed URLs

## 📊 Monitoring & Health Checks

### R2 Status Endpoint

```typescript
import { getR2Status } from './utils/cloudflare';

const status = await getR2Status();
// Returns: { configured, connected, cacheStats, middlewareCacheStats }
```

### Health Check Integration

The R2 services are integrated with the existing health check system:

```bash
curl http://localhost:8080/api/health
# Includes R2 service status
```

## 🚀 Performance Optimizations

### Caching Strategy

- **LRU Cache**: Signed URLs are cached with 1-hour TTL
- **Concurrency Control**: Maximum 5 concurrent signing operations
- **Batch Processing**: Multiple URLs signed in parallel
- **Smart Skipping**: Skips signing for too many URLs

### Video Processing

- **HLS Streaming**: Videos converted to HLS for better streaming
- **Thumbnail Extraction**: Automatic thumbnail generation
- **Parallel Processing**: Multiple operations run in parallel
- **Cleanup**: Automatic cleanup of temporary files

## 🔧 Configuration Options

### Middleware Configuration

```typescript
const customMiddleware = signR2UrlsMiddleware({
  fields: ['customField1', 'customField2'],
  maxTotalUrls: 100,
  concurrency: 10,
  expiry: 7200 // 2 hours
});
```

### Cache Configuration

```typescript
// Clear all caches
clearAllR2Caches();

// Get cache statistics
const stats = getCacheStats();
```

## 🧪 Testing

### Test R2 Connection

```bash
npm run test:r2
```

### Test File Upload

```bash
# Test video upload
curl -X POST http://localhost:8080/api/files/upload-video \
  -F "video=@test-video.mp4"

# Test image upload
curl -X POST http://localhost:8080/api/files/upload-image \
  -F "image=@test-image.jpg"
```

## 🚨 Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check R2 credentials in `.env`
   - Verify R2 endpoint URL
   - Ensure bucket exists

2. **File Upload Failed**
   - Check file size limits
   - Verify file type is allowed
   - Check disk space for temporary files

3. **URL Signing Failed**
   - Check R2 permissions
   - Verify object exists in bucket
   - Check cache configuration

### Debug Mode

Enable debug logging:

```env
AWS_SDK_LOG_LEVEL=debug
```

## 📈 Production Considerations

### Environment Setup

1. **Production Environment Variables**
   ```env
   NODE_ENV=production
   R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
   R2_ACCESS_KEY=your-production-access-key
   R2_SECRET_KEY=your-production-secret-key
   R2_BUCKET=your-production-bucket
   ```

2. **Custom Domain Setup**
   ```env
   GET_R2_ENDPOINT=https://your-cdn-domain.com
   ```

### Performance Tuning

- **Cache Size**: Adjust LRU cache size based on usage
- **Concurrency**: Tune concurrency limits for your infrastructure
- **TTL**: Adjust URL expiration times based on security requirements

### Monitoring

- **Health Checks**: Monitor R2 service health
- **Cache Performance**: Track cache hit/miss ratios
- **Upload Success Rates**: Monitor file upload success rates
- **Error Rates**: Track and alert on error rates

## 🎉 Benefits

✅ **Cost Effective**: Cloudflare R2 is more cost-effective than AWS S3
✅ **Global CDN**: Built-in global CDN for fast content delivery
✅ **Video Processing**: Built-in video processing with FFmpeg
✅ **Automatic URL Signing**: Secure, time-limited URLs
✅ **Caching**: High-performance caching for signed URLs
✅ **Error Handling**: Comprehensive error handling and fallbacks
✅ **Production Ready**: Enterprise-grade implementation
✅ **Easy Integration**: Seamless integration with existing codebase

## 📞 Support

For issues and questions:

1. Check the logs for detailed error information
2. Review this documentation for configuration options
3. Test R2 connection with `npm run test:r2`
4. Check Cloudflare R2 documentation
5. Contact the development team

---

**Your Zenow Learn Backend now has enterprise-grade file storage capabilities! 🚀**
