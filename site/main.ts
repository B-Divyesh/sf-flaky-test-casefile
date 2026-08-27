type DemoData = { id?: string; title?: string; symptom?: string; attempts?: Array<{ retry: number; status: string; durationMs: number }>; divergence?: { index?: number; expected?: { status?: number; method?: string; url?: string }; actual?: { status?: number; method?: string; url?: string } }; count?: number };

const sample: DemoData = { id: 'FC-7K2M9Q', title: 'Checkout submit waits forever', symptom: 'Network', count: 2, attempts: [{ retry: 0, status: 'timedOut', durationMs: 30000 }, { retry: 1, status: 'timedOut', durationMs: 30000 }, { retry: 2, status: 'passed', durationMs: 1840 }], divergence: { index: 6, expected: { status: 200, method: 'POST', url: '/api/payment' }, actual: { status: 503, method: 'POST', url: '/api/payment' } } };

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const eventLabel = (event?: { status?: number; method?: string; url?: string }) => event ? [event.status, event.method, event.url].filter((value) => value !== undefined).join(' · ') : 'No matching event';

function attemptBlock(attempt: { retry: number; status: string; durationMs: number }) {
  const block = document.createElement('div');
  block.className = `attempt-block${attempt.status === 'passed' ? ' passed' : ''}`;
  const retry = document.createElement('strong');
  retry.textContent = `Retry ${attempt.retry}`;
  block.append(retry, document.createTextNode(`${attempt.status} / ${attempt.durationMs} ms`));
  return block;
}

function render(value: DemoData) {
  byId('case-id').textContent = value.id ?? 'UNCLUSTERED';
  byId('case-title').textContent = value.title ?? 'Untitled test';
  byId('symptom').textContent = (value.symptom ?? 'Runtime').toUpperCase();
  byId('occurrences').textContent = `${value.count ?? value.attempts?.length ?? 0} OCCURRENCES`;
  byId('event-number').textContent = String((value.divergence?.index ?? 0) + 1).padStart(2, '0');
  byId('baseline-event').textContent = eventLabel(value.divergence?.expected);
  byId('failed-event').textContent = eventLabel(value.divergence?.actual);
  byId('attempt-ruler').replaceChildren(...(value.attempts ?? []).map(attemptBlock));
}

function firstCluster(json: any): DemoData {
  const cluster = json.clusters?.[0];
  if (!cluster || !Array.isArray(json.attempts)) throw new Error('No failure clusters were found in this casefile.');
  const attempts = cluster.attempts.map((id: string) => json.attempts.find((attempt: any) => attempt.id === id)).filter(Boolean);
  const divergence = attempts.find((attempt: any) => attempt.divergence)?.divergence;
  return { id: cluster.id, title: attempts[0]?.title, symptom: cluster.symptom, count: cluster.count, attempts, divergence };
}

byId<HTMLInputElement>('casefile-input').addEventListener('change', async (event) => {
  const file = (event.currentTarget as HTMLInputElement).files?.[0];
  if (!file) return;
  const status = byId('file-status'); status.textContent = `Reading ${file.name}…`;
  try { render(firstCluster(JSON.parse(await file.text()))); status.textContent = `Showing ${file.name}. Kept in this browser only.`; }
  catch (error) { status.textContent = `${error instanceof Error ? error.message : 'That file could not be read.'} Choose a generated casefile.json.`; }
});
byId('restore-sample').addEventListener('click', () => { render(sample); byId('file-status').textContent = 'Showing the built-in sample.'; byId<HTMLInputElement>('casefile-input').value = ''; });
byId('copy-code').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(byId('install-code').textContent ?? ''); byId('copy-code').textContent = 'Copied'; byId('copy-status').textContent = 'Configuration copied to clipboard.'; window.setTimeout(() => { byId('copy-code').textContent = 'Copy'; }, 1800); }
  catch { byId('copy-status').textContent = 'Clipboard access was blocked. Select and copy the configuration manually.'; }
});
render(sample);
const canRegisterServiceWorker = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && canRegisterServiceWorker) navigator.serviceWorker.register('/sw.js').catch(() => undefined);
