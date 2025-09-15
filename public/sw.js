// /public/sw.js  (versi aman)
const CACHE = "tb-v6"; // ganti versi tiap update

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
  // Hanya asset publik yang stabil. JANGAN _next/static yang ber-hash.
];

const PROTECTED = [
  "/dashboard",
  "/pelanggan",
  "/catat-meter",
  "/jadwal-pencatatan",
  "/pelunasan",
  "/tagihan-pembayaran",
  "/reset-meter",
  "/biaya",
  "/pengaturan",
  "/warga-dashboard",
];

self.addEventListener("install", (event) => {
  console.log("SW install", CACHE);
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC_ASSETS)));
});

self.addEventListener("activate", (event) => {
  console.log("SW activate", CACHE);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Hanya tangani GET, same-origin
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // 1) NAVIGASI HALAMAN → NETWORK-FIRST
  if (req.mode === "navigate") {
    // Jangan pernah serve cache untuk halaman protected
    if (PROTECTED.some((p) => url.pathname.startsWith(p))) {
      // biarkan ke network (jangan event.respondWith agar default network)
      return;
    }
    event.respondWith(
      fetch(req).catch(() => caches.match("/")) // offline fallback ke /
    );
    return;
  }

  // 2) STATIC ASSETS → CACHE-FIRST (put jika OK)
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    /\.(css|js|png|jpe?g|svg|ico|webp|avif|woff2?)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const resp = await fetch(req);
        if (resp.ok) cache.put(req, resp.clone());
        return resp;
      })
    );
  }
});
