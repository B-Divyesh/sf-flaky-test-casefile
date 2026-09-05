# Flaky Test Casefile v0.1.0 handoff

## Result

Repair complete. The product turns intermittent Playwright retries into a local static casefile for teams diagnosing flaky CI failures. The deployed documentation site now has the required sample sandbox, claim inventory, first-screen language, route structure, and clean audit command.

## SHA record and deployment

- **Implementation SHA / deployed artifact:** `18e9d3e31f02905e0eb1453d7343c1971ee5b9c5` (`fix: add demo sandbox and verified claims`).
- **Prior documentation/review SHA:** `8e1a58eb020e71000b15d4191cc87799a5524942`. This handoff is a later documentation-only update.
- **Production:** deployed `dist/site` to the existing `sf-flaky-test-casefile` Static Web App on 2026-09-05. No backend, environment, replica, or storage configuration was changed.
- **Live parity:** `https://flaky-test-casefile.sociobot.in/demo/` exactly matched `dist/site/demo/index.html` by SHA-256 after deployment.

## What changed

- Added the direct [`/demo/`](https://flaky-test-casefile.sociobot.in/demo/) sandbox. It opens a seeded checkout failure with three attempts and a `200 → 503` payment divergence. Its persistent banner says **Demo — sample data, nothing is saved**; **Reset demo** restores the sample; **Start for real** clears demo state and returns to the normal viewer.
- Demo browser state is isolated to `demo:flaky-test-casefile:`. Selected JSON files are only read in memory. `.factory/demo.md` documents the route, sample, reset, and namespace.
- Added `.factory/claims.json` with 20 public claims. Each has one `@claim:<id>` Playwright test and an independently runnable command. The tests assert outcomes, including real reporter output, masking pixels, request privacy, demo reset/exit, and offline reload.
- Rewrote the landing first screen: the job is named directly, the audience is explicit, and **Try it with sample data** states what it loads. The first screen has privacy, offline, and price facts. `.factory/copy-audit.md` records its word counts and terminology.
- Added product-specific `/demo/` and `404.html` pages, complete metadata, canonical/OG/Twitter tags, favicon, 180px touch icon, 1200×630 derived social image, sitemap entry, consistent navigation/footer, and an Azure response override for a styled HTTP 404.
- Updated the service-worker precache for all new public routes/assets and bumped its cache version. Existing XSS-safe DOM rendering, secure headers, immutable hashed-asset caching, and offline reload behavior remain intact.
- Repaired `npm run audit:site`: it builds and serves a production preview itself unless `CASEFILE_AUDIT_URL` is set, checks all five routes at desktop and phone widths, fails for console/page errors, and uses Axe.
- Pinned Playwright to `1.58.2`, removed the conflicting `esbuild` override, and added a clean ESM/CommonJS consumer-import check.

## Verification from a clean checkout

```sh
npm ci
npx playwright install chromium
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:claims
npm run audit:site
npm run test:consumer
npm pack --dry-run
npm audit --omit=dev --audit-level=high
```

All commands passed on Node 22.23.2.

- `npm test`: 5 files, 8 tests passed.
- `npm run typecheck` and `npm run build`: passed. The site output contains the npm library formats and `dist/site` with the landing, demo, legal, and 404 pages.
- `npm run test:e2e`: passed. The seeded Playwright run intentionally records a first `503` attempt and succeeds with `200` on retry, so Playwright reports the test as **flaky**, not failed. The viewer XSS and worker/offline regressions passed.
- `npm run test:claims`: 20/20 passed. Every one of the 20 commands in `.factory/claims.json` was also run independently; each selected one passing tagged test from a fresh browser context.
- `npm run audit:site`: passed locally and against production. Desktop 1440×960 and phone 390×844 checks cover `/`, `/demo/`, `/privacy/`, `/terms/`, and `/404.html`: one h1/main, titles, canonical/social metadata, no missing image alt, no overflow, no console errors, and zero Axe serious/critical violations.
- `npm run test:consumer`: passed from a temporary clean consumer: ESM and CommonJS root imports and the `/probe` subpath all loaded.
- `npm pack --dry-run`: passed (14.5 kB package, 65.2 kB unpacked). `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.

## Live verification

- Fresh desktop and phone browser contexts started at scroll position 0 and showed: **Turn Playwright retries into evidence**; the Playwright-team audience sentence; and **Try it with sample data**. The action opened the seeded three-attempt casefile, showed the demo banner, reset correctly, and removed its `demo:` key when leaving.
- The normal demo flow made same-origin requests only and produced no console errors. A new context installed the service worker, reloaded `/demo/` while offline, and retained the demo banner/sample.
- `/`, `/demo/`, `/privacy/`, and `/terms/` returned 200. An unknown path returned HTTP 404 with **Page not found — Flaky Test Casefile** and a way home.
- Live hashed JavaScript/CSS and the social image return `Cache-Control: public, max-age=31536000, immutable`. The live document response includes the same-origin CSP with `frame-ancestors 'none'`, HSTS, `nosniff`, referrer policy, and permissions policy.
- Mobile Lighthouse against production recorded Performance 100, Accessibility 100, Best Practices 100, and SEO 100; FCP 0.9 s, LCP 1.2 s, CLS 0, TBT 0 ms. Lighthouse wrote its JSON before reporting a Chrome tab crash during BFCache/full-page-screenshot shutdown; the browser audit and direct Playwright checks are the pass/fail evidence.

## Performance and assets

- First-load JavaScript: 1.86 kB gzip. CSS: 3.38 kB gzip. Self-hosted Space Grotesk: 22.4 kB. The 640px hero image is 24.4 kB. All are within static-product budgets.
- `casefile-og.webp` is a 1200×630 WebP crop derived from the original generated casefile drafting illustration. The new favicon is hand-authored SVG; its 180px touch icon is a local raster derivative. Provenance for the hero remains in `.factory/design.md`.

## Known gaps and next steps

- The optional probe must be attached by a test to compare network/DOM event streams; the standard Playwright reporter callback API does not expose them itself.
- Pixel masking supports non-interlaced 8-bit RGB/RGBA PNG screenshots. Other formats are safely excluded when masks are configured.
- Traces are excluded by default and are not parsed or sanitized. Enable trace inclusion only for a controlled artifact store.
- The factory owns npm publishing. The ready-to-publish handoff command is `npm pack`; do not publish from this checkout.
