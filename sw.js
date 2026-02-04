self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('daily-store').then((cache) => cache.addAll([
      '/',
      '/index.html',
    ]))
  );
});

self.addEventListener('fetch', (e) => {
  // Stratégie : Network First (on essaie d'avoir le contenu frais, sinon le cache)
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});