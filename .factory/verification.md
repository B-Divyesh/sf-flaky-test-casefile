# Independent verification — FAIL

Verified on 2026-08-27 against candidate commit
`6a179aaa2d724d19cc753d7fcde19a5dbe1bf0a1` and production
`https://flaky-test-casefile.sociobot.in/`.

## Verdict

**FAIL.** The core npm reporter works for the researched job, but the shipped
website has a reproducible client-side script injection when it opens an
untrusted `casefile.json`, and the advertised offline service worker does not
install. These are release-blocking privacy/security and PWA defects.

## Passing evidence

- Started from a clean candidate checkout on Node `v22.23.2` / npm `10.9.8`.
  `npm ci` completed with 0 audit vulnerabilities.
- `npm test`: 4 files / 7 tests passed.
- `npm run typecheck`: passed. No lint script or lint configuration exists in
  this repository.
- Exact production build `npm run build`: passed and produced `dist/`.
  Vite output: 3,261 B JS and 10,373 B CSS uncompressed. The self-hosted font
  is 22,376 B; responsive hero images are 24,398 B and 79,458 B. All are
  within the stated static asset budgets.
- `npm pack --dry-run` and `npm pack`: succeeded. The package is 14,221 B
  compressed / 64,248 B unpacked and includes ESM, CommonJS, and declarations.
  In a separate clean consumer directory, installing that tarball succeeded;
  both ESM and CommonJS reporter exports loaded, `flaky-test-casefile/probe`
  loaded, two normalized failures clustered together, `503` was identified as
  the divergent response, and `Authorization` was redacted.
- After installing the declared Playwright Chromium prerequisite,
  `npm run test:e2e` completed with the intended seeded flaky result: first
  attempt failed with HTTP 503, retry passed with HTTP 200. The emitted
  casefile had two attempts, one failure cluster, first divergence at response
  event 2 (`200 → 503`), and a PNG with the configured pixel mask baked in.
- A separate malformed probe attachment (`{`) was handled safely: the reporter
  wrote a casefile, marked that attachment `unavailable`, retained one failure
  cluster, and redacted an authorization secret.
- Live deployment parity is exact: the home, privacy, and terms HTML files and
  the built JS, CSS, font, both WebP files, and `sw.js` all matched the local
  `dist/site` bytes by SHA-256.
- Live desktop (1440px) and mobile (390px) checks: no page errors or ordinary
  console errors, no horizontal overflow, one title/lang/h1/main, all images
  have alt attributes, no runtime outbound requests, and zero axe
  serious/critical findings. The first Tab focuses the visible skip link.
  Reduced motion reports `scroll-behavior: auto` and no button transition.
- Viewer flows on both viewport sizes: valid representative casefile rendered;
  a zero-count/empty-status boundary shape rendered; malformed JSON showed an
  error and retained a recovery action; Restore sample recovered correctly.
- Privacy review: no telemetry, cookie, CDN font, or third-party runtime
  request was observed in the normal flow. The package defaults to excluded
  traces/videos and redacts the documented credential headers.

## Defects

### Medium — untrusted local casefile JSON executes script in the production origin

`site/main.ts` renders `attempt.status` directly through `innerHTML` in
`#attempt-ruler`. On the live deployment, selecting this JSON set
`window.__casefileXss` to true:

```json
{
  "clusters": [{"id":"FC-XSS","symptom":"Runtime","count":1,"attempts":["x"]}],
  "attempts": [{"id":"x","title":"XSS","retry":0,
    "status":"<img src=x onerror=window.__casefileXss=1>","durationMs":0}]
}
```

This breaks the viewer's privacy/security boundary for a file users may obtain
from CI or a teammate. Use DOM node creation / `textContent` for every value
from parsed JSON (and do not use `innerHTML` for this view). A restrictive CSP
would provide useful defense in depth but is absent from the live response.

### Medium — service worker does not install; offline reload fails

The deployed `sw.js` precaches `/style.css`, but Vite emits and the live page
uses `/assets/style-BEKr5oX-.css`. `GET /style.css` returns `404 text/html`.
Consequently `navigator.serviceWorker.ready` did not settle after five seconds,
there was no registration/controller, and `page.reload()` after setting the
network offline failed with `net::ERR_INTERNET_DISCONNECTED`.

This contradicts the privacy page's claim that the service worker caches public
site files for offline access. Generate the precache manifest from built hashed
assets (including the JS entry), version it, and test first install, update,
and offline reload.

### Low — live static asset caching misses the factory policy

The live hashed JS and CSS both return
`cache-control: public, must-revalidate, max-age=30`, rather than long-lived
immutable caching. The deploy should serve fingerprinted assets with immutable
cache headers. HTML can retain its short revalidation policy.

### Low — response hardening headers are incomplete

The live site has HSTS, `nosniff`, and a referrer policy, but no
`Content-Security-Policy`, `frame-ancestors`/`X-Frame-Options`, or
`Permissions-Policy`. The absent CSP materially worsens the XSS defect above.

## Scope and commands

Commands exercised: `npm ci`, `npm test`, `npm run typecheck`, `npm run build`,
`npm pack --dry-run`, `npm pack`, `npm run test:e2e`, `npm audit --omit=dev
--audit-level=high`, browser/axe checks, curl header checks, and a clean
tarball consumer import exercise. Chromium had to be installed with
`npx playwright install chromium` because the disposable verifier image did
not include the declared Playwright browser binary initially.

No product source code was modified by this verification.
