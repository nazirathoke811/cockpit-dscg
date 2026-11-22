import { UES, UE_BY_ID, TOPIC_BY_ID, ERROR_CATS } from '../programme.js';
import { state, save, uid, uiGet, uiSet } from '../store.js';
import { today, fmtDate, diffDays } from '../planner.js';
import { esc, modal, toast, confirmBox, opt } from '../ui.js';
import { topicOptions } from '../timer.js';

const catsFor = ue => [...(ERROR_CATS[ue] || []), ...ERROR_CATS.ALL];

export function render(root) {
  const ueF = uiGet('errUE', ''); const showRes = uiGet('errRes', false);
  const list = state.errors.filter(e => (!ueF || e.ue === ueF) && (showRes || !e.resolved)).sort((a, b) => b.date.localeCompare(a.date));
  const open = state.errors.filter(e => !e.resolved);
  const byCat = {};
  for (const e of open) byCat[e.cat] = (byCat[e.cat] || 0) + 1;
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const toReview = open.filter(e => !e.lastReview || diffDays(e.lastReview, today()) >= 7);

  root.innerHTML = `
  <section class="pagehead"><h1>${open.length ? `${open.length} erreur${open.length > 1 ? 's' : ''} à ne plus refaire` : 'Carnet d\'erreurs'}</h1>
    <p class="lead">Chaque erreur relevée en exercice ou en examen blanc, avec la bonne méthode. Relis-les chaque semaine ; marque « maîtrisée » quand elle ne revient plus.</p></section>
  <div class="cols">
    <div class="col wide">
      <div class="toolbar">
        <div class="seg">${['', ...UES.map(u => u.id)].map(u => `<button class="${u === ueF ? 'on' : ''}" data-ue="${u}">${u ? `<span class="dot ${u}"></span>${esc(UE_BY_ID[u].code)}` : 'Toutes'}</button>`).join('')}</div>
        <label class="chk"><input type="checkbox" id="res" ${showRes ? 'checked' : ''}> Afficher les maîtrisées</label>
        <button class="btn primary" id="add">Nouvelle erreur</button>
      </div>
      ${list.length ? list.map(e => `<article class="card err ${e.resolved ? 'res' : ''}">
        <header><div><span class="dot ${e.ue}"></span><b>${esc(e.cat)}</b> <span class="muted small">· ${esc(TOPIC_BY_ID[e.topicId]?.num || '')} ${esc(TOPIC_BY_ID[e.topicId]?.title || '')} · ${esc(fmtDate(e.date, { noDay: true }))}${e.reviews ? ` · relue ${e.reviews} fois` : ''}</span></div>
          <div class="row"><button class="btn sm" data-rv="${e.id}">Relue</button><button class="btn sm ghost" data-ok="${e.id}">${e.resolved ? 'Rouvrir' : 'Maîtrisée'}</button><button class="btn sm ghost" data-ed="${e.id}">Modifier</button></div></header>
        <div class="errgrid"><div><span class="muted small">Erreur</span><p>${esc(e.what)}</p></div><div><span class="muted small">Bonne méthode</span><p>${esc(e.fix)}</p></div></div>
      </article>`).join('') : '<p class="muted">Rien ici pour le moment.</p>'}
    </div>
    <div class="col">
      <article class="card"><header><h2>Erreurs récurrentes</h2></header>
        ${top.length ? `<ul class="list">${top.map(([c, n]) => `<li><span class="grow">${esc(c)}</span><b class="num">${n}</b></li>`).join('')}</ul>` : '<p class="muted small">Les catégories les plus fréquentes apparaîtront ici.</p>'}
      </article>
      <article class="card"><header><h2>Revue hebdomadaire</h2></header>
        <p><b class="num">${toReview.length}</b> erreur${toReview.length > 1 ? 's' : ''} non relue${toReview.length > 1 ? 's' : ''} depuis 7 jours.</p>
      </article>
    </div>
  </div>`;

  root.querySelectorAll('[data-ue]').forEach(b => b.onclick = () => { uiSet('errUE', b.dataset.ue); render(root); });
  root.querySelector('#res').onchange = e => { uiSet('errRes', e.target.checked); render(root); };
  root.querySelector('#add').onclick = () => errModal(null, ueF);
  const find = id => state.errors.find(x => x.id === id);
  root.querySelectorAll('[data-rv]').forEach(b => b.onclick = () => { const e = find(b.dataset.rv); e.reviews = (e.reviews || 0) + 1; e.lastReview = today(); save('errors'); toast('Relue'); render(root); });
  root.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => { const e = find(b.dataset.ok); e.resolved = !e.resolved; save('errors'); render(root); });
  root.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => errModal(find(b.dataset.ed)));
}

function errModal(err, ueDefault = '') {
  const e = err || { id: uid(), ue: ueDefault || 'UE4', topicId: '', cat: '', what: '', fix: '', date: today() };
  modal(`<h3>${err ? 'Modifier' : 'Nouvelle erreur'}</h3>
    <form id="xf" class="form">
      <label>Thème<select name="topicId" required>${topicOptions(e.topicId, err ? null : (ueDefault || null))}</select></label>
      <label>Catégorie<select name="cat" id="cat"></select></label>
      <label>Ce que j'ai fait (l'erreur)<textarea name="what" rows="3" required>${esc(e.what)}</textarea></label>
      <label>Ce qu'il fallait faire<textarea name="fix" rows="3" required>${esc(e.fix)}</textarea></label>
      <div class="row between">${err ? '<button type="button" class="btn ghost danger" id="del">Supprimer</button>' : '<span></span>'}<span class="row"><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn primary">Enregistrer</button></span></div>
    </form>`, (root, close) => {
    const f = root.querySelector('#xf');
    const fill = () => { const ue = TOPIC_BY_ID[f.topicId.value].ue; f.cat.innerHTML = catsFor(ue).map(c => opt(c, c, e.cat)).join(''); };
    f.topicId.onchange = fill; fill();
    f.onsubmit = ev => {
      ev.preventDefault();
      const tp = TOPIC_BY_ID[f.topicId.value];
      Object.assign(e, { topicId: tp.id, ue: tp.ue, cat: f.cat.value, what: f.what.value.trim(), fix: f.fix.value.trim() });
      if (!err) state.errors.push(e);
      save('errors'); close(); toast('Enregistré'); window.dispatchEvent(new Event('refresh'));
    };
    const d = root.querySelector('#del'); if (d) d.onclick = () => { close(); confirmBox('Supprimer cette erreur ?', () => { state.errors = state.errors.filter(x => x.id !== e.id); save('errors'); window.dispatchEvent(new Event('refresh')); }, 'Supprimer'); };
  });
}
