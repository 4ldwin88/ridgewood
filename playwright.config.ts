import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/tests/fixtures/forms/index.html',
    env: { VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_fixture', VITE_DEV_TELEMETRY_ENABLED: 'false' },
  },
});
