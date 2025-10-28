#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config();

async function checkBlogCategories() {
  console.log('🔍 Checking blog categories...');
  
  const client = new Client({
    connectionString: process.env.COCKROACH_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    const result = await client.query('SELECT id, name, slug FROM blog_categories ORDER BY id');
    
    console.log(`📊 Found ${result.rows.length} blog categories:`);
    result.rows.forEach(row => {
      console.log(`  - ID: ${row.id} (type: ${typeof row.id}), Name: ${row.name}, Slug: ${row.slug}`);
    });
    
    // Check if the problematic ID exists
    const problematicId = '1119342063978053600';
    console.log(`\n🔍 Checking for problematic ID: ${problematicId}`);
    
    const checkResult = await client.query('SELECT id, name FROM blog_categories WHERE id = $1', [problematicId]);
    if (checkResult.rows.length > 0) {
      console.log(`✅ Found category with ID ${problematicId}: ${checkResult.rows[0].name}`);
    } else {
      console.log(`❌ No category found with ID ${problematicId}`);
    }
    
    // Try with integer conversion
    const intId = parseInt(problematicId, 10);
    console.log(`\n🔍 Checking with parseInt(${problematicId}) = ${intId}`);
    
    const intCheckResult = await client.query('SELECT id, name FROM blog_categories WHERE id = $1', [intId]);
    if (intCheckResult.rows.length > 0) {
      console.log(`✅ Found category with converted ID ${intId}: ${intCheckResult.rows[0].name}`);
    } else {
      console.log(`❌ No category found with converted ID ${intId}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkBlogCategories();