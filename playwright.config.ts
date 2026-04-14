import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/test',
  webServer: {
    command: 'npm run dev',
    port: 8080,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:8080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Add your custom playwright configuration here
});
