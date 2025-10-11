# Database Connection Issues & Solutions Guide

## 🚨 **Main Issues Identified**

### 1. **Connection Timeout**
- **Problem**: Database connection fails with "Connection terminated due to connection timeout"
- **Root Cause**: Short connection timeout (2 seconds) + no retry mechanism
- **Impact**: Backend starts but most features are unusable

### 2. **No Retry Logic**
- **Problem**: Single connection attempt, no automatic retry
- **Root Cause**: Missing exponential backoff and retry mechanism
- **Impact**: Temporary network issues cause permanent failures

### 3. **No Health Monitoring**
- **Problem**: No automatic reconnection when connection drops
- **Root Cause**: Missing health checks and connection monitoring
- **Impact**: Backend becomes unresponsive if connection is lost

## ✅ **Solutions Implemented**

### 1. **Enhanced Database Manager with Retry Logic**

**Features Added:**
- **Exponential Backoff**: Retry delays increase progressively (1s → 2s → 4s → 8s → 16s → 30s max)
- **Max Retries**: 5 attempts before giving up
- **Connection Timeout**: Increased from 2s to 10s
- **Health Monitoring**: Automatic health checks every 30 seconds
- **Auto-Reconnection**: Automatic reconnection on connection loss

**Code Location**: `src/utils/databaseManager.ts`

```typescript
// Key improvements:
- connectionTimeoutMillis: 10000, // Increased from 2000
- Exponential backoff with jitter
- Health monitoring with automatic reconnection
- Connection status tracking
- Graceful error handling
```

### 2. **Background Retry Process**

**Features Added:**
- **Background Retries**: Automatic retry every 30 seconds if connection fails
- **Silent Retries**: No log spam during background attempts
- **Status Tracking**: Real-time connection status monitoring

**Code Location**: `src/index.ts`

```typescript
// Background retry process
setInterval(async () => {
  try {
    if (!dbManager.getConnectionStatus().connected) {
      console.log('🔄 Background database reconnection attempt...');
      await connectCockroach();
      console.log('✅ Database reconnected successfully');
    }
  } catch (retryError) {
    // Silent retry - don't spam logs
  }
}, 30000); // Retry every 30 seconds
```

### 3. **Enhanced Health Check Endpoint**

**Features Added:**
- **Detailed Status**: Database connection status, attempts, retry count
- **Pool Statistics**: Connection pool metrics
- **Service Health**: Database and cache health status
- **HTTP Status Codes**: 200 for healthy, 503 for degraded

**Endpoint**: `GET /api/health`

**Response Example:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": {
      "status": "healthy",
      "connected": true,
      "attempts": 1,
      "retryCount": 0,
      "poolStats": {
        "totalCount": 5,
        "idleCount": 4,
        "waitingCount": 0
      }
    },
    "cache": {
      "status": "healthy",
      "connected": true
    }
  }
}
```

### 4. **Database Connection Test Script**

**Features Added:**
- **Connection Testing**: Direct database connection test
- **Environment Validation**: Check all required environment variables
- **Troubleshooting Tips**: Specific error messages with solutions
- **Table Verification**: Check if tables exist

**Usage**: `npm run test:db`

**Output Example:**
```
🔍 Testing Database Connection...

📋 Environment Variables:
COCKROACH_URL: ✅ Set
COCKROACH_HOST: Not set
COCKROACH_PORT: Not set

🔗 Using connection string...
⏳ Connecting to database...
✅ Connected successfully in 245ms!

🔍 Testing query...
✅ Query executed successfully!
📊 Database Version: CockroachDB CCL v23.1.11
⏰ Current Time: 2024-01-15 10:30:00.123456+00:00

🔍 Checking tables...
✅ Tables found:
  - categories
  - fields
  - courses
  - users
```

## 🔧 **Troubleshooting Steps**

### 1. **Test Database Connection**
```bash
cd zenow-learn-backend
npm run test:db
```

### 2. **Check Environment Variables**
```bash
# Check if .env file exists and has correct values
cat .env | grep COCKROACH
```

### 3. **Verify CockroachDB is Running**
```bash
# For local development
cockroach start --insecure --host=localhost --port=26257

# Check if it's running
ps aux | grep cockroach
```

### 4. **Check Health Endpoint**
```bash
curl http://localhost:8080/api/health
```

### 5. **Monitor Logs**
```bash
# Watch backend logs for connection attempts
npm run dev
```

## 🚀 **Common Solutions**

### **Issue: Connection Timeout**
**Solution**: 
- Check if CockroachDB is running
- Verify host and port are correct
- Check firewall settings
- Increase connection timeout in environment

### **Issue: Authentication Failed**
**Solution**:
- Check username and password in .env
- Verify user has proper permissions
- Ensure database exists

### **Issue: SSL/TLS Errors**
**Solution**:
- Set `COCKROACH_SSL=false` for local development
- Check SSL certificate configuration
- Verify SSL mode settings

### **Issue: Network Issues**
**Solution**:
- Check network connectivity
- Verify DNS resolution
- Test with `ping` and `telnet`
- Check proxy settings

## 📊 **Monitoring & Observability**

### **Connection Status Tracking**
- **Attempts**: Number of connection attempts
- **Retry Count**: Current retry attempt
- **Connected**: Boolean connection status
- **Pool Stats**: Active/idle/waiting connections

### **Health Monitoring**
- **Automatic Health Checks**: Every 30 seconds
- **Connection Recovery**: Automatic reconnection on failure
- **Status Endpoint**: Real-time health information
- **Logging**: Detailed connection attempt logs

### **Error Handling**
- **Graceful Degradation**: App continues with limited functionality
- **Retry Logic**: Automatic retry with exponential backoff
- **Error Classification**: Specific error types with solutions
- **Recovery**: Automatic recovery when connection is restored

## 🎯 **Best Practices**

### **Environment Configuration**
```env
# Use connection string for production
COCKROACH_URL=postgresql://user:password@host:port/database?sslmode=require

# Or individual parameters for development
COCKROACH_HOST=localhost
COCKROACH_PORT=26257
COCKROACH_USER=root
COCKROACH_PASS=password
COCKROACH_DB=zenow_learn
COCKROACH_SSL=false
```

### **Connection Pool Settings**
```typescript
{
  max: 20,                    // Maximum connections
  min: 5,                     // Minimum connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 10000, // Connection timeout
  maxUses: 7500               // Connection lifetime
}
```

### **Monitoring Commands**
```bash
# Test database connection
npm run test:db

# Check health status
curl http://localhost:8080/api/health

# Monitor logs
npm run dev

# Check database status
cockroach sql --insecure --host=localhost --port=26257
```

## 🔄 **Recovery Process**

### **Automatic Recovery**
1. **Health Check Failure**: Detected every 30 seconds
2. **Connection Marked**: As disconnected
3. **Retry Attempt**: Automatic reconnection
4. **Success**: Connection restored, health monitoring resumed
5. **Failure**: Continue retry cycle

### **Manual Recovery**
1. **Check Status**: `curl http://localhost:8080/api/health`
2. **Test Connection**: `npm run test:db`
3. **Restart Database**: If needed
4. **Restart Backend**: If automatic recovery fails

## 📈 **Performance Improvements**

### **Before (Issues)**
- ❌ 2-second connection timeout
- ❌ No retry mechanism
- ❌ Single connection attempt
- ❌ No health monitoring
- ❌ App fails completely on DB issues

### **After (Solutions)**
- ✅ 10-second connection timeout
- ✅ 5 retry attempts with exponential backoff
- ✅ Background retry every 30 seconds
- ✅ Health monitoring and auto-reconnection
- ✅ Graceful degradation with limited functionality

## 🎉 **Result**

The backend now has **enterprise-grade database resilience** with:
- **Automatic retry logic** with exponential backoff
- **Health monitoring** and auto-reconnection
- **Graceful degradation** when database is unavailable
- **Comprehensive monitoring** and troubleshooting tools
- **Production-ready** connection management

**The backend will now automatically recover from database connection issues and provide detailed status information for monitoring and troubleshooting.**
