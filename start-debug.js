#!/usr/bin/env node

// Simple Node.js startup script for debugging
console.log('🚀 Starting Zenow Learn Backend (Node.js Debug Mode)...');
console.log('📅 Timestamp:', new Date().toISOString());
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 Port:', process.env.PORT || 8080);

// Check if required environment variables are set
console.log('🔍 Checking environment variables...');

if (!process.env.JWT_SECRET) {
  console.log('⚠️  WARNING: JWT_SECRET not set, using default (NOT SECURE FOR PRODUCTION)');
}

if (!process.env.COCKROACH_URL && !process.env.COCKROACH_HOST) {
  console.log('⚠️  WARNING: Database connection not configured');
  console.log('   Set COCKROACH_URL or COCKROACH_HOST environment variables');
}

if (!process.env.REDIS_URL) {
  console.log('⚠️  WARNING: Redis connection not configured');
  console.log('   Set REDIS_URL environment variable for caching');
}

// Check if the application file exists
const fs = require('fs');
const path = require('path');

console.log('📁 Current directory:', process.cwd());
console.log('📁 Directory contents:');
try {
  const files = fs.readdirSync('.');
  files.forEach(file => {
    const stats = fs.statSync(file);
    console.log(`  ${stats.isDirectory() ? '📁' : '📄'} ${file}`);
  });
} catch (error) {
  console.error('❌ Error reading directory:', error.message);
}

// Check if dist exists
if (fs.existsSync('dist')) {
  console.log('✅ dist directory exists');
  console.log('📁 dist contents:');
  try {
    const distFiles = fs.readdirSync('dist');
    distFiles.forEach(file => {
      console.log(`  📄 ${file}`);
    });
  } catch (error) {
    console.error('❌ Error reading dist directory:', error.message);
  }
} else {
  console.log('❌ dist directory not found');
  process.exit(1);
}

// Check if main file exists
if (fs.existsSync('dist/index.js')) {
  console.log('✅ dist/index.js exists');
} else {
  console.log('❌ dist/index.js not found');
  process.exit(1);
}

console.log('📦 Starting application...');
console.log('----------------------------------------');

// Start the application
try {
  require('./dist/index.js');
} catch (error) {
  console.error('❌ Failed to start application:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
