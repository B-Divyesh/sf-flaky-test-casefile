# Turn Playwright retries into evidence — independent verification 3

Verified 2026-09-05 against live <https://flaky-test-casefile.sociobot.in>.

Implementation reviewed: `18e9d3e31f02905e0eb1453d7343c1971ee5b9c5` (`fix: add demo sandbox and verified claims`). Documentation checkout: `95f30db4b921c9f7aaa2c03efa19eae7f2108f95` (`docs: record verification revision`); the intervening `870fe02` and `95f30db` commits change reports only. Fresh-build SHA-256 values matched live `/`, `/demo/`, `/privacy/`, `/terms/`, `/404.html`, `sw.js`, and the hashed JavaScript asset.

## Verdict: FAIL

**FAIL — 2 low-severity findings, 0 untested claims.** The library and live product paths work, but the result cannot be a release PASS until both accessibility and plain-words contract findings are repaired.

## Job, audience, and first action

The job is to turn intermittent Playwright retry failures into a compact static casefile that compares attempts and identifies the first changed network or page event. It is for Playwright teams diagnosing flaky CI failures. In fresh desktop (1440×960) and phone (390×844) browsers, before scrolling, the page said **Turn Playwright retries into evidence**, named that audience in a 19-word sentence, and showed **Try it with sample data** in the first screen with **Loads a seeded checkout failure** beside it.

## Findings

### Low — Two mobile touch targets are smaller than 44×44 CSS pixels

At 390px width, the home-wordmark link measures 121×42px on every route and the footer **Terms** link measures 39×44px. Both are interactive links. The accessibility contract requires at least 44×44px touch targets. Add sufficient padding/minimum dimensions while preserving the visual layout.

### Low — The landing page retains a decorative label

The hero caption begins with **PLATE 01**. It does not tell a visitor what the product does or what to do, and it is a decorative label prohibited by the plain-words contract. Remove it or replace it with useful, product-specific information.

## Passing checks

- A fresh detached checkout at `95f30db` completed `npm ci`, `npm run typecheck`, `npm test` (5 files, 8 tests), `npm run build`, and `npm run test:e2e`. The seeded E2E test is intentionally reported as flaky after its first 503 attempt; the command exited successfully and the viewer suite passed 2/2.
- `npm run test:claims` passed 20/20. Every manifest command below was then run separately from that clean checkout and passed with exactly one selected test.
- `CASEFILE_AUDIT_URL=https://flaky-test-casefile.sociobot.in npm run audit:site` passed desktop and phone audits for `/`, `/demo/`, `/privacy/`, `/terms/`, and `/404.html`: route titles, `lang`, one h1, one main, canonical/social metadata, image alt attributes, no overflow, no console errors, and zero Axe serious/critical findings.
- `npm run test:consumer` passed a clean ESM/CommonJS consumer check for the root package and `/probe`. `npm pack --dry-run` produced a 14.5 kB package (65.2 kB unpacked). `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities.
- Fresh desktop and phone flows opened the direct `/demo/` sample. It showed the persistent **Demo — sample data, nothing is saved** banner, three realistic retry records (two timed out at 30,000ms, then one passed at 1,840ms), and the `200 → 503` `POST /api/payment` divergence. **Reset demo** restored the sample; **Start for real** returned home and removed the `demo:` key. A pre-existing non-demo localStorage marker remained unchanged.
- A fresh phone context installed the live worker, reloaded `/demo/` while offline, and retained the seeded demo. The runtime made same-origin requests only and produced no console or page errors.
- Live normal, invalid, boundary, recovery, and security input paths passed. A selected boundary JSON showed `passed / 0 ms` and stayed out of local/session storage; malformed JSON gave a specific recovery instruction; **Restore sample** recovered; the prior hostile status payload remained literal text, created no image node, and did not execute.
- Keyboard and motion smoke checks passed: the first Tab showed the visible skip link; native controls remained operable; reduced motion computed `scroll-behavior: auto` and a `0s` button transition. The automated Axe integration found no serious or critical issue. The touch-target measurements above are the remaining accessibility finding.
- All discovered live links returned 200 (or were in-page anchors). An unknown path returned deliberate HTTP 404 with a product-styled page, one h1, and a **Go to the product home** route. The HTTP 404 itself is expected, not a defect.
- Live responses use same-origin CSP including `frame-ancestors 'none'`, HSTS, `nosniff`, referrer policy, and permissions policy. Hashed assets return `Cache-Control: public, max-age=31536000, immutable`.

## Claim evidence

| Claim id | Independent command result |
| --- | --- |
| `demo-sandbox` | PASS |
| `groups-retry-failures` | PASS |
| `normalizes-noise` | PASS |
| `first-divergence` | PASS |
| `static-casefile` | PASS |
| `no-server-or-account` | PASS |
| `offline-generated-reports` | PASS |
| `redacts-credential-headers` | PASS |
| `redacts-sensitive-query-values` | PASS |
| `traces-excluded` | PASS |
| `videos-excluded` | PASS |
| `png-masks-change-pixels` | PASS |
| `selected-json-stays-in-browser` | PASS |
| `selected-json-not-persisted` | PASS |
| `no-telemetry` | PASS |
| `no-cookies` | PASS |
| `no-third-party-fonts-or-scripts` | PASS |
| `no-runtime-cdn` | PASS |
| `offline-site-reload` | PASS |
| `free-mit-license` | PASS |

Each used its exact `npm run test:claims -- --grep @claim:<id>` declaration from `.factory/claims.json`. Cross-checking README, landing, and privacy copy found all public reliance claims represented in that manifest.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Client-side JSON/script injection | Fixed; hostile status stays literal and does not execute. |
| Worker precache and offline reload | Fixed; live demo reload passed while offline. |
| Immutable static-asset caching | Fixed; live hashed asset returned the immutable policy. |
| CSP, frame protection, and permissions policy | Fixed; all are present in the live response. |
| One-click isolated demo absent | Fixed; direct `/demo/`, banner, reset, exit, and isolated `demo:` storage work. |
| Claims manifest/tests absent | Fixed; 20 claims exist and all exact commands passed independently. |
| First-screen copy/site routes/metadata/404 incomplete | Fixed; direct first action, metadata, legal/demo routes, and styled HTTP 404 passed audit. |
| Clean site-audit command unusable | Fixed; the command passed from the clean checkout and against production. |
| Explicit demo reset/direct sample route absent | Fixed; **Reset demo** and `/demo/` work. |

## Scope notes

This is a static library/documentation product with no backend or tenant state. Tenant isolation, restart persistence, health endpoint, and 429/Retry-After checks do not apply. The reported Lighthouse shutdown crash is not used as a passing command; the successful browser audit and direct runtime checks above are the evidence.

## Required next steps

1. Make the wordmark and footer Terms links at least 44×44px at phone width.
2. Remove or replace `PLATE 01` with useful plain copy.
3. Re-run this verification after deployment. A PASS requires zero findings.
