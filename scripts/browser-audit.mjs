import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const baseURL = process.env.CASEFILE_AUDIT_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
let failures = 0;
for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }]) {
  for (const path of ['/', '/privacy/', '/terms/']) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
    const basics = await page.evaluate(() => ({
      title: document.title,
      lang: document.documentElement.lang,
      h1: document.querySelectorAll('h1').length,
      main: document.querySelectorAll('main').length,
      missingAlt: [...document.querySelectorAll('img')].filter((image) => !image.hasAttribute('alt')).length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    const axe = await new AxeBuilder({ page }).analyze();
    const serious = axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
    if (!basics.title || basics.lang !== 'en' || basics.h1 !== 1 || basics.main !== 1 || basics.missingAlt || basics.overflow || consoleErrors.length || serious.length) failures += 1;
    console.log(JSON.stringify({ viewport: viewport.name, path, basics, consoleErrors, serious: serious.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length })) }));
    if (path === '/') await page.screenshot({ path: `/tmp/flaky-test-casefile-${viewport.name}.png`, fullPage: true });
    await context.close();
  }
}
await browser.close();
if (failures) process.exitCode = 1;
