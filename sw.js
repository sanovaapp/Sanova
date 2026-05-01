/* ═══════════════════════════════════════════════════════════════════
   Sanova — Service Worker
   v3.1.19 — Cache offline + atualização automática
   ═══════════════════════════════════════════════════════════════════ */

const VERSION = 'sanova-v3.1.19';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instalar — cachear arquivos essenciais
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(VERSION).then(function(cache) {
      return cache.addAll(ASSETS).catch(function(err) {
        console.warn('[SW] Erro ao cachear alguns arquivos:', err);
        // Não falhar instalação se um asset não existir
      });
    })
  );
  // Ativar imediatamente sem esperar
  self.skipWaiting();
});

// Ativar — limpar caches antigos
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== VERSION;
        }).map(function(key) {
          console.log('[SW] Removendo cache antigo:', key);
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch — estratégia: network-first para HTML (sempre busca atualização),
// cache-first para assets estáticos
self.addEventListener('fetch', function(event) {
  // Apenas requisições GET
  if (event.request.method !== 'GET') return;

  // Apenas mesma origem
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  var isHTML = event.request.headers.get('accept') &&
               event.request.headers.get('accept').indexOf('text/html') !== -1;

  if (isHTML) {
    // Network-first para HTML — sempre tenta buscar versão nova
    event.respondWith(
      fetch(event.request).then(function(response) {
        // Atualizar cache com versão nova
        var responseClone = response.clone();
        caches.open(VERSION).then(function(cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(function() {
        // Offline — usar cache
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
  } else {
    // Cache-first para assets
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            var responseClone = response.clone();
            caches.open(VERSION).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
  }
});

// Mensagens — permite app forçar update do SW
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
