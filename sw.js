/* Wisely Arcade service worker v5
   Network-first for HTML navigations (never show a stale page),
   stale-while-revalidate for same-origin CSS/JS/images.
   v5: precaches every page in the sitemap plus the CSS/JS files each
   page names (engines carry ?v= versions), so the whole arcade can be
   played offline after a single online visit. When the connection
   returns, pages load fresh from the network and cached assets refresh
   in the background, so players drift back up to date on their own. */
const CACHE = 'wiselyarcade-v5';
const CORE = ['/css/style.css?v=10', '/js/main.js', '/js/recommend.js',
  '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];
const PAGES = ['/', '/kids', '/teens', '/adults',
  '/games/memory-match', '/games/neon-snake', '/games/tower-stack',
  '/games/daily-sudoku', '/games/daily-word-guess', '/games/nitro-gp',
  '/games/sky-gp', '/games/apex-gp', '/games/forest-dash',
  '/games/2048-merge', '/games/trail-stunts', '/games/bubble-pop',
  '/games/paint-the-rocket', '/games/spot-the-difference',
  '/games/jigsaw-puzzle', '/games/calm-fist-arena',
  '/games/missing-letters', '/games/math-quest', '/games/iq-quest',
  '/games/gk-quest', '/games/minesweeper', '/games/mind-meter',
  '/games/ludo', '/games/chess', '/games/block-bloom',
  '/games/gem-grove-quest', '/games/arrowway-escape',
  '/games/crown-logic', '/games/peak-dash',
  '/about', '/privacy', '/contact', '/terms',
  '/guides/why-puzzle-games-help-kids-brains',
  '/guides/free-online-games-with-100-levels',
  '/guides/free-online-games-that-teach-life-lessons',
  '/guides/minesweeper-online-free'];

async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(CORE.concat(PAGES));
  // Discover the scripts/styles each cached page names, so versioned
  // engine files are stored under the exact URL the page requests.
  const extra = new Set();
  for (const path of PAGES) {
    const res = await cache.match(path);
    if (!res) continue;
    const html = await res.text();
    const re = /(?:src|href)="((?:\.\.\/|\/)?(?:js|css)\/[^"]+)"/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const clean = m[1].replace(/^\.\.\//, '/');
      extra.add(clean.startsWith('/') ? clean : '/' + clean);
    }
  }
  // One bad asset URL must not sink the whole install.
  await Promise.all([...extra].map((u) => cache.add(u).catch(() => {})));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  // HTML pages: always try the network first so visitors see the latest
  // version; fall back to the cache offline, and to the home page if the
  // requested page was never cached.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      }).catch(() => caches.match(request).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  // Assets: serve cache instantly, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
