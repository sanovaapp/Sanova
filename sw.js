/* Sanova — Service Worker v1.5 */
var CACHE = 'sanova-v1.5';
var ASSETS = [
  '/sanova/',
  '/sanova/index.html',
  '/sanova/manifest.json'
];

/* Instala e faz cache dos assets principais */
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); })
  );
  self.skipWaiting();
});

/* Remove caches antigos */
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

/* Estratégia: network first, cache como fallback */
self.addEventListener('fetch', function(e){
  /* Não intercepta chamadas de IA (proxy Manus) */
  if(e.request.url.indexOf('manus.space') >= 0) return;
  if(e.request.url.indexOf('generativelanguage') >= 0) return;

  e.respondWith(
    fetch(e.request)
      .then(function(resp){
        /* Atualiza cache com versão nova */
        var clone = resp.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
        return resp;
      })
      .catch(function(){
        /* Sem rede — usa cache */
        return caches.match(e.request);
      })
  );
});
