import { UES, UE_BY_ID, COMPETENCES } from '../programme.js';
import { state, save, uid, addSession, uiGet, uiSet } from '../store.js';
import { today, fmtDate, pad } from '../planner.js';
import { esc, modal, toast, confirmBox, opt } from '../ui.js';

let tick = null;

export function render(root) {
  const run = uiGet('examRun', null);
  if (run) return renderRun(root, run);
  clearInterval(tick);
  const s = state.settings;
  const ex = [...state.exams].sort((a, b) => b.date.localeCompare(a.date));
  const last = {}; const avg = {};
  for (const u of UES) {
    const l = ex.filter(e => e.ue === u.id && e.grade != null);
    last[u.id] = l[0]?.grade ?? null;
    avg[u.id] = l.length ? l.reduce((a, e) => a + e.grade, 0) / l.length : null;
  }
  const sim = uiGet('sim', null) || Object.fromEntries(UES.map(u => [u.id, last[u.id] ?? 10]));
  const coefSum = UES.reduce((a, u) => a + u.coef, 0);
  const wavg = UES.reduce((a, u) => a + u.coef * Number(sim[u.id]), 0) / coefSum;
  const comp = {};
  for (const c of COMPETENCES) { const v = ex.filter(e => e.comp && e.comp[c] != null).map(e => e.comp[c]); comp[c] = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }

  root.innerHTML = `
  <section class="pagehead"><h1>Examens blancs et simulateur</h1><p class="lead">Conditions réelles : ${UES.map(u => `${u.code} ${u.duree} h`).join(' · ')}. Note ensuite ta copie et chaque compétence évaluée.</p></section>
  <div class="cols">
    <div class="col">
      <article class="card">
        <header><h2>Lancer un examen blanc</h2></header>
        <form id="ef" class="form">
          <div class="grid2">
            <label>UE<select name="ue">${UES.map(u => opt(u.id, `${u.code} · ${u.short} (${u.duree} h)`, 'UE4')).join('')}</select></label>
            <label>Sujet<input name="subject" placeholder="Sujet zéro 2027, annales 2024…" required></label>
          </div>
          <button class="btn primary">Démarrer le chrono</button>
        </form>
        <p class="muted small">Ou <button class="linkbtn" id="addPast">saisir un examen déjà fait</button>.</p>
      </article>
      <article class="card">
        <header><h2>Historique</h2></header>
        ${ex.length ? `<table class="t stack"><thead><tr><th>Date</th><th>UE</th><th>Sujet</th><th class="r">Note</th><th class="r">Temps</th><th></th></tr></thead><tbody>
          ${ex.map(e => `<tr><td>${esc(fmtDate(e.date, { noDay: true }))}</td><td><span class="dot ${e.ue}"></span>${esc(UE_BY_ID[e.ue].code)}</td><td>${esc(e.subject)}</td><td class="r num"><b>${e.grade != null ? String(e.grade).replace('.', ',') : '–'}</b>/20</td><td class="r num">${e.minutes ? Math.floor(e.minutes / 60) + ' h ' + pad(e.minutes % 60) : '–'}</td><td><button class="btn sm ghost" data-del="${e.id}">Suppr.</button></td></tr>`).join('')}
        </tbody></table>` : '<p class="muted">Aucun examen pour l\'instant. Le planning en propose un chaque samedi à partir de juin.</p>'}
      </article>
    </div>
    <div class="col">
      <article class="card">
        <header><h2>Simulateur de notes</h2><span class="muted small">objectif ${s.objective}/20 par UE</span></header>
        ${UES.map(u => `<div class="simrow"><label for="s_${u.id}"><span class="dot ${u.id}"></span>${esc(u.code)} <span class="muted small">coef. ${String(u.coef).replace('.', ',')}${avg[u.id] != null ? ` · moyenne blancs ${avg[u.id].toFixed(1).replace('.', ',')}` : ''}</span></label>
          <input type="range" id="s_${u.id}" min="0" max="20" step="0.5" value="${sim[u.id]}" data-sim="${u.id}"><b class="num ${Number(sim[u.id]) >= s.objective ? 'okc' : Number(sim[u.id]) < 10 ? 'koc' : ''}">${String(sim[u.id]).replace('.', ',')}</b></div>`).join('')}
        <div class="simres"><span>Moyenne pondérée des 3 UE</span><b class="num">${wavg.toFixed(2).replace('.', ',')}</b></div>
        <p class="muted small">Chaque UE se valide séparément. Ce calcul pondéré (coef. 1,5 / 1 / 1,5) donne une vue d'ensemble de ton niveau ; vérifie les règles d'obtention du diplôme dans l'arrêté.</p>
      </article>
      <article class="card">
        <header><h2>Compétences (moyenne des blancs)</h2></header>
        ${COMPETENCES.map(c => `<div class="row between"><span>${c}</span><span class="num">${comp[c] != null ? comp[c].toFixed(1).replace('.', ',') + ' / 5' : '–'}</span></div>`).join('')}
      </article>
    </div>
  </div>`;

  root.querySelector('#ef').onsubmit = e => {
    e.preventDefault();
    const ue = e.target.ue.value;
    uiSet('examRun', { ue, subject: e.target.subject.value.trim(), started: Date.now(), dur: UE_BY_ID[ue].duree * 3600000, paused: 0, pausedAt: null });
    render(root);
  };
  root.querySelector('#addPast').onclick = () => gradeModal({ ue: 'UE4', subject: '', minutes: null, date: today() });
  root.querySelectorAll('[data-sim]').forEach(r => r.oninput = () => { const v = { ...sim, [r.dataset.sim]: Number(r.value) }; uiSet('sim', v); render(root); root.querySelector('#s_' + r.dataset.sim).focus(); });
  root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => confirmBox('Supprimer cet examen ?', () => { state.exams = state.exams.filter(x => x.id !== b.dataset.del); save('exams'); render(root); }, 'Supprimer'));
}

function renderRun(root, run) {
  const ue = UE_BY_ID[run.ue];
  const elapsed = () => (run.pausedAt || Date.now()) - run.started - run.paused;
  const fmt = ms => { const neg = ms < 0; const s = Math.abs(Math.round(ms / 1000)); return `${neg ? '+' : ''}${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
  root.innerHTML = `
  <section class="examrun">
    <p class="eyebrow"><span class="dot ${ue.id}"></span>${esc(ue.code)} · ${esc(run.subject)}</p>
    <div class="bigclock num" id="clk">${fmt(run.dur - elapsed())}</div>
    <p class="muted">Temps restant sur ${ue.duree} h. Le chrono continue si tu changes d'onglet.</p>
    <div class="row center"><button class="btn" id="pz">${run.pausedAt ? 'Reprendre' : 'Pause'}</button><button class="btn primary" id="end">Rendre la copie</button><button class="btn ghost danger" id="ab">Abandonner</button></div>
  </section>`;
  clearInterval(tick);
  tick = setInterval(() => { const c = document.getElementById('clk'); if (!c) { clearInterval(tick); return; } const left = run.dur - elapsed(); c.textContent = fmt(left); c.classList.toggle('over', left < 0); }, 1000);
  root.querySelector('#pz').onclick = () => { if (run.pausedAt) { run.paused += Date.now() - run.pausedAt; run.pausedAt = null; } else run.pausedAt = Date.now(); uiSet('examRun', run); renderRun(root, run); };
  root.querySelector('#ab').onclick = () => confirmBox('Abandonner cet examen ?', () => { uiSet('examRun', null); render(root); }, 'Abandonner');
  root.querySelector('#end').onclick = () => { const minutes = Math.round(elapsed() / 60000); uiSet('examRun', null); clearInterval(tick); gradeModal({ ue: run.ue, subject: run.subject, minutes, date: today() }, () => render(root)); render(root); };
}

function gradeModal(e, after) {
  modal(`<h3>Corriger l'examen</h3>
    <form id="gf" class="form">
      <div class="grid2">
        <label>UE<select name="ue">${UES.map(u => opt(u.id, u.code, e.ue)).join('')}</select></label>
        <label>Date<input type="date" name="date" value="${e.date}"></label>
        <label>Sujet<input name="subject" value="${esc(e.subject)}" required></label>
        <label>Durée (min)<input type="number" name="minutes" value="${e.minutes ?? ''}" min="0"></label>
        <label>Note /20<input type="number" name="grade" step="0.25" min="0" max="20" required></label>
      </div>
      <fieldset><legend>Compétences (0 à 5)</legend><div class="grid4">${COMPETENCES.map(c => `<label>${c}<input type="number" name="c_${c}" min="0" max="5" step="0.5"></label>`).join('')}</div></fieldset>
      <label>Points forts / à retravailler<textarea name="comment" rows="3"></textarea></label>
      <p class="err" id="gerr" hidden></p>
      <div class="row end"><button type="button" class="btn ghost" data-close>Plus tard</button><button class="btn primary">Enregistrer</button></div>
    </form>`, (root, close) => {
    root.querySelector('#gf').onsubmit = ev => {
      ev.preventDefault(); const f = ev.target;
      const g = Number(f.grade.value);
      if (!(g >= 0 && g <= 20)) { const er = root.querySelector('#gerr'); er.hidden = false; er.textContent = 'Note entre 0 et 20.'; return; }
      const comp = {}; COMPETENCES.forEach(c => { const v = f['c_' + c].value; if (v !== '') comp[c] = Number(v); });
      const rec = { id: uid(), ue: f.ue.value, date: f.date.value, subject: f.subject.value.trim(), minutes: Number(f.minutes.value) || null, grade: g, comp, comment: f.comment.value.trim() };
      state.exams.push(rec); save('exams');
      if (rec.minutes) addSession({ id: uid(), date: rec.date, start: '', minutes: rec.minutes, type: 'examen', ue: rec.ue, topicId: null, quality: null, note: rec.subject });
      close(); toast('Examen enregistré'); after && after(); window.dispatchEvent(new Event('refresh'));
    };
  });
}
