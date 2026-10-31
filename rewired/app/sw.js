/* Service worker: caches ONLY the app shell. Never caches portal pages, status, or anything cross-origin. */
const VERSION = 'rewired-shell-v1';
const SHELL = ['./', './index.html', './console.html', './app.css', './trace.js', './app.js', './console.js', './config.js',
  './manifest.webmanifest', './manifest-console.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/console-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;   // portal + Google traffic untouched
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request).then(m => m || caches.match('./index.html'))));
});
