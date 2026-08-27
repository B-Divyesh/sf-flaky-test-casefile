# Flaky Test Casefile v0.1.0 handoff

## What shipped

- Publish-ready TypeScript npm package with ESM, CommonJS, and declaration outputs.
- Playwright reporter using documented reporter callbacks. It collects retry attempts, normalizes volatile timing/ID/port/source-location noise, clusters similar failures, and writes a self-contained `index.html` plus machine-readable `casefile.json`.
- Optional `createCasefileProbe(page)` helper that records requests, responses, warning/error console messages, page errors, and labeled DOM landmark snapshots. Reports compare retries and identify the first stable event divergence.
- Privacy controls: common credential header and sensitive query-string redaction, workspace/home path removal, traces/videos excluded by default, and pixel-baked rectangular masking for 8-bit RGB/RGBA PNG screenshots. Unsupported screenshot formats are omitted when masks are requested.
- Responsive blueprint drafting-sheet documentation site with an in-browser local JSON viewer, loading/error/empty messaging, privacy and terms pages, offline service worker, self-hosted font, robots/sitemap files, and original generated hero artwork.

## Run and verify

```sh
npm install
npm test
npm run typecheck
npm run build
npm run test:e2e # after installing Playwright Chromium
npm pack --dry-run
```

The deploy root is `dist/site`; `dist/site/index.html` is present. Publishing is intentionally not performed by the worker. Registry handoff command: `npm pack` (verified tarball: 14 KB compressed, 64 KB unpacked).

Verification completed on 2026-08-27:

- Unit/integration: 4 files, 7 tests passed.
- Real Playwright seeded flake: failed once and passed on retry; generated casefile reported 1 cluster and correctly marked the response divergence `200 → 503`; configured screenshot mask was baked into the copied PNG.
- Strict TypeScript: passed.
- `npm audit`: 0 vulnerabilities.
- Chromium checks at 390px and desktop on `/`, `/privacy/`, and `/terms/`: no console errors, horizontal overflow, missing alt text, or serious/critical axe findings; title/lang/main/one-h1 checks passed.
- Generated casefile checked from `file://` at 390px: filters rendered, one cluster rendered, no console errors/overflow, zero serious/critical axe findings.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9s, LCP 1.2s, CLS 0, total blocking time 0ms.
- First-load assets: 3.3 KB JS, 10.4 KB CSS, 22.4 KB font, 24.4 KB mobile hero WebP (all uncompressed and within budget).

## Known gaps and next steps

- Network/DOM divergence needs the optional probe attachment; the standard Playwright reporter API alone does not expose those event streams.
- Pixel masking intentionally supports Playwright's usual non-interlaced 8-bit RGB/RGBA PNG screenshots. Other image formats are safely excluded when masks are configured.
- Trace contents are not parsed or sanitized. They are excluded by default and should only be enabled for a controlled artifact store.
- Clustering uses deterministic normalization and token similarity rather than learned guesses. Teams with domain-specific volatile values may eventually benefit from configurable normalization patterns.

## Asset provenance

The original hero was generated with `/opt/fleet/lib/gen-image.sh` using the `factory-image` deployment, visually reviewed, converted to optimized 1200px and 640px WebP variants (79 KB and 24 KB), and saved at `site/public/casefile-drafting*.webp`. The complete production prompt and visual tokens are recorded in `.factory/design.md`. Space Grotesk is self-hosted under the SIL Open Font License at `site/public/fonts/OFL.txt`.

---

# Independent verification update — FAIL (2026-08-27)

Candidate verified: `6a179aaa2d724d19cc753d7fcde19a5dbe1bf0a1`.
Production verified: `https://flaky-test-casefile.sociobot.in/`.

**FAIL — do not release this candidate unchanged.** The reporter package and
seeded retry workflow pass, but the public local-casefile viewer has a
reproducible DOM XSS when an uploaded JSON contains HTML in an attempt status.
It executes script in the production origin. Separately, the service worker
precaches `/style.css`, which is 404 in production because the actual Vite
asset is hashed under `/assets/`; the worker never activates and an offline
reload fails. See `.factory/verification.md` for the exact payload, commands,
all passing evidence, deployment byte-for-byte parity, and lower-severity
caching/header findings.

How to reproduce the release blockers:

```sh
npm ci
npm run build
npm run test:e2e # after: npx playwright install chromium
```

Then use the JSON payload in `.factory/verification.md` with the live or local
viewer and observe its `onerror` handler run. On the live site, verify
`/style.css` returns 404 and reload after setting the browser offline; it fails
with `net::ERR_INTERNET_DISCONNECTED`.

---

# Release-blocker repair — ready to deploy (2026-08-27)

## Repaired findings

- The public local-casefile viewer now creates attempt elements with DOM APIs
  and assigns every parsed value with `textContent`; it no longer interpolates
  parsed casefile values into HTML. The verifier's exact `<img onerror>` payload
  is an automated browser regression and remains visible only as literal text.
- The service worker is emitted by Vite after fingerprinted asset names are
  known. Its precache contains the generated `/assets/main-*.js` and
  `/assets/style-*.css` entries, never the obsolete `/style.css`; it uses a new
  cache version, waits for installation, takes control, and serves cached
  navigation while offline.
- `staticwebapp.config.json` keeps the docs deployment on Azure Static Web Apps
  and adds a restrictive same-origin CSP, frame protection, nosniff,
  referrer/permissions policies, and long-lived immutable caching for hashed
  assets, self-hosted fonts, and immutable WebP artwork.

## Verification from a clean install

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:e2e   # Chromium installed with: npx playwright install chromium
npm pack --dry-run
npm pack
```

- Unit tests: 5 files / 8 tests passed, including the Azure header/cache
  configuration regression.
- E2E: the original seeded retry still fails once with HTTP 503 and passes with
  HTTP 200 on retry; its generated artifact remains exactly 2 attempts and 1
  cluster. The separate built-site suite passed the XSS regression and first
  install/offline-reload worker regression.
- Browser audit against the production build passed at desktop 1440px and
  mobile 390px for `/`, `/privacy/`, and `/terms/`: title/lang/one-h1/main/alt,
  no overflow, no console/page errors, and zero axe serious/critical findings.
- `npm pack` produced a 14.3 KB compressed / 64.4 KB unpacked tarball. A clean
  temporary consumer installed it and loaded the documented ESM and CommonJS
  reporter/probe exports.

## Deployment and publishing

- Deploy `dist/site` as the Azure Static Web Apps artifact. The included
  `staticwebapp.config.json` must remain at that deployment root.
- The package is ready for the factory registry workflow; do not publish from
  this worker. Use `npm pack` to generate the registry handoff tarball.

## Final production deployment

- Deployed `dist/site` to the existing **Standard Azure Static Web Apps**
  production target `sf-flaky-test-casefile` on 2026-08-27.
- Live SHA-256 parity passed for the three HTML pages, worker, hashed JS/CSS,
  both WebP files, and the self-hosted font.
- Live headers now include the same-origin CSP with `frame-ancestors 'none'`,
  permissions policy, and immutable one-year cache control for fingerprinted
  JS/CSS. The live worker precache names only files present in the deployment.
- On the public origin at mobile width, the verifier's exact uploaded XSS
  payload created zero image elements and did not execute; the activated worker
  then completed an offline viewer reload. The desktop/mobile/axe audit again
  passed for the home, privacy, and terms pages.
