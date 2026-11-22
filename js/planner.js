import { UES, TOPICS, TOPIC_BY_ID, CHAPTER_BY_ID } from './programme.js';
import { CNAM_DAYS, CNAM_CODES, FERIES } from './cnam.js';
import { state, sessionsAll } from './store.js';

// ---------- dates ----------
export const pad = n => String(n).padStart(2, '0');
export const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return dkey(d); };
export const today = () => dkey(new Date());
export const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
export const mondayOf = k => { const d = parse(k); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return dkey(d); };
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
export const fmtDate = (k, opts = {}) => {
  const d = parse(k);
  const s = `${opts.noDay ? '' : DAYS[d.getDay()] + ' '}${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return opts.year ? `${s} ${d.getFullYear()}` : s;
};
export const dayShort = k => DAYS[parse(k).getDay()].slice(0, 3);
export const fmtH = h => {
  let m = Math.round(h * 60);
  if (m < 60) return `${m}\u00a0min`;
  m = Math.round(m / 5) * 5;
  return `${Math.floor(m / 60)}\u00a0h${m % 60 ? '\u00a0' + pad(m % 60) : ''}`;
};

// ---------- répétition espacée (intervalles fixes) ----------
export const INTERVALS = [1, 3, 7, 15, 30];
export function nextReview(prev, quality, from = today()) {
  // quality : 0-5 (auto-évaluation). <=2 : on repart à J+1
  let i = prev ? prev.i : -1;
  i = quality <= 2 ? 0 : Math.min(i + 1, INTERVALS.length - 1);
  return { i, due: addDays(from, INTERVALS[i]), q: quality };
}

// ---------- CNAM ----------
export function cnamOn(k) {
  const slots = CNAM_DAYS[k];
  if (!slots) return null;
  return slots.map(([code, start, end]) => ({ code, start, end, ue: code ? CNAM_CODES[code].ue : null, label: code ? CNAM_CODES[code].label : 'Cours (UE non précisée)' }));
}

// ---------- capacité ----------
function inRanges(k, ranges) { return ranges.find(r => r.from && r.to && k >= r.from && k <= r.to); }
export function capacityFor(k) {
  const s = state.settings;
  const vac = inRanges(k, s.vacations || []);
  if (vac) return { h: Number(vac.hours || 0), why: vac.label || 'Congés' };
  let h; let why = '';
  if (CNAM_DAYS[k]) { h = s.cnamEvening; why = 'Cours CNAM'; }
  else if (FERIES.includes(k)) { h = s.ferieHours; why = 'Férié'; }
  else h = Number(s.capacity[parse(k).getDay()] || 0);
  const light = inRanges(k, s.lightWeeks || []);
  if (light) { h = h * (Number(light.factor || 100) / 100); why = why || (light.label || 'Semaine allégée'); }
  return { h: Math.max(0, h), why };
}

// ---------- cibles ----------
const LEARN_TYPES = new Set(['cours', 'fiche', 'exos']);
export function topicActive(t) { return state.settings.prereq || !t.prereq; }
export function topicTarget(t) {
  const s = state.settings;
  const ch = CHAPTER_BY_ID[t.chapter];
  const chHours = s.estHours[ch.id] != null ? Number(s.estHours[ch.id]) : ch.hours;
  let h = (chHours / ch.subs.length) * (t.prereq ? 1 : Number(s.selfRatio ?? 1));
  h *= (s.ueWeight[t.ue] || 1);
  if (t.lacune) h *= 1 + Number(s.lacuneBoost || 0);
  return Math.round(h * 100) / 100;
}
export function hoursByTopic(types = LEARN_TYPES) {
  const m = {};
  for (const x of sessionsAll()) if (x.topicId && (!types || types.has(x.type))) m[x.topicId] = (m[x.topicId] || 0) + x.minutes / 60;
  return m;
}
export function topicDone(t) {
  const p = state.progress[t.id];
  return !!(p && p.steps && p.steps.cours && p.steps.fiche && p.steps.exos);
}
export function remainingByTopic() {
  const done = hoursByTopic();
  const out = {};
  for (const t of TOPICS) {
    if (!topicActive(t)) continue;
    out[t.id] = topicDone(t) ? 0 : Math.max(0, topicTarget(t) - (done[t.id] || 0));
  }
  return out;
}
export function stepProgress(t) {
  const p = state.progress[t.id];
  if (!p || !p.steps) return 0;
  return ['cours', 'fiche', 'exos', 'annales', 'memo'].filter(s => p.steps[s]).length / 5;
}

// ---------- génération du planning ----------
// Recalculé à chaque affichage à partir du travail restant : une séance manquée
// laisse ses heures « à faire » et se répartit automatiquement sur les jours suivants.
export function buildPlan(opts = {}) {
  const s = state.settings;
  const start = opts.from || today();
  const end = s.deadline;
  const rem = remainingByTopic();
  const queue = {};
  for (const ue of UES) {
    const list = TOPICS.filter(t => t.ue === ue.id && rem[t.id] > 0.01);
    // priorité : prérequis, puis ce qui a été vu au CNAM (le plus récent d'abord), puis l'ordre du programme
    list.sort((a, b) => {
      if (a.prereq !== b.prereq) return a.prereq ? -1 : 1;
      const ca = state.progress[a.id]?.cnam || '', cb = state.progress[b.id]?.cnam || '';
      if (ca !== cb) return cb.localeCompare(ca);
      return TOPICS.indexOf(a) - TOPICS.indexOf(b);
    });
    queue[ue.id] = list.map(t => ({ id: t.id, left: rem[t.id] }));
  }
  const ueLeft = id => queue[id].reduce((a, x) => a + x.left, 0);
  const totalRem = Object.values(rem).reduce((a, b) => a + b, 0);
  const share = {}; const alloc = {};
  for (const ue of UES) { share[ue.id] = ueLeft(ue.id) / (totalRem || 1); alloc[ue.id] = 0; }

  const days = {};
  let capTotal = 0; let finish = null; let k = start;
  let uncoveredAtDeadline = start > end ? totalRem : null;
  const horizon = opts.until || s.examDate;
  const reviewDueToday = dueReviews(start).length + dueCards(start).length;
  while (k <= horizon) {
    const cap = capacityFor(k);
    const phase = k <= end ? 1 : 2;
    const day = { key: k, cap: cap.h, why: cap.why, cnam: cnamOn(k), blocks: [], review: 0, phase };
    if (cap.h > 0) {
      let reviewH = cap.h * s.reviewShare;
      if (k === start) reviewH = Math.min(cap.h * 0.5, Math.max(reviewH, reviewDueToday * 0.2));
      day.review = Math.round(reviewH * 4) / 4;
      let left = cap.h - day.review;
      if (phase === 1) capTotal += left;
      const usedUE = new Set();
      let guard = 0;
      while (left > 0.24 && guard++ < 12) {
        const cands = UES.map(u => u.id).filter(id => ueLeft(id) > 0.01);
        if (!cands.length) break;
        cands.sort((a, b) => {
          const ua = usedUE.has(a) ? 1 : 0, ub = usedUE.has(b) ? 1 : 0;
          if (ua !== ub) return ua - ub;
          return (alloc[a] / (share[a] || 1e-6)) - (alloc[b] / (share[b] || 1e-6));
        });
        const ue = cands[0];
        let blockLeft = Math.min(left, s.blockMax);
        while (blockLeft > 0.24 && queue[ue].length) {
          const item = queue[ue][0];
          const h = Math.min(item.left, blockLeft);
          const hq = Math.max(0.25, Math.round(h * 4) / 4);
          day.blocks.push({ ue, topicId: item.id, hours: hq });
          item.left -= h; blockLeft -= h; left -= h; alloc[ue] += h;
          if (item.left <= 0.01) queue[ue].shift();
        }
        usedUE.add(ue);
      }
      if (!finish && UES.every(u => ueLeft(u.id) <= 0.01)) finish = k;
      if (k === end) uncoveredAtDeadline = UES.reduce((a, u) => a + ueLeft(u.id), 0);
      if (phase === 2 && !day.blocks.length) day.phase2 = phase2Suggestion(k, cap.h);
    }
    if (k === end && uncoveredAtDeadline == null) uncoveredAtDeadline = UES.reduce((a, u) => a + ueLeft(u.id), 0);
    days[k] = day;
    k = addDays(k, 1);
  }
  const uncoveredAtExam = UES.reduce((a, u) => a + ueLeft(u.id), 0);
  const uncovered = uncoveredAtDeadline ?? uncoveredAtExam;
  return { days, totalRem, capTotal, finish, uncovered, uncoveredAtExam, rem };
}

function phase2Suggestion(k, h) {
  const d = parse(k).getDay();
  const rot = ['UE1', 'UE4', 'UE2'];
  if (d === 6 && h >= 3) {
    const wk = Math.floor(diffDays('2027-06-05', k) / 7);
    const ue = rot[((wk % 3) + 3) % 3];
    return { kind: 'exam', ue, label: `Examen blanc ${ue.replace('UE', 'UE ')} chronométré` };
  }
  return { kind: 'revision', label: 'Révisions ciblées (thèmes faibles) + annales par thème' };
}

// ---------- révisions dues ----------
export function dueReviews(k = today()) {
  return TOPICS.filter(t => topicActive(t)).map(t => ({ t, p: state.progress[t.id] })).filter(x => x.p && x.p.review && x.p.review.due <= k)
    .sort((a, b) => a.p.review.due.localeCompare(b.p.review.due));
}
export function dueCards(k = today(), ue = null) {
  const out = [];
  for (const [u, list] of Object.entries(state.cards)) if (!ue || ue === u) for (const c of list) if (!c.due || c.due <= k) out.push(c);
  return out;
}

// ---------- statistiques ----------
export function streak() {
  const byDay = {};
  for (const x of sessionsAll()) byDay[x.date] = (byDay[x.date] || 0) + x.minutes;
  let k = today(); let n = 0;
  if (!(byDay[k] >= 30)) k = addDays(k, -1);
  while (byDay[k] >= 30) { n++; k = addDays(k, -1); }
  return n;
}
export function weekStats(k = today()) {
  const mon = mondayOf(k);
  let goal = 0; let done = 0;
  for (let i = 0; i < 7; i++) goal += capacityFor(addDays(mon, i)).h;
  for (const x of sessionsAll()) if (x.date >= mon && x.date <= addDays(mon, 6) && x.type !== 'cnam') done += x.minutes / 60;
  return { mon, goal, done };
}
export function missedLast7() {
  const t = today(); let cap = 0; let done = 0;
  for (let i = 1; i <= 7; i++) { const k = addDays(t, -i); if (k < state.settings.startDate) continue; cap += capacityFor(k).h; }
  for (const x of sessionsAll()) if (x.date < t && x.date >= addDays(t, -7) && x.type !== 'cnam') done += x.minutes / 60;
  return Math.max(0, cap - done);
}
export function neglected(days = 14) {
  const t = today();
  return TOPICS.filter(topicActive).map(tp => ({ t: tp, p: state.progress[tp.id] }))
    .filter(x => x.p && x.p.last && diffDays(x.p.last, t) >= days && !(x.p.review && x.p.review.due > t))
    .sort((a, b) => a.p.last.localeCompare(b.p.last));
}
export function weak() {
  return TOPICS.filter(topicActive).map(tp => ({ t: tp, p: state.progress[tp.id] }))
    .filter(x => x.p && x.p.mastery != null && x.p.mastery <= 2);
}
export function ueAvancement(ueId) {
  const ts = TOPICS.filter(t => t.ue === ueId && topicActive(t));
  const w = ts.reduce((a, t) => a + topicTarget(t), 0);
  const v = ts.reduce((a, t) => a + topicTarget(t) * stepProgress(t), 0);
  return w ? v / w : 0;
}
export { TOPIC_BY_ID };
