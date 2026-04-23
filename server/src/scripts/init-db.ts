import { connectDatabaseWithRetry, closeDatabasePool } from '../config/database.js';
import { createAdvancedAuthTables } from '../models/AdvancedAuthMigration.js';
import { log, serializeError } from '../utils/logger.js';

async function initDatabase() {
  try {
    log('INFO', 'Starting database initialization');
    await connectDatabaseWithRetry();
    await createAdvancedAuthTables();
    log('INFO', 'Database initialization completed successfully', {
      ensuredTables: ['chain_indexer_state', 'chain_indexer_events', 'transaction_history'],
    });
    await closeDatabasePool();
  } catch (error) {
    log('ERROR', 'Database initialization failed', serializeError(error));

    try {
      await closeDatabasePool();
    } catch {
      // Ignore shutdown errors during failed init.
    }

    process.exit(1);
  }
}

void initDatabase();
