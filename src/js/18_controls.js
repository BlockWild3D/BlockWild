// ================= CONTROLS SCREEN: rebind keys =================
let kbWaiting = null, kbBackTo = 'menu';
function renderControls() {
  const list = $('kbList'); list.innerHTML = ''; const used = {}; for (const a in KB) used[KB[a]] = (used[KB[a]] || 0) + 1;
  for (const a of Object.keys(KB_DEFAULT)) {
    const row = document.createElement('div'); row.className = 'kbrow';
    const b = document.createElement('button'); b.className = 'sbtn kbkey' + (used[KB[a]] > 1 ? ' clash' : ''); b.textContent = kbWaiting === a ? '> press a key <' : keyName(KB[a]);
    b.onclick = () => { kbWaiting = a; renderControls(); };
    const r = document.createElement('button'); r.className = 'sbtn'; r.textContent = 'Reset'; r.disabled = KB[a] === KB_DEFAULT[a]; r.onclick = () => { KB[a] = KB_DEFAULT[a]; saveKB(); renderControls(); };
    row.innerHTML = '<span>' + KB_LABEL[a] + '</span>'; row.append(b, r); list.appendChild(row);
  }
}
function openControls(from) { kbBackTo = from; kbWaiting = null; show(from, false); show('controls', true); renderControls(); }
addEventListener('keydown', (e) => {
  if (!kbWaiting) return; e.preventDefault(); e.stopImmediatePropagation();
  if (e.code !== 'Escape') { KB[kbWaiting] = e.code; saveKB(); }
  kbWaiting = null; renderControls();
}, true);
$('btnControls').addEventListener('click', () => openControls('pause'));
$('btnControls2').addEventListener('click', () => openControls('menu'));
$('btnKbDone').addEventListener('click', () => { kbWaiting = null; show('controls', false); show(kbBackTo, true); });
$('btnKbReset').addEventListener('click', () => { Object.assign(KB, KB_DEFAULT); saveKB(); renderControls(); });
