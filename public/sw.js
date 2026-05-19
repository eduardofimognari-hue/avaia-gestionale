const CACHE = 'avaia-v2'
const STATIC_CACHE = 'avaia-static-v2'
const API_CACHE = 'avaia-api-v2'

const staticUrls = [
  '/',
  '/dashboard',
  '/login',
  '/anagrafiche',
  '/listino',
  '/vendite',
  '/magazzino',
  '/lavoro-soci',
  '/cassa',
  '/movimenti-soci',
  '/liquidazioni-soci',
  '/debiti',
  '/vendite/nuova',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(staticUrls)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== API_CACHE).map((k) => caches.delete(k))),
      ),
    ]),
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // API calls - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(API_CACHE).then((c) => c.put(request, clone))
          }
          return res
        })
        .catch(() => caches.match(request).then((r) => r || new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } }))),
    )
    return
  }

  // Static pages - cache first, network update
  if (request.method === 'GET') {
    e.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone))
          }
          return res
        }).catch(() => cached)
        return cached || fetchPromise
      }).catch(() => caches.match('/dashboard')),
    )
    return
  }

  e.respondWith(fetch(request).catch(() => new Response('offline', { status: 503 })))
})