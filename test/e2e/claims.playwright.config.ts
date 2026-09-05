import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  testDir: '.',
  testMatch: 'claims.spec.ts',
  timeout: 45_000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4174' },
  webServer: {
    command: 'npm run build:site && npx vite preview --config vite.config.ts --host 127.0.0.1 --port 4174',
    cwd: repoRoot,
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: !process.env.CI,
  },
});
