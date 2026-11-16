// ================= WORLD OPTIONS BEFORE YOU CREATE: TYPE, GAME RULES, HARDCORE =================
// Create World now has a world type (Default, Superflat with presets, Amplified, Large Biomes), a Game Rules button
// that sets the rules the world starts with, and a Hardcore mode. Superflat presets follow Minecraft's layer lists
// (Classic Flat: bedrock, 2 dirt, grass); the ground sits at sea level here rather than at the bottom of the world.
// Amplified and Large Biomes are my approximations: heights above sea level are roughly doubled / everything is
// stretched four times wider, using the normal generator.
const RULE_DEFAULTS = (() => { const o = {}; for (const k in S.rules) if (typeof S.rules[k] === 'boolean' && k !== 'arena') o[k] = S.rules[k]; return o; })();
const NEWWORLD = { rules: Object.assign({}, RULE_DEFAULTS), type: 'default', preset: 'classic', armed: false };
const FLAT_PRESETS = { classic: ['Classic Flat', ['BEDROCK', 'DIRT', 'DIRT', 'GRASS']], redstone: ['Redstone Ready', ['BEDROCK', 'STONE', 'STONE', 'STONE'].concat(new Array(52).fill('SANDSTONE'))],
  desert: ['Desert', ['BEDROCK', 'STONE', 'STONE', 'STONE'].concat(new Array(52).fill('SANDSTONE'), new Array(8).fill('SAND'))], snowy: ['Snowy Kingdom', ['BEDROCK'].concat(new Array(59).fill('STONE'), ['DIRT', 'DIRT', 'DIRT', 'GRASS', 'SNOW_LAYER'])],
  overworld: ['Overworld', ['BEDROCK'].concat(new Array(59).fill('STONE'), ['DIRT', 'DIRT', 'DIRT', 'GRASS'])], void: ['The Void', []] };
function flatLayers(preset) { const p = FLAT_PRESETS[preset] || FLAT_PRESETS.classic; return p[1].map(k => B[k] != null ? B[k] : k === 'SNOW_LAYER' ? (B.SNOW != null ? B.SNOW : 0) : B.STONE); }
function worldType() { return String((S.rules && S.rules.worldType) || 'default'); }
function flatTop(preset) { return SEA + 1; } // y of the air above the ground
function flatChunk(w, cx, cz) {
  const c = new Chunk(cx, cz); const d = c.d; const preset = worldType().split(':')[1] || 'classic'; const L = flatLayers(preset); const y0 = flatTop(preset) - L.filter(id => SOLID[id]).length;
  if (preset === 'void') { for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) { const X = cx * 16 + x, Z = cz * 16 + z; if (Math.abs(X) <= 16 && Math.abs(Z) <= 16) d[((SEA) * 16 + z) * 16 + x] = (X === 0 && Z === 0) ? B.COBBLESTONE : B.STONE; } }
  else for (let i = 0; i < L.length; i++) { const y = y0 + i; if (y < 0 || y >= WH || !L[i]) continue; const row = y * 256; for (let j = 0; j < 256; j++) d[row + j] = L[i]; }
  const e = w.edits.get(c.key); if (e) for (const [i, id] of e) d[i] = id;
  c.scanMeta(); w.chunks.set(c.key, c);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (dx || dz) { const n = w.getChunk(cx + dx, cz + dz); if (n) n.dirty = true; }
  w.hintsDone.add(c.key); return c;
}
function patchGenForType(w) {
  const g = w.gen; if (!g || g._typed || w.dim !== 'overworld') return; const t = worldType(); if (t === 'default') return; g._typed = true; const oc = g.column.bind(g); const memo = new Map();
  const wrap = (fn) => (x, z) => { const k = x * 100003 + z; let c = memo.get(k); if (!c) { c = fn(x, z); if (memo.size > 60000) memo.clear(); memo.set(k, c); } return c; };
  if (t.startsWith('flat')) { const preset = t.split(':')[1] || 'classic'; const biome = preset === 'desert' || preset === 'redstone' ? BIO.DESERT : preset === 'snowy' ? BIO.SNOWY : BIO.PLAINS; g.column = wrap((x, z) => Object.assign({}, oc(0, 0), { b: biome, v: 0, h: flatTop(preset) - 1 })); }
  else if (t === 'amplified') g.column = wrap((x, z) => { const c = oc(x, z); return c.h > SEA + 2 ? Object.assign({}, c, { h: Math.min(WH - 48, Math.round(SEA + (c.h - SEA) * 1.9)) }) : c; });
  else if (t === 'large') g.column = wrap((x, z) => oc(x / 4, z / 4));
}
{ const _dg = Dim.get; Dim.get = function (dim) { const w = _dg.apply(this, arguments); try { patchGenForType(w); } catch (e) { console.warn(e); } return w; }; }
{ const _g = World.prototype.generate; World.prototype.generate = function (cx, cz) { if (this.dim === 'overworld' && !S.rules.arena && worldType().startsWith('flat')) return flatChunk(this, cx, cz); return _g.apply(this, arguments); }; }
// ---- Create World screen ----
openRules = function (target, note) {
  const R = target || S.rules; let el = $('rulesPanel');
  if (!el) { el = document.createElement('div'); el.id = 'rulesPanel'; el.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:10px;background:rgba(0,0,0,.78);z-index:70;color:#fff';
    el.innerHTML = '<div style="font-size:30px;text-shadow:2px 2px 0 #333">Game Rules</div><div id="rulesNote" style="color:#ccc;font-size:15px"></div><div id="rulesList" style="width:min(560px,92vw);max-height:60vh;overflow-y:auto;display:flex;flex-direction:column;gap:4px;padding:4px"></div><button class="mbtn" id="rulesDone">Done</button>';
    document.body.appendChild(el); el.querySelector('#rulesDone').addEventListener('click', () => { el.style.display = 'none'; }); el.addEventListener('keydown', (e) => e.stopPropagation()); }
  el.querySelector('#rulesNote').textContent = note || 'Rules for this world. They are saved with it.';
  const list = el.querySelector('#rulesList'); list.innerHTML = ''; const order = Object.keys(RULE_NAMES);
  const keys = Object.keys(R).filter(k => typeof R[k] === 'boolean' && !/^(arena|hardcore|hardcoreDead)$/.test(k)); keys.sort((a, b) => (RULE_NAMES[a] ? 0 : 1) - (RULE_NAMES[b] ? 0 : 1) || order.indexOf(a) - order.indexOf(b));
  for (const k of keys) { const [nm, desc] = RULE_NAMES[k] || [k, '']; const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(0,0,0,.45);border:2px solid #000;padding:6px 10px';
    row.innerHTML = '<div><div style="font-size:19px">' + nm + '</div><div style="font-size:13px;color:#bbb">' + desc + '</div></div><div class="seg"><button data-v="1">On</button><button data-v="0">Off</button></div>';
    const paint = () => { for (const b of row.querySelectorAll('button')) b.classList.toggle('on', (b.dataset.v === '1') === !!R[k]); }; paint();
    for (const b of row.querySelectorAll('button')) b.addEventListener('click', () => { if (R === S.rules && mpClient()) return; R[k] = b.dataset.v === '1'; paint(); if (R === S.rules) { if (typeof MP !== 'undefined' && MP.rulesChanged) MP.rulesChanged(); if (typeof updateHearts === 'function') updateHearts(); } });
    if (R === S.rules && S.rules.arena && (k === 'pvp' || k === 'keepInventory' || k === 'doMobSpawning')) { row.style.opacity = '0.5'; row.style.pointerEvents = 'none'; }
    list.appendChild(row); }
  el.style.display = 'flex';
};
{ const b0 = $('btnRules'); if (b0) { const nb = b0.cloneNode(true); b0.parentNode.replaceChild(nb, b0); nb.addEventListener('click', () => openRules()); } }
{ const modeRow = $('modeSeg').parentNode; const mk = (html) => { const d = document.createElement('div'); d.className = 'row'; d.innerHTML = html; return d; };
  const seg = $('modeSeg'); if (!seg.querySelector('[data-m="hardcore"]')) { const b = document.createElement('button'); b.dataset.m = 'hardcore'; b.textContent = 'Hardcore'; b.title = 'Survival on Hard with one life'; seg.appendChild(b); b.addEventListener('click', () => { for (const x of seg.children) x.classList.toggle('on', x === b); pendingMode = 'hardcore'; }); }
  const typeRow = mk('<label>World type</label><select id="worldTypeSel" style="font-family:inherit;font-size:18px;padding:4px"><option value="default">Default</option><option value="flat">Superflat</option><option value="amplified">Amplified</option><option value="large">Large Biomes</option></select><select id="flatPresetSel" style="font-family:inherit;font-size:18px;padding:4px;display:none">' + Object.keys(FLAT_PRESETS).map(k => '<option value="' + k + '">' + FLAT_PRESETS[k][0] + '</option>').join('') + '</select>');
  const rulesRow = mk('<label>Game rules</label><button class="sbtn" id="btnPreRules">Set game rules...</button><span id="preRulesNote" style="font-size:14px;color:#ccc;margin-left:8px"></span>');
  modeRow.parentNode.insertBefore(typeRow, modeRow.nextSibling); modeRow.parentNode.insertBefore(rulesRow, typeRow.nextSibling);
  const note = () => { const n = Object.keys(NEWWORLD.rules).filter(k => NEWWORLD.rules[k] !== RULE_DEFAULTS[k]).length; $('preRulesNote').textContent = n ? n + ' changed' : 'defaults'; };
  $('worldTypeSel').addEventListener('change', (e) => { NEWWORLD.type = e.target.value; $('flatPresetSel').style.display = NEWWORLD.type === 'flat' ? '' : 'none'; });
  $('flatPresetSel').addEventListener('change', (e) => { NEWWORLD.preset = e.target.value; });
  $('btnPreRules').addEventListener('click', () => { openRules(NEWWORLD.rules, 'Rules the new world starts with. You can still change them later from the pause menu.'); $('rulesDone').addEventListener('click', note, { once: true }); });
  for (const id of ['worldTypeSel', 'flatPresetSel']) $(id).addEventListener('keydown', (e) => e.stopPropagation());
  document.addEventListener('click', (e) => { if (e.target && e.target.id === 'btnNew') NEWWORLD.armed = true; }, true); note(); }
{ const _sw = startWorld; startWorld = function (data) {
    if (NEWWORLD.armed && data && !data.player && !data.rules && !(typeof MP !== 'undefined' && MP.role === 'client')) {
      data.rules = Object.assign({}, NEWWORLD.rules); if (NEWWORLD.type !== 'default' && data.mode !== 'pvp') data.rules.worldType = NEWWORLD.type === 'flat' ? 'flat:' + NEWWORLD.preset : NEWWORLD.type;
      if (data.mode === 'hardcore') { data.mode = 'survival'; data.rules.hardcore = true; data.difficulty = 'hard'; } }
    else if (data && data.mode === 'hardcore') data.mode = 'survival';
    NEWWORLD.armed = false; return _sw.apply(this, arguments); }; }
// ---- Hardcore: Hard difficulty, one life; when you die you can only watch ----
function hardcoreSpectate() { player.dead = false; player.health = 20; show('death', false); S.rules.hardcoreDead = true; setMode('spectator'); requestLock(); toast('Hardcore: you can only spectate this world now', 4); saveGame(false); }
document.addEventListener('click', (e) => { if (e.target && e.target.id === 'btnRespawn' && S.rules.hardcore && S.started) { e.stopImmediatePropagation(); e.preventDefault(); hardcoreSpectate(); } }, true);
{ const _die = Player.prototype.die; Player.prototype.die = function () { const r = _die.apply(this, arguments); const b = $('btnRespawn'); if (b) b.textContent = this.dead && S.rules.hardcore ? 'Spectate world' : 'Respawn'; return r; };
  const _sm = setMode; setMode = function (m) { if (S.rules.hardcore && S.rules.hardcoreDead && m !== 'spectator') { toast('This Hardcore world is over. You can only spectate', 2); return; } return _sm.apply(this, arguments); };
  const _fl = finishLoading; finishLoading = function () { const r = _fl.apply(this, arguments); if (S.rules.hardcore) { S.difficulty = 'hard'; if (S.rules.hardcoreDead) _sm('spectator'); } return r; }; }

// ================= DRAW YOUR OWN SKIN =================
// Profile > Draw skin opens a pixel editor on the 64x64 skin sheet (the same layout as a Minecraft skin file): pencil,
// eraser, fill and colour picker, undo, a body-part guide, and a live front and back preview. Done keeps it as your skin.
const SKINED = { cv: null, tool: 'pen', color: '#3a7bd5', undo: [], down: false };
const SKIN_REGIONS = [['Head', 0, 0, 32, 16], ['Hat layer', 32, 0, 32, 16], ['Right leg', 0, 16, 16, 16], ['Body', 16, 16, 24, 16], ['Right arm', 40, 16, 16, 16], ['Leg layer', 0, 32, 16, 16], ['Jacket', 16, 32, 24, 16], ['Sleeve', 40, 32, 16, 16], ['Leg layer', 0, 48, 16, 16], ['Left leg', 16, 48, 16, 16], ['Left arm', 32, 48, 16, 16], ['Sleeve', 48, 48, 16, 16]];
function skinEdDraw() { const v = $('skinEdView'), x = v.getContext('2d'), Z = 8; x.imageSmoothingEnabled = false; x.clearRect(0, 0, 512, 512);
  for (let i = 0; i < 64; i++) for (let j = 0; j < 64; j++) { x.fillStyle = (i + j) & 1 ? '#2b2b2b' : '#353535'; x.fillRect(i * Z, j * Z, Z, Z); }
  x.drawImage(SKINED.cv, 0, 0, 512, 512); x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 1; x.beginPath(); for (let i = 0; i <= 64; i += 4) { x.moveTo(i * Z + .5, 0); x.lineTo(i * Z + .5, 512); x.moveTo(0, i * Z + .5); x.lineTo(512, i * Z + .5); } x.stroke();
  x.strokeStyle = 'rgba(255,220,90,.6)'; x.font = '10px monospace'; x.fillStyle = 'rgba(255,230,140,.85)'; for (const [n, a, b, w, h] of SKIN_REGIONS) { x.strokeRect(a * Z + .5, b * Z + .5, w * Z - 1, h * Z - 1); x.fillText(n, a * Z + 3, b * Z + 11); }
  drawSkinPreview($('skinEdPrev'), SKINED.cv); }
function skinEdPush() { SKINED.undo.push(SKINED.cv.getContext('2d').getImageData(0, 0, 64, 64)); if (SKINED.undo.length > 40) SKINED.undo.shift(); }
function skinEdAt(e) { const r = $('skinEdView').getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * 64), Math.floor((e.clientY - r.top) / r.height * 64)]; }
function skinEdApply(px, py) { if (px < 0 || py < 0 || px > 63 || py > 63) return; const c = SKINED.cv.getContext('2d');
  if (SKINED.tool === 'pen') { c.fillStyle = SKINED.color; c.clearRect(px, py, 1, 1); c.fillRect(px, py, 1, 1); }
  else if (SKINED.tool === 'erase') c.clearRect(px, py, 1, 1);
  else if (SKINED.tool === 'pick') { const d = c.getImageData(px, py, 1, 1).data; if (d[3] > 0) { SKINED.color = '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join(''); $('skinEdColor').value = SKINED.color; } skinEdTool('pen'); }
  else if (SKINED.tool === 'fill') { const img = c.getImageData(0, 0, 64, 64), d = img.data; const k0 = (py * 64 + px) * 4; const f0 = [d[k0], d[k0 + 1], d[k0 + 2], d[k0 + 3]]; const seen = new Uint8Array(4096); const from = true; const at = (x, y) => { if (seen[y * 64 + x]) return false; const k = (y * 64 + x) * 4; return (f0[3] < 10 ? d[k + 3] < 10 : d[k + 3] >= 10 && Math.abs(d[k] - f0[0]) + Math.abs(d[k + 1] - f0[1]) + Math.abs(d[k + 2] - f0[2]) < 60); }; /* close shades count as the same colour, so a textured shirt fills in one go */ const h = SKINED.color; const rgb = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255]; 
    const reg = SKIN_REGIONS.find(([n, a, b, w, hh]) => px >= a && px < a + w && py >= b && py < b + hh) || ['', 0, 0, 64, 64]; const st = [[px, py]]; // a fill stays inside the body part you clicked
    while (st.length) { const [x, y] = st.pop(); if (x < reg[1] || y < reg[2] || x >= reg[1] + reg[3] || y >= reg[2] + reg[4] || at(x, y) !== from) continue; seen[y * 64 + x] = 1; const k = (y * 64 + x) * 4; d[k] = rgb[0]; d[k + 1] = rgb[1]; d[k + 2] = rgb[2]; d[k + 3] = 255; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    c.putImageData(img, 0, 0); }
  skinEdDraw(); }
function skinEdTool(t) { SKINED.tool = t; for (const b of document.querySelectorAll('#skinEdTools button[data-t]')) b.classList.toggle('on', b.dataset.t === t); }
function openSkinEditor() {
  let el = $('skinEd');
  if (!el) { el = document.createElement('div'); el.id = 'skinEd'; el.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;gap:18px;background:rgba(0,0,0,.88);z-index:80;color:#fff;flex-wrap:wrap;overflow:auto';
    el.innerHTML = '<canvas id="skinEdView" width="512" height="512" style="width:min(512px,92vw,72vh);height:auto;aspect-ratio:1;image-rendering:pixelated;border:3px solid #000;cursor:crosshair;touch-action:none"></canvas>' +
      '<div style="display:flex;flex-direction:column;gap:10px;align-items:center"><div style="font-size:26px;text-shadow:2px 2px 0 #333">Draw your skin</div><canvas id="skinEdPrev" width="234" height="216"></canvas>' +
      '<div id="skinEdTools" class="seg"><button data-t="pen" class="on">Pencil</button><button data-t="erase">Eraser</button><button data-t="fill">Fill</button><button data-t="pick">Pick colour</button></div>' +
      '<div style="display:flex;gap:8px;align-items:center"><input type="color" id="skinEdColor" value="#3a7bd5" style="width:56px;height:36px"><div id="skinEdPal" style="display:grid;grid-template-columns:repeat(8,22px);gap:3px"></div></div>' +
      '<div style="display:flex;gap:8px"><button class="sbtn" id="skinEdUndo">Undo</button><button class="sbtn" id="skinEdClear">Clear all</button></div>' +
      '<div style="font-size:13px;color:#bbb;max-width:260px;text-align:center">Yellow boxes mark the body parts. The "layer" boxes are drawn over the body (hat, jacket, sleeves) and can be left empty.</div>' +
      '<div style="display:flex;gap:8px"><button class="mbtn" id="skinEdDone" style="width:130px">Done</button><button class="mbtn" id="skinEdCancel" style="width:130px">Cancel</button></div></div>';
    document.body.appendChild(el); el.addEventListener('keydown', (e) => e.stopPropagation());
    const pal = ['#000000', '#ffffff', '#7f7f7f', '#c69c6d', '#f1c9a5', '#8d5524', '#3b2a1a', '#b03a2e', '#e67e22', '#f1c40f', '#2ecc71', '#1e8449', '#3498db', '#1f3a93', '#8e44ad', '#ff7eb6'];
    for (const p of pal) { const s = document.createElement('div'); s.style.cssText = 'width:22px;height:22px;border:2px solid #000;cursor:pointer;background:' + p; s.addEventListener('click', () => { SKINED.color = p; $('skinEdColor').value = p; if (SKINED.tool !== 'fill') skinEdTool('pen'); }); el.querySelector('#skinEdPal').appendChild(s); }
    for (const b of el.querySelectorAll('#skinEdTools button')) b.addEventListener('click', () => skinEdTool(b.dataset.t));
    $('skinEdColor').addEventListener('input', (e) => { SKINED.color = e.target.value; });
    const v = $('skinEdView'); v.addEventListener('pointerdown', (e) => { e.preventDefault(); v.setPointerCapture(e.pointerId); SKINED.down = true; skinEdPush(); skinEdApply(...skinEdAt(e)); });
    v.addEventListener('pointermove', (e) => { if (SKINED.down && (SKINED.tool === 'pen' || SKINED.tool === 'erase')) skinEdApply(...skinEdAt(e)); }); const up = () => { SKINED.down = false; }; v.addEventListener('pointerup', up); v.addEventListener('pointercancel', up);
    $('skinEdUndo').addEventListener('click', () => { const u = SKINED.undo.pop(); if (u) { SKINED.cv.getContext('2d').putImageData(u, 0, 0); skinEdDraw(); } });
    $('skinEdClear').addEventListener('click', () => { skinEdPush(); SKINED.cv.getContext('2d').clearRect(0, 0, 64, 64); skinEdDraw(); });
    $('skinEdCancel').addEventListener('click', () => { el.style.display = 'none'; });
    $('skinEdDone').addEventListener('click', () => { profDraft.png = SKINED.cv.toDataURL('image/png'); el.style.display = 'none'; renderSkinEditor(); refreshPreview(); $('pSkinNote').textContent = 'Using the skin you drew. Press Save to keep it.'; }); }
  const start = (src) => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0); SKINED.cv = c; SKINED.undo = []; el.style.display = 'flex'; skinEdDraw(); };
  if (profDraft.png) { const img = new Image(); img.onload = () => start(normalizeSkin(img)); img.onerror = () => start(makeSkinCanvas(profDraft.skin)); img.src = profDraft.png; } else start(makeSkinCanvas(profDraft.skin));
}
{ const up = $('btnSkinUpload'); if (up && !$('btnSkinDraw')) { const b = document.createElement('button'); b.className = 'sbtn'; b.id = 'btnSkinDraw'; b.textContent = 'Draw skin'; up.parentNode.insertBefore(b, up); b.addEventListener('click', openSkinEditor); } }
