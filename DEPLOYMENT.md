# Zenow Learn Backend - Google Cloud Run Deployment Guide

## 🚀 Quick Start

### Prerequisites
1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Docker** installed locally
4. **CockroachDB** instance (Cloud or self-hosted)

### 1. Initial Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd zenow_learn_backend

# Set your Google Cloud project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 2. Environment Configuration

```bash
# Copy the environment template
cp env.example .env

# Edit the .env file with your actual values
nano .env
```

**Required Environment Variables:**
- `COCKROACH_URL` - Your CockroachDB connection string
- `JWT_SECRET` - Strong random string for JWT signing
- `CORS_ORIGIN` - Your frontend domain(s)

### 3. Deploy to Cloud Run

#### Option A: Using the deployment script (Recommended)
```bash
# Make the script executable (already done)
chmod +x deploy.sh

# Run deployment
./deploy.sh --project-id YOUR_PROJECT_ID --region us-central1
```

#### Option B: Manual deployment
```bash
# Build and push Docker image
docker build -t gcr.io/YOUR_PROJECT_ID/zenow-learn-backend .
docker push gcr.io/YOUR_PROJECT_ID/zenow-learn-backend

# Deploy to Cloud Run
gcloud run deploy zenow-learn-backend \
  --image gcr.io/YOUR_PROJECT_ID/zenow-learn-backend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

### 4. Set Environment Variables in Cloud Run

```bash
# Set environment variables
gcloud run services update zenow-learn-backend \
  --region us-central1 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars COCKROACH_URL=your-connection-string \
  --set-env-vars JWT_SECRET=your-jwt-secret \
  --set-env-vars CORS_ORIGIN=https://your-frontend.com
```

### 5. Run Database Migrations

```bash
# Create a Cloud Run job for migrations
gcloud run jobs create migrate-db \
  --image gcr.io/YOUR_PROJECT_ID/zenow-learn-backend \
  --region us-central1 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars COCKROACH_URL=your-connection-string \
  --command npm \
  --args run,migrate

# Execute the migration job
gcloud run jobs execute migrate-db --region us-central1
```

### 6. Create Admin User

```bash
# Create a Cloud Run job for admin user creation
gcloud run jobs create create-admin \
  --image gcr.io/YOUR_PROJECT_ID/zenow-learn-backend \
  --region us-central1 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars COCKROACH_URL=your-connection-string \
  --command npm \
  --args run,create-admin

# Execute the admin creation job
gcloud run jobs execute create-admin --region us-central1
```

## 🔧 Configuration Details

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 8080 |
| `NODE_ENV` | Environment | Yes | production |
| `COCKROACH_URL` | Database connection | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `CORS_ORIGIN` | Allowed origins | Yes | - |
| `SESSION_ENCRYPTION_KEY` | Session encryption | No | Generated |
| `CSRF_SECRET` | CSRF protection | No | Generated |

### Cloud Run Configuration

- **Memory**: 1GB (adjustable based on usage)
- **CPU**: 1 vCPU (adjustable based on usage)
- **Min Instances**: 0 (for cost optimization)
- **Max Instances**: 10 (adjustable based on traffic)
- **Concurrency**: 100 requests per instance
- **Timeout**: 300 seconds

## 🔍 Health Checks

The application includes a health check endpoint at `/api/health` that returns:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "security": {
    "sessionManagement": true,
    "rateLimiting": true,
    "securityMonitoring": true,
    "csrfProtection": true,
    "enhancedHeaders": true
  }
}
```

## 📊 Monitoring & Logging

### View Logs
```bash
# View recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=zenow-learn-backend" --limit 50

# Follow logs in real-time
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=zenow-learn-backend"
```

### Monitor Performance
- Use Google Cloud Console → Cloud Run → zenow-learn-backend
- Monitor CPU, memory, and request metrics
- Set up alerts for error rates and latency

## 🔒 Security Considerations

### Production Security Checklist
- [ ] Use strong, unique JWT secrets
- [ ] Enable HTTPS only (Cloud Run default)
- [ ] Configure proper CORS origins
- [ ] Set up database connection with SSL
- [ ] Enable security monitoring
- [ ] Regular security updates
- [ ] Monitor for suspicious activity

### Database Security
- Use CockroachDB Cloud with SSL
- Implement connection pooling
- Regular backups
- Access control and authentication

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check CockroachDB connection string
   - Verify SSL settings
   - Ensure database is accessible from Cloud Run

2. **CORS Errors**
   - Verify CORS_ORIGIN environment variable
   - Check frontend domain configuration

3. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check token expiration settings

4. **Memory Issues**
   - Increase Cloud Run memory allocation
   - Optimize database queries
   - Check for memory leaks

### Debug Commands

```bash
# Check service status
gcloud run services describe zenow-learn-backend --region us-central1

# View service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=zenow-learn-backend" --limit 100

# Test health endpoint
curl https://your-service-url/api/health
```

## 📈 Scaling

### Automatic Scaling
Cloud Run automatically scales based on:
- Request volume
- CPU utilization
- Memory usage
- Concurrent requests

### Manual Scaling
```bash
# Update scaling settings
gcloud run services update zenow-learn-backend \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 20 \
  --concurrency 50
```

## 💰 Cost Optimization

1. **Set min-instances to 0** for development
2. **Use appropriate memory/CPU** allocation
3. **Monitor usage** with Cloud Monitoring
4. **Implement caching** for frequently accessed data
5. **Optimize database queries** to reduce processing time

## 🔄 CI/CD Pipeline

### Using Cloud Build
```bash
# Trigger build from source
gcloud builds submit --config cloudbuild.yaml

# Set up automatic builds on Git push
gcloud builds triggers create github \
  --repo-name=your-repo \
  --repo-owner=your-username \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

## 📞 Support

For issues and questions:
1. Check the logs first
2. Review this documentation
3. Check Google Cloud Run documentation
4. Contact the development team

---

**Happy Deploying! 🚀**
