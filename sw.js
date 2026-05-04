/* ═══════════════════════════════════════════════════════════════════
   Sanova — Service Worker
   v3.1.51 — Cache offline + atualização agressiva
   
   IMPORTANTE: Mude a VERSION sempre que subir versão nova do app.
   Isso força o navegador a baixar SW novo, ativar imediatamente, e
   remover cache antigo. Sem isso, paciente vê HTML antigo.
   ═══════════════════════════════════════════════════════════════════ */

const VERSION = 'sanova-v3.1.51';
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
  // Ativa o SW novo IMEDIATAMENTE (não espera abas antigas fecharem)
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
    }).then(function() {
      // Força o SW novo a controlar TODAS as abas abertas (não espera reload)
      return self.clients.claim();
    }).then(function() {
      // Avisa todas as abas abertas que precisam recarregar
      return self.clients.matchAll({ type: 'window' }).then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'SW_UPDATED', version: VERSION });
        });
      });
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  var accept = event.request.headers.get('accept') || '';
  var isHTML = accept.indexOf('text/html') !== -1;

  if (isHTML) {
    // HTML: sempre buscar do servidor primeiro (network-first)
    // Pra garantir que paciente vê versão mais nova logo que sobe atualização
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(VERSION).then(function(cache) { cache.put(event.request, clone); });
        }
        return response;
      }).catch(function() {
        // Sem internet: usa cache
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('./index.html') || caches.match('./');
        });
      })
    );
  } else {
    // Outros assets (imagens, manifest, etc): cache-first é OK
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
