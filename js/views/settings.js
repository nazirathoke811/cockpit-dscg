import { UES, CHAPTERS } from '../programme.js';
import { state, saveSettings, exportAll, importAll, sync, DEFAULT_SETTINGS, allKeys, removeDoc, getConfig, setConfig, signIn, signUp, signOut, syncNow } from '../store.js';
import { today, fmtH, capacityFor, addDays, mondayOf } from '../planner.js';
import { esc, toast, download, confirmBox } from '../ui.js';

const WD = [[1, 'Lundi'], [2, 'Mardi'], [3, 'Mercredi'], [4, 'Jeudi'], [5, 'Vendredi'], [6, 'Samedi'], [0, 'Dimanche']];

export function render(root) {
  const s = state.settings;
  const week = WD.reduce((a, [d]) => a + Number(s.capacity[d] || 0), 0);
  const estCh = CHAPTERS.filter(c => c.est);
  const cfg = getConfig();

  root.innerHTML = `
  <section class="pagehead"><h1>Réglages</h1><p class="lead">Tout changement recalcule immédiatement le planning. ${esc(sync.message)}.</p></section>
  <form id="sf" class="cols">
    <div class="col">
      <article class="card"><header><h2>Échéances</h2></header>
        <div class="grid2">
          <label>Fin du programme (1er passage)<input type="date" name="deadline" value="${s.deadline}"></label>
          <label>Date des épreuves<input type="date" name="examDate" value="${s.examDate}"></label>
          <label>Début du suivi<input type="date" name="startDate" value="${s.startDate}"></label>
          <label>Objectif par UE (/20)<input type="number" name="objective" min="10" max="20" step="0.5" value="${s.objective}"></label>
        </div>
        <p class="muted small">Date des épreuves par défaut : semaine marquée « EXAMENS » au calendrier CNAM (25 octobre 2027). À corriger dès la publication du calendrier officiel de la session 2027.</p>
      </article>
      <article class="card"><header><h2>Créneaux de travail personnel</h2><span class="muted num small">${fmtH(week)} par semaine type</span></header>
        <div class="grid4">${WD.map(([d, l]) => `<label>${l}<input type="number" name="cap_${d}" min="0" max="14" step="0.25" value="${s.capacity[d]}"></label>`).join('')}</div>
        <div class="grid2">
          <label>Soir des jours CNAM (h)<input type="number" name="cnamEvening" min="0" max="6" step="0.25" value="${s.cnamEvening}"></label>
          <label>Jours fériés (h)<input type="number" name="ferieHours" min="0" max="10" step="0.25" value="${s.ferieHours}"></label>
          <label>Part réservée aux révisions (%)<input type="number" name="reviewShare" min="0" max="60" step="5" value="${Math.round(s.reviewShare * 100)}"></label>
          <label>Durée max d'un bloc (h)<input type="number" name="blockMax" min="0.5" max="4" step="0.25" value="${s.blockMax}"></label>
        </div>
        <p class="muted small">Les lundis et mardis de cours (8 h 30–17 h) sont repris du calendrier CNAM 2026-2027 : seule une reprise du soir y est planifiée. La demi-journée de repos est prise le dimanche (3 h au lieu de 5 h 30).</p>
      </article>
      <article class="card"><header><h2>Congés et semaines allégées</h2></header>
        <p class="muted small">Congés : heures disponibles par jour (0 = repos complet). Semaines allégées (bilans, période fiscale) : % du temps habituel.</p>
        <h3>Congés</h3>
        <div id="vac">${(s.vacations || []).map((v, i) => rangeRow('vac', i, v, 'hours', 'h/jour')).join('')}</div>
        <button type="button" class="btn sm" data-addr="vac">Ajouter une période de congés</button>
        <h3>Semaines allégées</h3>
        <div id="lw">${(s.lightWeeks || []).map((v, i) => rangeRow('lw', i, v, 'factor', '%')).join('')}</div>
        <button type="button" class="btn sm" data-addr="lw">Ajouter une période allégée</button>
      </article>
    </div>
    <div class="col">
      <article class="card" id="acct"><header><h2>Compte et synchronisation</h2><span class="muted small">${esc(sync.message)}</span></header>
        ${!cfg ? `<p class="small">1. Colle l'URL du projet et la clé publique de ton projet Supabase (tableau de bord Supabase, Project Settings, rubrique API Keys).</p>` : ''}
        <details ${cfg ? '' : 'open'}><summary class="small">Connexion au projet Supabase${cfg ? ' : configurée' : ''}</summary>
          <div class="grid2"><label>URL du projet<input id="sbUrl" placeholder="https://xxxx.supabase.co" value="${esc(cfg?.url || '')}"></label><label>Clé publique (publishable ou anon)<input id="sbKey" placeholder="eyJhbGciOi…" value="${esc(cfg?.key || '')}"></label></div>
          <button type="button" class="btn sm" id="sbSave">Enregistrer la connexion</button>
        </details>
        ${cfg && !sync.uid ? `<div class="grid2" style="margin-top:12px"><label>E-mail<input id="em" type="email" autocomplete="email"></label><label>Mot de passe<input id="pw" type="password" autocomplete="current-password" minlength="6"></label></div>
          <div class="row wrap"><button type="button" class="btn primary" id="login">Se connecter</button><button type="button" class="btn" id="signup">Créer mon compte</button></div>` : ''}
        ${sync.uid ? `<p class="small">Connectée : <b>${esc(sync.email || '')}</b>${sync.lastSync ? ` · dernière synchro ${esc(new Date(sync.lastSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))}` : ''}</p>
          <div class="row wrap"><button type="button" class="btn" id="syncBtn">Synchroniser maintenant</button><button type="button" class="btn ghost" id="logout">Se déconnecter</button></div>` : ''}
        <p class="err" id="acErr" hidden></p>
        <h3>Sauvegarde manuelle</h3>
        <p class="small muted">Sert aussi à reprendre les données de la version en ligne sur Claude : Exporter là-bas, Importer ici.</p>
        <div class="row wrap"><button type="button" class="btn" id="exp">Exporter (JSON)</button><label class="btn ghost filebtn">Importer<input type="file" id="imp" accept=".json,application/json"></label><button type="button" class="btn ghost danger" id="reset">Réinitialiser</button></div>
      </article>
      <article class="card"><header><h2>Priorités</h2></header>
        <div class="grid2">${UES.map(u => `<label><span class="dot ${u.id}"></span>Poids ${esc(u.code)}<input type="number" name="w_${u.id}" min="0.5" max="2" step="0.05" value="${s.ueWeight[u.id]}"></label>`).join('')}
          <label>Travail perso visé (% du volume officiel)<input type="number" name="selfRatio" min="20" max="150" step="5" value="${Math.round((s.selfRatio ?? 1) * 100)}"></label>
          <label>Bonus thèmes lacunaires (%)<input type="number" name="lacuneBoost" min="0" max="100" step="5" value="${Math.round(s.lacuneBoost * 100)}"></label></div>
        <p class="muted small">Volume officiel = heures de l'annexe (180 / 140 / 180 h). À 100 %, tu prévois autant de travail personnel que le volume d'enseignement ; baisse ce taux si tu considères que les cours du CNAM en couvrent une partie. Thèmes lacunaires : consolidation et IFRS (UE 4, partie 2). L'UE 4 est prioritaire par défaut (poids 1,15).</p>
        <label class="chk"><input type="checkbox" name="prereq" ${s.prereq ? 'checked' : ''}> Inclure la piste « Prérequis DCG — axe juridique » en UE 1 (24 h estimées)</label>
      </article>
      <article class="card"><header><h2>Volumes non fixés par l'annexe</h2></header>
        <p class="muted small">L'annexe officielle ne répartit pas ces heures. Ajuste-les si ton cours CNAM ou le guide pédagogique en donne.</p>
        <div class="grid2">${estCh.map(c => `<label>${esc(c.ue.replace('UE', 'UE '))} · ${esc(c.num)} ${esc(c.title.slice(0, 38))}<input type="number" name="est_${c.id}" min="0" max="80" step="0.5" value="${s.estHours[c.id] ?? c.hours}"></label>`).join('')}</div>
      </article>
      <article class="card"><header><h2>Pomodoro</h2></header>
        <div class="grid4"><label>Focus (min)<input type="number" name="pw" min="5" max="120" value="${s.pomodoro.work}"></label><label>Pause (min)<input type="number" name="ps" min="1" max="30" value="${s.pomodoro.short}"></label><label>Longue pause<input type="number" name="pl" min="5" max="60" value="${s.pomodoro.long}"></label></div>
      </article>

    </div>
  </form>`;

  const f = root.querySelector('#sf');
  const apply = () => {
    const v = n => f.elements[n]?.value;
    s.deadline = v('deadline'); s.examDate = v('examDate'); s.startDate = v('startDate'); s.objective = Number(v('objective'));
    WD.forEach(([d]) => { s.capacity[d] = Number(v('cap_' + d)) || 0; });
    s.cnamEvening = Number(v('cnamEvening')) || 0; s.ferieHours = Number(v('ferieHours')) || 0;
    s.reviewShare = (Number(v('reviewShare')) || 0) / 100; s.blockMax = Number(v('blockMax')) || 2;
    UES.forEach(u => { s.ueWeight[u.id] = Number(v('w_' + u.id)) || 1; });
    s.lacuneBoost = (Number(v('lacuneBoost')) || 0) / 100;
    s.selfRatio = (Number(v('selfRatio')) || 100) / 100;
    s.prereq = f.elements.prereq.checked;
    estCh.forEach(c => { const x = v('est_' + c.id); if (x !== '' && x != null) s.estHours[c.id] = Number(x); });
    s.pomodoro = { work: Number(v('pw')) || 25, short: Number(v('ps')) || 5, long: Number(v('pl')) || 15 };
    s.vacations = readRanges('vac', 'hours'); s.lightWeeks = readRanges('lw', 'factor');
    saveSettings(); toast('Réglages enregistrés');
  };
  const readRanges = (k, field) => [...root.querySelectorAll(`[data-range="${k}"]`)].map(r => ({ from: r.querySelector('[name=from]').value, to: r.querySelector('[name=to]').value, label: r.querySelector('[name=label]').value, [field]: Number(r.querySelector('[name=val]').value) })).filter(r => r.from && r.to);
  f.addEventListener('change', e => { if (e.target.closest('#acct')) return; apply(); });
  const acErr = m => { const e = root.querySelector('#acErr'); e.hidden = !m; e.textContent = m || ''; };
  const busy = async (btn, fn) => { btn.disabled = true; acErr(''); try { await fn(); } catch (e) { acErr(e.message || String(e)); } btn.disabled = false; };
  root.querySelector('#sbSave').onclick = () => {
    const u = root.querySelector('#sbUrl').value.trim(), k = root.querySelector('#sbKey').value.trim();
    if (!/^https:\/\/.+/.test(u) || k.length < 20) { acErr('URL (https://…supabase.co) ou clé invalide'); return; }
    setConfig(u, k); toast('Connexion enregistrée'); render(root);
  };
  const em = () => root.querySelector('#em').value.trim(), pw = () => root.querySelector('#pw').value;
  const li = root.querySelector('#login'); if (li) li.onclick = () => busy(li, async () => { await signIn(em(), pw()); toast('Connectée, données synchronisées'); window.dispatchEvent(new Event('refresh')); });
  const su = root.querySelector('#signup'); if (su) su.onclick = () => busy(su, async () => { const r = await signUp(em(), pw()); if (r === 'confirm') acErr('Compte créé : ouvre l\'e-mail de confirmation de Supabase, clique sur le lien, puis reviens te connecter.'); else { toast('Compte créé'); window.dispatchEvent(new Event('refresh')); } });
  const sy = root.querySelector('#syncBtn'); if (sy) sy.onclick = () => busy(sy, async () => { await syncNow(); render(root); });
  const lo = root.querySelector('#logout'); if (lo) lo.onclick = () => busy(lo, async () => { await signOut(); render(root); });
  root.querySelectorAll('[data-addr]').forEach(b => b.onclick = () => {
    const k = b.dataset.addr; const t = today();
    (k === 'vac' ? s.vacations : s.lightWeeks).push(k === 'vac' ? { from: t, to: addDays(t, 6), label: 'Congés', hours: 0 } : { from: mondayOf(t), to: addDays(mondayOf(t), 6), label: 'Période chargée', factor: 60 });
    saveSettings(); render(root);
  });
  root.querySelectorAll('[data-delr]').forEach(b => b.onclick = () => { const [k, i] = b.dataset.delr.split(':'); (k === 'vac' ? s.vacations : s.lightWeeks).splice(+i, 1); saveSettings(); render(root); });
  root.querySelector('#exp').onclick = () => download(`cockpit-dscg-sauvegarde-${today()}.json`, exportAll());
  root.querySelector('#imp').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { importAll(await file.text()); toast('Sauvegarde importée'); window.dispatchEvent(new Event('refresh')); }
    catch (err) { toast('Import impossible : ' + (err.message || 'fichier invalide')); }
  };
  root.querySelector('#reset').onclick = () => confirmBox('Effacer toutes tes données (progression, séances, cartes, notes) ? Exporte une sauvegarde avant.', async () => {
    const keys = allKeys();
    state.settings = structuredClone(DEFAULT_SETTINGS); state.progress = {}; state.cards = { UE1: [], UE2: [], UE4: [] }; state.errors = []; state.exams = []; state.sessions = {}; state.notes = {};
    for (const k of keys) await removeDoc(k);
    saveSettings(); toast('Données effacées'); window.dispatchEvent(new Event('refresh'));
  }, 'Tout effacer');
}

function rangeRow(k, i, v, field, unit) {
  return `<div class="rrow" data-range="${k}"><input type="date" name="from" value="${esc(v.from)}" aria-label="Du"><input type="date" name="to" value="${esc(v.to)}" aria-label="Au"><input name="label" value="${esc(v.label || '')}" placeholder="Libellé" aria-label="Libellé"><label class="inl"><input type="number" name="val" value="${esc(v[field])}" min="0" max="${field === 'factor' ? 100 : 12}" step="${field === 'factor' ? 5 : 0.5}" aria-label="${unit}">${unit}</label><button type="button" class="btn sm ghost" data-delr="${k}:${i}">Retirer</button></div>`;
}
