# Independent verification 2 — PASS

Verified on 2026-08-27 against candidate commit
`6c381a47a18aa60cb099c5c32b60b4f99d0e608d` and production
`https://flaky-test-casefile.sociobot.in/`.

## Verdict

**PASS.** The candidate delivers the researched smallest useful product: a
local Playwright reporter groups retry failures, writes a self-contained
casefile, normalizes retry noise, identifies the first probe-event divergence,
and applies the promised privacy controls. The deployed documentation/demo is
byte-for-byte the candidate build and passed its normal, boundary, invalid,
security, accessibility, responsive, offline, and response-policy checks.

No release-blocking defects were found. There are no open defects to assign a
severity in this verification.

## Reproducible local evidence

The checkout was clean at the candidate SHA before verification. Environment:
Node `v22.23.2`, npm `10.9.8`, and Playwright Chromium `1234` (installed with
`npx playwright install chromium`, because this disposable image did not ship
the browser executable).

| Check | Fresh result |
| --- | --- |
| `npm ci` | Passed; 87 packages audited, 0 vulnerabilities. |
| `npm test` | Passed: 5 files, 8 tests. |
| `npm run typecheck` | Passed. No lint script or lint configuration exists. |
| `npm run build` | Passed; generated ESM, CJS, declarations, and `dist/site`. |
| `npm run test:e2e` | Passed. The seeded test intentionally failed with 503 on attempt 0 and passed with 200 on retry 1; Playwright reports it as `flaky`, not failed. The two viewer security/offline tests passed. |
| `npm pack --dry-run` and `npm pack` | Passed; tarball is 14.3 kB compressed / 64.4 kB unpacked, with only the documented package files. |
| `npm audit --omit=dev --audit-level=high` | Passed: 0 vulnerabilities. |

The production build emitted 3,460 B JS (1,660 B gzip), 10,373 B CSS (3,070 B
gzip), 22,376 B self-hosted font, and 24,398 B/79,458 B responsive WebP hero
assets. These are within the specified static budgets; no remote font or
runtime CDN is required.

## End-to-end product checks

- The real Playwright run produced `.artifacts/e2e-casefile/casefile.json` and
  a portable `index.html`: 2 attempts, 1 flaky test, 1 failure cluster, and
  first divergence at response event 2 (`200` baseline to `503` retry). The
  copied failure screenshot records `1 mask(s) baked in`.
- The generated static report was opened directly from `file://` at 1440px and
  390px. It has one title/lang/h1/main, visible skip-link focus, no horizontal
  overflow or console/page errors, local-only requests, and zero axe
  serious/critical findings. Keyboard filtering reaches the empty state and
  clearing the filter restores the one result.
- A clean temporary consumer (`/tmp/flaky-consumer-dbG5io`) installed the packed
  tarball. ESM and CommonJS loads of the root package and `/probe` subpath
  succeeded. Its public clustering API grouped two timing/UUID variants; its
  divergence API returned the changed 503 response.
- On both the locally built site and live origin at 1440px and 390px, a normal
  two-attempt JSON casefile rendered `failed` and `passed` retry evidence,
  including a zero-duration boundary value. Malformed JSON presented the
  recovery guidance and **Restore sample** returned to a working state.
- The prior XSS regression payload containing
  `<img src=x onerror=window.__casefileXss=1>` remained literal text: no image
  node was created and the handler did not execute. This rechecks the core
  trust boundary for a locally selected CI artifact.
- Keyboard-only first Tab exposed a visible skip link with a solid focus
  outline. Under reduced motion, computed scroll behavior was `auto` and the
  tested button transition duration was `0s`.

## Browser, privacy, and deployment evidence

- `npm run audit:site` passed against the exact local build and again against
  production for `/`, `/privacy/`, and `/terms/`, each at desktop 1440px and
  mobile 390px: title, `lang=en`, one h1, one main, image alt attributes, no
  horizontal overflow, no console/page errors, and zero axe serious/critical
  issues.
- A direct browser flow on both viewport sizes recorded only same-origin
  requests before the deliberately induced offline transition. It found no
  normal console/page errors. A fresh production context had an empty
  `document.cookie`, zero localStorage/sessionStorage entries, and the HTTP
  response had no `Set-Cookie`. No analytics, third-party font/script, upload,
  localStorage, or sessionStorage behavior is present in the product code or
  observed viewer flow. Reports are local files; traces/videos remain
  off by default; credential headers and sensitive query parameters are
  redacted; masked PNG pixels are copied rather than the original unmasked
  pixels.
- The generated worker installed, became active/controller, completed
  `registration.update()`, and reloaded the home/viewer successfully after the
  browser context was put offline at both widths. Its generated precache uses
  actual hashed JS/CSS names, never `/style.css`.
- SHA-256 byte comparison matched local `dist/site` and live `/`, `/privacy/`,
  `/terms/`, `/sw.js`, hashed JS/CSS, both WebP files, and the WOFF2 font.
- Live responses provide HSTS, `nosniff`, strict-origin referrer policy,
  restrictive same-origin CSP with `frame-ancestors 'none'`, and a permissions
  policy. Hashed JS/CSS, font, and WebP return
  `Cache-Control: public, max-age=31536000, immutable`; HTML and `sw.js`
  intentionally revalidate after 30 seconds.
- A mobile Lighthouse run against production produced Performance 100,
  Accessibility 100, Best Practices 96, and SEO 100; FCP 0.8 s, LCP 1.1 s,
  TBT 80 ms, and CLS 0. Lighthouse emitted its JSON result then reported a
  Chrome BFCache-gatherer tab crash during shutdown, so the scores/metrics are
  retained as evidence but that command's process exit was not used as a
  pass/fail gate.

## Commands exercised

```sh
npm ci
npm test
npm run typecheck
npx playwright install chromium
npm run build
npm run test:e2e
npm pack --dry-run
npm pack
npm audit --omit=dev --audit-level=high
npm run audit:site
CASEFILE_AUDIT_URL=https://flaky-test-casefile.sociobot.in npm run audit:site
```

No product code was modified during verification.
