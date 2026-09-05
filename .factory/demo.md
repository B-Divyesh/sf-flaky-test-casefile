# Demo sandbox

Open [`/demo/`](https://flaky-test-casefile.sociobot.in/demo/) or use the landing-page **Try it with sample data** action.

The demo starts with a seeded checkout failure:

- Three retries: two `timedOut` attempts and one `passed` attempt.
- A first network divergence: `200 → 503` for `POST /api/payment`.
- The same casefile shape produced by the reporter’s shipped sample tests.

The banner stays visible while demo mode is active: **Demo — sample data, nothing is saved**. Demo mode creates only `localStorage` keys beginning with `demo:flaky-test-casefile:`. Selected JSON files are read in memory and are not stored.

Use **Reset demo** to clear that namespace and restore the seeded casefile. Use **Start for real** to clear the namespace and return to the normal local viewer. The normal viewer neither reads nor writes demo storage.

The service worker precaches the sample route and public assets. After the first visit, the demo can reload while offline.
