import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'site',
  publicDir: 'public',
  build: {
    outDir: '../dist/site',
    emptyOutDir: false,
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'site/index.html'),
        privacy: resolve(process.cwd(), 'site/privacy/index.html'),
        terms: resolve(process.cwd(), 'site/terms/index.html'),
      },
    },
  },
});
