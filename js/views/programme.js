import { UES, STEPS, TOPIC_BY_ID } from '../programme.js';
import { state, prog, saveProgress, uiGet, uiSet } from '../store.js';
import { hoursByTopic, topicTarget, topicActive, stepProgress, fmtH, fmtDate, today, nextReview } from '../planner.js';
import { esc, bar, toast } from '../ui.js';
import { startTimerModal, logSessionModal, masteryOptions } from '../timer.js';

export function render(root) {
  const ueSel = uiGet('progUE', 'UE4');
  const q = uiGet('progQ', '');
  const hrs = hoursByTopic(null);
  const ue = UES.find(u => u.id === ueSel) || UES[2];
  const match = t => !q || (t.title + ' ' + t.items.join(' ')).toLowerCase().includes(q.toLowerCase());

  root.innerHTML = `
  <section class="pagehead">
    <h1>Programme officiel 2027</h1>
    <p class="lead">Arrêté du 4 août 2025, annexe 2. Coche les étapes de chaque sous-thème et note ta maîtrise de 0 à 5 : le planning et les révisions s'ajustent.</p>
  </section>
  <div class="toolbar">
    <div class="seg" role="tablist">${UES.map(u => `<button role="tab" class="${u.id === ue.id ? 'on' : ''}" data-ue="${u.id}"><span class="dot ${u.id}"></span>${esc(u.code)} · ${esc(u.short)}</button>`).join('')}</div>
    <input type="search" id="q" placeholder="Rechercher une notion…" value="${esc(q)}">
  </div>
  <div class="uehead card">
    <div><h2>${esc(ue.code)} — ${esc(ue.name)}</h2><p class="muted">${ue.hours} h · ${ue.ects} ECTS · écrit de ${ue.duree} h · coefficient ${String(ue.coef).replace('.', ',')} · CNAM ${esc(ue.cnam)}</p></div>
  </div>
  ${ue.parts.map(p => {
    const chs = p.chapters.filter(c => c.subs.some(topicActive));
    if (!chs.length) return '';
    return `<section class="part">
    <h3 class="parth">${p.prereq ? 'Piste' : 'Partie'} ${esc(p.num)} · ${esc(p.title)} <span class="muted num">${p.hours} h${p.est ? ' · estimation' : ''}</span></h3>
    ${chs.map(c => {
      const subs = c.subs.filter(t => topicActive(t) && match(t));
      if (!subs.length) return '';
      const avg = c.subs.reduce((a, t) => a + stepProgress(t), 0) / c.subs.length;
      return `<article class="card chap">
        <header><div><h4>${esc(c.num)} · ${esc(c.title)}</h4><span class="muted small num">${c.hours} h${c.est ? ' (répartition indicative)' : ''}${c.subs[0].lacune ? ' · thème prioritaire (lacune)' : ''}</span></div><div class="w120">${bar(avg, ue.id)}</div></header>
        <div class="tbl">
          <div class="tr th"><span>Sous-thème</span>${['Cours', 'Fiche', 'Exos', 'Annales', 'Mémo'].map(l => `<span class="c">${l}</span>`).join('')}<span class="c">Maîtrise</span><span class="c">Heures</span><span class="c">Révision</span><span></span></div>
          ${subs.map(t => { const p = state.progress[t.id] || {}; const st = p.steps || {};
            return `<div class="tr" data-t="${t.id}">
              <span class="tt"><b>${esc(t.num)} ${esc(t.title)}</b><small class="muted">${esc(t.items.join(' · '))}${t.note ? ' — ' + esc(t.note) : ''}</small></span>
              ${STEPS.map(s => `<label class="c cbx" title="${s.label}"><input type="checkbox" data-step="${s.id}" ${st[s.id] ? 'checked' : ''} aria-label="${s.label}"></label>`).join('')}
              <span class="c"><select data-m aria-label="Maîtrise"><option value="">–</option>${masteryOptions(p.mastery ?? '').replace(/ · [^<]+</g, '<')}</select></span>
              <span class="c num small">${fmtH(hrs[t.id] || 0)}<br><span class="muted">/ ${fmtH(topicTarget(t))}</span></span>
              <span class="c small">${p.review ? (p.review.due <= today() ? '<b class="due">À faire</b>' : esc(fmtDate(p.review.due, { noDay: true }))) : '<span class="muted">—</span>'}</span>
              <span class="c acts"><button class="btn sm" data-go="${t.id}" title="Lancer une séance">▶</button><button class="btn sm ghost" data-add="${t.id}" title="Saisir une séance">+</button><a class="btn sm ghost" href="#notes" data-note="${t.id}" title="Notes">✎</a></span>
            </div>`; }).join('')}
        </div>
      </article>`; }).join('')}
  </section>`; }).join('')}`;

  root.querySelectorAll('[data-ue]').forEach(b => b.onclick = () => { uiSet('progUE', b.dataset.ue); render(root); });
  const qi = root.querySelector('#q');
  qi.oninput = () => { uiSet('progQ', qi.value); clearTimeout(qi._t); qi._t = setTimeout(() => { render(root); const n = root.querySelector('#q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
  root.querySelectorAll('.tr[data-t]').forEach(row => {
    const id = row.dataset.t;
    row.querySelectorAll('[data-step]').forEach(c => c.onchange = () => {
      const p = prog(id); p.steps[c.dataset.step] = c.checked;
      if (c.checked) { p.last = today(); if (!p.review) p.review = nextReview(null, p.mastery ?? 3); }
      saveProgress(); toast(`${TOPIC_BY_ID[id].num} · ${c.checked ? 'étape cochée' : 'étape décochée'}`);
    });
    row.querySelector('[data-m]').onchange = e => { const p = prog(id); p.mastery = e.target.value === '' ? null : Number(e.target.value); saveProgress(); };
    row.querySelector('[data-go]').onclick = () => startTimerModal({ topicId: id });
    row.querySelector('[data-add]').onclick = () => logSessionModal({ topicId: id });
    row.querySelector('[data-note]').onclick = () => uiSet('noteTopic', id);
  });
}
