import { describe, expect, it } from 'vitest';
import { clusterAttempts, firstDivergence, normalizeFailure } from '../src/normalize.js';
import type { CasefileAttempt, ProbeEvent } from '../src/types.js';

const attempt = (id: string, error: string): CasefileAttempt => ({
  id, testId: `test-${id}`, title: 'checkout', path: ['checkout'], project: 'chromium', retry: 0,
  status: 'failed', expectedStatus: 'passed', durationMs: 30_000, errors: [error], stdout: [], stderr: [], events: [], attachments: [],
});

describe('failure signatures', () => {
  it('removes retry timing, UUID, port, and source-line noise', () => {
    const one = 'Timeout 30000ms exceeded at http://localhost:4173/pay?timestamp=1991 id 14b2c1c0-9240-4b1e-a19a-e3e12003e744 (/app/test.ts:42:9) retry #1';
    const two = 'Timeout 45000ms exceeded at http://localhost:8080/pay?timestamp=8831 id 1e94a7de-26d5-4111-9871-23547985c488 (/app/test.ts:88:12) retry #2';
    expect(normalizeFailure(one)).toBe(normalizeFailure(two));
  });

  it('clusters at least four of five seeded variants and separates a locator failure', () => {
    const failures = [
      'Timeout 30000ms exceeded while POST /api/payment request 0d88a798-a7a8-4a86-a116-5db368498521',
      'Timeout 45000ms exceeded while POST /api/payment request f955457a-1ee5-43ce-8712-f608596a728f',
      'Timed out after 30 seconds while POST /api/payment request 729276fe-a343-489f-bd07-1a38525a1ea0',
      'Timeout 31s exceeded while POST /api/payment request 80cd76a1-9307-4d63-84df-1200b0c66663',
      'Timeout 29.4s exceeded while POST /api/payment request 9847879a-a134-4843-9f05-32158ab9f444',
      'locator.click: strict mode violation: button matched 2 elements',
    ].map((error, index) => attempt(String(index), error));
    const clusters = clusterAttempts(failures);
    expect(Math.max(...clusters.map((cluster) => cluster.count))).toBeGreaterThanOrEqual(4);
    expect(clusters.some((cluster) => cluster.symptom === 'Locator')).toBe(true);
  });
});

describe('event comparison', () => {
  it('points to the first stable divergence and ignores cache-busting query values', () => {
    const baseline: ProbeEvent[] = [
      { kind: 'request', at: 4, method: 'GET', url: 'https://app.test/api/cart?timestamp=1' },
      { kind: 'response', at: 20, status: 200, url: 'https://app.test/api/cart' },
    ];
    const retry: ProbeEvent[] = [
      { kind: 'request', at: 90, method: 'GET', url: 'https://app.test/api/cart?timestamp=99' },
      { kind: 'response', at: 110, status: 503, url: 'https://app.test/api/cart' },
    ];
    expect(firstDivergence(baseline, retry)).toMatchObject({ index: 1, expected: { status: 200 }, actual: { status: 503 } });
  });
});
