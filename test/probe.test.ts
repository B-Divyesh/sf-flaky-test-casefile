import { describe, expect, it } from 'vitest';
import { createCasefileProbe, redactHeaderRecord } from '../src/probe.js';

class FakePage {
  handlers = new Map<string, Set<(...args: any[]) => void>>();
  on(name: string, handler: (...args: any[]) => void) { const values = this.handlers.get(name) ?? new Set(); values.add(handler); this.handlers.set(name, values); }
  off(name: string, handler: (...args: any[]) => void) { this.handlers.get(name)?.delete(handler); }
  emit(name: string, value: unknown) { for (const handler of this.handlers.get(name) ?? []) handler(value); }
  async evaluate<T>(_callback: () => T): Promise<T> { return { title: 'Checkout', url: 'https://app.test/pay?token=secret', landmarks: ['h1:::Pay'], bodyText: 'Pay now' } as T; }
}

describe('page probe', () => {
  it('captures ordered evidence, sanitizes URLs and detaches listeners', async () => {
    const page = new FakePage();
    const probe = createCasefileProbe(page, { captureRequestHeaders: true });
    page.emit('request', { method: () => 'POST', url: () => 'https://app.test/api?token=secret', allHeaders: async () => ({ authorization: 'Bearer secret', accept: 'json' }) });
    page.emit('response', { status: () => 503, url: () => 'https://app.test/api' });
    await probe.mark('result');
    const result = await probe.stop();
    expect(result.events).toHaveLength(3);
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(JSON.stringify(result)).toContain('[REDACTED]');
    expect([...page.handlers.values()].every((set) => set.size === 0)).toBe(true);
  });

  it('matches header names without case sensitivity', () => {
    expect(redactHeaderRecord({ Authorization: 'Bearer x', accept: 'json' }, ['authorization'])).toEqual({ Authorization: '[REDACTED]', accept: 'json' });
  });
});
