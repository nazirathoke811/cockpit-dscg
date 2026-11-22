import { UES, UE_BY_ID, TOPIC_BY_ID, TOPICS } from '../programme.js';
import { state, sessionsAll, deleteSession } from '../store.js';
import { today, addDays, mondayOf, fmtDate, fmtH, ueAvancement, streak, neglected, weak, topicActive, hoursByTopic, diffDays } from '../planner.js';
import { esc, bar, download, confirmBox, toast } from '../ui.js';
import { TYPE_LABEL, logSessionModal } from '../timer.js';

export function render(root) {
  const t = today(); const all = sessionsAll();
  const study = all.filter(x => x.type !== 'cnam');
  const total = study.reduce((a, x) => a + x.minutes, 0) / 60;
  const byUE = {}; const byType = {};
  for (const x of study) { byUE[x.ue] = (byUE[x.ue] || 0) + x.minutes / 60; byType[x.type] = (byType[x.type] || 0) + x.minutes / 60; }
  const weeks = [];
  for (let i = 11; i >= 0; i--) { const mon = addDays(mondayOf(t), -7 * i); const w = { mon, UE1: 0, UE2: 0, UE4: 0 }; for (const x of study) if (x.date >= mon && x.date <= addDays(mon, 6) && w[x.ue] != null) w[x.ue] += x.minutes / 60; weeks.push(w); }
  const maxW = Math.max(1, ...weeks.map(w => w.UE1 + w.UE2 + w.UE4));
  const negl = neglected(); const wk = weak();
  const untouched = TOPICS.filter(x => topicActive(x) && !state.progress[x.id]?.last).length;
  const recent = [...all].reverse().slice(0, 40);

  root.innerHTML = `
  <section class="pagehead"><h1>${fmtH(total)} de travail personnel enregistrées</h1><p class="lead">Volume, régularité, avancement et thèmes délaissés. Exporte le journal ou un rapport PDF.</p></section>
  <div class="stats4">
    ${UES.map(u => `<div class="stat"><span><span class="dot ${u.id}"></span>${esc(u.code)} · ${esc(u.short)}</span><b class="num">${fmtH(byUE[u.id] || 0)}</b>${bar(ueAvancement(u.id), u.id)}<small class="muted">${Math.round(ueAvancement(u.id) * 100)} % des étapes</small></div>`).join('')}
    <div class="stat"><span>Régularité</span><b class="num">${streak()} j</b><small class="muted">${untouched} thèmes jamais travaillés</small></div>
  </div>
  <article class="card">
    <header><h2>Heures par semaine</h2><span class="legend">${UES.map(u => `<span><span class="dot ${u.id}"></span>${esc(u.code)}</span>`).join('')}</span></header>
    <div class="wbars">${weeks.map(w => { const tot = w.UE1 + w.UE2 + w.UE4; return `<div class="wb" title="${esc(fmtDate(w.mon, { noDay: true }))} : ${fmtH(tot)}"><div class="stack" style="height:${(tot / maxW * 100).toFixed(1)}%">${['UE4', 'UE2', 'UE1'].map(u => w[u] ? `<i class="${u}" style="height:${(w[u] / tot * 100).toFixed(1)}%"></i>` : '').join('')}</div><span class="num small">${tot ? Math.round(tot) : ''}</span><span class="small muted">${Number(w.mon.slice(8))}/${Number(w.mon.slice(5, 7))}</span></div>`; }).join('')}</div>
  </article>
  <div class="cols">
    <div class="col">
      <article class="card"><header><h2>Répartition par activité</h2></header>
        ${Object.keys(TYPE_LABEL).map(k => `<div class="hrow"><span>${esc(TYPE_LABEL[k])}</span>${bar(total ? (byType[k] || 0) / total : 0)}<span class="num">${fmtH(byType[k] || 0)}</span></div>`).join('')}
      </article>
      <article class="card"><header><h2>Thèmes délaissés ou fragiles</h2></header>
        ${negl.length || wk.length ? `<ul class="list">${[...negl.map(x => ({ ...x, why: `${diffDays(x.p.last, t)} j sans révision` })), ...wk.map(x => ({ ...x, why: `maîtrise ${x.p.mastery}/5` }))].slice(0, 12).map(x => `<li><span class="dot ${x.t.ue}"></span><span class="grow">${esc(x.t.num)} ${esc(x.t.title)}</span><span class="tag">${esc(x.why)}</span></li>`).join('')}</ul>` : '<p class="muted">Rien à signaler.</p>'}
      </article>
    </div>
    <div class="col">
      <article class="card"><header><h2>Exports</h2></header>
        <div class="row wrap"><button class="btn" id="csv">Journal (CSV)</button><button class="btn" id="pdf">Rapport (PDF)</button></div>
        <p class="muted small">La sauvegarde complète (JSON) se trouve dans Réglages.</p>
      </article>
    </div>
  </div>
  <article class="card">
    <header><h2>Journal des séances</h2><button class="btn sm primary" id="add">Ajouter une séance</button></header>
    ${recent.length ? `<table class="t stack"><thead><tr><th>Date</th><th>Activité</th><th>Thème</th><th class="r">Durée</th><th class="r">Maîtrise</th><th></th></tr></thead><tbody>
      ${recent.map(x => `<tr><td>${esc(fmtDate(x.date, { noDay: true }))}${x.start ? ' <span class="muted">' + esc(x.start) + '</span>' : ''}</td><td>${esc(TYPE_LABEL[x.type] || x.type)}</td><td><span class="dot ${x.ue}"></span>${esc(x.topicId ? TOPIC_BY_ID[x.topicId]?.num + ' ' + TOPIC_BY_ID[x.topicId]?.title : (x.note || UE_BY_ID[x.ue]?.code || ''))}</td><td class="r num">${fmtH(x.minutes / 60)}</td><td class="r num">${x.quality != null ? x.quality + '/5' : '–'}</td><td><button class="btn sm ghost" data-del="${x.id}">Suppr.</button></td></tr>`).join('')}
    </tbody></table>${all.length > 40 ? `<p class="muted small">40 dernières séances affichées sur ${all.length} (toutes dans l'export CSV).</p>` : ''}` : '<p class="muted">Aucune séance. Lance le chrono ou saisis une séance.</p>'}
  </article>`;

  root.querySelector('#add').onclick = () => logSessionModal();
  root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => confirmBox('Supprimer cette séance du journal ?', () => { deleteSession(b.dataset.del); window.dispatchEvent(new Event('refresh')); }, 'Supprimer'));
  root.querySelector('#csv').onclick = () => download(`journal-dscg-${t}.csv`, toCSV(all));
  root.querySelector('#pdf').onclick = () => pdfReport();
}

function toCSV(all) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Date', 'Début', 'Minutes', 'UE', 'Sous-thème', 'Intitulé', 'Activité', 'Maîtrise', 'Note'].map(q).join(';')];
  for (const x of all) { const tp = x.topicId ? TOPIC_BY_ID[x.topicId] : null; rows.push([x.date, x.start, x.minutes, UE_BY_ID[x.ue]?.code, tp?.num, tp?.title, TYPE_LABEL[x.type] || x.type, x.quality, x.note].map(q).join(';')); }
  return '﻿' + rows.join('\r\n');
}

function pdfReport() {
  const J = window.jspdf && window.jspdf.jsPDF;
  if (!J) { toast('Module PDF indisponible'); return; }
  const doc = new J({ unit: 'mm', format: 'a4' });
  const t = today(); const s = state.settings; let y = 18;
  const line = (txt, size = 10, bold = false) => { if (y > 280) { doc.addPage(); y = 18; } doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.text(String(txt), 14, y); y += size * 0.5 + 2; };
  line('Cockpit DSCG 2027 — rapport de progression', 16, true);
  line(`Édité le ${fmtDate(t, { year: true })} · épreuves dans ${diffDays(t, s.examDate)} jours · objectif ${s.objective}/20`, 10);
  y += 3;
  const hrs = hoursByTopic(null);
  for (const u of UES) {
    const h = sessionsAll().filter(x => x.ue === u.id && x.type !== 'cnam').reduce((a, x) => a + x.minutes, 0) / 60;
    line(`${u.code} — ${u.name}`, 12, true);
    line(`${fmtH(h)} travaillées · ${Math.round(ueAvancement(u.id) * 100)} % des étapes · coef. ${String(u.coef).replace('.', ',')}`, 10);
    for (const p of u.parts) for (const c of p.chapters) {
      const subs = c.subs.filter(topicActive); if (!subs.length) continue;
      line(`${c.num} ${c.title}`, 9, true);
      for (const x of subs) { const pr = state.progress[x.id] || {}; const st = pr.steps || {}; const marks = ['cours', 'fiche', 'exos', 'annales', 'memo'].map(k => st[k] ? 'x' : '·').join(' '); line(`   ${x.num} ${x.title.slice(0, 60)}  [${marks}]  maîtrise ${pr.mastery ?? '–'}/5  ${fmtH(hrs[x.id] || 0)}`, 8); }
    }
    y += 2;
  }
  const ex = [...state.exams].sort((a, b) => a.date.localeCompare(b.date));
  if (ex.length) { line('Examens blancs', 12, true); ex.forEach(e => line(`${e.date}  ${UE_BY_ID[e.ue].code}  ${e.subject}  ${e.grade}/20`, 9)); }
  line('Étapes : cours · fiche · exercices · annales · mémorisation', 8);
  const out = doc.output('arraybuffer');
  download(`rapport-dscg-${t}.pdf`, out);
}
