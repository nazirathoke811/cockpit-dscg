import { UES, TOPIC_BY_ID } from '../programme.js';
import { state, saveNote, uiGet, uiSet } from '../store.js';
import { topicActive } from '../planner.js';
import { esc, renderMd, toast } from '../ui.js';

export function render(root) {
  const cur = uiGet('noteTopic', '') || Object.keys(state.notes)[0] || 'UE4-2.1-a';
  const tp = TOPIC_BY_ID[cur] || TOPIC_BY_ID['UE4-2.1-a'];
  const note = state.notes[tp.id] || { md: '', links: [] };
  const q = uiGet('noteQ', '');
  const has = id => state.notes[id] && (state.notes[id].md || (state.notes[id].links || []).length);

  root.innerHTML = `
  <section class="pagehead"><h1>Notes et formules</h1><p class="lead">Une note par sous-thème. Markdown, formules entre $…$ (en ligne) ou $$…$$ (bloc), liens Google Drive. Enregistrement automatique.</p></section>
  <div class="notes">
    <aside class="card ntree">
      <input type="search" id="nq" placeholder="Filtrer…" value="${esc(q)}">
      ${UES.map(u => `<details ${u.id === tp.ue ? 'open' : ''}><summary><span class="dot ${u.id}"></span>${esc(u.code)} · ${esc(u.short)}</summary>
        ${u.parts.flatMap(p => p.chapters).flatMap(c => c.subs).filter(t => topicActive(t) && (!q || t.title.toLowerCase().includes(q.toLowerCase()))).map(t => `<button class="nitem ${t.id === tp.id ? 'on' : ''}" data-t="${t.id}">${has(t.id) ? '<i class="has"></i>' : ''}${esc(t.num)} ${esc(t.title)}</button>`).join('')}
      </details>`).join('')}
    </aside>
    <section class="card neditor">
      <header><div><h2>${esc(tp.num)} · ${esc(tp.title)}</h2><span class="muted small">${esc(tp.items.join(' · '))}</span></div><span class="muted small" id="saved">${note.updated ? 'Enregistré' : ''}</span></header>
      <div class="split">
        <textarea id="md" spellcheck="true" placeholder="## Idées clés&#10;- Condition 1…&#10;&#10;Formule : $VE = VCP + D$">${esc(note.md)}</textarea>
        <div class="md preview" id="pv">${renderMd(note.md)}</div>
      </div>
      <h3>Liens (Google Drive, cours CNAM…)</h3>
      <ul class="links">${(note.links || []).map((l, i) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || l.url)}</a><span class="muted small">${esc(l.url)}</span><button class="btn sm ghost" data-del="${i}">Retirer</button></li>`).join('') || '<li class="muted small">Aucun lien.</li>'}</ul>
      <form id="lk" class="row wrap"><input name="label" placeholder="Intitulé (ex. Fiche consolidation)"><input name="url" type="url" placeholder="https://drive.google.com/…" required><button class="btn">Ajouter</button></form>
      <p class="err" id="lkerr" hidden></p>
    </section>
  </div>`;

  root.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { uiSet('noteTopic', b.dataset.t); render(root); });
  const nq = root.querySelector('#nq');
  nq.oninput = () => { uiSet('noteQ', nq.value); clearTimeout(nq._t); nq._t = setTimeout(() => { render(root); const n = root.querySelector('#nq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
  const ta = root.querySelector('#md'); const pv = root.querySelector('#pv'); const sv = root.querySelector('#saved');
  let t1;
  ta.oninput = () => {
    pv.innerHTML = renderMd(ta.value); sv.textContent = 'Modification…';
    clearTimeout(t1);
    t1 = setTimeout(() => { const n = state.notes[tp.id] ||= { md: '', links: [] }; n.md = ta.value; n.updated = new Date().toISOString(); saveNote(tp.id); sv.textContent = 'Enregistré'; }, 1200);
  };
  ta.onkeydown = e => { if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('  ', s, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); } };
  root.querySelector('#lk').onsubmit = e => {
    e.preventDefault();
    const url = e.target.url.value.trim();
    if (!/^https?:\/\//i.test(url)) { const er = root.querySelector('#lkerr'); er.hidden = false; er.textContent = 'Le lien doit commencer par https://'; return; }
    const n = state.notes[tp.id] ||= { md: ta.value, links: [] };
    n.md = ta.value; (n.links ||= []).push({ label: e.target.label.value.trim(), url }); n.updated = new Date().toISOString();
    saveNote(tp.id); toast('Lien ajouté'); render(root);
  };
  root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const n = state.notes[tp.id]; n.links.splice(+b.dataset.del, 1); saveNote(tp.id); render(root); });
}
