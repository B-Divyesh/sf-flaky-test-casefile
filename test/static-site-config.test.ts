import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Azure Static Web Apps configuration', () => {
  it('ships restrictive document headers and immutable cache headers for fingerprinted assets', async () => {
    const config = JSON.parse(await readFile(resolve('site/public/staticwebapp.config.json'), 'utf8')) as {
      globalHeaders: Record<string, string>;
      routes: Array<{ route: string; headers: Record<string, string> }>;
    };
    expect(config.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(config.globalHeaders['Content-Security-Policy']).toContain("script-src 'self'");
    expect(config.globalHeaders['Permissions-Policy']).toContain('camera=()');
    expect(config.globalHeaders['X-Content-Type-Options']).toBe('nosniff');
    expect(config.routes.find((route) => route.route === '/assets/*')?.headers['Cache-Control'])
      .toBe('public, max-age=31536000, immutable');
  });
});
