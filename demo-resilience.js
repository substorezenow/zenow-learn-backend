#!/usr/bin/env node

/**
 * Resilience Pattern Demo Script
 * Demonstrates how the system handles failures gracefully
 */

import { circuitBreakers } from './src/utils/circuitBreaker';
import { gracefulDegradation } from './src/utils/gracefulDegradation';
import { logger } from './src/utils/logger';

async function demonstrateResilience() {
  console.log('🛡️  Resilience Pattern Demonstration\n');

  // 1. Show initial circuit breaker states
  console.log('📊 Initial Circuit Breaker States:');
  console.log('Database:', circuitBreakers.database.getStats().state);
  console.log('Cache:', circuitBreakers.cache.getStats().state);
  console.log('Auth:', circuitBreakers.auth.getStats().state);
  console.log('');

  // 2. Simulate database failure
  console.log('💥 Simulating Database Failures...');
  for (let i = 0; i < 5; i++) {
    try {
      await circuitBreakers.database.execute(
        async () => {
          throw new Error('Database connection failed');
        },
        () => {
          console.log(`   Fallback executed for attempt ${i + 1}`);
          return [];
        }
      );
    } catch (error) {
      console.log(`   Attempt ${i + 1}: ${error.message}`);
    }
  }

  // 3. Check circuit breaker state after failures
  console.log('\n📊 Circuit Breaker States After Failures:');
  const dbStats = circuitBreakers.database.getStats();
  console.log('Database:', dbStats.state);
  console.log('Failures:', dbStats.failures);
  console.log('Failure Rate:', dbStats.failureRate.toFixed(2) + '%');
  console.log('');

  // 4. Demonstrate graceful degradation
  console.log('🔄 Testing Graceful Degradation...');
  try {
    const categories = await gracefulDegradation.getCategoriesWithFallback();
    console.log(`   Retrieved ${categories.length} categories using fallback`);
    console.log('   Categories:', categories.map(c => c.name).join(', '));
  } catch (error) {
    console.log('   Error:', error.message);
  }
  console.log('');

  // 5. Show system health
  console.log('🏥 System Health Status:');
  const health = gracefulDegradation.getHealthStatus();
  console.log('Database Circuit:', health.database.state);
  console.log('Cache Circuit:', health.cache.state);
  console.log('Auth Circuit:', health.auth.state);
  console.log('Fallback Data Available:', Object.values(health.fallbackData).every(Boolean));
  console.log('');

  // 6. Simulate recovery
  console.log('🔄 Simulating Service Recovery...');
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
  
  // Reset circuit breaker to simulate recovery
  circuitBreakers.database.reset();
  console.log('   Database circuit breaker reset');
  
  const recoveredStats = circuitBreakers.database.getStats();
  console.log('   Database state:', recoveredStats.state);
  console.log('   Failures reset to:', recoveredStats.failures);
  console.log('');

  // 7. Test successful operation after recovery
  console.log('✅ Testing Successful Operation After Recovery...');
  try {
    await circuitBreakers.database.execute(
      async () => {
        console.log('   Database operation successful');
        return { rows: [{ id: 1, name: 'Test Category' }] };
      },
      () => {
        console.log('   Fallback executed (should not happen)');
        return [];
      }
    );
    console.log('   ✅ System fully recovered and operational');
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  console.log('\n🎉 Resilience demonstration completed!');
  console.log('\nKey Benefits Demonstrated:');
  console.log('✅ Circuit breakers prevent cascading failures');
  console.log('✅ Graceful degradation provides fallback data');
  console.log('✅ System continues operating during failures');
  console.log('✅ Automatic recovery testing and restoration');
  console.log('✅ Comprehensive health monitoring');
}

// Run the demonstration
if (require.main === module) {
  demonstrateResilience().catch(console.error);
}

export { demonstrateResilience };
