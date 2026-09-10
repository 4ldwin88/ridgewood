import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/acceptance',
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://127.0.0.1:4174', actionTimeout: 15_000, trace: 'off', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run dev -- --mode acceptance --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
  },
});
