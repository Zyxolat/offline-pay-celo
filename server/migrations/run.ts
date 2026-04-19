import { connectDatabaseWithRetry } from '../src/config/database.js';
import { createAdvancedAuthTables } from '../src/models/AdvancedAuthMigration.js';
import { log, serializeError } from '../src/utils/logger.js';

async function runMigrations() {
  try {
    log('INFO', 'Starting manual migration run');
    await connectDatabaseWithRetry();
    await createAdvancedAuthTables();
    log('INFO', 'Manual migration run completed');
  } catch (error) {
    log('ERROR', 'Fatal migration error', serializeError(error));
    process.exit(1);
  }
}

void runMigrations();
