# Flaky Test Casefile

Turn Playwright retries into one private, static incident report. The reporter groups matching failures, removes timing and identifier noise, compares optional network/DOM probe events, redacts headers, and exports masked screenshots without a server or account.

Built for teams diagnosing intermittent CI failures. It complements Playwright's trace viewer; it does not run tests, upload artifacts, or guess at fixes.

## Install

```sh
npm install --save-dev flaky-test-casefile
```

Requires Node 20+ and Playwright 1.40+.

## Use the reporter

Add the reporter to `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['line'],
    ['flaky-test-casefile', {
      outputDir: 'casefile-report',
      screenshotMasks: [{ x: 0, y: 0, width: 240, height: 72 }],
    }],
  ],
});
```

Run the suite, then open `casefile-report/index.html`. The report is self-contained and works offline. `casefile.json` is also emitted for automation.

By default screenshots are copied, common credential headers are replaced with `[REDACTED]`, and traces/videos are not copied because they may contain credentials or personal data. Set `includeTraces: true` only for a controlled artifact store.

## Pinpoint a network or DOM divergence

The optional probe uses ordinary Playwright page events. Attach its result once per attempt:

```ts
import { test } from '@playwright/test';
import { createCasefileProbe } from 'flaky-test-casefile/probe';

test('checkout survives a retry', async ({ page }, testInfo) => {
  const probe = createCasefileProbe(page);
  await page.goto('/checkout');
  await probe.mark('checkout-ready');

  try {
    await page.getByRole('button', { name: 'Pay' }).click();
    await probe.mark('payment-result');
  } finally {
    const evidence = await probe.stop();
    await testInfo.attach('casefile-events', {
      body: Buffer.from(JSON.stringify(evidence)),
      contentType: 'application/vnd.casefile+json',
    });
  }
});
```

The casefile compares ordered events between retries and identifies the first differing request, response, console error, page error, or DOM landmark snapshot. Request headers are redacted before they enter the attachment.

## Options

```ts
type CasefileReporterOptions = {
  outputDir?: string;                 // casefile-report
  includeTraces?: boolean;            // false
  includeVideos?: boolean;            // false
  copyScreenshots?: boolean;          // true
  redactHeaders?: string[];           // authorization, cookie, set-cookie, x-api-key
  screenshotMasks?: Array<{ x: number; y: number; width: number; height: number }>;
};
```

Mask coordinates are CSS pixels in the screenshot. For PNGs, masking changes the exported pixels; the original remains where Playwright wrote it. Unsupported image formats are omitted when masks are configured so an unmasked copy cannot leak into the casefile.

## Develop and verify

```sh
npm install
npm test
npm run build
npm pack --dry-run
```

`npm run build` creates ESM, CommonJS, declarations, and the deployable documentation/demo site at `dist/site/index.html`. `npm run dev` starts the site locally.

No telemetry, accounts, cookies, cloud service, or runtime CDN is used. See [CHANGELOG.md](./CHANGELOG.md), [SECURITY.md](./SECURITY.md), and the [MIT license](./LICENSE).
