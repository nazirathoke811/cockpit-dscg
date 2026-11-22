import { UES, UE_BY_ID, TOPIC_BY_ID } from '../programme.js';
import { state, uiGet, uiSet, sessionsAll } from '../store.js';
import { buildPlan, today, addDays, mondayOf, fmtDate, fmtH, dayShort, diffDays, parse } from '../planner.js';
import { esc, bar } from '../ui.js';
import { startTimerModal } from '../timer.js';

export function render(root) {
  const s = state.settings; const t = today();
  const plan = buildPlan();
  let wk = uiGet('planWeek', mondayOf(t));
  const done = {}; for (const x of sessionsAll()) (done[x.date] ||= []).push(x);
  const days = []; for (let i = 0; i < 7; i++) days.push(addDays(wk, i));
  const remUE = UES.map(u => ({ u, h: Object.entries(plan.rem).filter(([id]) => TOPIC_BY_ID[id].ue === u.id).reduce((a, [, h]) => a + h, 0) }));
  const margin = plan.capTotal - plan.totalRem;
  const status = plan.uncovered > 0.5 ? 'late' : 'ok';

  // charge par mois jusqu'aux épreuves
  const months = {};
  for (const d of Object.values(plan.days)) {
    const m = d.key.slice(0, 7); const o = months[m] ||= { cap: 0, learn: 0, cnam: 0, p2: 0 };
    o.cap += d.cap; o.learn += d.blocks.reduce((a, b) => a + b.hours, 0); if (d.cnam) o.cnam++; if (d.phase === 2) o.p2 += d.cap;
  }
  const maxCap = Math.max(...Object.values(months).map(m => m.cap), 1);
  const MN = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

  root.innerHTML = `
  <section class="pagehead">
    <h1>${status === 'ok' ? `Programme bouclé le ${esc(fmtDate(plan.finish || s.deadline, { noDay: true }))}` : `${fmtH(plan.uncovered)} ne tiennent pas avant le ${esc(fmtDate(s.deadline, { noDay: true }))}`}</h1>
    ${status === 'late' ? `<p class="lead"><b>À ce rythme, le 1er passage sur tout le programme se termine ${plan.finish ? 'le ' + esc(fmtDate(plan.finish, { noDay: true, year: true })) : 'après les épreuves'}.</b></p>` : ''}
    <p class="lead">Le planning se recalcule à chaque ouverture à partir de ce qu'il te reste à faire : une séance manquée est automatiquement redistribuée sur les jours suivants.</p>
  </section>

  <div class="stats4">
    <div class="stat"><span>Reste à apprendre</span><b class="num">${fmtH(plan.totalRem)}</b></div>
    <div class="stat"><span>Créneaux jusqu'au ${esc(fmtDate(s.deadline, { noDay: true }))}</span><b class="num">${fmtH(plan.capTotal)}</b><small class="muted">hors révisions (${Math.round(s.reviewShare * 100)} %)</small></div>
    <div class="stat ${margin < 0 ? 'neg' : 'pos'}"><span>${margin < 0 ? 'Déficit' : 'Marge'}</span><b class="num">${fmtH(Math.abs(margin))}</b></div>
    <div class="stat"><span>Par UE</span>${remUE.map(x => `<small><span class="dot ${x.u.id}"></span>${esc(x.u.code)} ${fmtH(x.h)}</small>`).join('')}</div>
  </div>
  ${status === 'late' ? `<div class="note warn">Pour tout faire avant la date cible : ajoute du temps dans Réglages (créneaux, congés studieux), réduis la part réservée aux révisions, ou décale la date cible. Les heures non couvertes basculent sur juin.</div>` : ''}

  <article class="card">
    <header><h2>Semaine du ${esc(fmtDate(wk, { noDay: true }))}</h2>
      <div class="row"><button class="btn sm ghost" id="prev">‹ Préc.</button><button class="btn sm ghost" id="now">Aujourd'hui</button><button class="btn sm ghost" id="next">Suiv. ›</button></div></header>
    <div class="weekgrid">
      ${days.map(k => { const d = plan.days[k];
        return `<div class="wday ${k === t ? 'is-today' : ''} ${k < t ? 'past' : ''}">
          <div class="wdh"><b>${esc(dayShort(k))} ${Number(k.slice(8))}</b><span class="muted num">${d ? (d.cap ? fmtH(d.cap) : '—') : ''}</span></div>
          ${d && d.why ? `<span class="tag">${esc(d.why)}</span>` : ''}
          ${d && d.cnam ? d.cnam.map(c => `<div class="ev cnam"><span class="num">${c.start}–${c.end}</span> ${esc(c.code || 'CNAM')}${c.ue ? ` <span class="dot ${c.ue}"></span>` : ''}</div>`).join('') : ''}
          ${!d ? ((done[k] || []).map(x => `<div class="ev blk ${x.ue} doneev"><span class="num">${fmtH(x.minutes / 60)}</span> ${esc(x.topicId ? TOPIC_BY_ID[x.topicId].num + ' ' + TOPIC_BY_ID[x.topicId].title : x.note || 'Séance')}</div>`).join('') || '<p class="muted small">Aucune séance enregistrée.</p>') : ''}
          ${d && d.review ? `<div class="ev rev">Révisions <span class="num">${fmtH(d.review)}</span></div>` : ''}
          ${d ? d.blocks.map(b => { const tp = TOPIC_BY_ID[b.topicId]; return `<button class="ev blk ${b.ue}" data-go="${b.topicId}" title="Lancer : ${esc(tp.title)}"><span class="num">${fmtH(b.hours)}</span> ${esc(tp.num)} ${esc(tp.title)}</button>`; }).join('') : ''}
          ${d && d.phase2 ? `<div class="ev p2">${esc(d.phase2.label)}</div>` : ''}
        </div>`; }).join('')}
    </div>
  </article>

  <article class="card">
    <header><h2>Charge mois par mois jusqu'aux épreuves</h2><span class="muted small">Apprentissage · révisions · phase annales</span></header>
    <div class="months">
      ${Object.entries(months).map(([m, o]) => `<div class="mo">
        <div class="mbar" style="height:${(o.cap / maxCap * 100).toFixed(1)}%">
          <i class="learn" style="height:${o.cap ? (o.learn / o.cap * 100).toFixed(1) : 0}%"></i>
          <i class="p2" style="height:${o.cap ? (o.p2 / o.cap * 100).toFixed(1) : 0}%"></i>
        </div>
        <span class="num small">${Math.round(o.cap)} h</span><span class="small muted">${MN[+m.slice(5) - 1]}</span>${o.cnam ? `<span class="small muted">${o.cnam} j CNAM</span>` : ''}
      </div>`).join('')}
    </div>
    <p class="muted small">Après le ${esc(fmtDate(s.deadline, { noDay: true }))} : un examen blanc chronométré chaque samedi (UE 1, UE 4 puis UE 2 en rotation) et des révisions ciblées sur les thèmes faibles. Épreuves prévues autour du ${esc(fmtDate(s.examDate, { noDay: true, year: true }))} (calendrier CNAM, à confirmer par l'arrêté de la session 2027).</p>
  </article>`;

  root.querySelector('#prev').onclick = () => { uiSet('planWeek', addDays(wk, -7)); render(root); };
  root.querySelector('#next').onclick = () => { uiSet('planWeek', addDays(wk, 7)); render(root); };
  root.querySelector('#now').onclick = () => { uiSet('planWeek', mondayOf(t)); render(root); };
  root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => startTimerModal({ topicId: b.dataset.go }));
}
