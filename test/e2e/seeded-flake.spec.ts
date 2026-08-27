import { expect, test } from '@playwright/test';
import { createCasefileProbe } from '../../src/probe.js';

test('checkout recovers after a transient payment response', async ({ page }, testInfo) => {
  await page.route('https://casefile.test/api/payment', async (route) => {
    await route.fulfill({ status: testInfo.retry === 0 ? 503 : 200, contentType: 'application/json', body: '{}' });
  });
  await page.setContent('<main><h1>Checkout</h1><button>Pay now</button><output></output></main>');
  const probe = createCasefileProbe(page);
  try {
    const status = await page.evaluate(async () => (await fetch('https://casefile.test/api/payment', { method: 'POST' })).status);
    await page.locator('output').evaluate((element, value) => { element.textContent = String(value); }, status);
    await probe.mark('payment-result');
    expect(status).toBe(200);
  } finally {
    await testInfo.attach('casefile-events', { body: Buffer.from(JSON.stringify(await probe.stop())), contentType: 'application/vnd.casefile+json' });
  }
});
