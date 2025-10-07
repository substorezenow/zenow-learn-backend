#!/bin/bash

# Zenow Learn Backend Startup Script
# This script helps with debugging startup issues

echo "🚀 Starting Zenow Learn Backend..."
echo "📅 Timestamp: $(date)"
echo "🌍 Environment: ${NODE_ENV:-development}"
echo "🔌 Port: ${PORT:-8080}"

# Check if required environment variables are set
echo "🔍 Checking environment variables..."

if [ -z "$JWT_SECRET" ]; then
  echo "⚠️  WARNING: JWT_SECRET not set, using default (NOT SECURE FOR PRODUCTION)"
fi

if [ -z "$COCKROACH_URL" ] && [ -z "$COCKROACH_HOST" ]; then
  echo "⚠️  WARNING: Database connection not configured"
  echo "   Set COCKROACH_URL or COCKROACH_HOST environment variables"
fi

if [ -z "$REDIS_URL" ]; then
  echo "⚠️  WARNING: Redis connection not configured"
  echo "   Set REDIS_URL environment variable for caching"
fi

echo "📦 Starting application..."
echo "----------------------------------------"

# Start the application
exec node dist/index.js
