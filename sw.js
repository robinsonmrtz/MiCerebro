// ==========================================
// SERVICE WORKER: sw.js
// MiCerebro — Cache offline básico
// ==========================================

const CACHE_NAME = 'micerebro-v1';

// Archivos que se guardan offline
const ARCHIVOS_CACHE = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/trabajo.css',
    '/css/habitos.css',
    '/js/core/storage.js',
    '/js/core/app.js',
    '/js/modulos/temporizador.js',
    '/js/modulos/metricas.js',
    '/js/modulos/habitos.js',
    '/vistas/inicio.html',
    '/vistas/trabajo.html',
    '/vistas/habitos.html',
    '/vistas/backup.html',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Instalación: guarda todos los archivos en cache
self.addEventListener('install', evento => {
    evento.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ARCHIVOS_CACHE))
    );
    self.skipWaiting();
});

// Activación: limpia caches viejos si cambiaste CACHE_NAME
self.addEventListener('activate', evento => {
    evento.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: sirve desde cache, si no hay va a la red
self.addEventListener('fetch', evento => {
    evento.respondWith(
        caches.match(evento.request)
            .then(respuesta => respuesta || fetch(evento.request))
            .catch(() => {
                // Si no hay conexión y no está en cache, devolver página de inicio como fallback
                return caches.match('/vistas/inicio.html') || 
                       new Response('Offline - No hay conexión disponible', { status: 503 });
            })
    );
});
