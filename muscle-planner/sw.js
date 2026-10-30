// Muscle Planner service worker — offline app shell cache
const CACHE = "muscle-planner-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./body-front.webp",
  "./body-back.webp",
  "./goals/shoulder.webp",
  "./goals/chest.webp",
  "./goals/arms.webp",
  "./goals/glutes.webp",
  "./goals/legs.webp",
  "./goals/core.webp",
  "./goals/posture.webp",
  "./goals/balance.webp",
  "./frames/arm-0.webp",
  "./frames/arm-90.webp",
  "./frames/arm-150.webp",
  "./frames/arm-180.webp",
  "./frames/neck-0.webp",
  "./frames/neck-15.webp",
  "./frames/neck-30.webp",
  "./frames/neck-45.webp",
  "./frames/neck-60.webp"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// cache-first for app shell, fall back to network, then cache
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
