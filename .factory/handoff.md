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
