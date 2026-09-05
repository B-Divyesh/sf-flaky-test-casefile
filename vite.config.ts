import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';

/** Emit a worker after Vite has chosen the fingerprinted asset filenames. */
function casefileServiceWorker(): Plugin {
  return {
    name: 'casefile-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const precache = new Set([
        '/',
        '/demo/',
        '/privacy/',
        '/terms/',
        '/404.html',
        '/casefile-drafting-640.webp',
        '/casefile-drafting.webp',
        '/casefile-og.webp',
        '/favicon.svg',
        '/apple-touch-icon.png',
        '/fonts/space-grotesk-latin.woff2',
      ]);
      for (const [filename, output] of Object.entries(bundle)) {
        const isMainEntry = output.type === 'chunk' && output.code.includes('serviceWorker.register("/sw.js")');
        if (filename.endsWith('.css') || isMainEntry) precache.add(`/${filename}`);
      }
      const assets = JSON.stringify([...precache].sort());
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `const CACHE='casefile-site-v4';
const ASSETS=${assets};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(hit => {
    if (hit) return hit;
    return fetch(event.request).then(response => {
      if (response.ok && new URL(event.request.url).origin === self.location.origin) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => event.request.mode === 'navigate' ? caches.match('/') : Response.error());
  }));
});`,
      });
    },
  };
}

export default defineConfig({
  root: 'site',
  publicDir: 'public',
  build: {
    outDir: '../dist/site',
    emptyOutDir: false,
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'site/index.html'),
        demo: resolve(process.cwd(), 'site/demo/index.html'),
        privacy: resolve(process.cwd(), 'site/privacy/index.html'),
        terms: resolve(process.cwd(), 'site/terms/index.html'),
        notFound: resolve(process.cwd(), 'site/404.html'),
      },
    },
  },
  plugins: [casefileServiceWorker()],
});
