import { init, onSync, sync, state, loadLocal } from './store.js';
import { today, diffDays, dueReviews, dueCards } from './planner.js';
import { renderTimer } from './timer.js';
import { esc } from './ui.js';
import * as Today from './views/today.js';
import * as Programme from './views/programme.js';
import * as Planning from './views/planning.js';
import * as Revisions from './views/revisions.js';
import * as Notes from './views/notes.js';
import * as Exams from './views/exams.js';
import * as Errors from './views/errors.js';
import * as Stats from './views/stats.js';
import * as Settings from './views/settings.js';

const ROUTES = {
  aujourdhui: ['Aujourd\'hui', Today], programme: ['Programme', Programme], planning: ['Planning', Planning],
  revisions: ['Révisions', Revisions], notes: ['Notes', Notes], examens: ['Examens blancs', Exams],
  erreurs: ['Erreurs', Errors], stats: ['Statistiques', Stats], reglages: ['Réglages', Settings],
};
const main = document.getElementById('main');

function route() { const h = (location.hash || '').slice(1); return ROUTES[h] ? h : 'aujourdhui'; }

function renderNav() {
  const r = route(); const t = today();
  const due = dueReviews(t).length + dueCards(t).length;
  document.getElementById('nav').innerHTML = Object.entries(ROUTES).map(([k, [label]]) =>
    `<a href="#${k}" class="${k === r ? 'on' : ''}" ${k === r ? 'aria-current="page"' : ''}>${esc(label)}${k === 'revisions' && due ? `<span class="badge num">${due}</span>` : ''}</a>`).join('');
  const s = state.settings;
  document.getElementById('countdown').innerHTML = `<b class="num">J-${Math.max(0, diffDays(t, s.examDate))}</b><span>épreuves</span>`;
}

function renderSync() {
  const el = document.getElementById('sync');
  el.className = 'sync ' + sync.status;
  el.title = sync.message;
  el.innerHTML = `<i></i><span>${sync.mode !== 'cloud' ? 'Local uniquement' : sync.status === 'saving' ? 'Synchronisation…' : sync.status === 'offline' ? 'Hors ligne' : sync.status === 'error' ? 'Erreur de synchro' : 'Synchronisé'}</span>`;
}

function render() {
  const r = route();
  renderNav();
  try { ROUTES[r][1].render(main); }
  catch (e) { console.error(e); main.innerHTML = `<div class="card"><h2>Oups</h2><p class="muted">Cette vue a rencontré une erreur : ${esc(e.message)}</p></div>`; }
  document.title = `${ROUTES[r][0]} · Cockpit DSCG 2027`;
}

window.addEventListener('hashchange', () => { render(); main.scrollTop = 0; window.scrollTo(0, 0); document.getElementById('shell').classList.remove('navopen'); });
window.addEventListener('refresh', () => { if (route() === 'notes' && document.activeElement?.id === 'md') return; render(); });
document.getElementById('burger').onclick = () => document.getElementById('shell').classList.toggle('navopen');

onSync(renderSync);
renderSync();
loadLocal();
render();
renderTimer();
init().then(() => { if (!document.querySelector('#modal:not([hidden])')) render(); renderTimer(); });
// changement de jour sans rechargement
let lastDay = today();
setInterval(() => { if (today() !== lastDay) { lastDay = today(); render(); } }, 60000);
// libellés de colonnes pour les tableaux empilés sur mobile
new MutationObserver(() => {
  for (const c of document.querySelectorAll('table.stack td:not([data-l])')) {
    let i = 0, p = c; while ((p = p.previousElementSibling)) i += p.colSpan;
    c.dataset.l = c.closest('table').rows[0].cells[i]?.textContent || '';
  }
}).observe(document.body, { childList: true, subtree: true });

// application installable + hors ligne
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW', e)));
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded || !navigator.serviceWorker.controller) return; reloaded = true; location.reload(); });
}
