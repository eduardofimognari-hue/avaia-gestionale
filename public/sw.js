const CACHE_NAME = 'avaia-cache-v1'
const STATIC_CACHE = 'avaia-static-v1'
const API_CACHE = 'avaia-api-v1'

const STATIC_EXTENSIONS = [
  '.js', '.css', '.png', '.svg', '.ico', '.webmanifest',
  '.woff', '.woff2', '.ttf', '.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/dashboard',
        '/login',
        '/manifest',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/icons/icon-192.svg',
        '/icons/icon-512.svg',
      ])
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== API_CACHE && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

function isStaticAsset(url) {
  return STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext))
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/')
}

function isNavigazione(url) {
  return url.pathname.startsWith('/anagrafiche') ||
         url.pathname.startsWith('/dashboard') ||
         url.pathname.startsWith('/vendite') ||
         url.pathname.startsWith('/listino') ||
         url.pathname.startsWith('/magazzino') ||
         url.pathname.startsWith('/raccolta') ||
         url.pathname.startsWith('/lavoro-soci') ||
         url.pathname.startsWith('/contabilita') ||
         url.pathname.startsWith('/liquidazioni-soci') ||
         url.pathname.startsWith('/documenti') ||
         url.pathname.startsWith('/utenti') ||
         url.pathname === '/' ||
         url.pathname === '/login'
}

// Cache-First per asset statici
async function staticStrategy(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return caches.match('/')
  }
}

// Network-First per API
async function apiStrategy(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(API_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ error: 'Sei offline. I dati verranno aggiornati quando sarai di nuovo connesso.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Network-First per pagine
async function navigationStrategy(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return caches.match('/')
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (event.request.method !== 'GET') return

  if (isStaticAsset(url)) {
    event.respondWith(staticStrategy(event.request))
  } else if (isApiRequest(url)) {
    event.respondWith(apiStrategy(event.request))
  } else if (isNavigazione(url)) {
    event.respondWith(navigationStrategy(event.request))
  }
})
