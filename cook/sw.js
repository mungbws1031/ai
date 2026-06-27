/* 전자혀 서비스워커 — 오프라인 + 빠른 로딩 */
const CACHE = "jeonjahyeo-v1";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // HTML(화면)은 네트워크 우선 → 항상 최신, 오프라인이면 캐시
  if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html")) {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // 그 외(아이콘·폰트 등)는 캐시 우선
  e.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => { try { c.put(req, copy); } catch (_) {} });
        return res;
      })
    )
  );
});
