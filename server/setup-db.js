import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const result = spawnSync('npm', ['run', 'migrate'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error('❌ Failed to start database setup:', result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
