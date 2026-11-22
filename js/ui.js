export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Markdown + formules : $...$ en ligne, $$...$$ en bloc
export function renderMd(src) {
  const math = [];
  let text = String(src || '');
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => { math.push([m, true]); return `@@MATH${math.length - 1}@@`; });
  text = text.replace(/(^|[^\\$])\$([^\n$]+?)\$/g, (_, pre, m) => { math.push([m, false]); return `${pre}@@MATH${math.length - 1}@@`; });
  let html = window.marked ? window.marked.parse(esc(text).replace(/&gt;/g, '>'), { breaks: true }) : esc(text).replace(/\n/g, '<br>');
  html = html.replace(/@@MATH(\d+)@@/g, (_, i) => {
    const [m, display] = math[+i];
    try { return window.katex ? window.katex.renderToString(m, { displayMode: display, throwOnError: false, output: 'mathml' }) : esc(m); } catch { return esc(m); }
  });
  return html.replace(/<(script|iframe|object|embed)[\s\S]*?<\/\1>/gi, '').replace(/\son\w+="[^"]*"/gi, '').replace(/href="javascript:[^"]*"/gi, 'href="#"');
}

let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

export function modal(html, onMount) {
  const m = $('#modal');
  m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden = false;
  const close = () => { m.hidden = true; m.innerHTML = ''; };
  m.onclick = e => { if (e.target === m || e.target.closest('[data-close]')) close(); };
  if (onMount) onMount(m.firstElementChild, close);
  const f = m.querySelector('input,select,textarea,button');
  if (f) setTimeout(() => f.focus(), 30);
  return close;
}

export function confirmBox(text, onYes, yes = 'Confirmer') {
  modal(`<h3>${esc(text)}</h3><div class="row end"><button class="btn ghost" data-close>Annuler</button><button class="btn danger" id="yes">${esc(yes)}</button></div>`,
    (root, close) => { root.querySelector('#yes').onclick = () => { close(); onYes(); }; });
}

export const ueDot = ue => `<span class="dot ${ue}"></span>`;
export const bar = (v, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v * 100)).toFixed(1)}%"></i></div>`;
export const opt = (v, label, sel) => `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(label)}</option>`;

export function ring(v, size = 64, label = '') {
  const r = size / 2 - 6; const c = 2 * Math.PI * r; const p = Math.max(0, Math.min(1, v));
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(label)}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg"/>
    ${p > 0.005 ? '' : '<!--'}<circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>${p > 0.005 ? '' : '-->'}
  </svg>`;
}

export function download(filename, data) {
  const type = filename.endsWith('.pdf') ? 'application/pdf' : filename.endsWith('.csv') ? 'text/csv;charset=utf-8' : 'application/json';
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Fichier enregistré dans Téléchargements');
}
