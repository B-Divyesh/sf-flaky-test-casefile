import { expect, test } from '@playwright/test';

const maliciousStatus = '<img src=x onerror=window.__casefileXss=1>';
const maliciousCasefile = {
  clusters: [{ id: 'FC-XSS', symptom: 'Runtime', count: 1, attempts: ['x'] }],
  attempts: [{
    id: 'x',
    title: 'XSS',
    retry: 0,
    status: maliciousStatus,
    durationMs: 0,
  }],
};
test('renders local casefile values as text and never executes uploaded markup', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('#casefile-input', {
    name: 'casefile.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(maliciousCasefile)),
  });

  await expect(page.locator('#attempt-ruler')).toContainText(maliciousStatus);
  await expect(page.locator('#attempt-ruler img')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __casefileXss?: number }).__casefileXss)).toBeUndefined();
});

test('installs the generated worker and reloads the viewer offline', async ({ page, context }) => {
  await page.goto('/');
  const worker = await page.evaluate(async () => (await (await fetch('/sw.js')).text()));
  expect(worker).not.toContain('"/style.css"');
  expect(worker).toMatch(/"\/assets\/style-[^"]+\.css"/);
  expect(worker).toMatch(/"\/assets\/main-[^"]+\.js"/);
  const precache = JSON.parse(worker.match(/const ASSETS=(\[[^;]+\])/)?.[1] ?? '[]') as string[];
  const assetResponses = await page.evaluate(async (paths) => Promise.all(paths.filter((path) => path.startsWith('/assets/')).map(async (path) => {
    const response = await fetch(path);
    return { path, ok: response.ok, contentType: response.headers.get('content-type') };
  })), precache);
  expect(assetResponses).toEqual(expect.arrayContaining([
    expect.objectContaining({ path: expect.stringMatching(/\/assets\/main-.*\.js$/), ok: true, contentType: expect.stringMatching(/javascript/) }),
    expect.objectContaining({ path: expect.stringMatching(/\/assets\/style-.*\.css$/), ok: true, contentType: expect.stringMatching(/css/) }),
  ]));
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload({ waitUntil: 'networkidle' });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/Flaky Test Casefile/);
  await expect(page.locator('h1')).toHaveCount(1);
});
