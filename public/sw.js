// Service worker do Planejador de Marmitas.
// Estratégia:
//  - Navegações (HTML): network-first → online sempre traz a versão nova;
//    offline cai no cache (app abre sem sinal).
//  - Estáticos do Next e ícones: stale-while-revalidate (rápido + atualiza).
//  - GET do Supabase REST: stale-while-revalidate → a última lista aberta
//    (Semana/Refeição) fica disponível offline. Nunca cacheia POST/PUT/DELETE.
// Auto-atualização: skipWaiting + clients.claim aplicam o SW novo na hora.

const VERSION = "v1";
const STATIC_CACHE = `static-${VERSION}`;
const PAGES_CACHE = `pages-${VERSION}`;
const DATA_CACHE = `data-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, PAGES_CACHE, DATA_CACHE].includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Permite que a página peça a ativação imediata do SW novo.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isSupabaseRest(url) {
  return url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/");
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Fallback: qualquer página em cache, para o app abrir offline.
    const anyPage = await cache.match("/inicio");
    if (anyPage) return anyPage;
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Dados do Supabase (leitura): SWR → última lista disponível offline.
  if (isSupabaseRest(url)) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
    return;
  }

  // Só tratamos o mesmo domínio daqui pra frente.
  if (url.origin !== self.location.origin) return;

  // Estáticos do Next, ícones, manifest: SWR.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Navegações/documentos: network-first (online = sempre atualizado).
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGES_CACHE));
    return;
  }
});
