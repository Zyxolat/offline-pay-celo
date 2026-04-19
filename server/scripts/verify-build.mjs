import fs from 'node:fs';
import path from 'node:path';

const expectedEntry = path.resolve('dist/app.js');

if (!fs.existsSync(expectedEntry)) {
  console.error(`Build artifact missing: ${expectedEntry}`);
  process.exit(1);
}

console.log(`Verified build artifact: ${expectedEntry}`);
