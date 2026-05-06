/* ═══════════════════════════════════════════════════════════════════
   Sanova — Service Worker
   v3.1.56 — Cache offline + atualização agressiva
   
   IMPORTANTE: Mude a VERSION sempre que subir versão nova do app.
   Isso força o navegador a baixar SW novo, ativar imediatamente, e
   remover cache antigo. Sem isso, paciente vê HTML antigo.
   ═══════════════════════════════════════════════════════════════════ */

const VERSION = 'sanova-v3.1.58';
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
      return cache.addAll(ASSETS).catch(function(err) {
        console.warn('[SW] Falha ao cachear alguns assets:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Ativando v' + VERSION);
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(key) {
        if (key !== VERSION) {
          console.log('[SW] Removendo cache antigo:', key);
          return caches.delete(key);
        }
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  
  // Network-first para HTML (sempre versão mais nova)
  if (event.request.mode === 'navigate' || 
      (event.request.headers.get('accept') || '').indexOf('text/html') > -1) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(function(resp) {
          var copy = resp.clone();
          caches.open(VERSION).then(function(cache) { cache.put(event.request, copy); });
          return resp;
        })
        .catch(function() {
          return caches.match(event.request).then(function(cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }
  
  // Cache-first para assets
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request);
    })
  );
});
