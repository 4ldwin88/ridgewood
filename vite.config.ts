import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves this repository beneath /ridgewood/. Local development
  // remains rooted at /. Override only if Ridgewood is later deployed at a
  // different public path.
  base: process.env.GITHUB_ACTIONS ? '/ridgewood/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
