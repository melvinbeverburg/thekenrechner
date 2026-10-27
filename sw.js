/* Service Worker für Theke: sofort aus dem Cache starten, im Hintergrund aktualisieren.
   Bei einer neuen App-Version die Zahl hier erhöhen (v1.4 -> v1.5), damit alte Caches verschwinden. */
const CACHE = 'theke-v1.4';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = (await cache.match(req, {ignoreSearch: true})) ||
                (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
    const net = fetch(new Request(req.url, {cache: 'no-cache'})).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || Response.error();
  }));
});
