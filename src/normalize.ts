import type { CasefileAttempt, CasefileCluster, ProbeEvent } from './types.js';

const TIME = /\b\d+(?:\.\d+)?\s*(?:ms|s|seconds?|minutes?)\b/gi;
const ISO_TIME = /\b\d{4}-\d\d-\d\d[T ][\d:.+-]+Z?\b/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi;
const HEX = /\b(?:0x)?[0-9a-f]{12,}\b/gi;
const PORT = /(https?:\/\/[^/:\s]+):\d+/gi;
const QUERY_NOISE = /([?&](?:_?t|timestamp|cacheBust|nonce|requestId)=)[^&#\s)]+/gi;

export function normalizeFailure(input: string): string {
  return input
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(ISO_TIME, '<time>')
    .replace(TIME, '<duration>')
    .replace(UUID, '<id>')
    .replace(HEX, '<id>')
    .replace(PORT, '$1:<port>')
    .replace(QUERY_NOISE, '$1<value>')
    .replace(/(?:[A-Za-z]:)?\/[\w./-]+\/node_modules\//g, 'node_modules/')
    .replace(/:\d+:\d+(?=[)\s]|$)/gm, ':<line>:<col>')
    .replace(/\bretry\s*#?\d+\b/gi, 'retry <n>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);
}

export function symptomFor(input: string): string {
  const text = input.toLowerCase();
  if (/timeout|timed out|exceeded/.test(text)) return 'Timeout';
  if (/expect\(|assert|expected|received/.test(text)) return 'Assertion';
  if (/net::|econn|request|response|http \d|fetch/.test(text)) return 'Network';
  if (/locator|selector|strict mode|element/.test(text)) return 'Locator';
  if (/page crashed|browser.*closed|target closed/.test(text)) return 'Browser';
  return 'Runtime';
}

export function fingerprint(input: string): string {
  let hash = 2166136261;
  for (const character of input) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) ?? []);
}

function similarity(left: string, right: string): number {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size && !b.size) return 1;
  let shared = 0;
  for (const value of a) if (b.has(value)) shared += 1;
  return shared / Math.max(a.size, b.size);
}

export function clusterAttempts(attempts: CasefileAttempt[]): CasefileCluster[] {
  const clusters: CasefileCluster[] = [];
  for (const attempt of attempts.filter((item) => item.status !== 'passed' && item.status !== 'skipped')) {
    const source = attempt.errors.join('\n') || attempt.stderr.join('\n') || attempt.status;
    const signature = normalizeFailure(source);
    const symptom = symptomFor(signature);
    let cluster = clusters.find((candidate) => candidate.symptom === symptom && similarity(candidate.signature, signature) >= 0.68);
    if (!cluster) {
      cluster = { id: `FC-${fingerprint(`${symptom}:${signature}`)}`, symptom, signature, count: 0, tests: [], attempts: [] };
      clusters.push(cluster);
    }
    cluster.count += 1;
    if (!cluster.tests.includes(attempt.testId)) cluster.tests.push(attempt.testId);
    cluster.attempts.push(attempt.id);
    attempt.signature = signature;
    attempt.symptom = symptom;
    attempt.clusterId = cluster.id;
  }
  return clusters.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

function stableEvent(event: ProbeEvent | undefined): string {
  if (!event) return '<missing>';
  const stableUrl = event.url?.replace(QUERY_NOISE, '$1<value>');
  return JSON.stringify({ kind: event.kind, label: event.label, method: event.method, url: stableUrl, status: event.status, level: event.level, message: event.message && normalizeFailure(event.message), dom: event.dom });
}

export function firstDivergence(expected: ProbeEvent[], actual: ProbeEvent[]): CasefileAttempt['divergence'] {
  const length = Math.max(expected.length, actual.length);
  for (let index = 0; index < length; index += 1) {
    if (stableEvent(expected[index]) !== stableEvent(actual[index])) {
      const want = expected[index];
      const got = actual[index];
      const label = got?.label ?? want?.label ?? got?.url ?? want?.url ?? `event ${index + 1}`;
      return { index, expected: want, actual: got, summary: `First divergence at ${label}: ${want?.kind ?? 'nothing'} → ${got?.kind ?? 'nothing'}` };
    }
  }
  return undefined;
}
