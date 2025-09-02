const CACHE_NAME = "tirta-bening-v1"
const urlsToCache = [
  "/",
  "/dashboard",
  "/pelanggan",
  "/catat-meter",
  "/pelunasan",
  "/pengaturan",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
  // Cache font files
  "/_next/static/media/geist-sans.woff2",
  "/_next/static/media/geist-mono.woff2",
  // Cache CSS files
  "/_next/static/css/app/layout.css",
  "/_next/static/css/app/globals.css",
]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)))
})

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request)
    }),
  )
})
