// Cache only the app shell. /api/* always goes to the network.
const CACHE = "igsave-v1";
const SHELL = ["./", "manifest.webmanifest", "icon.svg"];

self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
));
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || /\/api\/(resolve|download)$/.test(url.pathname)) return;
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request, { ignoreSearch: true }).then(r => r || Response.error())
    )
  );
});
