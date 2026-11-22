// Persistance « hors ligne d'abord » :
// 1. chaque modification est écrite tout de suite dans le navigateur (localStorage) ;
// 2. dès qu'il y a internet et un compte connecté, elle est envoyée à Supabase (table `docs`) ;
// 3. au démarrage et au retour du réseau, les documents plus récents côté serveur sont récupérés.
// Résolution des conflits : par document, la version la plus récente gagne.

const LS_PREFIX = 'dscg27:';
const META = '__meta';
const CONF = '__supabase';

export const DEFAULT_SETTINGS = {
  examDate: '2027-10-25',
  deadline: '2027-05-31',
  startDate: '2026-11-23',
  objective: 14,
  capacity: { 1: 1.75, 2: 1.75, 3: 1.75, 4: 1.75, 5: 1.75, 6: 5.5, 0: 3 },
  cnamEvening: 1,
  ferieHours: 3,
  vacations: [],
  lightWeeks: [],
  ueWeight: { UE1: 1, UE2: 1, UE4: 1.15 },
  lacuneBoost: 0.3,
  selfRatio: 1,
  prereq: true,
  reviewShare: 0.2,
  blockMax: 2,
  pomodoro: { work: 25, short: 5, long: 15 },
  estHours: {},
  ueGoal: { UE1: 14, UE2: 14, UE4: 14 },
};

export const state = {
  settings: structuredClone(DEFAULT_SETTINGS),
  progress: {},
  cards: { UE1: [], UE2: [], UE4: [] },
  errors: [],
  exams: [],
  sessions: {},
  notes: {},
};

export const sync = { mode: 'local', status: 'idle', uid: null, email: null, message: 'Sauvegarde dans ce navigateur', lastSync: null };

let sb = null;          // client Supabase
let syncTimer = null;
let syncing = false;
const listeners = new Set();

export function onSync(fn) { listeners.add(fn); }
function emitSync() { listeners.forEach(fn => { try { fn(sync); } catch (e) { console.error(e); } }); }

function lsGet(k) { try { const v = localStorage.getItem(LS_PREFIX + k); return v ? JSON.parse(v) : null; } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(LS_PREFIX + k, JSON.stringify(v)); return true; } catch { return false; } }
function lsDel(k) { try { localStorage.removeItem(LS_PREFIX + k); } catch { /* indisponible */ } }
function lsKeys() {
  const out = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(LS_PREFIX)) out.push(k.slice(LS_PREFIX.length)); } } catch { /* indisponible */ }
  return out.filter(k => !k.startsWith('__'));
}
const meta = () => lsGet(META) || {};
const setMeta = m => lsSet(META, m);

function bodyFor(key) {
  if (key === 'settings') return state.settings;
  if (key === 'progress') return { map: state.progress };
  if (key.startsWith('cards_')) return { items: state.cards[key.slice(6)] || [] };
  if (key === 'errors') return { items: state.errors };
  if (key === 'exams') return { items: state.exams };
  if (key.startsWith('sessions_')) return { items: state.sessions[key.slice(9)] || [] };
  if (key.startsWith('note_')) return state.notes[key.slice(5)] || { md: '', links: [] };
  return null;
}

function applyDoc(key, body) {
  if (!body) return;
  if (key === 'settings') state.settings = mergeSettings(body);
  else if (key === 'progress') state.progress = structuredClone(body.map || {});
  else if (key.startsWith('cards_')) state.cards[key.slice(6)] = structuredClone(body.items || []);
  else if (key === 'errors') state.errors = structuredClone(body.items || []);
  else if (key === 'exams') state.exams = structuredClone(body.items || []);
  else if (key.startsWith('sessions_')) state.sessions[key.slice(9)] = structuredClone(body.items || []);
  else if (key.startsWith('note_')) state.notes[key.slice(5)] = structuredClone(body);
}

function mergeSettings(b) {
  const s = structuredClone(DEFAULT_SETTINGS);
  const src = structuredClone(b || {});
  for (const k of Object.keys(src)) {
    if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) s[k] = { ...s[k], ...src[k] };
    else s[k] = src[k];
  }
  return s;
}

export function loadLocal() { for (const k of lsKeys()) applyDoc(k, lsGet(k)); }

// ---------- configuration Supabase ----------
export function getConfig() { return lsGet(CONF); }
export function setConfig(url, anonKey) {
  lsSet(CONF, { url: url.trim().replace(/\/+$/, ''), key: anonKey.trim() });
  sb = null;
}
function client() {
  if (sb) return sb;
  const c = getConfig();
  if (!c || !c.url || !c.key || !window.supabase) return null;
  sb = window.supabase.createClient(c.url, c.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'dscg27-auth' } });
  sb.auth.onAuthStateChange((_e, session) => {
    sync.uid = session?.user?.id || null; sync.email = session?.user?.email || null;
    sync.mode = sync.uid ? 'cloud' : 'local';
    emitSync();
  });
  return sb;
}

export async function signIn(email, password) {
  const c = client(); if (!c) throw new Error('Renseigne d\'abord l\'URL et la clé Supabase');
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(frError(error.message));
  await afterLogin();
}
export async function signUp(email, password) {
  const c = client(); if (!c) throw new Error('Renseigne d\'abord l\'URL et la clé Supabase');
  const { data, error } = await c.auth.signUp({ email, password, options: { emailRedirectTo: location.href.split('#')[0] } });
  if (error) throw new Error(frError(error.message));
  if (!data.session) return 'confirm';
  await afterLogin();
  return 'ok';
}
export async function signOut() {
  const c = client(); if (c) await c.auth.signOut();
  sync.uid = null; sync.email = null; sync.mode = 'local'; sync.status = 'idle'; sync.message = 'Déconnectée : sauvegarde dans ce navigateur';
  emitSync();
}
function frError(m) {
  if (/Invalid login/i.test(m)) return 'E-mail ou mot de passe incorrect';
  if (/Email not confirmed/i.test(m)) return 'E-mail pas encore confirmé : clique sur le lien reçu par e-mail';
  if (/already registered/i.test(m)) return 'Un compte existe déjà avec cet e-mail : connecte-toi';
  if (/Password should be/i.test(m)) return 'Mot de passe trop court (6 caractères minimum)';
  if (/fetch/i.test(m)) return 'Pas de connexion internet';
  return m;
}
async function afterLogin() {
  const m = meta();
  // première connexion : tout ce qui existe localement est à envoyer
  for (const k of lsKeys()) if (!m[k]) m[k] = { u: new Date().toISOString(), dirty: true };
  setMeta(m);
  await syncNow();
}

// ---------- démarrage ----------
export async function init() {
  loadLocal();
  const c = client();
  if (!c) { sync.mode = 'local'; sync.message = 'Synchronisation non configurée (Réglages)'; emitSync(); return; }
  try {
    const { data } = await c.auth.getSession();
    const s = data?.session;
    sync.uid = s?.user?.id || null; sync.email = s?.user?.email || null;
    sync.mode = sync.uid ? 'cloud' : 'local';
    if (!sync.uid) sync.message = 'Non connectée : sauvegarde dans ce navigateur';
  } catch { sync.mode = 'local'; }
  emitSync();
  if (sync.uid) await syncNow();
  window.addEventListener('online', () => syncNow());
  window.addEventListener('offline', () => { sync.status = 'offline'; sync.message = 'Hors ligne : les modifications seront envoyées au retour du réseau'; emitSync(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
  setInterval(() => { if (Object.values(meta()).some(x => x.dirty)) syncNow(); }, 60000);
}

// ---------- écriture ----------
export function save(key) {
  const body = bodyFor(key);
  if (!body) return;
  const ok = lsSet(key, body);
  const m = meta(); m[key] = { u: new Date().toISOString(), dirty: true }; setMeta(m);
  if (!ok) { sync.status = 'error'; sync.message = 'Stockage du navigateur plein : exporte une sauvegarde'; emitSync(); }
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncNow(), 1500);
  if (sync.mode === 'cloud') { sync.status = 'saving'; emitSync(); }
}

export async function removeDoc(key) {
  lsDel(key);
  const m = meta(); m[key] = { u: new Date().toISOString(), dirty: true, deleted: true }; setMeta(m);
  clearTimeout(syncTimer); syncTimer = setTimeout(() => syncNow(), 800);
}

// ---------- synchronisation ----------
export async function syncNow() {
  const c = client();
  if (!c || !sync.uid || syncing) return;
  if (!navigator.onLine) { sync.status = 'offline'; sync.message = 'Hors ligne : modifications gardées sur cet ordinateur'; emitSync(); return; }
  syncing = true; sync.status = 'saving'; emitSync();
  let changed = false;
  try {
    // 1. récupérer
    const { data, error } = await c.from('docs').select('key, body, updated_at');
    if (error) throw error;
    const m = meta();
    for (const row of data || []) {
      const loc = m[row.key];
      if (!loc || new Date(row.updated_at) > new Date(loc.u)) {
        applyDoc(row.key, row.body); lsSet(row.key, row.body);
        m[row.key] = { u: row.updated_at, dirty: false };
        changed = true;
      }
    }
    setMeta(m);
    // 2. envoyer
    const dirty = Object.entries(meta()).filter(([, v]) => v.dirty);
    const ups = dirty.filter(([, v]) => !v.deleted).map(([k, v]) => ({ user_id: sync.uid, key: k, body: bodyFor(k), updated_at: v.u })).filter(r => r.body);
    for (let i = 0; i < ups.length; i += 50) {
      const { error: e2 } = await c.from('docs').upsert(ups.slice(i, i + 50), { onConflict: 'user_id,key' });
      if (e2) throw e2;
    }
    const dels = dirty.filter(([, v]) => v.deleted).map(([k]) => k);
    if (dels.length) { const { error: e3 } = await c.from('docs').delete().in('key', dels); if (e3) throw e3; }
    const m2 = meta();
    for (const [k, v] of dirty) if (m2[k] && m2[k].u === v.u) { if (v.deleted) delete m2[k]; else m2[k].dirty = false; }
    setMeta(m2);
    sync.status = 'ok'; sync.lastSync = new Date().toISOString(); sync.message = 'Synchronisé';
  } catch (e) {
    const msg = String(e?.message || e);
    sync.status = /fetch|network/i.test(msg) ? 'offline' : 'error';
    sync.message = sync.status === 'offline' ? 'Serveur injoignable : modifications gardées sur cet ordinateur' : 'Échec de synchronisation : ' + msg;
  }
  syncing = false;
  emitSync();
  if (changed) window.dispatchEvent(new Event('refresh'));
}

// ---- helpers métier ----
export function sessionsAll() {
  return Object.values(state.sessions).flat().sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')));
}
export function addSession(s) {
  const m = s.date.slice(0, 7);
  (state.sessions[m] ||= []).push(s);
  save('sessions_' + m);
}
export function deleteSession(id) {
  for (const m of Object.keys(state.sessions)) {
    const i = state.sessions[m].findIndex(x => x.id === id);
    if (i >= 0) { state.sessions[m].splice(i, 1); save('sessions_' + m); return; }
  }
}
export function prog(topicId) {
  return (state.progress[topicId] ||= { steps: {}, mastery: null, review: null, last: null, cnam: null });
}
export function saveProgress() { save('progress'); }
export function saveSettings() { save('settings'); }
export function saveCards(ue) { save('cards_' + ue); }
export function saveNote(topicId) { save('note_' + topicId); }

export function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

export function exportAll() {
  return JSON.stringify({ app: 'cockpit-dscg-2027', version: 1, exportedAt: new Date().toISOString(), data: state }, null, 1);
}
export function importAll(text) {
  const j = JSON.parse(text);
  const d = j.data || j;
  if (!d || typeof d !== 'object' || !d.settings) throw new Error('Fichier non reconnu');
  state.settings = mergeSettings(d.settings);
  state.progress = d.progress || {};
  state.cards = { UE1: [], UE2: [], UE4: [], ...(d.cards || {}) };
  state.errors = d.errors || [];
  state.exams = d.exams || [];
  state.sessions = d.sessions || {};
  state.notes = d.notes || {};
  allKeys().forEach(save);
}
export function allKeys() {
  return ['settings', 'progress', 'errors', 'exams',
    ...Object.keys(state.cards).map(u => 'cards_' + u),
    ...Object.keys(state.sessions).map(m => 'sessions_' + m),
    ...Object.keys(state.notes).map(t => 'note_' + t)];
}
export function uiGet(k, d) { const u = lsGet('__ui') || {}; return k in u ? u[k] : d; }
export function uiSet(k, v) { const u = lsGet('__ui') || {}; u[k] = v; lsSet('__ui', u); }
export function timerGet() { return lsGet('__timer'); }
export function timerSet(v) { if (v) lsSet('__timer', v); else lsDel('__timer'); }
