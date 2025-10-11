#!/usr/bin/env node

/**
 * Database Connection Test Script
 * This script helps diagnose database connection issues
 */

const { Client } = require('pg');
require('dotenv').config();

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testConnection() {
  log('\n🔍 Testing Database Connection...', 'blue');
  
  // Check environment variables
  log('\n📋 Environment Variables:', 'yellow');
  log(`COCKROACH_URL: ${process.env.COCKROACH_URL ? '✅ Set' : '❌ Not set'}`, process.env.COCKROACH_URL ? 'green' : 'red');
  log(`COCKROACH_HOST: ${process.env.COCKROACH_HOST || 'Not set'}`, 'yellow');
  log(`COCKROACH_PORT: ${process.env.COCKROACH_PORT || 'Not set'}`, 'yellow');
  log(`COCKROACH_USER: ${process.env.COCKROACH_USER || 'Not set'}`, 'yellow');
  log(`COCKROACH_DB: ${process.env.COCKROACH_DB || 'Not set'}`, 'yellow');
  
  let client;
  
  try {
    // Create client
    if (process.env.COCKROACH_URL) {
      log('\n🔗 Using connection string...', 'blue');
      client = new Client({
        connectionString: process.env.COCKROACH_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
      });
    } else {
      log('\n🔗 Using individual parameters...', 'blue');
      client = new Client({
        host: process.env.COCKROACH_HOST || 'localhost',
        port: parseInt(process.env.COCKROACH_PORT || '26257'),
        user: process.env.COCKROACH_USER || 'root',
        password: process.env.COCKROACH_PASS || '',
        database: process.env.COCKROACH_DB || 'defaultdb',
        ssl: process.env.COCKROACH_SSL === 'true' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000
      });
    }
    
    // Test connection
    log('\n⏳ Connecting to database...', 'yellow');
    const startTime = Date.now();
    
    await client.connect();
    const connectionTime = Date.now() - startTime;
    
    log(`✅ Connected successfully in ${connectionTime}ms!`, 'green');
    
    // Test query
    log('\n🔍 Testing query...', 'yellow');
    const result = await client.query('SELECT version(), now() as current_time');
    
    log('✅ Query executed successfully!', 'green');
    log(`📊 Database Version: ${result.rows[0].version}`, 'blue');
    log(`⏰ Current Time: ${result.rows[0].current_time}`, 'blue');
    
    // Test tables
    log('\n🔍 Checking tables...', 'yellow');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      log('✅ Tables found:', 'green');
      tablesResult.rows.forEach(row => {
        log(`  - ${row.table_name}`, 'blue');
      });
    } else {
      log('⚠️ No tables found in public schema', 'yellow');
    }
    
  } catch (error) {
    log(`❌ Connection failed: ${error.message}`, 'red');
    
    // Provide troubleshooting tips
    log('\n🔧 Troubleshooting Tips:', 'yellow');
    
    if (error.code === 'ECONNREFUSED') {
      log('• Check if CockroachDB is running', 'yellow');
      log('• Verify the host and port are correct', 'yellow');
      log('• Check firewall settings', 'yellow');
    } else if (error.code === 'ENOTFOUND') {
      log('• Check if the hostname is correct', 'yellow');
      log('• Verify DNS resolution', 'yellow');
    } else if (error.message.includes('authentication')) {
      log('• Check username and password', 'yellow');
      log('• Verify user has proper permissions', 'yellow');
    } else if (error.message.includes('database')) {
      log('• Check if the database exists', 'yellow');
      log('• Verify database name is correct', 'yellow');
    } else if (error.message.includes('SSL')) {
      log('• Check SSL configuration', 'yellow');
      log('• Try setting COCKROACH_SSL=false for testing', 'yellow');
    } else if (error.message.includes('timeout')) {
      log('• Check network connectivity', 'yellow');
      log('• Verify database is not overloaded', 'yellow');
      log('• Try increasing connection timeout', 'yellow');
    }
    
    log('\n📝 Common Solutions:', 'blue');
    log('• Ensure CockroachDB is running: cockroach start --insecure', 'blue');
    log('• Check .env file configuration', 'blue');
    log('• Verify network connectivity to database host', 'blue');
    log('• Check database logs for errors', 'blue');
    
  } finally {
    if (client) {
      await client.end();
      log('\n🔌 Connection closed', 'blue');
    }
  }
}

// Run the test
testConnection().catch(error => {
  log(`\n💥 Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
