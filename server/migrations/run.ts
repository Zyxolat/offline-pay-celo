import { createAdvancedAuthTables } from '../src/models/AdvancedAuthMigration.js';

createAdvancedAuthTables().catch((error) => {
  console.error('Fatal migration error:', error);
  process.exit(1);
});
