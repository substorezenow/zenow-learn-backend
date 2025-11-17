#!/bin/bash

# Minimal startup script for debugging
echo "🚀 Starting Zenow Learn Backend (Minimal Debug Mode)..."
echo "📅 Timestamp: $(date)"
echo "🌍 Environment: ${NODE_ENV:-development}"
echo "🔌 Port: ${PORT:-8080}"

# Show current directory
echo "📁 Current directory: $(pwd)"
echo "📁 Directory contents:"
ls -la

# Check if dist exists
if [ -d "dist" ]; then
  echo "✅ dist directory exists"
  echo "📁 dist contents:"
  ls -la dist/
else
  echo "❌ dist directory not found"
  exit 1
fi

# Check if main file exists
if [ -f "dist/index.js" ]; then
  echo "✅ dist/index.js exists"
else
  echo "❌ dist/index.js not found"
  exit 1
fi

# Test Node.js
echo "🔍 Testing Node.js..."
node --version

# Test if we can require the main file
echo "🔍 Testing application load..."
node -e "console.log('Testing require...'); try { require('./dist/index.js'); console.log('✅ Application loaded successfully'); } catch(e) { console.error('❌ Application load failed:', e.message); process.exit(1); }"

echo "📦 Starting application..."
echo "----------------------------------------"

# Start the application
exec node dist/index.js
