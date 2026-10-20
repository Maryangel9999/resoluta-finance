/* =========================================================
   Resoluta Finance — Service Worker
   Estratégia:
   - Pré-cache dos arquivos essenciais (app shell).
   - Navegação: network-first com fallback para o cache (offline).
   - Estáticos same-origin: stale-while-revalidate.
   - Requisições cross-origin (fontes, VLibras): não são cacheadas.
   ========================================================= */

const CACHE_VERSION = "resoluta-v2";
const CACHE_NAME = `resoluta-finance-${CACHE_VERSION}`;

/* Arquivos essenciais para o app funcionar offline. */
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/script.js",
  "./js/bcrypt.min.js",
  "./icons/favicon-16.png",
  "./icons/favicon-32.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./assets/logo-resoluta.jpeg",
  "./assets/logo-mark.png",
  "./assets/equipe-resoluta.png",
];

/* ---------- Install: pré-cache ---------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Adiciona individualmente para que uma falha não aborte todo o cache.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => null)
        )
      );
      await self.skipWaiting();
    })()
  );
});

/* ---------- Activate: limpa caches antigos ---------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("resoluta-finance-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.disable();
        } catch (_) {}
      }
      await self.clients.claim();
    })()
  );
});

/* ---------- Fetch ---------- */
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Somente GET é tratado.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Ignora esquemas não http(s) e requisições cross-origin (fontes, VLibras, etc.).
  if (url.origin !== self.location.origin) return;

  // Navegação (documentos): network-first com fallback para cache.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          if (preload) return preload;
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put("./index.html", fresh.clone());
          return fresh;
        } catch (_) {
          const cache = await caches.open(CACHE_NAME);
          const cached =
            (await cache.match(request)) ||
            (await cache.match("./index.html")) ||
            (await cache.match("./"));
          return (
            cached ||
            new Response(
              "<h1>Resoluta Finance</h1><p>Você está offline. Reabra o app quando tiver conexão.</p>",
              { headers: { "Content-Type": "text/html; charset=utf-8" } }
            )
          );
        }
      })()
    );
    return;
  }

  // Demais estáticos same-origin: stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);

      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      return cached || (await networkFetch) || Response.error();
    })()
  );
});

/* ---------- Mensagens (ex.: forçar atualização) ---------- */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
