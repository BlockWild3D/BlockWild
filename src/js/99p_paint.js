// ================= TEXTURE STUDIO: draw your own block and item pictures =================
// Opened from the Mods screen. You pick a block or an item, draw its 16x16 picture with the mouse, and it changes in the
// game straight away. You can also make brand new blocks, items, food and tools (those join the game after a restart,
// because the game hands out block and item numbers when it starts). Everything is kept in this browser; "Save pack to
// file" writes it all into one file you can send to a friend, who loads it with "Load pack".
// The store itself (PAINT) and the part that adds your new things to the game are in 01a_mods.js.
const PAINT_ORIG = { tiles: {}, icons: {} }; // what things looked like before you painted them, for "Put the original back"
const paintAnim = (name) => typeof ANIM !== 'undefined' && !!ANIM[name]; // moving textures (water, lava, fire) are redrawn every frame
function paintTileGet(i) { return actx.getImageData((i % ATN) * 16, Math.floor(i / ATN) * 16, 16, 16).data; }
function paintCanvas(bytes) { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); const img = x.createImageData(16, 16); img.data.set(bytes); x.putImageData(img, 0, 0); return c; }
function paintRefreshItem(id) { if (itemTexCache[id]) { itemTexCache[id].dispose(); itemTexCache[id] = null; } if (spriteMats[id]) spriteMats[id] = null; handId = -1; }
function paintTileSet(i, bytes) {
  const img = actx.createImageData(16, 16); img.data.set(bytes); actx.putImageData(img, (i % ATN) * 16, Math.floor(i / ATN) * 16); TILE_CV.delete(i);
  let s = [0, 0, 0], n = 0; for (let k = 0; k < 1024; k += 4) if (bytes[k + 3] > 0) { s[0] += bytes[k]; s[1] += bytes[k + 1]; s[2] += bytes[k + 2]; n++; } TILE_AVG[i] = n ? [s[0] / n / 255, s[1] / n / 255, s[2] / n / 255] : [1, 1, 1];
  if (typeof hdTile === 'function') hdTile(i); if (typeof atlasTex !== 'undefined') atlasTex.needsUpdate = true;
  // every block that shows this texture gets its inventory picture drawn again (unless you painted that picture yourself)
  for (const id of ITEM_IDS) { const it = ITEMS[id]; if (it.kind !== 'block' || !BL[id] || !BL[id].texIds || !BL[id].texIds.includes(i) || PAINT.icons[it.key] || !LAZY_MAKE[id]) continue; lazyIcon(id, LAZY_MAKE[id]); paintRefreshItem(id); }
}
function paintIconGet(id) { const c = ICON_CANVAS[id]; if (!c || c.width !== 16) return null; return c.getContext('2d').getImageData(0, 0, 16, 16).data; }
function paintIconSet(id, bytes) { const copy = new Uint8ClampedArray(bytes); lazyIcon(id, () => paintCanvas(copy)); paintRefreshItem(id); }
function paintIconKeep(id, key) { if (key in PAINT_ORIG.icons) return; PAINT_ORIG.icons[key] = { make: LAZY_MAKE[id], bytes: paintIconGet(id) }; }
// when the game starts: put your pictures over the built-in ones
(function paintApply() {
  for (const name in PAINT.tiles) { const i = TILE[name]; if (i === undefined || paintAnim(name)) continue; try { PAINT_ORIG.tiles[name] = paintTileGet(i); paintTileSet(i, paintBytes(PAINT.tiles[name])); } catch (e) { console.warn('paint tile', name, e); } }
  for (const key in PAINT.icons) { const id = IT[key]; if (id === undefined) continue; try { paintIconKeep(id, key); paintIconSet(id, paintBytes(PAINT.icons[key])); } catch (e) { console.warn('paint icon', key, e); } }
})();

// ---------------- the editor ----------------
const PE = { tab: 'items', q: '', sel: null, tgts: [], ti: 0, px: new Uint8ClampedArray(1024), undo: [], tool: 'pen', color: '#e0115f', down: false, opaque: false, reload: false, recent: [] };
const PE_TYPES = [['block', 'Block'], ['item', 'Item'], ['food', 'Food'], ['sword', 'Sword'], ['pickaxe', 'Pickaxe'], ['axe', 'Axe'], ['shovel', 'Shovel'], ['hoe', 'Hoe']];
const PE_PAL = ['#000000', '#3b3b3b', '#7f7f7f', '#bcbcbc', '#ffffff', '#5a3a1a', '#8a6a3a', '#c69c6d', '#7a0a30', '#b03a2e', '#e0115f', '#e67e22', '#f1c40f', '#fff6b0', '#1e8449', '#2ecc71', '#9ed36c', '#1f3a93', '#3498db', '#46dcd2', '#beffee', '#4a2a7a', '#8e44ad', '#ff7eb6'];
const peHex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
const peCustom = (key) => PAINT.custom.find(c => c.key === key);
function peTargets(sel) { // the pictures that belong to what you picked
  if (sel.type === 'tile') return [{ k: 'tile', name: sel.name, label: sel.name }];
  if (sel.type === 'custom' && !PAINT_LIVE.has(sel.key)) { const c = peCustom(sel.key); if (!c) return [];
    if (c.type !== 'block') return [{ k: 'picon', key: c.key, label: 'Item picture' }];
    return c.faces ? [{ k: 'ptile', name: c.key + '_top', label: 'Top', clear: c.clear }, { k: 'ptile', name: c.key + '_side', label: 'Sides', clear: c.clear }, { k: 'ptile', name: c.key + '_bottom', label: 'Bottom', clear: c.clear }] : [{ k: 'ptile', name: c.key, label: 'All sides', clear: c.clear }]; }
  const id = sel.type === 'custom' ? IT[sel.key] : sel.id; const it = ITEMS[id]; if (!it) return []; const out = [];
  if (it.kind === 'block' && BL[id] && BL[id].texIds) { const names = {}; for (const n in TILE) names[TILE[n]] = n; const seen = new Map(); const face = ['Sides', 'Sides', 'Top', 'Bottom', 'Sides', 'Sides'];
    BL[id].texIds.forEach((t, k) => { const n = names[t]; if (n === undefined || paintAnim(n)) return; if (!seen.has(n)) seen.set(n, new Set()); seen.get(n).add(face[k] || 'Sides'); });
    for (const [n, fs] of seen) out.push({ k: 'tile', name: n, label: fs.size === 3 || seen.size === 1 ? 'All sides' : [...fs].join(' + ') }); }
  if (paintIconGet(id)) out.push({ k: 'icon', id, key: it.key, label: out.length ? 'Inventory picture' : 'Item picture' });
  return out;
}
function peRead(t) {
  if (t.k === 'tile') return new Uint8ClampedArray(paintTileGet(TILE[t.name]));
  if (t.k === 'icon') return new Uint8ClampedArray(paintIconGet(t.id) || 1024);
  if (t.k === 'ptile') { if (PAINT.tiles[t.name]) return paintBytes(PAINT.tiles[t.name]); const d = new Uint8ClampedArray(1024); if (!t.clear) for (let k = 0; k < 256; k++) { d[k * 4] = 176; d[k * 4 + 1] = 96; d[k * 4 + 2] = 208; d[k * 4 + 3] = 255; } return d; }
  return PAINT.icons[t.key] ? paintBytes(PAINT.icons[t.key]) : new Uint8ClampedArray(1024);
}
function peWrite(t, bytes) {
  if (t.k === 'tile') { const i = TILE[t.name]; if (!(t.name in PAINT_ORIG.tiles)) PAINT_ORIG.tiles[t.name] = paintTileGet(i); PAINT.tiles[t.name] = paintB64(bytes); paintTileSet(i, bytes); }
  else if (t.k === 'icon') { paintIconKeep(t.id, t.key); PAINT.icons[t.key] = paintB64(bytes); paintIconSet(t.id, bytes); }
  else if (t.k === 'ptile') PAINT.tiles[t.name] = paintB64(bytes);
  else PAINT.icons[t.key] = paintB64(bytes);
  if (!paintSave()) peNote('Could not save: this browser\'s storage is full.');
}
function peCanReset(t) { return !!t && ((t.k === 'tile' && !!PAINT.tiles[t.name] && t.name in PAINT_ORIG.tiles && !peOwnTile(t.name)) || (t.k === 'icon' && !!PAINT.icons[t.key] && !peCustom(t.key))); }
function peOwnTile(name) { return PAINT.custom.some(c => c.type === 'block' && (name === c.key || name === c.key + '_top' || name === c.key + '_side' || name === c.key + '_bottom')); }
function peReset(t) {
  if (t.k === 'tile') { delete PAINT.tiles[t.name]; paintTileSet(TILE[t.name], PAINT_ORIG.tiles[t.name]); }
  else { delete PAINT.icons[t.key]; const o = PAINT_ORIG.icons[t.key]; if (o && o.make) { lazyIcon(t.id, o.make); paintRefreshItem(t.id); } else if (o && o.bytes) paintIconSet(t.id, o.bytes); }
  paintSave();
}
function peNote(msg) { const el = $('peNote'); if (el) el.textContent = msg || ''; }
function peSelect(sel) { PE.sel = sel; PE.tgts = peTargets(sel); PE.ti = 0; peOpenTarget(); peList(); }
function peOpenTarget() {
  const t = PE.tgts[PE.ti]; PE.undo = []; peNote('');
  if (t) { PE.px = peRead(t); PE.opaque = (t.k === 'tile' || t.k === 'ptile') && !t.clear && (() => { for (let k = 3; k < 1024; k += 4) if (PE.px[k] < 128) return false; return true; })(); }
  if (PE.opaque && PE.tool === 'erase') PE.tool = 'pen';
  peSide(); peDraw();
}
function peTitle() { const s = PE.sel; if (!s) return 'Pick something on the left'; if (s.type === 'tile') return 'Texture: ' + s.name; if (s.type === 'custom') { const c = peCustom(s.key); return c ? c.name : ''; } return ITEMS[s.id].name; }
function peDraw() { // the big drawing grid, the small previews
  const v = $('peView'); if (!v) return; const x = v.getContext('2d'); const d = PE.px, has = !!PE.tgts[PE.ti];
  for (let py = 0; py < 16; py++) for (let px = 0; px < 16; px++) { const k = (py * 16 + px) * 4;
    x.fillStyle = (px + py) & 1 ? '#3a3a3a' : '#2c2c2c'; x.fillRect(px * 32, py * 32, 32, 32);
    if (has && d[k + 3] > 127) { x.fillStyle = 'rgb(' + d[k] + ',' + d[k + 1] + ',' + d[k + 2] + ')'; x.fillRect(px * 32, py * 32, 32, 32); } }
  x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.beginPath(); for (let i = 1; i < 16; i++) { x.moveTo(i * 32 + 0.5, 0); x.lineTo(i * 32 + 0.5, 512); x.moveTo(0, i * 32 + 0.5); x.lineTo(512, i * 32 + 0.5); } x.stroke();
  const p = $('pePrev'), q = p.getContext('2d'); q.imageSmoothingEnabled = false; q.fillStyle = '#8b8b8b'; q.fillRect(0, 0, 144, 144); if (!has) return; const c = paintCanvas(d); const t = PE.tgts[PE.ti];
  if (t.k === 'tile' || t.k === 'ptile') { for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) q.drawImage(c, a * 48, b * 48, 48, 48); } else q.drawImage(c, 8, 8, 128, 128);
  const iso = $('peIso'), ix = iso.getContext('2d'); ix.imageSmoothingEnabled = false; ix.clearRect(0, 0, 96, 96);
  const id = PE.sel && (PE.sel.type === 'item' ? PE.sel.id : PE.sel.type === 'custom' && PAINT_LIVE.has(PE.sel.key) ? IT[PE.sel.key] : null);
  if (id != null && ICON_CANVAS[id]) ix.drawImage(ICON_CANVAS[id], 0, 0, 96, 96); else if (t.k === 'picon') ix.drawImage(c, 0, 0, 96, 96); else if (t.k === 'ptile' || t.k === 'tile') ix.drawImage(c, 16, 16, 64, 64);
}
function peSide() { // the tool buttons and the row of pictures a block has
  const t = PE.tgts[PE.ti]; $('peTitle').textContent = peTitle();
  const f = $('peFaces'); f.innerHTML = ''; PE.tgts.forEach((g, k) => { const b = document.createElement('button'); b.textContent = g.label; if (k === PE.ti) b.className = 'on'; b.addEventListener('click', () => { PE.ti = k; peOpenTarget(); }); f.appendChild(b); }); f.style.display = PE.tgts.length > 1 ? 'flex' : 'none';
  for (const b of $('peTools').children) { b.classList.toggle('on', b.dataset.t === PE.tool); if (b.dataset.t === 'erase') b.disabled = PE.opaque; }
  $('peReset').disabled = !peCanReset(t); const s = PE.sel; const mine = s && s.type === 'custom' && !!peCustom(s.key);
  $('peDelete').style.display = mine ? '' : 'none'; $('peEdit').style.display = mine ? '' : 'none';
  $('peInfo').textContent = !s ? 'Pick a block or an item on the left, or press "Make something new".' : !t ? 'This one has a moving or 3D picture that cannot be drawn here.' : s.type === 'custom' && !PAINT_LIVE.has(s.key) ? 'New: it joins the game after a restart. You can draw it now.' : PE.opaque ? 'A solid block face: every pixel needs a colour, so there is no eraser.' : (t.k === 'tile' ? 'This texture is shared by every block that uses it. ' : '') + 'Changes show in the game straight away.';
  const r = $('peRecent'); r.innerHTML = ''; for (const col of PE.recent) { const sw = document.createElement('div'); sw.style.cssText = 'width:20px;height:20px;border:2px solid #000;cursor:pointer;background:' + col; sw.addEventListener('click', () => peColor(col)); r.appendChild(sw); }
  $('peDone').textContent = PE.reload ? 'Done and restart' : 'Done';
}
function peColor(col) { PE.color = col; $('peColor').value = col; if (PE.tool === 'erase' || PE.tool === 'pick') { PE.tool = 'pen'; peSide(); } }
function peUsed(col) { const i = PE.recent.indexOf(col); if (i >= 0) PE.recent.splice(i, 1); PE.recent.unshift(col); PE.recent.length = Math.min(PE.recent.length, 10); }
function peAt(e) { const r = $('peView').getBoundingClientRect(); return [clamp(Math.floor((e.clientX - r.left) / r.width * 16), 0, 15), clamp(Math.floor((e.clientY - r.top) / r.height * 16), 0, 15)]; }
function pePush() { PE.undo.push(new Uint8ClampedArray(PE.px)); if (PE.undo.length > 60) PE.undo.shift(); }
function peApply(px, py) {
  const d = PE.px, k = (py * 16 + px) * 4; const n = parseInt(PE.color.slice(1), 16), col = [n >> 16 & 255, n >> 8 & 255, n & 255, 255];
  const put = (q, c) => { d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2]; d[q + 3] = c[3]; };
  if (PE.tool === 'pick') { if (d[k + 3] > 127) peColor(peHex(d[k], d[k + 1], d[k + 2])); PE.tool = 'pen'; peSide(); return; }
  if (PE.tool === 'erase') { put(k, [0, 0, 0, 0]); return; }
  if (PE.tool === 'pen') { put(k, col); const m = $('peMirror').checked; if (m) put((py * 16 + (15 - px)) * 4, col); return; }
  /* fill: every touching pixel of the same colour */
  const same = (q) => d[q] === t0[0] && d[q + 1] === t0[1] && d[q + 2] === t0[2] && d[q + 3] === t0[3]; const t0 = [d[k], d[k + 1], d[k + 2], d[k + 3]]; if (t0.every((v, i) => v === col[i])) return;
  const st = [[px, py]]; while (st.length) { const [x, y] = st.pop(); if (x < 0 || y < 0 || x > 15 || y > 15) continue; const q = (y * 16 + x) * 4; if (!same(q)) continue; put(q, col); st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
}
function peCommit() { const t = PE.tgts[PE.ti]; if (!t) return; if (PE.opaque) for (let k = 3; k < 1024; k += 4) PE.px[k] = 255; else for (let k = 3; k < 1024; k += 4) PE.px[k] = PE.px[k] > 127 ? 255 : 0; peWrite(t, PE.px); peSide(); peDraw(); peThumb(); }
function peThumb() { if (PE.tab === 'changed' || PE.tab === 'mine') peList(); else { const el = document.querySelector('#peGrid .on canvas'); if (el && PE.sel) peThumbDraw(el, PE.sel); } }
function peThumbDraw(cv, sel) { const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 32, 32); let src = null;
  if (sel.type === 'tile') src = tileCanvas(TILE[sel.name]); else if (sel.type === 'item') src = ICON_CANVAS[sel.id];
  else if (PAINT_LIVE.has(sel.key)) src = ICON_CANVAS[IT[sel.key]]; else { const c = peCustom(sel.key); const b = c && (c.type === 'block' ? PAINT.tiles[c.faces ? c.key + '_side' : c.key] : PAINT.icons[c.key]); if (b) src = paintCanvas(paintBytes(b)); else { x.fillStyle = '#b060d0'; x.fillRect(4, 4, 24, 24); } }
  if (src) x.drawImage(src, 0, 0, 32, 32); }
function peEntries() { // what the list on the left shows for the tab and the search words
  const q = PE.q.trim().toLowerCase(); let out = [];
  if (PE.tab === 'items') { for (const id of ITEM_IDS) { const it = ITEMS[id]; if (!it || it.hidden || (q && !it.name.toLowerCase().includes(q) && !it.key.includes(q))) continue; out.push({ sel: { type: 'item', id }, name: it.name }); } }
  else if (PE.tab === 'tiles') { for (const n of Object.keys(TILE).sort()) { if (paintAnim(n) || (q && !n.includes(q.replace(/ /g, '_')))) continue; out.push({ sel: { type: 'tile', name: n }, name: n }); } }
  else if (PE.tab === 'changed') { for (const n in PAINT.tiles) if (TILE[n] !== undefined && !peOwnTile(n)) out.push({ sel: { type: 'tile', name: n }, name: n }); for (const k in PAINT.icons) if (IT[k] !== undefined && !peCustom(k)) out.push({ sel: { type: 'item', id: IT[k] }, name: ITEMS[IT[k]].name }); }
  else for (const c of PAINT.custom) out.push({ sel: { type: 'custom', key: c.key }, name: c.name + (PAINT_LIVE.has(c.key) ? '' : ' (after restart)') });
  return out;
}
const peSame = (a, b) => !!a && !!b && a.type === b.type && a.id === b.id && a.name === b.name && a.key === b.key;
function peList() {
  const g = $('peGrid'); if (!g) return; const all = peEntries(), LIM = 150; g.innerHTML = '';
  for (const b of $('peTabs').children) b.classList.toggle('on', b.dataset.t === PE.tab);
  for (const e of all.slice(0, LIM)) { const el = document.createElement('div'); el.title = e.name; el.className = peSame(e.sel, PE.sel) ? 'on' : '';
    el.style.cssText = 'width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:#8b8b8b;border:2px solid ' + (el.className ? '#fff' : '#373737') + ';cursor:pointer';
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; cv.style.cssText = 'width:32px;height:32px;image-rendering:pixelated'; el.appendChild(cv); try { peThumbDraw(cv, e.sel); } catch (err) { }
    el.addEventListener('click', () => peSelect(e.sel)); g.appendChild(el); }
  $('peCount').textContent = !all.length ? (PE.tab === 'changed' ? 'Nothing repainted yet.' : PE.tab === 'mine' ? 'You have not made anything yet.' : 'Nothing found.') : all.length > LIM ? 'Showing ' + LIM + ' of ' + all.length + '. Type in the search box to find more.' : all.length + (all.length === 1 ? ' thing' : ' things');
}
// ---- making a new block, item or tool ----
function peFormShow(edit) {
  const c = edit ? peCustom(edit) : null; const F = $('peForm'); F.dataset.edit = edit || ''; F.style.display = 'flex';
  $('pfTitle').textContent = c ? 'Change ' + c.name : 'Make something new'; $('pfName').value = c ? c.name : ''; $('pfType').value = c ? c.type : 'block'; $('pfType').disabled = !!c;
  $('pfHard').value = c && c.hardness != null ? c.hardness : 1.5; $('pfTool').value = c && c.tool || ''; $('pfLight').value = c && c.light || 0; $('pfFaces').checked = !!(c && c.faces); $('pfFaces').disabled = !!c; $('pfClear').checked = !!(c && c.clear);
  $('pfTier').value = c && c.tier || 3; $('pfSpeed').value = c && c.speed || ''; $('pfDmg').value = c && c.damage || ''; $('pfFood').value = c && c.food || 4; $('pfCopy').checked = false; $('pfCopyRow').style.display = c ? 'none' : ''; $('pfErr').textContent = ''; peFormType();
}
function peFormType() { const t = $('pfType').value; const tool = !['block', 'item', 'food'].includes(t); $('pfBlock').style.display = t === 'block' ? 'flex' : 'none'; $('pfToolBox').style.display = tool ? 'flex' : 'none'; $('pfFoodBox').style.display = t === 'food' ? 'flex' : 'none';
  $('pfSpeed').placeholder = t === 'sword' || t === 'hoe' ? '1' : String((+$('pfTier').value || 3) * 2); $('pfDmg').placeholder = String((t === 'sword' ? 3 : 1) + (+$('pfTier').value || 3)); }
function peFormSave() {
  const F = $('peForm'), edit = F.dataset.edit; const name = $('pfName').value.trim().slice(0, 40); if (!name) { $('pfErr').textContent = 'Give it a name.'; return; }
  const num = (id, lo, hi, dflt) => { const v = parseFloat($(id).value); return isFinite(v) ? clamp(v, lo, hi) : dflt; };
  let c = edit ? peCustom(edit) : null;
  if (!c) { let base = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'thing', key = base, n = 2;
    while (IT[key] !== undefined || B[key.toUpperCase()] !== undefined || peCustom(key)) key = base + '_' + n++;
    if (PAINT.custom.length >= 200) { $('pfErr').textContent = 'That is the most new things one pack can hold (200).'; return; }
    c = { key, type: $('pfType').value, faces: $('pfFaces').checked }; PAINT.custom.push(c);
    if ($('pfCopy').checked && PE.tgts[PE.ti]) { const b = paintB64(PE.px); if (c.type === 'block') { if (c.faces) for (const s of ['_top', '_side', '_bottom']) PAINT.tiles[key + s] = b; else PAINT.tiles[key] = b; } else PAINT.icons[key] = b; }
    else if (c.type !== 'block' && c.type !== 'item') { /* a new tool or food starts as a copy of the iron one (or bread), so there is a shape to recolour */ const from = IT[c.type === 'food' ? 'bread' : 'iron_' + c.type]; const d = from !== undefined && paintIconGet(from); if (d) PAINT.icons[c.key] = paintB64(d); } }
  c.name = name;
  if (c.type === 'block') { c.hardness = num('pfHard', 0, 100, 1.5); c.tool = $('pfTool').value || ''; c.tier = c.tool ? 1 : 0; c.light = Math.round(num('pfLight', 0, 15, 0)); c.clear = $('pfClear').checked; }
  else if (c.type === 'food') c.food = Math.round(num('pfFood', 1, 20, 4));
  else if (c.type !== 'item') { c.tier = Math.round(num('pfTier', 1, 5, 3)); c.speed = num('pfSpeed', 0, 40, 0); c.damage = num('pfDmg', 0, 100, 0); }
  if (!paintSave()) { $('pfErr').textContent = 'Could not save: this browser\'s storage is full.'; return; }
  PE.reload = true; F.style.display = 'none'; PE.tab = 'mine'; peSelect({ type: 'custom', key: c.key });
}
function pePackOut() { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ blockwildPaint: 1, tiles: PAINT.tiles, icons: PAINT.icons, custom: PAINT.custom })], { type: 'application/json' })); a.download = 'blockwild-textures.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
function pePackIn(file) { const r = new FileReader(); r.onload = () => { try { const p = JSON.parse(r.result); if (!p || !p.blockwildPaint) throw 0; let n = 0;
      const ok = (v) => typeof v === 'string' && v.length < 1500;
      for (const k in (p.tiles || {})) if (ok(p.tiles[k])) { PAINT.tiles[k] = p.tiles[k]; n++; } for (const k in (p.icons || {})) if (ok(p.icons[k])) { PAINT.icons[k] = p.icons[k]; n++; }
      for (const c of (Array.isArray(p.custom) ? p.custom : [])) { if (!c || typeof c.key !== 'string' || !/^[a-z0-9_]{1,48}$/.test(c.key) || !PE_TYPES.some(t => t[0] === c.type) || peCustom(c.key) || PAINT.custom.length >= 200) continue;
        PAINT.custom.push({ key: c.key, type: c.type, name: String(c.name || c.key).slice(0, 40), faces: !!c.faces, clear: !!c.clear, hardness: +c.hardness || 0, tool: ['pickaxe', 'axe', 'shovel', 'hoe'].includes(c.tool) ? c.tool : '', tier: clamp(+c.tier || 0, 0, 5), light: clamp(+c.light || 0, 0, 15), speed: clamp(+c.speed || 0, 0, 40), damage: clamp(+c.damage || 0, 0, 100), food: clamp(+c.food || 0, 0, 20) }); n++; }
      if (!paintSave()) { peNote('Could not save: this browser\'s storage is full.'); return; } PE.reload = true; peNote('Loaded ' + n + ' pictures and things. Press Done to restart and see them.'); peSide(); peList();
    } catch (e) { peNote('That file is not a BlockWild texture pack.'); } }; r.readAsText(file); }
function pePngIn(file) { const t = PE.tgts[PE.ti]; if (!t) return; const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, 16, 16); pePush(); PE.px = new Uint8ClampedArray(x.getImageData(0, 0, 16, 16).data);
    if (PE.opaque) for (let k = 0; k < 1024; k += 4) if (PE.px[k + 3] < 128) { PE.px[k] = PE.px[k + 1] = PE.px[k + 2] = 0; } peCommit(); peNote(img.width === 16 && img.height === 16 ? '' : 'That picture was ' + img.width + ' x ' + img.height + ', so it was shrunk to 16 x 16.'); URL.revokeObjectURL(img.src); };
  img.onerror = () => peNote('That file could not be read as a picture.'); img.src = URL.createObjectURL(file); }
function openPaint() {
  let el = $('paintEd');
  if (!el) { el = document.createElement('div'); el.id = 'paintEd'; el.style.cssText = 'position:fixed;inset:0;display:none;background:rgba(0,0,0,.92);z-index:80;color:#fff;overflow:auto;padding:14px;box-sizing:border-box;gap:16px;justify-content:center;align-items:flex-start;flex-wrap:wrap';
    const lab = 'font-size:15px;color:#ccc;display:flex;align-items:center;gap:6px', inp = 'height:30px;font-size:16px;background:#222;color:#fff;border:2px solid #000;padding:0 6px;font-family:inherit';
    el.innerHTML =
      '<div style="width:300px;display:flex;flex-direction:column;gap:8px"><div style="font-size:28px;text-shadow:2px 2px 0 #333">Texture Studio</div>' +
      '<div id="peTabs" class="seg" style="flex:none"><button data-t="items" style="font-size:15px">Items</button><button data-t="tiles" style="font-size:15px">Textures</button><button data-t="changed" style="font-size:15px">Changed</button><button data-t="mine" style="font-size:15px">Mine</button></div>' +
      '<input id="peSearch" placeholder="Search" style="' + inp + '">' +
      '<div id="peGrid" style="display:flex;flex-wrap:wrap;gap:3px;align-content:flex-start;height:min(360px,42vh);overflow:auto;background:#1a1a1a;border:2px solid #000;padding:4px"></div><div id="peCount" style="font-size:13px;color:#bbb"></div>' +
      '<button class="sbtn" id="peNew">Make something new</button><div style="display:flex;gap:6px"><button class="sbtn" id="pePackSave" style="flex:1">Save pack to file</button><button class="sbtn" id="pePackLoad" style="flex:1">Load pack</button></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;align-items:center"><div id="peTitle" style="font-size:22px;text-shadow:2px 2px 0 #333;min-height:28px"></div><div id="peFaces" class="seg" style="flex:none;width:100%"></div>' +
      '<canvas id="peView" width="512" height="512" style="width:min(512px,94vw,66vh);height:auto;aspect-ratio:1;border:3px solid #000;cursor:crosshair;touch-action:none"></canvas><div id="peNote" style="font-size:14px;color:#ffd27a;min-height:18px;max-width:512px;text-align:center"></div></div>' +
      '<div style="width:280px;display:flex;flex-direction:column;gap:9px"><div id="peTools" class="seg" style="flex:none"><button data-t="pen" style="font-size:15px">Pencil</button><button data-t="erase" style="font-size:15px">Eraser</button><button data-t="fill" style="font-size:15px">Fill</button><button data-t="pick" style="font-size:15px">Pick</button></div>' +
      '<div style="display:flex;gap:8px;align-items:flex-start"><input type="color" id="peColor" value="' + PE.color + '" style="width:54px;height:54px;flex:none"><div id="pePal" style="display:grid;grid-template-columns:repeat(8,22px);gap:3px"></div></div>' +
      '<div style="' + lab + '">Used: <div id="peRecent" style="display:flex;gap:3px;flex-wrap:wrap"></div></div>' +
      '<label style="' + lab + '"><input type="checkbox" id="peMirror"> Mirror left and right while drawing</label>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="sbtn" id="peUndo">Undo</button><button class="sbtn" id="pePngIn">Load PNG</button><button class="sbtn" id="pePngOut">Save PNG</button></div>' +
      '<div style="display:flex;gap:10px;align-items:flex-end"><canvas id="pePrev" width="144" height="144" style="width:144px;height:144px;image-rendering:pixelated;border:2px solid #000"></canvas><canvas id="peIso" width="96" height="96" style="width:96px;height:96px;image-rendering:pixelated;background:#8b8b8b;border:2px solid #000"></canvas></div>' +
      '<div id="peInfo" style="font-size:13px;color:#bbb;min-height:34px"></div>' +
      '<button class="sbtn" id="peReset">Put the original back</button><button class="sbtn" id="peEdit">Change name and settings</button><button class="sbtn" id="peDelete">Delete this</button>' +
      '<button class="mbtn" id="peDone" style="width:100%;margin:6px 0 0">Done</button></div>' +
      '<input type="file" id="peFilePng" accept="image/png,image/*" style="display:none"><input type="file" id="peFilePack" accept=".json,application/json" style="display:none">' +
      '<div id="peForm" style="position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.8);z-index:81"><div style="background:#2b2b2b;border:3px solid #000;padding:18px;display:flex;flex-direction:column;gap:10px;width:min(420px,92vw);max-height:92vh;overflow:auto">' +
      '<div id="pfTitle" style="font-size:24px"></div><label style="' + lab + '">Name <input id="pfName" maxlength="40" style="' + inp + ';flex:1"></label>' +
      '<label style="' + lab + '">What it is <select id="pfType" style="' + inp + ';flex:1">' + PE_TYPES.map(t => '<option value="' + t[0] + '">' + t[1] + '</option>').join('') + '</select></label>' +
      '<div id="pfBlock" style="flex-direction:column;gap:8px"><label style="' + lab + '">How hard to break (stone is 1.5, obsidian 50) <input id="pfHard" type="number" min="0" max="100" step="0.1" style="' + inp + ';width:80px"></label>' +
      '<label style="' + lab + '">Breaks fastest with <select id="pfTool" style="' + inp + ';flex:1"><option value="">Anything</option><option value="pickaxe">Pickaxe (needed for drops)</option><option value="axe">Axe</option><option value="shovel">Shovel</option><option value="hoe">Hoe</option></select></label>' +
      '<label style="' + lab + '">Light it gives off (0 to 15) <input id="pfLight" type="number" min="0" max="15" style="' + inp + ';width:80px"></label>' +
      '<label style="' + lab + '"><input type="checkbox" id="pfFaces"> Different pictures for top, sides and bottom</label><label style="' + lab + '"><input type="checkbox" id="pfClear"> See-through parts, like glass</label></div>' +
      '<div id="pfToolBox" style="flex-direction:column;gap:8px"><label style="' + lab + '">Material level <select id="pfTier" style="' + inp + ';flex:1"><option value="1">1, like wood</option><option value="2">2, like stone</option><option value="3">3, like iron</option><option value="4">4, like diamond</option><option value="5">5, above diamond</option></select></label>' +
      '<label style="' + lab + '">Mining speed (blank = normal for the level) <input id="pfSpeed" type="number" min="0" max="40" step="0.5" style="' + inp + ';width:80px"></label><label style="' + lab + '">Attack damage (blank = normal) <input id="pfDmg" type="number" min="0" max="100" step="0.5" style="' + inp + ';width:80px"></label></div>' +
      '<div id="pfFoodBox" style="flex-direction:column;gap:8px"><label style="' + lab + '">Hunger points it fills (bread is 5) <input id="pfFood" type="number" min="1" max="20" style="' + inp + ';width:80px"></label></div>' +
      '<label id="pfCopyRow" style="' + lab + '"><input type="checkbox" id="pfCopy"> Start from the picture I have open now</label><div id="pfErr" style="color:#ff8a8a;font-size:14px;min-height:16px"></div>' +
      '<div style="display:flex;gap:8px"><button class="sbtn" id="pfOk" style="flex:1">Save</button><button class="sbtn" id="pfCancel" style="flex:1">Cancel</button></div></div></div>';
    document.body.appendChild(el); el.addEventListener('keydown', (e) => e.stopPropagation());
    for (const p of PE_PAL) { const s = document.createElement('div'); s.style.cssText = 'width:22px;height:22px;border:2px solid #000;cursor:pointer;background:' + p; s.addEventListener('click', () => peColor(p)); $('pePal').appendChild(s); }
    for (const b of $('peTabs').children) b.addEventListener('click', () => { PE.tab = b.dataset.t; $('peSearch').style.display = PE.tab === 'items' || PE.tab === 'tiles' ? '' : 'none'; peList(); });
    for (const b of $('peTools').children) b.addEventListener('click', () => { PE.tool = b.dataset.t; peSide(); });
    $('peSearch').addEventListener('input', (e) => { PE.q = e.target.value; peList(); }); $('peColor').addEventListener('input', (e) => { PE.color = e.target.value; if (PE.tool === 'erase' || PE.tool === 'pick') { PE.tool = 'pen'; peSide(); } });
    const v = $('peView'); let last = '';
    v.addEventListener('pointerdown', (e) => { if (!PE.tgts[PE.ti]) return; e.preventDefault(); v.setPointerCapture(e.pointerId); PE.down = true; pePush(); const [x, y] = peAt(e); last = x + ',' + y; const wasPick = PE.tool === 'pick'; peApply(x, y); if (wasPick) { PE.down = false; PE.undo.pop(); return; } peDraw(); });
    v.addEventListener('pointermove', (e) => { if (!PE.down || (PE.tool !== 'pen' && PE.tool !== 'erase')) return; const [x, y] = peAt(e); if (x + ',' + y === last) return; last = x + ',' + y; peApply(x, y); peDraw(); });
    const up = () => { if (!PE.down) return; PE.down = false; if (PE.tool !== 'erase') peUsed(PE.color); peCommit(); }; v.addEventListener('pointerup', up); v.addEventListener('pointercancel', up);
    $('peUndo').addEventListener('click', () => { const u = PE.undo.pop(); if (u) { PE.px = u; peCommit(); } });
    $('pePngIn').addEventListener('click', () => { if (PE.tgts[PE.ti]) $('peFilePng').click(); }); $('peFilePng').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) pePngIn(f); });
    $('pePngOut').addEventListener('click', () => { if (!PE.tgts[PE.ti]) return; const a = document.createElement('a'); a.href = paintCanvas(PE.px).toDataURL('image/png'); a.download = (PE.tgts[PE.ti].name || PE.tgts[PE.ti].key || 'picture') + '.png'; a.click(); });
    $('pePackSave').addEventListener('click', pePackOut); $('pePackLoad').addEventListener('click', () => $('peFilePack').click()); $('peFilePack').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) pePackIn(f); });
    $('peReset').addEventListener('click', () => { const t = PE.tgts[PE.ti]; if (!peCanReset(t)) return; peReset(t); peOpenTarget(); peList(); });
    $('peNew').addEventListener('click', () => peFormShow('')); $('peEdit').addEventListener('click', () => { if (PE.sel && PE.sel.type === 'custom') peFormShow(PE.sel.key); });
    $('pfType').addEventListener('change', peFormType); $('pfTier').addEventListener('change', peFormType); $('pfOk').addEventListener('click', peFormSave); $('pfCancel').addEventListener('click', () => { $('peForm').style.display = 'none'; });
    $('peDelete').addEventListener('click', () => { const b = $('peDelete'); const s = PE.sel; if (!s || s.type !== 'custom') return; if (b.dataset.sure !== s.key) { b.dataset.sure = s.key; b.textContent = 'Press again to delete it for good'; setTimeout(() => { b.dataset.sure = ''; b.textContent = 'Delete this'; }, 3500); return; }
      b.dataset.sure = ''; b.textContent = 'Delete this'; const i = PAINT.custom.findIndex(c => c.key === s.key); if (i < 0) return; if (PAINT_LIVE.has(s.key)) PE.reload = true; PAINT.custom.splice(i, 1); for (const n of [s.key, s.key + '_top', s.key + '_side', s.key + '_bottom']) delete PAINT.tiles[n]; delete PAINT.icons[s.key]; paintSave();
      PE.sel = null; PE.tgts = []; peOpenTarget(); peList(); });
    $('peDone').addEventListener('click', () => { if (PE.reload) { location.reload(); return; } el.style.display = 'none'; });
  }
  el.style.display = 'flex'; if (PE.sel && PE.sel.type === 'custom' && !peCustom(PE.sel.key)) { PE.sel = null; PE.tgts = []; }
  peOpenTarget(); peList();
}
// a selection from the Mine tab is the same thing as its item once it is in the game
{ const _ps = peSelect; peSelect = function (sel) { if (sel && sel.type === 'item' && ITEMS[sel.id] && peCustom(ITEMS[sel.id].key)) sel = { type: 'custom', key: ITEMS[sel.id].key }; return _ps(sel); }; }
{ const bar = $('btnModExamples'); if (bar && !$('btnPaint')) { const b = document.createElement('button'); b.className = 'sbtn'; b.id = 'btnPaint'; b.textContent = 'Texture Studio (draw your own)'; bar.parentNode.appendChild(b); b.addEventListener('click', openPaint); } }
