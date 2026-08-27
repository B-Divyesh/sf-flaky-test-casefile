import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import CasefileReporter from '../src/index.js';

describe('reporter integration', () => {
  it('writes a portable casefile, redacts secrets, and excludes traces', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'casefile-'));
    const reporter = new CasefileReporter({ outputDir });
    reporter.onBegin({} as never, { allTests: () => [{}] } as never);
    await reporter.onTestEnd({ id: 'checkout', title: 'checkout', titlePath: () => ['suite', 'checkout'], expectedStatus: 'passed', parent: { project: () => ({ name: 'chromium' }) } } as never, {
      retry: 0, status: 'timedOut', duration: 30001, errors: [{ message: `Timeout 30000ms authorization: Bearer-secret at ${process.cwd()}/tests/private.ts` }], stdout: [], stderr: [],
      attachments: [
        { name: 'casefile-events', contentType: 'application/vnd.casefile+json', body: Buffer.from(JSON.stringify({ schema: 1, events: [{ kind: 'response', at: 1, status: 503, url: '/api/pay' }] })) },
        { name: 'trace', contentType: 'application/zip', body: Buffer.from('credential') },
      ],
    } as never);
    await reporter.onEnd({} as never);
    const json = await readFile(join(outputDir, 'casefile.json'), 'utf8');
    const html = await readFile(join(outputDir, 'index.html'), 'utf8');
    expect(json).toContain('[REDACTED]');
    expect(json).not.toContain('Bearer-secret');
    expect(json).not.toContain(process.cwd());
    expect(json).toContain('Privacy-safe default');
    expect(html).toContain('<main id="main">');
    expect((html.match(/<h1/g) ?? [])).toHaveLength(1);
    expect((await stat(join(outputDir, 'casefile.json'))).size).toBeGreaterThan(100);
  });
});
