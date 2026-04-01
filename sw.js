// Sanova Service Worker v1.5
const CACHE = 'sanova-v1.5';
const SHELL = [
  '/sanova/',
  '/sanova/index.html'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(cache){
      return cache.addAll(SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// NETWORK-FIRST — sempre busca versão nova, usa cache só offline
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  
  // Nunca cachear chamadas de API
  if(e.request.url.includes('googleapis.com') || 
     e.request.url.includes('generativelanguage')) return;

  e.respondWith(
    fetch(e.request).then(function(res){
      if(res && res.status === 200){
        var clone = res.clone();
        caches.open(CACHE).then(function(cache){ 
          cache.put(e.request, clone); 
        });
      }
      return res;
    }).catch(function(){
      return caches.match(e.request);
    })
  );
});
