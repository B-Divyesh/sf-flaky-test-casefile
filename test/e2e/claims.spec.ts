import { deflateSync, inflateSync } from 'node:zlib';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import CasefileReporter, { clusterAttempts, firstDivergence, normalizeFailure } from '../../src/index.js';
import { createCasefileProbe } from '../../src/probe.js';

const demoCasefile = {
  clusters: [{ id: 'FC-DEMO', symptom: 'Network', count: 2, attempts: ['first', 'retry'] }],
  attempts: [
    { id: 'first', title: 'Checkout submit waits forever', retry: 0, status: 'timedOut', durationMs: 30_000 },
    { id: 'retry', title: 'Checkout submit waits forever', retry: 1, status: 'passed', durationMs: 1_840 },
  ],
};

const failureAttempt = (id: string, error: string) => ({
  id,
  testId: 'checkout',
  title: 'checkout',
  path: ['checkout'],
  project: 'chromium',
  retry: 0,
  status: 'failed',
  expectedStatus: 'passed',
  durationMs: 30_000,
  errors: [error],
  stdout: [],
  stderr: [],
  events: [],
  attachments: [],
});

class FakePage {
  handlers = new Map<string, Set<(...args: any[]) => void>>();
  on(name: string, handler: (...args: any[]) => void) { const values = this.handlers.get(name) ?? new Set(); values.add(handler); this.handlers.set(name, values); }
  off(name: string, handler: (...args: any[]) => void) { this.handlers.get(name)?.delete(handler); }
  emit(name: string, value: unknown) { for (const handler of this.handlers.get(name) ?? []) handler(value); }
  async evaluate<T>(): Promise<T> { return { title: 'Checkout', url: 'https://app.test/pay?token=secret', landmarks: ['h1:::Pay'], bodyText: 'Pay now' } as T; }
}

async function openDemo(page: import('@playwright/test').Page) {
  await page.goto('/demo/', { waitUntil: 'networkidle' });
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
}

async function emittedCasefile(attachments: Array<Record<string, unknown>> = [], options: Record<string, unknown> = {}) {
  const outputDir = await mkdtemp(join(tmpdir(), 'casefile-claim-'));
  const reporter = new CasefileReporter({ outputDir, ...options });
  reporter.onBegin({} as never, { allTests: () => [{}] } as never);
  await reporter.onTestEnd({ id: 'checkout', title: 'checkout', titlePath: () => ['suite', 'checkout'], expectedStatus: 'passed', parent: { project: () => ({ name: 'chromium' }) } } as never, {
    retry: 0,
    status: 'timedOut',
    duration: 30_001,
    errors: [{ message: 'Timeout 30000ms authorization: Bearer-secret' }],
    stdout: [],
    stderr: [],
    attachments,
  } as never);
  await reporter.onEnd({} as never);
  return {
    outputDir,
    data: JSON.parse(await readFile(join(outputDir, 'casefile.json'), 'utf8')) as { attempts: Array<{ attachments: Array<{ state: string; note?: string; path?: string }> }> },
    html: await readFile(join(outputDir, 'index.html'), 'utf8'),
  };
}

function pngFixture() {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const table = Array.from({ length: 256 }, (_, value) => { let current = value; for (let bit = 0; bit < 8; bit += 1) current = (current & 1) ? 0xedb88320 ^ (current >>> 1) : current >>> 1; return current >>> 0; });
  const crc32 = (buffer: Buffer) => { let crc = 0xffffffff; for (const byte of buffer) crc = (table[(crc ^ byte) & 255]! ^ (crc >>> 8)) >>> 0; return (crc ^ 0xffffffff) >>> 0; };
  const chunk = (name: string, data: Buffer) => { const type = Buffer.from(name); const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([type, data]))); return Buffer.concat([length, type, data, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(2, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.from([0, 255, 255, 255, 255, 200, 200, 200, 255]);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function decodedPngPixels(png: Buffer) {
  const chunks: Buffer[] = [];
  let cursor = 8;
  while (cursor < png.length) {
    const length = png.readUInt32BE(cursor);
    const name = png.toString('ascii', cursor + 4, cursor + 8);
    if (name === 'IDAT') chunks.push(png.subarray(cursor + 8, cursor + 8 + length));
    cursor += length + 12;
  }
  return inflateSync(Buffer.concat(chunks));
}

test('@claim:demo-sandbox opens a realistic sample in one click and keeps demo storage separate', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveURL(/\/demo\/$/);
  await expect(page.locator('#case-title')).toHaveText('Checkout submit waits forever');
  await expect(page.locator('.attempt-block')).toHaveCount(3);
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('#file-status')).toContainText('Demo reset');
  expect(await page.evaluate(() => Object.keys(localStorage).every((key) => key.startsWith('demo:')))).toBe(true);
  await page.getByRole('link', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test('@claim:groups-retry-failures groups matching retry failures', async ({ page }) => {
  await openDemo(page);
  const clusters = clusterAttempts([
    failureAttempt('one', 'Timeout 30000ms while POST /api/payment request 14b2c1c0-9240-4b1e-a19a-e3e12003e744'),
    failureAttempt('two', 'Timeout 45000ms while POST /api/payment request 1e94a7de-26d5-4111-9871-23547985c488'),
  ]);
  expect(clusters).toHaveLength(1);
  expect(clusters[0]).toMatchObject({ count: 2, symptom: 'Timeout' });
});

test('@claim:normalizes-noise removes timing and identifier noise before comparison', async ({ page }) => {
  await openDemo(page);
  const one = 'Timeout 30000ms at http://localhost:4173/pay?timestamp=1991 id 14b2c1c0-9240-4b1e-a19a-e3e12003e744 (/app/test.ts:42:9)';
  const two = 'Timeout 45000ms at http://localhost:8080/pay?timestamp=8831 id 1e94a7de-26d5-4111-9871-23547985c488 (/app/test.ts:88:12)';
  expect(normalizeFailure(one)).toBe(normalizeFailure(two));
});

test('@claim:first-divergence identifies the first changed network event', async ({ page }) => {
  await openDemo(page);
  const divergence = firstDivergence(
    [{ kind: 'request', at: 1, method: 'GET', url: 'https://app.test/cart?timestamp=1' }, { kind: 'response', at: 2, status: 200, url: 'https://app.test/cart' }],
    [{ kind: 'request', at: 8, method: 'GET', url: 'https://app.test/cart?timestamp=2' }, { kind: 'response', at: 9, status: 503, url: 'https://app.test/cart' }],
  );
  expect(divergence).toMatchObject({ index: 1, expected: { status: 200 }, actual: { status: 503 } });
});

test('@claim:static-casefile writes a portable report that opens without a server', async ({ page }) => {
  await openDemo(page);
  const report = await emittedCasefile();
  expect(report.html).toContain('casefile-data');
  await page.goto(pathToFileURL(join(report.outputDir, 'index.html')).href);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Flaky Test Casefile');
  await expect(page.getByText('1 of 1 signatures shown')).toBeVisible();
});

test('@claim:no-server-or-account keeps the demo local and makes no upload request', async ({ page }) => {
  const requests: Array<{ url: string; method: string }> = [];
  page.on('request', (request) => requests.push({ url: request.url(), method: request.method() }));
  await openDemo(page);
  await page.setInputFiles('#casefile-input', { name: 'casefile.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(demoCasefile)) });
  await expect(page.locator('#file-status')).toContainText('Kept in this browser only');
  expect(requests.every((request) => new URL(request.url).origin === new URL(page.url()).origin && request.method === 'GET')).toBe(true);
});

test('@claim:offline-generated-reports opens an emitted casefile while the browser is offline', async ({ browser, page }) => {
  await openDemo(page);
  const report = await emittedCasefile();
  const context = await browser.newContext({ offline: true });
  const offlinePage = await context.newPage();
  await offlinePage.goto(pathToFileURL(join(report.outputDir, 'index.html')).href);
  await expect(offlinePage.getByRole('heading', { level: 1 })).toHaveText('Flaky Test Casefile');
  await context.close();
});

test('@claim:redacts-credential-headers removes credential values from probe evidence', async ({ page }) => {
  await openDemo(page);
  const fake = new FakePage();
  const probe = createCasefileProbe(fake, { captureRequestHeaders: true });
  fake.emit('request', { method: () => 'POST', url: () => 'https://app.test/pay', allHeaders: async () => ({ authorization: 'Bearer secret', accept: 'json' }) });
  const evidence = await probe.stop();
  expect(JSON.stringify(evidence)).not.toContain('Bearer secret');
  expect(JSON.stringify(evidence)).toContain('[REDACTED]');
});

test('@claim:redacts-sensitive-query-values removes token values from probe evidence', async ({ page }) => {
  await openDemo(page);
  const fake = new FakePage();
  const probe = createCasefileProbe(fake);
  fake.emit('request', { method: () => 'GET', url: () => 'https://app.test/pay?token=secret&signature=also-secret' });
  const evidence = await probe.stop();
  expect(JSON.stringify(evidence)).not.toContain('secret');
  expect(decodeURIComponent(JSON.stringify(evidence))).toContain('[REDACTED]');
});

test('@claim:traces-excluded excludes trace attachments by default', async ({ page }) => {
  await openDemo(page);
  const report = await emittedCasefile([{ name: 'trace', contentType: 'application/zip', body: Buffer.from('private trace') }]);
  expect(report.data.attempts[0]?.attachments[0]).toMatchObject({ state: 'excluded', note: 'Privacy-safe default' });
});

test('@claim:videos-excluded excludes video attachments by default', async ({ page }) => {
  await openDemo(page);
  const report = await emittedCasefile([{ name: 'run.webm', contentType: 'video/webm', body: Buffer.from('private video') }]);
  expect(report.data.attempts[0]?.attachments[0]).toMatchObject({ state: 'excluded', note: 'Privacy-safe default' });
});

test('@claim:png-masks-change-pixels writes a masked PNG instead of the original pixels', async ({ page }) => {
  await openDemo(page);
  const original = pngFixture();
  const report = await emittedCasefile([{ name: 'failure.png', contentType: 'image/png', body: original }], { screenshotMasks: [{ x: 0, y: 0, width: 1, height: 1 }] });
  const attachment = report.data.attempts[0]?.attachments[0];
  expect(attachment).toMatchObject({ state: 'copied', note: '1 mask(s) baked in' });
  const copied = await readFile(join(report.outputDir, attachment?.path ?? 'missing'));
  expect(copied.equals(original)).toBe(false);
  expect([...decodedPngPixels(copied).subarray(1, 5)]).toEqual([7, 27, 43, 255]);
  expect([...decodedPngPixels(copied).subarray(5, 9)]).toEqual([200, 200, 200, 255]);
});

test('@claim:selected-json-stays-in-browser does not send a selected JSON file over the network', async ({ page }) => {
  await openDemo(page);
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.setInputFiles('#casefile-input', { name: 'customer-casefile.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(demoCasefile)) });
  await expect(page.locator('#case-title')).toHaveText('Checkout submit waits forever');
  expect(requests).toEqual([]);
});

test('@claim:selected-json-not-persisted keeps a selected JSON file out of browser storage', async ({ page }) => {
  await openDemo(page);
  await page.setInputFiles('#casefile-input', { name: 'customer-casefile.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(demoCasefile)) });
  await expect(page.locator('#file-status')).toContainText('customer-casefile.json');
  const stored = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(JSON.stringify(stored)).not.toContain('customer-casefile.json');
  expect(JSON.stringify(stored)).not.toContain('Checkout submit waits forever');
});

test('@claim:no-telemetry makes no third-party requests during the demo flow', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await openDemo(page);
  await page.getByRole('button', { name: 'Reset demo' }).click();
  expect(requests.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
});

test('@claim:no-cookies starts the demo with no cookies', async ({ context, page }) => {
  await openDemo(page);
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => document.cookie)).toBe('');
});

test('@claim:no-third-party-fonts-or-scripts loads all demo resources from its own origin', async ({ page }) => {
  await openDemo(page);
  const loaded = await page.evaluate(() => ({ origin: location.origin, resources: performance.getEntriesByType('resource').map((entry) => new URL(entry.name).origin) }));
  expect(loaded.resources.every((origin) => origin === loaded.origin)).toBe(true);
});

test('@claim:no-runtime-cdn uses no external runtime resource', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await openDemo(page);
  expect(requests.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
});

test('@claim:offline-site-reload reloads the demo after the first visit while offline', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4174/demo/', { waitUntil: 'networkidle' });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload({ waitUntil: 'networkidle' });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await context.close();
});

test('@claim:free-mit-license ships the package under the MIT License', async ({ page }) => {
  await openDemo(page);
  const license = await readFile('LICENSE', 'utf8');
  const packageMetadata = JSON.parse(await readFile('package.json', 'utf8')) as { license?: string };
  expect(packageMetadata.license).toBe('MIT');
  expect(license).toContain('Permission is hereby granted, free of charge');
});
