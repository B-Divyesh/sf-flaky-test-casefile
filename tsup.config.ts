import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', probe: 'src/probe.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node20',
  splitting: false,
});
