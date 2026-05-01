/* ═══════════════════════════════════════════════════════════════════
   Sanova — Service Worker
   v3.1.20 — Cache offline + atualização automática
   ═══════════════════════════════════════════════════════════════════ */

const VERSION = 'sanova-v3.1.20';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event) {
  console.log('[SW] Instalando v' + VERSION);
  event.waitUntil(
    caches.open(VERSION).then(function(cache) {
      return Promise.all(
        ASSETS.map(function(asset) {
          return cache.add(asset).catch(function(err) {
            console.warn('[SW] Falha ao cachear', asset, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Ativando v' + VERSION);
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== VERSION; })
            .map(function(key) {
              console.log('[SW] Removendo cache antigo:', key);
              return caches.delete(key);
            })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  var accept = event.request.headers.get('accept') || '';
  var isHTML = accept.indexOf('text/html') !== -1;

  if (isHTML) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(VERSION).then(function(cache) { cache.put(event.request, clone); });
        }
        return response;
      }).catch(function() {
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('./index.html') || caches.match('./');
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(VERSION).then(function(cache) { cache.put(event.request, clone); });
          }
          return response;
        }).catch(function() { return caches.match(event.request); });
      })
    );
  }
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
