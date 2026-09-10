/*
 * CodeFlow service worker.
 *
 * - Navigations: network-first, falling back to the cached app shell offline.
 * - Hashed build assets (/_next/static): cache-first — they never change.
 * - Everything else same-origin: stale-while-revalidate.
 *
 * Bump VERSION to invalidate old caches after a deploy.
 */
const VERSION = 'v2'
const SHELL_CACHE = `codeflow-shell-${VERSION}`
const RUNTIME_CACHE = `codeflow-runtime-${VERSION}`

const PRECACHE = [
  '/',
  '/practice',
  '/dsa-worker.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE)
  // Cache each page under its own path (ignoring #hash / ?query), so visiting
  // /practice never replaces the cached visualizer at /.
  const url = new URL(request.url)
  const key = url.origin + url.pathname
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(key, response.clone())
    return response
  } catch {
    return (await cache.match(key)) || (await cache.match('/')) || Response.error()
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const hit = await cache.match(request)
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const hit = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => hit)
  return hit || network
}
