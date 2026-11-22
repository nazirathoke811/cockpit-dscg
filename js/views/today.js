import { UE_BY_ID, TOPIC_BY_ID, TOPICS } from '../programme.js';
import { state, prog, saveProgress, sync, getConfig } from '../store.js';
import { today, fmtDate, fmtH, buildPlan, dueReviews, dueCards, streak, weekStats, missedLast7, neglected, weak, diffDays, nextReview, cnamOn, addDays, topicActive, dayShort } from '../planner.js';
import { esc, ring, bar, modal, toast } from '../ui.js';
import { startTimerModal, logSessionModal, masteryOptions } from '../timer.js';

export function render(root) {
  const s = state.settings; const t = today();
  const plan = buildPlan();
  const week7 = Array.from({ length: 7 }, (_, i) => plan.days[addDays(t, i)]).filter(Boolean);
  const day = plan.days[t];
  const reviews = dueReviews(t);
  const cards = dueCards(t);
  const wk = weekStats(t);
  const st = streak();
  const missed = missedLast7();
  const negl = neglected().slice(0, 4);
  const wk_ = weak().slice(0, 4);
  const jExam = diffDays(t, s.examDate); const jDead = diffDays(t, s.deadline);
  const cnam = cnamOn(t);

  root.innerHTML = `
  <section class="hero">
    <div>
      <p class="eyebrow">${esc(fmtDate(t, { year: true }))}</p>
      <h1>${day && day.blocks.length ? `Aujourd'hui : ${fmtH(day.cap)} de travail prévu` : cnam ? 'Journée CNAM' : 'Pas de séance planifiée aujourd\'hui'}</h1>
      <p class="lead">${jDead >= 0 ? `Programme à boucler dans <b>${jDead} jours</b> (${esc(fmtDate(s.deadline, { noDay: true }))}).` : 'Phase annales et examens blancs.'} Épreuves dans <b>${jExam} jours</b>.</p>
    </div>
    <div class="kpis">
      <div class="kpi">${ring(wk.goal ? wk.done / wk.goal : 0, 72, 'Objectif de la semaine')}<div><b class="num">${fmtH(wk.done)}</b><span>sur ${fmtH(wk.goal)} cette semaine</span></div></div>
      <div class="kpi"><div class="big num">${st}</div><div><b>jour${st > 1 ? 's' : ''} d'affilée</b><span>≥ 30 min par jour</span></div></div>
    </div>
  </section>

  ${sync.mode !== 'cloud' ? `<div class="note">${getConfig() ? 'Tu n\'es pas connectée : tes données restent sur cet ordinateur.' : 'Synchronisation en ligne non activée : tes données restent sur cet ordinateur.'} <a href="#reglages">${getConfig() ? 'Se connecter' : 'Configurer'}</a></div>` : ''}
  ${missed >= 1 ? `<div class="note warn">Sur les 7 derniers jours, ${fmtH(missed)} prévues n'ont pas été faites. Elles sont reportées automatiquement dans le planning.</div>` : ''}

  <div class="cols">
    <div class="col">
      ${cnam ? `<article class="card">
        <header><h2>Cours au CNAM</h2></header>
        <ul class="slots">${cnam.map(c => `<li><span class="time num">${c.start}–${c.end}</span>${c.ue ? `<span class="dot ${c.ue}"></span>` : ''}<span>${esc(c.code || '')} ${esc(c.label)}</span></li>`).join('')}</ul>
        <p class="muted small">Ce soir, une reprise à chaud de ${fmtH(s.cnamEvening)} est prévue. Note ce qui a été traité en cours : ces thèmes passent en tête du planning et entrent en révision J+1.</p>
        <button class="btn" id="cnamSeen">Noter ce qui a été vu en cours</button>
      </article>` : ''}

      <article class="card">
        <header><h2>Séance du jour</h2><span class="muted small">${day ? esc(day.why || '') : ''}</span></header>
        ${day && (day.blocks.length || day.review) ? `
        <ol class="blocks">
          ${day.review ? `<li class="blk rev"><div><b>Révisions espacées</b><span class="muted">${reviews.length} thème${reviews.length > 1 ? 's' : ''} · ${cards.length} flashcard${cards.length > 1 ? 's' : ''}</span></div><span class="num">${fmtH(day.review)}</span><a class="btn sm" href="#revisions">Réviser</a></li>` : ''}
          ${day.blocks.map((b, i) => { const tp = TOPIC_BY_ID[b.topicId]; const p = state.progress[b.topicId]; const next = nextStep(p);
            return `<li class="blk"><span class="dot ${b.ue}"></span><div><b>${esc(tp.num)} ${esc(tp.title)}</b><span class="muted">${esc(UE_BY_ID[b.ue].code)} · ${esc(next.label)}</span></div><span class="num">${fmtH(b.hours)}</span>
            <span class="row"><button class="btn sm primary" data-start="${i}">Lancer</button><button class="btn sm ghost" data-log="${i}">Saisir</button></span></li>`; }).join('')}
        </ol>` : day && day.phase2 ? `<p>${esc(day.phase2.label)}</p>` : `<p class="muted">Aucun créneau aujourd'hui${day && day.why ? ' (' + esc(day.why) + ')' : ''}. Tu peux quand même lancer une séance avec le bouton en haut.</p>`}
        ${plan.uncovered > 0.5 ? `<p class="note warn small">${fmtH(plan.uncovered)} de programme ne tiennent pas avant le ${esc(fmtDate(s.deadline, { noDay: true }))} avec tes créneaux actuels. Voir Planning.</p>` : ''}
      </article>

      <article class="card">
        <header><h2>Révisions dues</h2><span class="muted small">J+1, J+3, J+7, J+15, J+30</span></header>
        ${reviews.length ? `<ul class="list">${reviews.slice(0, 8).map(({ t: tp, p }) => `<li><span class="dot ${tp.ue}"></span><span class="grow">${esc(tp.num)} ${esc(tp.title)}<span class="muted small"> · prévue ${p.review.due === t ? 'aujourd\'hui' : 'le ' + esc(fmtDate(p.review.due, { noDay: true }))}</span></span><button class="btn sm" data-rev="${tp.id}">Réviser</button></li>`).join('')}</ul>
        ${reviews.length > 8 ? `<p class="muted small">+ ${reviews.length - 8} autres dans Révisions.</p>` : ''}` : '<p class="muted">Rien à réviser aujourd\'hui. Chaque séance enregistrée programme sa première révision à J+1.</p>'}
        ${cards.length ? `<a class="btn" href="#revisions">Réviser ${cards.length} flashcard${cards.length > 1 ? 's' : ''}</a>` : ''}
      </article>
    </div>

    <div class="col">
      <article class="card">
        <header><h2>Avancement</h2></header>
        ${['UE1', 'UE2', 'UE4'].map(u => { const ue = UE_BY_ID[u]; const ts = TOPICS.filter(x => x.ue === u && topicActive(x)); const done = ts.filter(x => { const p = state.progress[x.id]; return p && p.steps && p.steps.cours && p.steps.fiche && p.steps.exos; }).length;
          return `<div class="uep"><div class="row between"><span>${`<span class="dot ${u}"></span>`} ${esc(ue.code)} · ${esc(ue.short)}</span><span class="num muted">${done}/${ts.length} thèmes</span></div>${bar(done / ts.length, u)}</div>`; }).join('')}
      </article>

      <article class="card">
        <header><h2>Cette semaine</h2></header>
        <ul class="week">${week7.map(d => `<li class="${d.key === t ? 'is-today' : ''}"><span class="wd">${esc(dayShort(d.key))}</span><span class="num">${Number(d.key.slice(8))}</span>
          <span class="chips">${d.cnam ? '<i class="chip cnam" title="CNAM">C</i>' : ''}${d.blocks.map(b => `<i class="chip ${b.ue}" title="${esc(TOPIC_BY_ID[b.topicId].title)}"></i>`).join('')}</span><span class="num muted">${d.cap ? fmtH(d.cap) : '—'}</span></li>`).join('')}</ul>
      </article>

      ${negl.length || wk_.length ? `<article class="card">
        <header><h2>À surveiller</h2></header>
        ${negl.length ? `<p class="muted small">Pas revus depuis plus de 14 jours</p><ul class="list">${negl.map(({ t: tp, p }) => `<li><span class="dot ${tp.ue}"></span><span class="grow">${esc(tp.num)} ${esc(tp.title)}</span><span class="muted small">${diffDays(p.last, t)} j</span></li>`).join('')}</ul>` : ''}
        ${wk_.length ? `<p class="muted small">Maîtrise ≤ 2/5</p><ul class="list">${wk_.map(({ t: tp, p }) => `<li><span class="dot ${tp.ue}"></span><span class="grow">${esc(tp.num)} ${esc(tp.title)}</span><span class="tag">${p.mastery}/5</span></li>`).join('')}</ul>` : ''}
      </article>` : ''}
    </div>
  </div>`;

  root.querySelectorAll('[data-start]').forEach(b => b.onclick = () => { const bl = day.blocks[+b.dataset.start]; startTimerModal({ topicId: bl.topicId, type: nextStep(state.progress[bl.topicId]).id }); });
  root.querySelectorAll('[data-log]').forEach(b => b.onclick = () => { const bl = day.blocks[+b.dataset.log]; logSessionModal({ topicId: bl.topicId, minutes: Math.round(bl.hours * 60), type: nextStep(state.progress[bl.topicId]).id }); });
  root.querySelectorAll('[data-rev]').forEach(b => b.onclick = () => reviewModal(b.dataset.rev));
  const cs = root.querySelector('#cnamSeen'); if (cs) cs.onclick = () => cnamSeenModal(cnam);
}

export function nextStep(p) {
  const order = [['cours', 'Comprendre le cours'], ['fiche', 'Faire la fiche de synthèse'], ['exos', 'Exercices d\'application'], ['memo', 'Mémorisation active'], ['annales', 'Annales']];
  const s = p && p.steps ? p.steps : {};
  const n = order.find(([id]) => !s[id]) || order[3];
  return { id: n[0], label: n[1] };
}

export function reviewModal(topicId) {
  const tp = TOPIC_BY_ID[topicId]; const p = prog(topicId);
  modal(`<h3>Révision · ${esc(tp.num)} ${esc(tp.title)}</h3>
    <p class="muted small">Récite sans support, refais un exercice court ou passe les flashcards du thème, puis évalue-toi honnêtement.</p>
    <ul class="items">${tp.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    <form id="rf" class="form">
      <label>Maîtrise après révision<select name="q">${masteryOptions(p.mastery ?? 3)}</select></label>
      <label>Durée (min)<input type="number" name="min" value="20" min="1" max="240"></label>
      <div class="row end"><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn primary">Valider la révision</button></div>
    </form>`, (root, close) => {
    root.querySelector('#rf').onsubmit = async e => {
      e.preventDefault();
      const q = Number(e.target.q.value); const min = Number(e.target.min.value) || 0;
      const { addSession, uid } = await import('../store.js');
      if (min > 0) addSession({ id: uid(), date: today(), start: '', minutes: min, type: 'revision', ue: tp.ue, topicId, quality: q, note: '' });
      p.mastery = q; p.last = today(); p.review = nextReview(p.review, q);
      saveProgress(); close();
      toast(`Prochaine révision le ${p.review.due.split('-').reverse().join('/')}`);
      window.dispatchEvent(new Event('refresh'));
    };
  });
}

function cnamSeenModal(slots) {
  const ues = [...new Set(slots.map(s => s.ue).filter(Boolean))];
  const list = TOPICS.filter(t => ues.includes(t.ue) && topicActive(t));
  modal(`<h3>Vu en cours aujourd'hui</h3>
    <p class="muted small">Coche les thèmes traités. L'étape « Cours » n'est pas cochée automatiquement : un cours entendu n'est pas un cours compris.</p>
    <form id="cf" class="form"><div class="checklist">${list.map(t => `<label class="chk"><input type="checkbox" name="t" value="${t.id}" ${state.progress[t.id]?.cnam === today() ? 'checked' : ''}> <span class="dot ${t.ue}"></span> ${esc(t.num)} ${esc(t.title)}</label>`).join('')}</div>
    <div class="row end"><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn primary">Enregistrer</button></div></form>`, (root, close) => {
    root.querySelector('#cf').onsubmit = e => {
      e.preventDefault();
      const ids = [...e.target.querySelectorAll('input[name=t]:checked')].map(i => i.value);
      ids.forEach(id => { const p = prog(id); p.cnam = today(); if (!p.review) p.review = nextReview(null, 3); if (!p.last) p.last = today(); });
      saveProgress(); close(); toast(`${ids.length} thème(s) marqué(s) : révision J+1 programmée`);
      window.dispatchEvent(new Event('refresh'));
    };
  });
}
