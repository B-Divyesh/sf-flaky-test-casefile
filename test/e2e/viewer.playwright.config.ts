import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  testDir: '.',
  testMatch: 'viewer-security.spec.ts',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'npm run build:site && npx vite preview --config vite.config.ts --host 127.0.0.1 --port 4173',
    cwd: repoRoot,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
