/* Agência A2 Click: service worker
   Páginas: busca na rede primeiro; sem internet, usa a cópia guardada ou a página offline.
   Demais arquivos: entrega a cópia guardada na hora e atualiza em segundo plano
   (stale-while-revalidate). VERSAO e GUARDAR são atualizados por tools/build.py. */
const VERSAO = 'a2-4707f15031';
const GUARDAR = [
  '/',
  '/quem-somos',
  '/offline',
  '/assets/js/main.63b51bd4.js',
  '/assets/fonts/stretch-pro-latin.woff2',
  '/assets/fonts/bricolage-grotesque-latin.woff2',
  '/assets/img/logo/a2click-horizontal-negativo.svg',
  '/assets/img/favicon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(GUARDAR)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // WhatsApp, Instagram etc. não passam por aqui
  if (url.pathname.startsWith('/portfolio/')) return;   // sites de clientes: sempre da rede

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(VERSAO).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/offline')))
    );
    return;
  }

  e.respondWith(
    caches.open(VERSAO).then((c) =>
      c.match(req).then((guardado) => {
        const daRede = fetch(req)
          .then((res) => {
            if (res.ok) c.put(req, res.clone());
            return res;
          })
          .catch(() => guardado);
        return guardado || daRede;
      })
    )
  );
});
