import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  // Production builds are deployed beneath /ridgewood/ on GitHub Pages.
  // Vite's serve command stays rooted at / for local development.
  base: command === 'build' ? '/ridgewood/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
}));
