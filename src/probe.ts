import { createHash } from 'node:crypto';
import type { ProbeEvent, ProbeEvidence } from './types.js';

type Handler = (...args: any[]) => void;
export type PageLike = {
  on(event: string, handler: Handler): unknown;
  off(event: string, handler: Handler): unknown;
  evaluate<T>(callback: () => T): Promise<T>;
};

type ProbeOptions = { redactHeaders?: string[]; captureRequestHeaders?: boolean };

function cleanUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const name of ['token', 'access_token', 'key', 'api_key', 'signature']) if (url.searchParams.has(name)) url.searchParams.set(name, '[REDACTED]');
    return url.toString();
  } catch { return value; }
}

export function redactHeaderRecord(headers: Record<string, string>, names: string[]): Record<string, string> {
  const blocked = new Set(names.map((name) => name.toLowerCase()));
  return Object.fromEntries(Object.entries(headers).map(([name, value]) => [name, blocked.has(name.toLowerCase()) ? '[REDACTED]' : value]));
}

export function createCasefileProbe(page: PageLike, options: ProbeOptions = {}) {
  const started = Date.now();
  const events: ProbeEvent[] = [];
  const pending = new Set<Promise<void>>();
  const redactions = options.redactHeaders ?? ['authorization', 'cookie', 'set-cookie', 'x-api-key'];
  const add = (event: Omit<ProbeEvent, 'at'>): void => { events.push({ ...event, at: Date.now() - started }); };

  const request: Handler = (value) => {
    const base = { kind: 'request' as const, method: value.method?.(), url: cleanUrl(value.url?.() ?? '') };
    if (!options.captureRequestHeaders || typeof value.allHeaders !== 'function') return add(base);
    const job = Promise.resolve(value.allHeaders()).then((headers) => add({ ...base, headers: redactHeaderRecord(headers, redactions) })).catch(() => add(base)).finally(() => pending.delete(job));
    pending.add(job);
  };
  const response: Handler = (value) => add({ kind: 'response', status: value.status?.(), url: cleanUrl(value.url?.() ?? '') });
  const consoleEvent: Handler = (value) => {
    const level = value.type?.() ?? 'log';
    if (level === 'error' || level === 'warning') add({ kind: 'console', level, message: String(value.text?.() ?? value) });
  };
  const pageerror: Handler = (value) => add({ kind: 'pageerror', message: String(value?.message ?? value) });
  const handlers: Array<[string, Handler]> = [['request', request], ['response', response], ['console', consoleEvent], ['pageerror', pageerror]];
  for (const [name, handler] of handlers) page.on(name, handler);

  return {
    async mark(label: string): Promise<void> {
      const snapshot = await page.evaluate(() => {
        const bodyText = document.body?.innerText.replace(/\s+/g, ' ').trim().slice(0, 20_000) ?? '';
        const landmarks = Array.from(document.querySelectorAll('h1,h2,[role="alert"],[data-testid]')).slice(0, 40).map((node) => {
          const element = node as HTMLElement;
          return `${element.tagName.toLowerCase()}:${element.getAttribute('role') ?? ''}:${element.getAttribute('data-testid') ?? ''}:${element.innerText?.replace(/\s+/g, ' ').trim().slice(0, 120) ?? ''}`;
        });
        return { title: document.title, url: location.href, landmarks, bodyText };
      });
      add({ kind: 'dom', label, dom: { title: snapshot.title, url: cleanUrl(snapshot.url), landmarks: snapshot.landmarks, textHash: createHash('sha256').update(snapshot.bodyText).digest('hex').slice(0, 16) } });
    },
    async stop(): Promise<ProbeEvidence> {
      for (const [name, handler] of handlers) page.off(name, handler);
      await Promise.allSettled([...pending]);
      return { schema: 1, startedAt: new Date(started).toISOString(), events: [...events].sort((a, b) => a.at - b.at) };
    },
  };
}
