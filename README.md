# Flaky Test Casefile

Turn Playwright retries into evidence. This free MIT-licensed reporter is for teams comparing flaky CI failures and finding the first changed network or page event.

Try the one-click sample at [flaky-test-casefile.sociobot.in/demo/](https://flaky-test-casefile.sociobot.in/demo/). It opens a seeded checkout failure in an isolated `demo:` browser-storage namespace. **Reset demo** restores the sample. **Start for real** discards demo storage and returns to the documentation.

## Install

```sh
npm install --save-dev flaky-test-casefile
```

Node 20+ and Playwright 1.40+ are required.

## Add the reporter

Add it to `playwright.config.ts`:

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

Run the suite, then open `casefile-report/index.html`. The reporter also writes `casefile.json` for automation. The HTML report is self-contained and opens from a local file while offline.

## Compare a network or page event

Attach optional probe evidence once per attempt:

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

The casefile groups matching failures after normalizing timing and identifier noise. It reports the first changed request, response, console error, page error, or DOM landmark when probe evidence is attached.

## Privacy defaults

The reporter needs no account, upload, server, or cloud service. It redacts common credential headers and sensitive query values from probe evidence. Traces and videos are excluded by default. Configured masks alter copied PNG screenshot pixels.

The documentation site uses no telemetry, cookies, third-party fonts, third-party scripts, or runtime CDN. The local JSON viewer processes a selected file in browser memory and does not save or upload it. The public site caches its files after the first visit for offline reloads.

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

Mask coordinates are CSS pixels in the screenshot. Masked export supports non-interlaced 8-bit RGB/RGBA PNGs.

## Develop and verify

From a clean checkout:

```sh
npm ci
npx playwright install chromium
npm test
npm run typecheck
npm run build
npm run test:e2e
npm run test:claims
npm run audit:site
npm run test:consumer
npm pack --dry-run
npm audit --omit=dev --audit-level=high
```

`npm run audit:site` builds the site and starts its own local production preview unless `CASEFILE_AUDIT_URL` names a site to inspect. `npm run test:claims` runs every public claim in `.factory/claims.json`; each command in that manifest can also run independently.

`npm run build` creates ESM, CommonJS, declarations, and the deployable documentation/demo site at `dist/site/index.html`. Deploy `dist/site` as a static site. The factory owns registry publishing; use `npm pack` to prepare the package and do not publish from this checkout.

See [privacy](https://flaky-test-casefile.sociobot.in/privacy/), [terms](https://flaky-test-casefile.sociobot.in/terms/), [CHANGELOG.md](./CHANGELOG.md), [SECURITY.md](./SECURITY.md), and the [MIT license](./LICENSE).
