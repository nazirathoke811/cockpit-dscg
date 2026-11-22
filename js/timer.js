import { UES, TOPIC_BY_ID, STEPS } from './programme.js';
import { state, addSession, prog, saveProgress, uid, timerGet, timerSet } from './store.js';
import { today, nextReview, pad, topicActive } from './planner.js';
import { esc, modal, toast, opt, $ } from './ui.js';

export const TYPES = [
  ['cours', 'Compréhension du cours'], ['fiche', 'Fiche de synthèse'], ['exos', 'Exercices d\'application'],
  ['annales', 'Annales / sujet zéro'], ['memo', 'Mémorisation active'], ['revision', 'Révision espacée'], ['examen', 'Examen blanc'],
];
export const TYPE_LABEL = Object.fromEntries(TYPES);

export function topicOptions(sel, ueFilter = null) {
  return UES.filter(u => !ueFilter || u.id === ueFilter).map(u => u.parts.map(p => p.chapters.map(c => {
    const subs = c.subs.filter(topicActive);
    if (!subs.length) return '';
    return `<optgroup label="${esc(u.code + ' · ' + c.num + ' ' + c.title)}">${subs.map(t => opt(t.id, `${t.num} ${t.title}`, sel)).join('')}</optgroup>`;
  }).join('')).join('')).join('');
}

const MASTERY = ['0 · Rien retenu', '1 · Très flou', '2 · Fragile', '3 · Correct', '4 · Solide', '5 · Parfait'];
export const masteryOptions = sel => MASTERY.map((l, i) => opt(i, l, sel)).join('');

export function logSessionModal(preset = {}, onDone) {
  const now = new Date();
  const t = preset.topicId ? TOPIC_BY_ID[preset.topicId] : null;
  modal(`
    <h3>${preset.fromTimer ? 'Séance terminée' : 'Ajouter une séance'}</h3>
    <form id="lf" class="form">
      <div class="grid2">
        <label>Date<input type="date" name="date" value="${preset.date || today()}" required></label>
        <label>Début<input type="time" name="start" value="${preset.start || pad(now.getHours()) + ':' + pad(now.getMinutes())}"></label>
        <label>Durée (min)<input type="number" name="minutes" min="1" max="600" value="${preset.minutes || 60}" required></label>
        <label>Activité<select name="type">${TYPES.map(([v, l]) => opt(v, l, preset.type || 'cours')).join('')}</select></label>
      </div>
      <label>Thème<select name="topicId" required>${topicOptions(preset.topicId || '')}</select></label>
      <label>Maîtrise ressentie après la séance<select name="quality">${masteryOptions(preset.quality ?? (t && state.progress[t.id]?.mastery) ?? 3)}</select></label>
      <fieldset class="steps-inline"><legend>Étapes terminées pour ce thème</legend>
        ${STEPS.map(s => `<label class="chk"><input type="checkbox" name="step_${s.id}" ${t && state.progress[t.id]?.steps?.[s.id] ? 'checked' : ''}> ${s.label}</label>`).join('')}
      </fieldset>
      <label>Note libre<input name="note" maxlength="300" placeholder="Ce que j'ai fait, ce qui bloque…" value="${esc(preset.note || '')}"></label>
      <p class="err" id="lferr" hidden></p>
      <div class="row end"><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn primary">Enregistrer</button></div>
    </form>`, (root, close) => {
    const f = root.querySelector('#lf');
    f.topicId.addEventListener('change', () => {
      const p = state.progress[f.topicId.value];
      STEPS.forEach(s => { f['step_' + s.id].checked = !!p?.steps?.[s.id]; });
      if (p && p.mastery != null) f.quality.value = p.mastery;
    });
    if (!preset.topicId) f.topicId.dispatchEvent(new Event('change'));
    f.onsubmit = e => {
      e.preventDefault();
      const minutes = Number(f.minutes.value);
      if (!(minutes > 0)) { const er = root.querySelector('#lferr'); er.hidden = false; er.textContent = 'Indique une durée en minutes.'; return; }
      const topicId = f.topicId.value; const tp = TOPIC_BY_ID[topicId];
      const q = Number(f.quality.value);
      const s = { id: uid(), date: f.date.value, start: f.start.value, minutes, type: f.type.value, ue: tp.ue, topicId, quality: q, note: f.note.value.trim() };
      addSession(s);
      const p = prog(topicId);
      STEPS.forEach(st => { p.steps[st.id] = f['step_' + st.id].checked; });
      p.mastery = q;
      if (!p.last || s.date >= p.last) p.last = s.date;
      if (s.type !== 'examen') p.review = nextReview(p.review, q, s.date);
      saveProgress();
      close();
      toast(`Séance enregistrée · prochaine révision le ${p.review ? p.review.due.split('-').reverse().join('/') : '—'}`);
      onDone && onDone();
      window.dispatchEvent(new Event('refresh'));
    };
  });
}

// ---------- chronomètre / Pomodoro (barre du haut) ----------
let tick = null;
function elapsed(tm) { return (tm.acc || 0) + (tm.running ? Date.now() - tm.startedAt : 0); }
function fmt(ms) { const s = Math.max(0, Math.round(ms / 1000)); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; }

export function renderTimer() {
  const el = $('#timer');
  const tm = timerGet();
  if (!tm) {
    el.innerHTML = `<button class="btn sm" id="tStart" title="Démarrer une séance chronométrée">Démarrer une séance</button>`;
    el.querySelector('#tStart').onclick = () => startTimerModal();
    clearInterval(tick); tick = null;
    return;
  }
  const t = TOPIC_BY_ID[tm.topicId];
  el.innerHTML = `<div class="tmr ${tm.running ? 'on' : ''}">
    <span class="dot ${t.ue}"></span>
    <span class="tm-topic" title="${esc(t.title)}">${esc(t.num)} · ${esc(TYPE_LABEL[tm.type])}</span>
    <b id="tClock" class="num">${fmt(tm.mode === 'pomo' ? pomoLeft(tm) : elapsed(tm))}</b>
    ${tm.mode === 'pomo' ? `<span class="tag">${tm.phase === 'work' ? 'Focus' : 'Pause'} ${tm.cycle}</span>` : ''}
    <button class="btn sm" id="tPause">${tm.running ? 'Pause' : 'Reprendre'}</button>
    <button class="btn sm primary" id="tStop">Terminer</button>
  </div>`;
  el.querySelector('#tPause').onclick = () => {
    const x = timerGet();
    if (x.running) { x.acc = elapsed(x); x.running = false; } else { x.running = true; x.startedAt = Date.now(); }
    timerSet(x); renderTimer();
  };
  el.querySelector('#tStop').onclick = () => stopTimer();
  clearInterval(tick);
  tick = setInterval(() => {
    const x = timerGet(); if (!x) return;
    if (x.mode === 'pomo' && x.running && pomoLeft(x) <= 0) {
      const P = state.settings.pomodoro;
      if (x.phase === 'work') { x.work = (x.work || 0) + P.work * 60000; x.phase = 'break'; x.dur = (x.cycle % 4 === 0 ? P.long : P.short) * 60000; toast('Pause !'); }
      else { x.phase = 'work'; x.cycle++; x.dur = P.work * 60000; toast('On reprend'); }
      x.acc = 0; x.startedAt = Date.now(); timerSet(x); renderTimer(); return;
    }
    const c = document.getElementById('tClock');
    if (c) c.textContent = fmt(x.mode === 'pomo' ? pomoLeft(x) : elapsed(x));
  }, 1000);
}
function pomoLeft(tm) { return tm.dur - elapsed(tm); }

export function startTimerModal(preset = {}) {
  if (timerGet()) { toast('Une séance est déjà en cours'); return; }
  const P = state.settings.pomodoro;
  modal(`<h3>Démarrer une séance</h3>
    <form id="tf" class="form">
      <label>Thème<select name="topicId" required>${topicOptions(preset.topicId || '')}</select></label>
      <label>Activité<select name="type">${TYPES.map(([v, l]) => opt(v, l, preset.type || 'cours')).join('')}</select></label>
      <label>Mode<select name="mode">${opt('pomo', `Pomodoro ${P.work} / ${P.short} min`, 'pomo')}${opt('free', 'Chrono libre', '')}</select></label>
      <div class="row end"><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn primary">Lancer</button></div>
    </form>`, (root, close) => {
    const f = root.querySelector('#tf');
    f.onsubmit = e => {
      e.preventDefault();
      timerSet({ topicId: f.topicId.value, type: f.type.value, mode: f.mode.value, running: true, startedAt: Date.now(), acc: 0, began: Date.now(), phase: 'work', cycle: 1, dur: P.work * 60000, work: 0 });
      close(); renderTimer();
    };
  });
}

function stopTimer() {
  const x = timerGet();
  let ms = x.mode === 'pomo' ? (x.work || 0) + (x.phase === 'work' ? elapsed(x) : 0) : elapsed(x);
  const minutes = Math.max(1, Math.round(ms / 60000));
  const b = new Date(x.began);
  timerSet(null); renderTimer();
  logSessionModal({ topicId: x.topicId, type: x.type, minutes, fromTimer: true, date: today(), start: `${pad(b.getHours())}:${pad(b.getMinutes())}` });
}
