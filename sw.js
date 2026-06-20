/*
 * James Woodward Lab - service worker.
 *
 * Strategy:
 *   - Precache the app shell (theme/CSS/JS/icons/manifest and the homepage)
 *     on install so the first offline visit works immediately.
 *   - HTML navigation requests use a network-first strategy with a cache
 *     fallback, so deploys propagate quickly while still surviving offline.
 *   - Same-origin static GETs (CSS/JS/SVG/images/fonts) use stale-while-
 *     revalidate: serve instantly from cache, refresh in background.
 *   - Cross-origin requests are never cached (e.g. external quick-link hosts).
 *
 * Bump CACHE_VERSION when any precached asset is meaningfully updated; old
 * caches are cleaned on activate.
 */

const CACHE_VERSION = 'v7';
const SHELL_CACHE = `jwl-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `jwl-runtime-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/css/app-theme.css',
  '/css/style-variants.css',
  '/css/ed-discharge-pack.css',
  '/css/rota-app.css',
  '/js/style-system.js',
  '/js/theme-toggle.js',
  '/js/quick-links.js',
  '/js/app-shell.js',
  '/js/rota-app.js',
  '/ed-discharge-pack/index.html',
  '/rota-app/index.html',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg'
];

/* ------------------------------------------------------------------ */
/* Install: precache the shell. Individual failures don't kill the    */
/* install so a missing optional asset can't brick the worker.        */
/* ------------------------------------------------------------------ */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(APP_SHELL.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res && (res.ok || res.type === 'opaque')) {
          await cache.put(url, res.clone());
        }
      } catch (_) { /* ignore - runtime fetch will repair if possible */ }
    }));
    self.skipWaiting();
  })());
});

/* ------------------------------------------------------------------ */
/* Activate: drop obsolete caches, claim clients immediately.         */
/* ------------------------------------------------------------------ */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => ![SHELL_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

/* ------------------------------------------------------------------ */
/* Fetch routing.                                                      */
/* ------------------------------------------------------------------ */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML / navigations - network-first, cache fallback, then offline shell.
  const isNavigation = req.mode === 'navigate'
    || (req.headers.get('accept') || '').includes('text/html');
  if (isNavigation) {
    event.respondWith(networkFirstHTML(req));
    return;
  }

  // Static same-origin assets - stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(req));
});

async function networkFirstHTML(req) {
  const runtime = await caches.open(RUNTIME_CACHE);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) {
      runtime.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (_) {
    const cached = await runtime.match(req) || await caches.match(req);
    if (cached) return cached;
    // Last-ditch: serve the precached homepage so the user at least sees
    // navigation / branding with a clear offline notice on the page.
    const shell = await caches.match('/') || await caches.match('/index.html');
    if (shell) return shell;
    return new Response(offlineFallbackHTML(), {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

async function staleWhileRevalidate(req) {
  const runtime = await caches.open(RUNTIME_CACHE);
  const cached = await caches.match(req);
  const networkPromise = fetch(req).then((res) => {
    if (res && res.ok) runtime.put(req, res.clone()).catch(() => {});
    return res;
  }).catch(() => null);
  return cached || networkPromise || new Response('', { status: 504 });
}

function offlineFallbackHTML() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <title>Offline - James Woodward Lab</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { font: 16px/1.5 -apple-system, 'Segoe UI', system-ui, sans-serif;
        background: #13293d; color: #e2edf9; padding: 48px 24px; margin: 0; }
      .wrap { max-width: 480px; margin: 0 auto; text-align: center; }
      h1 { font-size: 1.4rem; margin-bottom: 8px; color: #24aacc; }
      p { color: #9eb5c9; }
      a { color: #5dc0da; }
    </style></head><body><div class="wrap">
    <h1>You're offline</h1>
    <p>This page hasn't been cached yet. Reconnect and revisit once and it'll be available offline from then on.</p>
    <p><a href="/">Back to home</a></p>
    </div></body></html>`;
}

/* Allow the page to request an immediate activation after update. */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

