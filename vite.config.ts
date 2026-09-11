import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

function preserveBrandAssets() {
  return {
    name: 'preserve-ridgewood-brand-assets',
    closeBundle() {
      const outputDir = resolve('dist/assets');
      mkdirSync(outputDir, { recursive: true });
      for (const file of ['ridgewood-horizontal-light.svg', 'ridgewood-horizontal-dark.svg']) {
        copyFileSync(resolve('assets', file), resolve(outputDir, file));
      }
    },
  };
}

export default defineConfig(({ command, isPreview }) => ({
  server: { host: '0.0.0.0', allowedHosts: ['terminal.local'] },
  // Production builds are deployed beneath /ridgewood/ on GitHub Pages.
  // Vite's serve command stays rooted at / for local development.
  base: command === 'build' || isPreview ? '/ridgewood/' : '/',
  plugins: [react(), preserveBrandAssets()],
  test: {
    environment: 'node',
  },
}));
