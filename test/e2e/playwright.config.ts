import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: '.',
  testMatch: 'seeded-flake.spec.ts',
  retries: 1,
  workers: 1,
  reporter: [
    ['line'],
    [resolve(process.cwd(), 'src/index.ts'), { outputDir: '.artifacts/e2e-casefile', screenshotMasks: [{ x: 0, y: 0, width: 60, height: 30 }] }],
  ],
  use: { screenshot: 'only-on-failure' },
});
