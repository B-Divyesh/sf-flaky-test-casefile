import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const suppliedURL = process.env.CASEFILE_AUDIT_URL;
let preview;

function command(name, args) {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(name, args, { cwd: process.cwd(), stdio: 'inherit' });
    child.once('error', rejectCommand);
    child.once('exit', (code) => code === 0 ? resolveCommand() : rejectCommand(new Error(`${name} ${args.join(' ')} exited ${code}`)));
  });
}

async function waitForServer(url) {
  let lastError;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`Preview returned ${response.status}`);
    } catch (error) { lastError = error; }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw lastError ?? new Error('Preview server did not start');
}

async function startLocalPreview() {
  await command(npm, ['run', 'build:site']);
  const vite = resolve(process.cwd(), 'node_modules/vite/bin/vite.js');
  preview = spawn(process.execPath, [vite, 'preview', '--config', 'vite.config.ts', '--host', '127.0.0.1', '--port', '4173'], { cwd: process.cwd(), stdio: 'pipe' });
  let stderr = '';
  preview.stderr.on('data', (chunk) => { stderr += String(chunk); });
  preview.once('exit', (code) => { if (code && !stderr) stderr = `Vite preview exited ${code}`; });
  try { await waitForServer('http://127.0.0.1:4173/'); }
  catch (error) { throw new Error(`${error instanceof Error ? error.message : error}\n${stderr}`); }
  return 'http://127.0.0.1:4173';
}

const routes = [
  { path: '/', title: /^Flaky Test Casefile — / },
  { path: '/demo/', title: /^Demo — Flaky Test Casefile$/ },
  { path: '/privacy/', title: /^Privacy — Flaky Test Casefile$/ },
  { path: '/terms/', title: /^Terms — Flaky Test Casefile$/ },
  { path: '/404.html', title: /^Page not found — Flaky Test Casefile$/ },
];

let failures = 0;
let browser;
try {
  const baseURL = suppliedURL?.replace(/\/$/, '') ?? await startLocalPreview();
  browser = await chromium.launch({ headless: true });
  for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }]) {
    for (const route of routes) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.on('pageerror', (error) => consoleErrors.push(error.message));
      const response = await page.goto(`${baseURL}${route.path}`, { waitUntil: 'networkidle' });
      const basics = await page.evaluate(() => ({
        title: document.title,
        lang: document.documentElement.lang,
        h1: document.querySelectorAll('h1').length,
        main: document.querySelectorAll('main').length,
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
        socialImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
        missingAlt: [...document.querySelectorAll('img')].filter((image) => !image.hasAttribute('alt')).length,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      }));
      const axe = await new AxeBuilder({ page }).analyze();
      const serious = axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
      const valid = response?.ok() && route.title.test(basics.title) && basics.lang === 'en' && basics.h1 === 1 && basics.main === 1 && Boolean(basics.canonical) && Boolean(basics.socialImage) && basics.missingAlt === 0 && !basics.overflow && consoleErrors.length === 0 && serious.length === 0;
      if (!valid) failures += 1;
      console.log(JSON.stringify({ viewport: viewport.name, path: route.path, status: response?.status(), basics, consoleErrors, serious: serious.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length })) }));
      if (route.path === '/') await page.screenshot({ path: `/tmp/flaky-test-casefile-${viewport.name}.png`, fullPage: true });
      await context.close();
    }
  }
} finally {
  await browser?.close();
  if (preview && !preview.killed) preview.kill('SIGTERM');
}
if (failures) process.exitCode = 1;
