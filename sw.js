// Service worker : met l'application en cache pour qu'elle s'ouvre sans internet.
// Changer VERSION à chaque mise à jour des fichiers pour forcer le rafraîchissement.
const VERSION = 'cockpit-dscg-v1';
const ASSETS = ['./', './css/app.css', './fonts/manrope-latin-ext-wght-normal.woff2', './fonts/manrope-latin-wght-normal.woff2', './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './index.html', './js/app.js', './js/cnam.js', './js/planner.js', './js/programme.js', './js/store.js', './js/timer.js', './js/ui.js', './js/views/errors.js', './js/views/exams.js', './js/views/notes.js', './js/views/planning.js', './js/views/programme.js', './js/views/revisions.js', './js/views/settings.js', './js/views/stats.js', './js/views/today.js', './manifest.webmanifest', './vendor/jspdf.umd.min.js', './vendor/katex.min.js', './vendor/marked.min.js', './vendor/supabase.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase : toujours en direct
  // navigation : la page d'accueil en cache (routes en #ancre)
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return r; }).catch(() => caches.match('./index.html')));
    return;
  }
  // fichiers de l'app : cache d'abord, mise à jour en arrière-plan
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
