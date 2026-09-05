// Service worker de "23". Dos cosas:
//  1) Es lo que hace que Chrome ofrezca instalar la aplicacion, como las demas.
//  2) Deja la app utilizable sin cobertura, que estando dentro de una tienda
//     pasa a menudo.
//
// Ojo: las baldosas del mapa son de otro dominio (OpenStreetMap) y NO se
// guardan aqui. Sin conexion el listado y los datos funcionan; el fondo del
// mapa se vera gris, pero los puntos de las tiendas siguen dibujandose.
const CACHE_NAME = 'v23-1';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './vendor/leaflet.css',
  './vendor/leaflet.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Solo lo servido desde aqui. Las baldosas del mapa van directas a la red.
  if (new URL(req.url).origin !== self.location.origin) return;

  // Abrir la app: red primero, para que una version nueva entre sola.
  // Si no hay cobertura, se usa la copia guardada.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copia));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Lo demas (Leaflet, iconos): primero lo guardado, la red de respaldo.
  event.respondWith(
    caches.match(req).then((guardado) => {
      if (guardado) return guardado;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
        }
        return res;
      }).catch(() => guardado);
    })
  );
});
