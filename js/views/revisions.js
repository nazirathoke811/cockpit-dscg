import { UES, TOPIC_BY_ID } from '../programme.js';
import { state, saveCards, uid, uiGet, uiSet } from '../store.js';
import { today, dueReviews, dueCards, fmtDate, nextReview, INTERVALS, addDays } from '../planner.js';
import { esc, renderMd, modal, toast, confirmBox, opt } from '../ui.js';
import { topicOptions } from '../timer.js';
import { reviewModal } from './today.js';

let session = null; // file de cartes en cours

export function render(root) {
  const t = today();
  const reviews = dueReviews(t);
  const ueF = uiGet('cardUE', '');
  const topF = uiGet('cardTopic', '');
  const all = Object.values(state.cards).flat();
  const list = all.filter(c => (!ueF || c.ue === ueF) && (!topF || c.topicId === topF));
  const due = list.filter(c => !c.due || c.due <= t);
  const upcoming = {};
  for (let i = 1; i <= 7; i++) { const k = addDays(t, i); upcoming[k] = all.filter(c => c.due === k).length + Object.values(state.progress).filter(p => p.review && p.review.due === k).length; }

  if (session && session.queue.length) return renderStudy(root);

  root.innerHTML = `
  <section class="pagehead">
    <h1>${reviews.length + due.length ? `${reviews.length} thème${reviews.length > 1 ? 's' : ''} et ${due.length} carte${due.length > 1 ? 's' : ''} à revoir` : 'Tout est à jour'}</h1>
    <p class="lead">Intervalles fixes : J+${INTERVALS.join(', J+')}. Maîtrise ≤ 2 ou « À revoir » : retour à J+1.</p>
  </section>
  <div class="cols">
    <div class="col">
      <article class="card">
        <header><h2>Thèmes à réviser</h2></header>
        ${reviews.length ? `<ul class="list">${reviews.map(({ t: tp, p }) => `<li><span class="dot ${tp.ue}"></span><span class="grow">${esc(tp.num)} ${esc(tp.title)}<span class="muted small"> · palier J+${INTERVALS[p.review.i]} · ${p.review.due < t ? 'en retard' : 'aujourd\'hui'}</span></span><button class="btn sm" data-rev="${tp.id}">Réviser</button></li>`).join('')}</ul>` : '<p class="muted">Aucun thème dû.</p>'}
      </article>
      <article class="card">
        <header><h2>7 prochains jours</h2></header>
        <div class="spark">${Object.entries(upcoming).map(([k, n]) => `<div><i style="height:${Math.min(100, n * 8)}%"></i><span class="small muted">${Number(k.slice(8))}</span><span class="small num">${n}</span></div>`).join('')}</div>
      </article>
    </div>
    <div class="col">
      <article class="card">
        <header><h2>Flashcards</h2><button class="btn sm primary" id="newCard">Nouvelle carte</button></header>
        <div class="row wrap">
          <select id="fUE">${opt('', 'Toutes les UE', ueF)}${UES.map(u => opt(u.id, u.code + ' · ' + u.short, ueF)).join('')}</select>
          <select id="fTop"><option value="">Tous les thèmes</option>${topicOptions(topF, ueF || null)}</select>
        </div>
        <p><b class="num">${list.length}</b> carte${list.length > 1 ? 's' : ''} · <b class="num">${due.length}</b> à revoir aujourd'hui</p>
        <div class="row"><button class="btn primary" id="study" ${due.length ? '' : 'disabled'}>Réviser les ${due.length} cartes dues</button><button class="btn ghost" id="studyAll" ${list.length ? '' : 'disabled'}>Tout réviser (entraînement)</button></div>
        <ul class="cards">${list.slice(0, 60).map(c => `<li><div class="grow"><div class="md small">${renderMd(c.front)}</div><span class="muted small">${esc(TOPIC_BY_ID[c.topicId]?.num || '')} · ${c.due ? (c.due <= t ? 'due' : 'le ' + esc(fmtDate(c.due, { noDay: true }))) : 'nouvelle'}</span></div><button class="btn sm ghost" data-edit="${c.id}">Modifier</button></li>`).join('')}</ul>
        ${list.length > 60 ? `<p class="muted small">60 premières cartes affichées (filtre par thème pour voir les autres).</p>` : ''}
        ${!all.length ? '<p class="muted">Astuce : une carte = une question précise (définition, condition d\'application, formule, écriture type). Les formules s\'écrivent entre $…$, par exemple $CMPC = k_{cp}\\frac{CP}{V} + k_d(1-t)\\frac{D}{V}$.</p>' : ''}
      </article>
    </div>
  </div>`;

  root.querySelectorAll('[data-rev]').forEach(b => b.onclick = () => reviewModal(b.dataset.rev));
  root.querySelector('#fUE').onchange = e => { uiSet('cardUE', e.target.value); uiSet('cardTopic', ''); render(root); };
  root.querySelector('#fTop').onchange = e => { uiSet('cardTopic', e.target.value); render(root); };
  root.querySelector('#newCard').onclick = () => cardModal(null, topF);
  root.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => cardModal(all.find(c => c.id === b.dataset.edit)));
  root.querySelector('#study').onclick = () => { session = { queue: shuffle(due.map(c => c.id)), done: 0, ok: 0, show: false, practice: false }; render(root); };
  root.querySelector('#studyAll').onclick = () => { session = { queue: shuffle(list.map(c => c.id)), done: 0, ok: 0, show: false, practice: true }; render(root); };
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function findCard(id) { return Object.values(state.cards).flat().find(c => c.id === id); }

function renderStudy(root) {
  const c = findCard(session.queue[0]);
  if (!c) { session.queue.shift(); return render(root); }
  const tp = TOPIC_BY_ID[c.topicId];
  root.innerHTML = `
  <section class="pagehead"><h1>Flashcards ${session.practice ? '· entraînement' : ''}</h1><p class="lead num">${session.done} faite${session.done > 1 ? 's' : ''} · ${session.queue.length} restante${session.queue.length > 1 ? 's' : ''}</p></section>
  <article class="card flash">
    <span class="muted small"><span class="dot ${c.ue}"></span> ${esc(tp?.num || '')} ${esc(tp?.title || '')}</span>
    <div class="md front">${renderMd(c.front)}</div>
    ${session.show ? `<hr><div class="md back">${renderMd(c.back)}</div>
      <div class="row center"><button class="btn danger" id="ko">À revoir (J+1)</button><button class="btn primary" id="okb">Je savais</button></div>` :
      `<div class="row center"><button class="btn primary" id="reveal">Afficher la réponse</button></div>`}
    <div class="row center"><button class="btn ghost sm" id="quit">Arrêter</button></div>
  </article>`;
  const answer = good => {
    if (!session.practice) { const r = nextReview(c.i != null ? { i: c.i } : null, good ? 4 : 1); c.i = r.i; c.due = r.due; c.lapses = (c.lapses || 0) + (good ? 0 : 1); saveCards(c.ue); }
    session.done++; if (good) session.ok++; session.queue.shift(); session.show = false;
    if (!session.queue.length) { toast(`Terminé : ${session.ok}/${session.done} connues`); session = null; }
    render(root);
  };
  const rv = root.querySelector('#reveal'); if (rv) rv.onclick = () => { session.show = true; renderStudy(root); };
  const ok = root.querySelector('#okb'); if (ok) ok.onclick = () => answer(true);
  const ko = root.querySelector('#ko'); if (ko) ko.onclick = () => answer(false);
  root.querySelector('#quit').onclick = () => { session = null; render(root); };
  root.onkeydown = null;
  document.onkeydown = e => {
    if (!session || document.querySelector('#modal:not([hidden])')) return;
    if (e.key === ' ' && !session.show) { e.preventDefault(); session.show = true; renderStudy(root); }
    else if (session.show && (e.key === '1')) answer(false);
    else if (session.show && (e.key === '2')) answer(true);
  };
}

function cardModal(card, presetTopic = '') {
  const isNew = !card;
  const c = card || { id: uid(), front: '', back: '', topicId: presetTopic || '', ue: '' };
  modal(`<h3>${isNew ? 'Nouvelle carte' : 'Modifier la carte'}</h3>
    <form id="cf" class="form">
      <label>Thème<select name="topicId" required>${topicOptions(c.topicId)}</select></label>
      <label>Question (recto)<textarea name="front" rows="3" required placeholder="Ex. Conditions du régime de faveur ?">${esc(c.front)}</textarea></label>
      <label>Réponse (verso)<textarea name="back" rows="5" required placeholder="Markdown et formules $…$ acceptés">${esc(c.back)}</textarea></label>
      <div class="md preview small" id="pv"></div>
      <p class="err" id="cerr" hidden></p>
      <div class="row between">${isNew ? '<span></span>' : '<button type="button" class="btn danger ghost" id="del">Supprimer</button>'}
        <span class="row"><button type="button" class="btn ghost" data-close>Annuler</button>${isNew ? '<button type="button" class="btn" id="saveNext">Enregistrer et suivante</button>' : ''}<button class="btn primary">Enregistrer</button></span></div>
    </form>`, (root, close) => {
    const f = root.querySelector('#cf');
    const pv = () => { root.querySelector('#pv').innerHTML = f.back.value ? renderMd(f.back.value) : ''; };
    f.back.oninput = pv; pv();
    const commit = () => {
      if (!f.front.value.trim() || !f.back.value.trim()) { const e = root.querySelector('#cerr'); e.hidden = false; e.textContent = 'Remplis la question et la réponse.'; return false; }
      const tp = TOPIC_BY_ID[f.topicId.value];
      if (!isNew && c.ue && c.ue !== tp.ue) { state.cards[c.ue] = state.cards[c.ue].filter(x => x.id !== c.id); saveCards(c.ue); }
      const upd = { ...c, front: f.front.value.trim(), back: f.back.value.trim(), topicId: tp.id, ue: tp.ue };
      const arr = state.cards[tp.ue] ||= [];
      const i = arr.findIndex(x => x.id === c.id);
      if (i >= 0) arr[i] = upd; else arr.push({ ...upd, created: today(), due: today() });
      saveCards(tp.ue); return tp.id;
    };
    f.onsubmit = e => { e.preventDefault(); if (commit()) { close(); toast('Carte enregistrée'); window.dispatchEvent(new Event('refresh')); } };
    const sn = root.querySelector('#saveNext'); if (sn) sn.onclick = () => { const tid = commit(); if (tid) { close(); cardModal(null, tid); window.dispatchEvent(new Event('refresh')); } };
    const del = root.querySelector('#del'); if (del) del.onclick = () => { close(); confirmBox('Supprimer cette carte ?', () => { state.cards[c.ue] = state.cards[c.ue].filter(x => x.id !== c.id); saveCards(c.ue); window.dispatchEvent(new Event('refresh')); }, 'Supprimer'); };
  });
}

export function hasActiveSession() { return !!session; }
