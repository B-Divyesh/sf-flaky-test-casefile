# Turn Playwright retries into comparable evidence — review 1

Reviewed 2026-09-05. Live URL: <https://flaky-test-casefile.sociobot.in>.

Implementation candidate: `f0c13bf789f547c16fb3e96455ccb37eaab3e903` (`fix: precache only emitted site assets`). Documentation checkout: `57e9f4be233edb5afe7f6dab62d6b459c935aed1` (`docs: record independent candidate verification`). The later commits after the implementation candidate only change verification/handoff documents. The live JS, CSS, and worker SHA-256 values exactly matched a local build of this checkout.

## Verdict: FAIL

**FAIL — 5 findings, including 2 high-severity findings, and 18 untested public claims.** This is not a release pass.

## Product, audience, and first action

The job is to turn intermittent Playwright failures into a small static casefile that compares retries and shows the first changed network or DOM event. It is for teams diagnosing flaky Playwright CI tests. On the live first screen, the first primary action is **Install the reporter**; the nearby secondary link is **Open a sample casefile**. Neither is the required **Try it with sample data** action.

I opened fresh Chromium desktop (1440 × 960) and phone (390 × 844) contexts before scrolling. The first screen has the h1 “Find the first thing that changed.” and a 27-word paragraph. It does not state the job in the required plain, direct form, does not name the audience, and does not offer the prescribed demo action or its result next to it.

## Findings

### High — The required one-click, isolated demo sandbox is absent

The landing page includes a built-in sample viewer lower on the page, but it is not a demo mode. There is no `/demo` route, no `?demo=1` handling, no persistent “Demo — sample data, nothing is saved” label, no **Reset demo**, and no **Start for real** action. `https://flaky-test-casefile.sociobot.in/demo` returns the generic Azure `404` page.

The built-in sample itself is useful: in fresh desktop and phone contexts it displays three realistic attempts and a 503/200 comparison. Loading a normal local casefile works, malformed JSON gives a recovery message, and **Restore sample** returns the viewer to the built-in sample. The supplied JSON is processed in memory and the fresh browser had no cookies, localStorage, or sessionStorage entries. Those good facts do not supply the required separately named storage namespace or a visitor-visible demo boundary. The catalog and verifier entry point therefore cannot enter the promised sandbox directly or prove it cannot touch real data.

### High — Required claim inventory and sandbox tests are missing

`.factory/claims.json` does not exist, so there are no declared `@claim:` commands to run from a clean checkout. This leaves **18 public claims unlisted and untested by the required sandbox mechanism**:

1. Groups matching retry failures.
2. Normalizes timing and identifier noise.
3. Identifies the first changed network or DOM event.
4. Writes a static/self-contained casefile.
5. Needs no server, upload, account, or cloud service.
6. Generated reports work offline.
7. Credential headers are redacted.
8. Sensitive query parameters are redacted.
9. Traces are excluded by default.
10. Videos are excluded by default.
11. Configured PNG masks alter copied pixels.
12. A selected viewer JSON file never leaves the browser.
13. The viewer does not persist the selected file.
14. The website uses no telemetry.
15. The website uses no cookies.
16. The website uses no third-party fonts or scripts.
17. The website uses no runtime CDN.
18. The service worker makes the public site available offline after first visit.

Several of these behaviors have ordinary unit/E2E coverage and were independently observed below, but that is not a replacement for the mandatory claim list and one tagged, clean-state sandbox test per public claim. No PASS is possible with these untested claims.

### Medium — Required first-screen copy and standard site structure are incomplete

The visual implementation is product-specific and legible, but the live first screen does not meet the plain-words contract. The headline is an indirect phrase rather than the job; the following paragraph is over the 22-word limit and does not say who it is for; the primary action installs rather than starts the sample. The three lines are feature statements rather than the required privacy/offline/price facts. `.factory/copy-audit.md` is also absent.

The common site skeleton is incomplete. The landing header lacks a Demo and Privacy nav route; legal-page headers are different; footers omit the required “Built by Param Factory” and version/build identifier. The page source has no canonical link, Open Graph metadata, Twitter card metadata, or favicon/apple-touch icon. `/demo` is missing and the deliberate unknown-path 404 is the generic Azure page without a product h1, main landmark, product styling, or way back. That is a broken required 404 design, not a finding merely because it returns HTTP 404.

### Medium — `npm run audit:site` is not a usable clean verification command

From the documented clean setup, `npm run audit:site` fails with `net::ERR_CONNECTION_REFUSED` because it assumes an already-running server at `127.0.0.1:4173` but does not start one and README does not give the prerequisite. Starting a plain Vite server at that port lets the command run, but it reports an unsupported module MIME-type console error for `/` at both widths while still exits zero. That means it can pass despite its own console-error condition, so it cannot substantiate its advertised local site audit without repair.

`npm audit --omit=dev --audit-level=high` also could not run because npm reports the package’s `esbuild` override conflicts with a direct dependency (`EOVERRIDE`). This is not a security-vulnerability finding by itself, but the earlier handoff’s “npm audit: 0 vulnerabilities” statement is not reproducible from this clean checkout.

### Low — The demo’s current recovery control is not an explicit reset and the first sample is not directly reachable

The locally rendered sample has **Restore sample**, which works after both a malformed input and a valid uploaded casefile. It is not a labelled reset for a named demo, it does not remove a demo storage namespace because none exists, and it cannot be linked as a direct catalog route. This is included separately so the remedy keeps the already working recovery behavior while making its purpose testable.

## Passing checks and evidence

- Clean `npm ci` passed: 87 packages audited, 0 vulnerabilities reported by install.
- `npm test` passed: 5 files, 8 tests.
- `npm run typecheck` and `npm run build` passed. The build produced ESM, CJS, declarations, `dist/site`, a 3.46 kB JS entry (1.66 kB gzip), and a 10.37 kB CSS entry (3.07 kB gzip).
- After installing the documented Chromium prerequisite with `npx playwright install chromium`, `npm run test:e2e` passed. The intentionally seeded first retry has 503 then succeeds on retry; the security/offline viewer suite passed 2/2.
- `npm pack --dry-run` and `npm pack` passed. The tarball is 14.3 kB compressed / 64.4 kB unpacked. In a new temporary consumer, ESM and CommonJS each loaded the default reporter and the `/probe` subpath successfully.
- Fresh desktop and phone live contexts had one title, `lang=en`, one h1, one main, no horizontal overflow, no page/console errors, a visible skip-link focus ring on first Tab, no third-party requests, and zero serious/critical Axe violations using the installed `@axe-core/playwright` integration. The standalone Axe CLI could not discover the Playwright-managed Chrome binary; the integrated Axe result is the completed equivalent check.
- Keyboard and content paths: a normal local JSON displayed the sample title and `0 ms` boundary value; invalid JSON gave a specific recovery message; **Restore sample** recovered; no browser storage was created; reduced-motion styling, responsive layout, and normal viewer focus behavior remained intact.
- Privacy/runtime: a fresh context had an empty cookie string and empty local/session storage. The normal viewer flow made only same-origin requests. The service worker controlled the page and reloaded it offline after the first load at both viewport sizes.
- Earlier XSS finding is fixed: uploading the prior `<img src=x onerror=window.__casefileXss=1>` status payload left the literal text in the attempt ruler, created zero image elements there, set no `window.__casefileXss`, and made no page error.
- Earlier worker/cache and response-header findings are fixed: live `sw.js` matches the current build, controls the page, and offline reload works. Live HTML supplies CSP with `frame-ancestors 'none'`, HSTS, `nosniff`, referrer and permissions policies. Fingerprinted live JS/CSS match local assets byte-for-byte. The external GitHub link returned HTTP 200; home, privacy, and terms returned 200.
- Privacy and terms have route-specific titles and a single h1/main. The current live site has no backend, so tenant isolation, restart persistence, health, and 429/Retry-After checks do not apply.

## Commands run

```sh
npm ci
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
npm pack --dry-run
npm pack --pack-destination /tmp
npm run audit:site
npm audit --omit=dev --audit-level=high
```

The first E2E run correctly exposed the missing browser prerequisite; after installation it passed. The browser audit command and npm audit command remain failed/incomplete as described above. There were no claim commands to run because the required claims manifest is missing.

## Earlier findings disposition

| Earlier finding | Current disposition |
| --- | --- |
| Uploaded casefile DOM XSS | Fixed and directly rechecked live with the original hostile status payload. |
| Service-worker precache/offline reload | Fixed and rechecked live at desktop and phone widths. |
| Immutable caching for fingerprinted assets | Fixed in the live headers reported by the previous verification; current local/live JS/CSS byte parity confirms the reviewed build is deployed. |
| CSP, frame protection, permissions policy | Fixed; live response includes all three policy categories. |

The prior PASS report remains accurate only for the then-tested implementation/security behaviors. It did not establish the now-required demo-sandbox, claims, plain-words, or full site-structure contracts.

## Required next steps

1. Add `/demo` (or `?demo=1`) with the required one-click action, persistent named demo banner, **Reset demo**, **Start for real**, an isolated `demo:` storage namespace, and a documented `.factory/demo.md`.
2. Add `.factory/claims.json` and one independently runnable `@claim:` sandbox test for every listed public claim; remove any claim that cannot be tested.
3. Rewrite the landing first screen and add `.factory/copy-audit.md`; complete metadata, favicon, consistent navigation/footer, a product 404 page, and a real Demo route.
4. Make `npm run audit:site` start the correct production-like server and fail on every reported console error. Resolve the npm override conflict or remove the irreproducible audit statement.
