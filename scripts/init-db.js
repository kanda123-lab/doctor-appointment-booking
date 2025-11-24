#!/usr/bin/env node

const DatabaseInitializer = require('../src/database/init');
const logger = require('../src/utils/logger');

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'init':
        console.log('🚀 Initializing database...');
        await DatabaseInitializer.initialize();
        console.log('✅ Database initialization completed!');
        break;

      case 'reset':
        console.log('⚠️  Resetting database...');
        await DatabaseInitializer.reset();
        await DatabaseInitializer.initialize();
        console.log('✅ Database reset and reinitialized!');
        break;

      case 'health':
        console.log('🔍 Checking database health...');
        const health = await DatabaseInitializer.checkHealth();
        console.log('Database Health Status:');
        console.log('- Connection:', health.connection ? '✅' : '❌');
        console.log('- Tables:', health.tables ? '✅' : '❌');
        console.log('- Functions:', health.functions ? '✅' : '❌');

        if (health.error) {
          console.log('- Error:', health.error);
        }

        const isHealthy =
          health.connection && health.tables && health.functions;
        console.log(
          'Overall Status:',
          isHealthy ? '✅ Healthy' : '❌ Issues Found'
        );
        process.exit(isHealthy ? 0 : 1);
        break;

      case 'migrate':
        console.log('🔄 Running migrations...');
        await DatabaseInitializer.migrate();
        console.log('✅ Migrations completed!');
        break;

      default:
        console.log('Usage: node scripts/init-db.js [command]');
        console.log('Commands:');
        console.log(
          '  init    - Initialize database with schema and sample data'
        );
        console.log('  reset   - Reset and reinitialize database');
        console.log('  health  - Check database health');
        console.log('  migrate - Run database migrations');
        process.exit(1);
    }
  } catch (error) {
    logger.error('Database operation failed:', error);
    console.error('❌ Operation failed:', error.message);
    process.exit(1);
  }
}

main();
