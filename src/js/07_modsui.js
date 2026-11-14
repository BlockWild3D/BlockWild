// ================= MODS SCREEN =================
const EXAMPLE_MODS = [
`// @name Rubies
// @description Ruby ore deep underground, rubies, glowing ruby blocks and ruby tools that beat diamond.
// @author BlockWild
// @version 1.0
api.addItem('ruby', { name: 'Ruby', icon: { color: '#e0115f', style: 'gem' } });
api.addBlock('ruby_ore', { name: 'Ruby Ore', texture: { color: '#e0115f', style: 'ore' }, hardness: 3, tool: 'pickaxe', tier: 3, drop: 'ruby' });
api.addBlock('ruby_block', { name: 'Block of Ruby', texture: { color: '#c0104f', style: 'lamp' }, hardness: 5, tool: 'pickaxe', tier: 3, light: 0.5 });
api.addTool('ruby_pickaxe', { name: 'Ruby Pickaxe', type: 'pickaxe', tier: 4, speed: 11, color: '#e0115f' });
api.addTool('ruby_sword', { name: 'Ruby Sword', type: 'sword', tier: 4, damage: 9, color: '#e0115f' });
api.addRecipe('ruby_block', 1, ['RRR', 'RRR', 'RRR'], { R: 'ruby' });
api.addRecipe('ruby', 9, ['ruby_block']);
api.addRecipe('ruby_pickaxe', 1, ['RRR', ' S ', ' S '], { R: 'ruby', S: 'stick' });
api.addRecipe('ruby_sword', 1, ['R', 'R', 'S'], { R: 'ruby', S: 'stick' });
api.addOre('ruby_ore', { veins: 2, size: 4, minY: 1, maxY: 18 });
api.addLoot('dungeon', 'ruby', 1, 3, 0.3);
api.addLoot('pyramid', 'ruby', 1, 2, 0.25);
`,
`// @name Moon Jump
// @description Low gravity: jump about three blocks high, fall slowly and take half fall damage.
// @author BlockWild
// @version 1.0
api.physics.gravity = 14;
api.physics.jump = 9;
api.physics.fallDamage = 0.5;
`,
`// @name Starter Kit
// @description New survival worlds start with stone tools, torches, food and a crafting table.
// @author BlockWild
// @version 1.0
api.on('worldStart', (e) => {
  if (!e.newWorld || api.mode !== 'survival') return;
  api.give('stone_pickaxe'); api.give('stone_sword');
  api.give('torch', 16); api.give('cooked_pork', 8); api.give('crafting_table');
  api.message('Starter kit added to your inventory');
});
`,
`// @name Boom Staff
// @description Craft a Boom Staff (TNT on two blaze rods) and right-click to blow up the block you are looking at, up to 48 blocks away.
// @author BlockWild
// @version 1.0
api.addItem('boom_staff', { name: 'Boom Staff', stack: 1, icon: {
  pixels: ['............rrr.', '...........rTTTr', '...........rTTTr', '...........rTTTr', '............rrr.', '...........b....', '..........b.....', '.........b......',
           '........b.......', '.......b........', '......b.........', '.....b..........', '....b...........', '...b............', '..b.............', '................'],
  palette: { r: '#7a1a12', T: '#d8382a', b: '#f0b030' } } });
api.addRecipe('boom_staff', 1, ['  T', ' B ', 'B  '], { T: 'tnt', B: 'blaze_rod' });
let cooldown = 0;
api.on('tick', (dt) => { cooldown -= dt; });
api.on('useItem', (e) => {
  if (e.item !== 'boom_staff') return;
  const hit = api.lookingAt(48);           // the block you are looking at, up to 48 blocks away
  if (hit && cooldown <= 0) {
    const p = api.player.pos;
    if (Math.hypot(hit.x - p.x, hit.y - p.y, hit.z - p.z) < 5) api.message('Too close!', 1.5);
    else { api.explode(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, 3); cooldown = 1; }
  }
  return false; // stop the normal right-click action
});
`,
`// @name Sky Islands
// @description Small floating islands with a tree drift high above the Overworld.
// @author BlockWild
// @version 1.0
api.on('chunkGenerate', (c) => {
  if (c.dimension !== 'overworld' || c.random() > 0.035) return;
  const cx = 8, cz = 8, top = 74 + Math.floor(c.random() * 10), R = 4 + Math.floor(c.random() * 3);
  for (let y = 0; y < R; y++) {
    const r = R - y;
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
      if (x * x + z * z > r * r + 1) continue;
      c.set(cx + x, top - y, cz + z, y === 0 ? 'grass' : y < 2 ? 'dirt' : 'stone');
    }
  }
  for (let y = 1; y <= 4; y++) c.set(cx, top + y, cz, 'log');
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) for (let y = 3; y <= 5; y++)
    if (Math.abs(x) + Math.abs(z) < (y === 5 ? 2 : 4) && !(x === 0 && z === 0 && y < 5)) c.set(cx + x, top + y, cz + z, 'leaves');
  if (c.random() < 0.5) { c.set(cx + 2, top + 1, cz, 'chest'); }
});
`,
`// @name Fullbright
// @description See clearly everywhere: caves, night and the Nether are fully lit. Press B to turn it on or off.
// @author BlockWild
// @version 1.0
let on = true;
api.graphics.minLight = 1;
api.onKey('KeyB', () => {
  on = !on; api.graphics.minLight = on ? 1 : 0;
  api.message('Fullbright ' + (on ? 'on' : 'off'), 1.5);
});
`,
`// @name Mini Map
// @description A round map in the corner showing the land around you, players and mobs. Press M to zoom.
// @author BlockWild
// @version 1.0
const SIZE = 136, R = SIZE / 2;
let zoom = 1; // pixels per block
api.onKey('KeyM', () => { zoom = zoom === 1 ? 2 : zoom === 2 ? 0.5 : 1; api.message('Map zoom ' + zoom + 'x', 1); });
api.addHud({ width: SIZE, height: SIZE, corner: 'top-left', every: 0.15, draw(ctx) {
  const p = api.player.pos; const img = ctx.createImageData(SIZE, SIZE); const d = img.data;
  const under = api.dimension !== 'overworld' || api.surfaceColor(p.x, p.z)[3] > p.y + 3; // in a cave or the Nether: slice at your height
  for (let py = 0; py < SIZE; py++) for (let px = 0; px < SIZE; px++) {
    const dx = px - R, dy = py - R; if (dx * dx + dy * dy > (R - 3) * (R - 3)) continue;
    const c = api.surfaceColor(p.x + dx / zoom, p.z + dy / zoom, under ? p.y + 1.5 : undefined) || [20, 20, 24];
    const k = (py * SIZE + px) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = '#222'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(R, R, R - 3, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#bbb'; ctx.lineWidth = 2; ctx.stroke();
  const dot = (x, z, col, r) => { const sx = R + (x - p.x) * zoom, sy = R + (z - p.z) * zoom; if ((sx - R) ** 2 + (sy - R) ** 2 > (R - 6) ** 2) return; ctx.fillStyle = '#000'; ctx.fillRect(sx - r - 1, sy - r - 1, r * 2 + 2, r * 2 + 2); ctx.fillStyle = col; ctx.fillRect(sx - r, sy - r, r * 2, r * 2); };
  for (const m of api.mobs()) dot(m.x, m.z, m.boss ? '#c070ff' : m.hostile ? '#ff4a3a' : '#f4f4f4', 1.5);
  for (const pl of api.players()) if (!pl.me) dot(pl.x, pl.z, '#4ab0ff', 2.5);
  // you: an arrow pointing where you look (north is up)
  const yaw = api.player.yaw; ctx.save(); ctx.translate(R, R); ctx.rotate(-yaw); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText('N', R, 13);
} });
`,
`// @name Vein Miner
// @description Hold the \` key (above Tab) while mining an ore or a log to break the whole connected vein or tree at once (up to 64 blocks). Uses the right tool, wears it down and costs hunger per block, like the Vein Miner mod.
// @author BlockWild
// @version 1.0
const KEY = 'Backquote';   // hold this while mining; change to 'ShiftLeft' to use sneak instead
const MAX = 64;            // most blocks broken at once
// blocks that count as the same vein (normal and deepslate ores, lit and unlit redstone)
const group = (k) => !k ? null : k.endsWith('_ore') ? k.replace(/^deepslate_/, '').replace(/^lit_/, '') : k;
const isOre = (k) => /_ore$/.test(k) || k === 'ancient_debris';
const isLog = (k) => /(_log|_stem)$/.test(k) || k === 'log';
let busy = false;
api.on('blockBreak', (e) => {
  if (busy || !api.keyDown(KEY)) return;
  const k = e.block; const ore = isOre(k), log = isLog(k); if (!ore && !log) return;
  const h = api.held(); if (!h || h.tool !== (ore ? 'pick' : 'axe')) return; // pickaxe for ores, axe for logs
  const want = group(k), seen = new Set([e.x + ',' + e.y + ',' + e.z]), queue = [[e.x, e.y, e.z]], found = [];
  while (queue.length && found.length < MAX - 1) {
    const [x, y, z] = queue.shift();
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const nx = x + dx, ny = y + dy, nz = z + dz, id = nx + ',' + ny + ',' + nz; if (seen.has(id)) continue; seen.add(id);
      if (group(api.getBlock(nx, ny, nz)) === want && found.length < MAX - 1) { found.push([nx, ny, nz]); queue.push([nx, ny, nz]); }
    }
  }
  // nearest first, and stop if the tool breaks or runs low
  const p = api.player.pos; found.sort((a, b) => Math.hypot(a[0] - p.x, a[1] - p.y, a[2] - p.z) - Math.hypot(b[0] - p.x, b[1] - p.y, b[2] - p.z));
  busy = true;
  try { for (const [x, y, z] of found) { const t = api.held(); if (!t || t.tool !== h.tool || (t.durability != null && t.durability <= 1)) break; api.breakBlock(x, y, z); } }
  finally { busy = false; }
});
`,
`// @name Endless Day
// @description The sun never sets: time stops at midday.
// @author BlockWild
// @version 1.0
api.on('tick', () => { api.time = 0.25; });
`,
];

let modsChanged = false;
const modsList = () => modsLoad();
function modStatus(m) {
  if (MODS.errors[m.id]) return ['err', 'Error: ' + MODS.errors[m.id]];
  const running = MODS.loaded.includes(m.id);
  if (m.enabled && !running) return ['pend', 'Turns on when you press Done'];
  if (!m.enabled && running) return ['pend', 'Turns off when you press Done'];
  return m.enabled ? ['', 'Active'] : ['off', 'Off'];
}
function esc(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function renderMods() {
  const list = modsList(); const el = $('modList'); el.innerHTML = '';
  if (!list.length) { el.innerHTML = '<div class="modempty">No mods yet. Add a mod file, paste code, or try an example mod.</div>'; }
  for (const m of list) {
    const meta = modMeta(m.code, m.name); const [cls, txt] = modStatus(m);
    const row = document.createElement('div'); row.className = 'moditem';
    row.innerHTML = '<div class="mi"><div class="mn">' + esc(meta.name) + (meta.version ? '<small>v' + esc(meta.version) + '</small>' : '') + (meta.author ? '<small>by ' + esc(meta.author) + '</small>' : '') + '</div>' +
      (meta.description ? '<div class="md">' + esc(meta.description) + '</div>' : '') + '<div class="ms ' + cls + '">' + esc(txt) + '</div></div>';
    const tog = document.createElement('button'); tog.className = 'sbtn' + (m.enabled ? ' on' : ''); tog.textContent = m.enabled ? 'On' : 'Off';
    tog.onclick = () => { const l = modsList(); const t = l.find(x => x.id === m.id); if (t) { t.enabled = !t.enabled; modsSave(l); modsChanged = true; renderMods(); } };
    const exp = document.createElement('button'); exp.className = 'sbtn'; exp.textContent = 'Save file';
    exp.onclick = () => saveFile(meta.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.js', m.code);
    const del = document.createElement('button'); del.className = 'sbtn red'; del.textContent = 'Remove';
    del.onclick = () => { if (!confirmRemove(del)) return; modsSave(modsList().filter(x => x.id !== m.id)); modsChanged = true; renderMods(); };
    row.append(tog, exp, del); el.appendChild(row);
  }
  $('btnModsDone').textContent = modsChanged ? 'Done (restart with mods)' : 'Done';
}
function confirmRemove(btn) { if (btn.dataset.sure) return true; btn.dataset.sure = '1'; btn.textContent = 'Sure?'; setTimeout(() => { delete btn.dataset.sure; btn.textContent = 'Remove'; }, 2500); return false; }
function addModCode(code, fallbackName) {
  code = String(code || ''); if (!code.trim()) { toast('That mod is empty', 2); return false; }
  try { new Function('api', code); } catch (e) { toast('This mod has a syntax error: ' + e.message, 5); return false; }
  const meta = modMeta(code, fallbackName); const list = modsList();
  const same = list.find(x => modMeta(x.code, x.name).name === meta.name);
  if (same) { same.code = code; same.enabled = true; } else list.push({ id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: meta.name, code, enabled: true });
  if (!modsSave(list)) { toast('Not enough browser storage to keep this mod', 4); return false; }
  modsChanged = true; renderMods(); toast((same ? 'Updated ' : 'Added ') + meta.name, 2); return true;
}
function renderExamples() {
  const el = $('modExamples'); el.innerHTML = ''; const have = new Set(modsList().map(m => modMeta(m.code, m.name).name));
  for (const code of EXAMPLE_MODS) {
    const meta = modMeta(code); const row = document.createElement('div'); row.className = 'moditem';
    row.innerHTML = '<div class="mi"><div class="mn">' + esc(meta.name) + '</div><div class="md">' + esc(meta.description) + '</div></div>';
    const b = document.createElement('button'); b.className = 'sbtn'; b.textContent = have.has(meta.name) ? 'Added' : 'Add'; b.disabled = have.has(meta.name);
    b.onclick = () => { if (addModCode(code)) { b.textContent = 'Added'; b.disabled = true; } };
    row.appendChild(b); el.appendChild(row);
  }
}
$('btnMods').addEventListener('click', () => { modsChanged = false; show('menu', false); show('mods', true); show('modPaste', false); show('modExamples', false); renderMods(); });
$('btnModsDone').addEventListener('click', () => { if (modsChanged) { location.reload(); return; } show('mods', false); show('menu', true); });
$('btnModFile').addEventListener('click', () => $('modFile').click());
$('modFile').addEventListener('change', (e) => {
  for (const f of e.target.files) { if (f.size > 400000) { toast(f.name + ' is too big (max 400 KB)', 3); continue; } const rd = new FileReader(); rd.onload = () => addModCode(rd.result, f.name.replace(/\.(js|txt)$/i, '')); rd.readAsText(f); }
  e.target.value = '';
});
$('btnModPasteOpen').addEventListener('click', () => { show('modExamples', false); show('modPaste', true); $('modCode').focus(); });
$('btnModPasteCancel').addEventListener('click', () => { show('modPaste', false); });
$('btnModPasteAdd').addEventListener('click', () => { if (addModCode($('modCode').value)) { $('modCode').value = ''; show('modPaste', false); } });
$('btnModExamples').addEventListener('click', () => { show('modPaste', false); const on = $('modExamples').classList.contains('hidden'); show('modExamples', on); if (on) renderExamples(); });
// keys typed into the mod editor must not reach the game
$('modCode').addEventListener('keydown', (e) => e.stopPropagation());
modLoadImages();
if (Object.keys(MODS.errors).length) setTimeout(() => toast(Object.keys(MODS.errors).length + ' mod(s) failed to load - see Mods', 5), 800);
