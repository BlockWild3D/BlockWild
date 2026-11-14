// ================= MORE ITEMS AT RUN TIME (Minecraft rules) =================
// Jukeboxes play music discs (tunes generated here: original music, not Minecraft's) and a comparator reads which disc;
// boats come in every wood, chest boats hold 27 stacks (sneak + use to open); buckets scoop up fish, axolotls, tadpoles
// and powder snow; fire charges light TNT, portals, candles and campfires; the spyglass zooms; goat horns sound;
// recovery compasses point to where you last died; knowledge books teach recipes; books and quills are written and
// signed; maps draw the land around you; bundles carry a stack's worth of mixed items; brushes uncover pottery sherds and
// treasure in suspicious sand and gravel; turtle eggs and frogspawn hatch; the turtle shell gives 10 s of water breathing.
// item data (written books, maps, bundles) travels with the item
{ const _x = xtra; xtra = function (s) { const o = _x.apply(this, arguments); if (s && s.data) return Object.assign(o || {}, { data: s.data }); return o; }; }
const isWater = (id) => typeof isWaterId === 'function' ? isWaterId(id) : id === B.WATER;
// ---------------- jukebox and music ----------------
const DISC_LEN = { '13': 178, cat: 185, blocks: 345, chirp: 185, far: 174, mall: 197, mellohi: 96, stal: 150, strad: 188, ward: 251, '11': 71, wait: 238, otherside: 195, '5': 178, pigstep: 149, relic: 218, creator: 176, creator_music_box: 73, precipice: 299, tears: 175, lava_chicken: 134 };
const DISC_ORDER = DISCS.map(d => d[0]);
const JUKE = new Map(); // key -> { disc, t0, next, gain, bar }
function discTune(k) { let h = 2166136261; for (const ch of k) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; const r = mulberry32(h);
  const SCALES = [[0, 2, 4, 5, 7, 9, 11], [0, 2, 3, 5, 7, 8, 10], [0, 2, 3, 5, 7, 9, 10], [0, 2, 4, 7, 9], [0, 3, 5, 7, 10], [0, 1, 4, 5, 7, 8, 10]];
  const ambient = k === '11' || k === '13' || k === '5'; const box = k === 'creator_music_box';
  const t = { scale: SCALES[r() * SCALES.length | 0], root: 45 + (r() * 12 | 0), bpm: ambient ? 50 : 72 + (r() * 60 | 0), wave: box ? 'sine' : ['triangle', 'square', 'sawtooth', 'sine'][r() * 4 | 0], ambient, box, drums: !ambient && !box && r() < 0.7 };
  t.prog = Array.from({ length: 4 }, () => [0, 3, 4, 5, 1, 2][r() * 6 | 0]); t.prog[0] = 0;
  t.mel = Array.from({ length: 4 }, () => Array.from({ length: 8 }, () => r() < 0.18 ? null : (r() * 10 | 0) - 2));
  t.form = Array.from({ length: 16 }, (_, i) => i < 2 ? 0 : (r() * 4 | 0)); return t; }
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
function jukeSchedule(J, pos) { const c = Sfx.ctx; if (!c) return; const T = J.tune; const beat = 60 / T.bpm; const now = c.currentTime;
  const deg = (d, oct) => { const sc = T.scale; const o = Math.floor(d / sc.length); const i = ((d % sc.length) + sc.length) % sc.length; return T.root + sc[i] + 12 * (o + (oct || 0)); };
  const note = (n, at, dur, vol, wave) => { const o = c.createOscillator(); o.type = wave; o.frequency.value = midi(n); const g = c.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + dur); o.connect(g); g.connect(J.gain); o.start(at); o.stop(at + dur + 0.05); };
  const hit = (at, f, dur, vol) => { const s = c.createBufferSource(); s.buffer = Sfx.noise; const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; const g = c.createGain(); g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur); s.connect(fl); fl.connect(g); g.connect(J.gain); s.start(at, Math.random()); s.stop(at + dur + 0.05); };
  while (J.next < now + 0.6) { const at = Math.max(J.next, now + 0.02); const bar = J.bar; const step = J.step; const chord = T.prog[bar % 4]; const phrase = T.form[(bar >> 1) % 16];
    if (T.ambient) { if (step % 8 === 0) { note(deg(chord, -1), at, beat * 7, 0.05, 'sine'); note(deg(chord + 4, -1), at, beat * 7, 0.03, 'sine'); } if (Math.random() < 0.18) note(deg((Math.random() * 7 | 0), 1), at, beat * 2, 0.025, 'sine'); }
    else { if (step % 4 === 0) note(deg(chord, -2), at, beat * 1.8, T.box ? 0 : 0.09, 'triangle'); if (step % 8 === 0) for (const k of [0, 2, 4]) note(deg(chord + k, -1), at, beat * 3.6, T.box ? 0.02 : 0.03, T.box ? 'sine' : 'triangle');
      const m = T.mel[phrase][step % 8]; if (m !== null && (step % 2 === 0 || T.bpm < 100)) note(deg(chord + m, T.box ? 1 : 0), at, beat * (T.box ? 1.2 : 0.9), T.box ? 0.07 : 0.05, T.wave);
      if (T.drums) { if (step % 4 === 0) hit(at, 120, 0.15, 0.25); if (step % 4 === 2) hit(at, 2200, 0.08, 0.12); if (step % 2 === 1) hit(at, 7000, 0.03, 0.04); } }
    J.next = at + beat / 2; J.step++; if (J.step % 8 === 0) J.bar++; } }
function jukeStart(x, y, z, disc) { const k = keyOf(x, y, z); jukeStop(k); const c = Sfx.ctx; const J = { disc, t0: performance.now() / 1000, len: DISC_LEN[disc] || 180, next: c ? c.currentTime + 0.1 : 0, step: 0, bar: 0, tune: discTune(disc), pos: [x, y, z] };
  if (c) { J.gain = c.createGain(); J.gain.gain.value = 0; J.gain.connect(c.destination); } JUKE.set(k, J); const d = DISCS.find(q => q[0] === disc); if (d) toast('Now Playing: ' + d[1], 3); }
function jukeStop(k) { const J = JUKE.get(k); if (!J) return; if (J.gain) { try { J.gain.gain.setTargetAtTime(0, Sfx.ctx.currentTime, 0.05); setTimeout(() => J.gain.disconnect(), 400); } catch (e) { } } JUKE.delete(k); }
function jukeTick() { if (!world) return; const now = performance.now() / 1000;
  for (const [k, J] of JUKE) { const [x, y, z] = J.pos; if (!(BL[world.get(x, y, z)] || {}).jukebox || J.dim !== undefined && J.dim !== world.dim) { jukeStop(k); continue; }
    if (now - J.t0 > J.len) { jukeStop(k); rsNotify(x, y, z); continue; } // the disc stays in; the music has finished
    const d = player.pos.distanceTo(new V3(x + 0.5, y + 0.5, z + 0.5)); const v = Math.max(0, 1 - d / 64) * Sfx.vol * 1.4; if (J.gain) J.gain.gain.setTargetAtTime(v, Sfx.ctx.currentTime, 0.1);
    if (v > 0) jukeSchedule(J); else if (Sfx.ctx) J.next = Sfx.ctx.currentTime;
    if (Math.random() < 0.05 && d < 24) { const hue = Math.random(); Particles.emit(x + 0.5, y + 1.2, z + 0.5, 1, [[0.5 + 0.5 * Math.sin(hue * 6.3), 0.5 + 0.5 * Math.sin(hue * 6.3 + 2), 0.5 + 0.5 * Math.sin(hue * 6.3 + 4)]], 0.4, 1, -1.5, 0.2, 1.5); } } }
{ const _cs = containerSignal; containerSignal = function (x, y, z) { const d = BL[world.get(x, y, z)]; if (d && d.jukebox) { const inv = world.chestInv.get(keyOf(x, y, z)); const it = inv && inv[0]; if (!it) return 0; const i = DISC_ORDER.indexOf(ITEMS[it.id].disc); return i < 0 ? 0 : Math.min(15, i + 1); } return _cs.apply(this, arguments); }; }
// ---------------- boats in every wood, chest boats ----------------
const BOAT_RGB = { oak: [164, 132, 80], spruce: [114, 84, 48], birch: [200, 184, 130], jungle: [160, 114, 80], acacia: [170, 90, 50], dark_oak: [70, 46, 22], mangrove: [118, 54, 48], cherry: [226, 176, 168], bamboo: [196, 176, 84], pale_oak: [228, 218, 206] };
function boatItemOf(b) { const w = b.wood || 'oak'; const raft = w === 'bamboo'; const k = b.chest ? (raft ? 'bamboo_chest_raft' : w + '_chest_boat') : (raft ? 'bamboo_raft' : w === 'oak' ? 'boat' : w + '_boat'); return IT[k] !== undefined ? IT[k] : IT.boat; }
function dressBoat(b) { const c = BOAT_RGB[b.wood || 'oak'] || BOAT_RGB.oak; const base = BOAT_RGB.oak; const tint = new THREE.Color(Math.min(1.6, c[0] / base[0]), Math.min(1.6, c[1] / base[1]), Math.min(1.6, c[2] / base[2]));
  if (b.wood && b.wood !== 'oak') for (const m of b.mats) { m[0].color.copy(tint); m[1] = tint.clone(); }
  if (b.chest && !b.chestMesh) { const g = new THREE.BoxGeometry(0.62, 0.62, 0.62); const can = document.createElement('canvas'); can.width = can.height = 16; const x = can.getContext('2d'); x.drawImage(tileCanvas(TILE.chest_front), 0, 0); const t = new THREE.CanvasTexture(can); t.magFilter = THREE.NearestFilter;
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: t })); m.position.set(0, 0.47, -0.42); b.mesh.add(m); b.chestMesh = m; if (!b.inv) b.inv = new Array(27).fill(null); } }
{ const _pbi = placeBoatItem; placeBoatItem = function (eye, dir) { const h = player.held(); const it = h && ITEMS[h.id]; const n0 = G.boats.length; const r = _pbi.apply(this, arguments);
    if (G.boats.length > n0 && it) { const b = G.boats[G.boats.length - 1]; b.wood = it.wood || 'oak'; b.chest = !!it.chest; dressBoat(b); } return r; }; }
{ const _bl = boatList; boatList = function () { const l = _bl.apply(this, arguments); l.forEach((o, i) => { const b = G.boats[i]; if (b.wood && b.wood !== 'oak') o.wood = b.wood; if (b.chest) { o.chest = 1; o.inv = b.inv.map(s => s ? Object.assign({ id: s.id, count: s.count }, xtra(s) || {}) : null); } }); return l; }; }
{ const _lb = loadBoats; loadBoats = function (list) { const n0 = G.boats.length; const r = _lb.apply(this, arguments); let i = 0; for (const o of list || []) { if (!o || !isFinite(o.x)) continue; const b = G.boats[n0 + i++]; if (!b) continue; b.wood = o.wood || 'oak'; b.chest = !!o.chest; if (o.inv) b.inv = o.inv.map(s => s && ITEMS[REMAP.item(s.id)] ? Object.assign({}, s, { id: REMAP.item(s.id) }) : null); dressBoat(b); } return r; }; }
{ const _rb = removeBoat; removeBoat = function (b) { if (b.chest && b.inv && !b.dropped && S.mode !== 'creative' && b.hp >= 4) { b.dropped = true; for (const s of b.inv) if (s) dropItem(s.id, s.count, b.pos.x, b.pos.y + 0.5, b.pos.z, true, xtra(s)); } return _rb.apply(this, arguments); }; }
{ const _ci = closeInv; closeInv = function (noLock) { const k = S.chestKey; const r = _ci.apply(this, arguments); if (k && String(k).startsWith('boat:')) world.chestInv.delete(k); return r; }; }
// ---------------- spyglass zoom ----------------
{ const _bp = bowPower; bowPower = function () { if (S.spyglass) return (1 - 10 / Math.max(30, S.fov)) / 0.16; return _bp.apply(this, arguments); }; }
function spyOverlay(on) { let el = $('spyOv'); if (!el && on) { el = document.createElement('div'); el.id = 'spyOv'; el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;background:radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0, rgba(0,0,0,0) 34vmin, rgba(0,0,0,.96) 35vmin)'; document.body.appendChild(el); } if (el) el.style.display = on ? 'block' : 'none'; }
// ---------------- maps ----------------
const MAPS = { canvas: new Map() };
function mapColour(x, z) { const c = world.getChunk(x >> 4, z >> 4); if (!c) return null; const lx = x & 15, lz = z & 15; let y = Math.min(WH - 1, c.maxY + 1); while (y > 0 && !c.d[(y * 16 + lz) * 16 + lx]) y--; const id = c.d[(y * 16 + lz) * 16 + lx]; const d = BL[id];
  if (isWater(id)) { let depth = 0; while (y - depth > 0 && isWater(c.d[((y - depth) * 16 + lz) * 16 + lx])) depth++; const f = Math.max(0.55, 1 - depth * 0.04); return [[64 * f, 96 * f, 220 * f], y]; }
  if (!d || !d.texIds) return [[0, 0, 0], y]; const t = TILE_AVG[d.texIds[2]] || [0.5, 0.5, 0.5]; return [[t[0] * 255, t[1] * 255, t[2] * 255], y]; }
function mapUpdate(data, radius) { const cvs = mapCanvasOf(data); const g = cvs.getContext('2d'); const img = g.getImageData(0, 0, 128, 128); const P = player.pos; const s = 1 << (data.scale || 0);
  for (let pz = 0; pz < 128; pz++) for (let px = 0; px < 128; px++) { const wx = data.x0 + px * s, wz = data.z0 + pz * s; if (radius && (Math.abs(wx - P.x) > radius || Math.abs(wz - P.z) > radius)) continue; const c = mapColour(wx, wz); if (!c) continue; const n = mapColour(wx, wz - s); const sh = n && c[1] > n[1] ? 1.12 : n && c[1] < n[1] ? 0.84 : 1;
    const i = (pz * 128 + px) * 4; img.data[i] = Math.min(255, c[0][0] * sh); img.data[i + 1] = Math.min(255, c[0][1] * sh); img.data[i + 2] = Math.min(255, c[0][2] * sh); img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0); data.img = cvs.toDataURL(); }
function mapCanvasOf(data) { let c = MAPS.canvas.get(data.id); if (!c) { c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#d8ccA0'; g.fillRect(0, 0, 128, 128); if (data.img) { const im = new Image(); im.onload = () => g.drawImage(im, 0, 0); im.src = data.img; } MAPS.canvas.set(data.id, c); } return c; }
function mapHud(data) { let el = $('mapHud'); if (!el) { el = document.createElement('canvas'); el.id = 'mapHud'; el.width = el.height = 160; el.style.cssText = 'position:fixed;left:50%;bottom:78px;transform:translateX(-50%);width:min(40vmin,300px);height:min(40vmin,300px);image-rendering:pixelated;pointer-events:none;z-index:4;border:6px solid #8a6a40;background:#d8cca0;box-shadow:0 4px 12px rgba(0,0,0,.5)'; document.body.appendChild(el); }
  if (!data) { el.style.display = 'none'; return; } el.style.display = 'block'; const g = el.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#d8cca0'; g.fillRect(0, 0, 160, 160); g.drawImage(mapCanvasOf(data), 16, 16, 128, 128);
  if (data.dim === world.dim) { const s = 1 << (data.scale || 0); const px = 16 + (player.pos.x - data.x0) / s, pz = 16 + (player.pos.z - data.z0) / s; if (px > 14 && px < 146 && pz > 14 && pz < 146) { g.save(); g.translate(px, pz); g.rotate(-player.yaw + Math.PI); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.beginPath(); g.moveTo(0, -5); g.lineTo(4, 4); g.lineTo(0, 2); g.lineTo(-4, 4); g.closePath(); g.fill(); g.stroke(); g.restore(); } } }
// ---------------- books ----------------
function bookUI(stack, write) { let el = $('bookEd'); const data = stack.data || (stack.data = { pages: [''] }); if (!data.pages || !data.pages.length) data.pages = [''];
  if (!el) { el = document.createElement('div'); el.id = 'bookEd'; el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);z-index:60;flex-direction:column;gap:8px';
    el.innerHTML = '<div style="background:#f4ecd8;border:4px solid #7a5a30;width:min(420px,90vw);padding:14px;color:#222;font-family:VT323,monospace"><div id="bkPage" style="text-align:right;font-size:20px;color:#555"></div><textarea id="bkText" maxlength="256" style="width:100%;height:300px;background:transparent;border:none;resize:none;font-family:VT323,monospace;font-size:24px;color:#222;outline:none"></textarea><div id="bkRead" style="white-space:pre-wrap;height:300px;overflow:auto;font-size:24px"></div></div>' +
      '<div style="display:flex;gap:8px"><button id="bkPrev">&lt;</button><button id="bkNext">&gt;</button><button id="bkSign">Sign</button><button id="bkDone">Done</button></div><div id="bkSignBox" style="display:none;flex-direction:column;align-items:center;gap:6px"><input id="bkTitle" maxlength="32" placeholder="Enter Book Title" style="width:300px;height:36px;font-size:24px;font-family:VT323"><button id="bkSignOk">Sign and Close</button></div>';
    document.body.appendChild(el); for (const b of el.querySelectorAll('button')) b.style.cssText = 'min-width:70px;height:40px;font-size:22px;background:#6e6e6e;border:2px solid #222;color:#fff;cursor:pointer;font-family:VT323';
    const ta = el.querySelector('#bkText'), ti = el.querySelector('#bkTitle'); for (const inp of [ta, ti]) inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); BOOK_ED.close(); } }); }
  const ta = el.querySelector('#bkText'), rd = el.querySelector('#bkRead'), pg = el.querySelector('#bkPage'); let page = 0;
  const show = () => { pg.textContent = 'Page ' + (page + 1) + ' of ' + data.pages.length; ta.style.display = write ? 'block' : 'none'; rd.style.display = write ? 'none' : 'block'; if (write) ta.value = data.pages[page] || ''; else rd.textContent = (page === 0 && data.title ? data.title + '\nby ' + (data.author || '?') + '\n\n' : '') + (data.pages[page] || ''); };
  const save = () => { if (write) data.pages[page] = ta.value.slice(0, 256); };
  el.querySelector('#bkPrev').onpointerdown = (e) => { e.preventDefault(); save(); if (page > 0) page--; show(); };
  el.querySelector('#bkNext').onpointerdown = (e) => { e.preventDefault(); save(); if (page < data.pages.length - 1) page++; else if (write && data.pages.length < 100) { data.pages.push(''); page++; } show(); };
  el.querySelector('#bkSign').style.display = write ? '' : 'none'; el.querySelector('#bkSignBox').style.display = 'none';
  el.querySelector('#bkSign').onpointerdown = (e) => { e.preventDefault(); save(); el.querySelector('#bkSignBox').style.display = 'flex'; setTimeout(() => el.querySelector('#bkTitle').focus(), 0); };
  el.querySelector('#bkSignOk').onpointerdown = (e) => { e.preventDefault(); const t = el.querySelector('#bkTitle').value.trim(); if (!t) return; save(); data.title = t; data.author = myName(); stack.id = IT.written_book; stack.name = t; invDirty(); BOOK_ED.close(); };
  el.querySelector('#bkDone').onpointerdown = (e) => { e.preventDefault(); BOOK_ED.close(); };
  BOOK_ED.close = () => { save(); el.style.display = 'none'; ta.blur(); S.uiOpen = null; invDirty(); requestLock(); };
  S.uiOpen = 'book'; for (const kk in keys) keys[kk] = false; mouseL = mouseR = false; el.style.display = 'flex'; releaseLock(); show(); if (write) setTimeout(() => ta.focus(), 0); }
const BOOK_ED = { close: () => { } };
{ const _ci = closeInv; closeInv = function (noLock) { if (S.uiOpen === 'book') { BOOK_ED.close(); return; } return _ci.apply(this, arguments); }; }
// ---------------- bundles: right-click items into a bundle in your inventory (64 "weight": a stack of 16 counts 4 each) ----------------
const bundleW = (s) => s ? s.count * Math.ceil(64 / stackMax(s.id)) : 0;
const bundleUsed = (b) => (b.data && b.data.items || []).reduce((a, s) => a + bundleW(s), 0);
{ const _sc = slotClick; slotClick = function (cont, i, button, shift) { const arr = contArr(cont); const s = arr && arr[i]; const c = S.cursor;
    if (button === 2 && arr) { const isB = (x) => x && ITEMS[x.id] && ITEMS[x.id].kind === 'bundle';
      if (isB(s) && c && !isB(c)) { const room = 64 - bundleUsed(s); const per = Math.ceil(64 / stackMax(c.id)); const n = Math.min(c.count, Math.floor(room / per)); if (n > 0) { s.data = s.data || { items: [] }; s.data.items = s.data.items || []; const top = s.data.items[s.data.items.length - 1]; if (top && top.id === c.id && !xtra(top) && !xtra(c)) top.count += n; else s.data.items.push(Object.assign({}, c, { count: n })); c.count -= n; if (!c.count) S.cursor = null; Sfx.play('cloth', 0.6); invDirty(); renderInvUI(); } return; }
      if (isB(s) && !c && s.data && s.data.items && s.data.items.length) { S.cursor = s.data.items.pop(); Sfx.play('cloth', 0.6); invDirty(); renderInvUI(); return; }
      if (isB(c) && s && !isB(s)) { const room = 64 - bundleUsed(c); const per = Math.ceil(64 / stackMax(s.id)); const n = Math.min(s.count, Math.floor(room / per)); if (n > 0) { c.data = c.data || { items: [] }; c.data.items = c.data.items || []; c.data.items.push(Object.assign({}, s, { count: n })); s.count -= n; if (!s.count) arr[i] = null; Sfx.play('cloth', 0.6); invDirty(); renderInvUI(); } return; } }
    return _sc.apply(this, arguments); }; }
// ---------------- brushing suspicious sand and gravel ----------------
const BRUSH_LOOT = { sand: [['archer_pottery_sherd', 8], ['miner_pottery_sherd', 8], ['prize_pottery_sherd', 8], ['skull_pottery_sherd', 8], ['arms_up_pottery_sherd', 6], ['brewer_pottery_sherd', 6], ['angler_pottery_sherd', 5], ['shelter_pottery_sherd', 5], ['snort_pottery_sherd', 5], ['emerald', 10], ['diamond', 3], ['gunpowder', 10], ['tnt', 4], ['coal', 10], ['wheat', 8], ['gold_nugget', 8]],
  gravel: [['burn_pottery_sherd', 8], ['danger_pottery_sherd', 8], ['friend_pottery_sherd', 8], ['heart_pottery_sherd', 8], ['heartbreak_pottery_sherd', 6], ['howl_pottery_sherd', 8], ['sheaf_pottery_sherd', 8], ['explorer_pottery_sherd', 6], ['mourner_pottery_sherd', 6], ['plenty_pottery_sherd', 6], ['blade_pottery_sherd', 5], ['emerald', 8], ['wheat', 8], ['coal', 10], ['string', 8], ['iron_nugget', 8], ['glass', 6]] };
function brushLoot(kind) { const L = BRUSH_LOOT[kind].filter(e => IT[e[0]] !== undefined); let t = Math.random() * L.reduce((a, e) => a + e[1], 0); for (const e of L) { t -= e[1]; if (t <= 0) return IT[e[0]]; } return IT[L[0][0]]; }
let BRUSH = { k: null, t: 0 };
{ const _ui = updateInteraction; updateInteraction = function (dt) { const r = _ui.apply(this, arguments);
    const h = player.held(); const hd = h && ITEMS[h.id];
    // spyglass
    const spy = !!(hd && hd.kind === 'spyglass' && mouseR && !S.uiOpen && !player.dead); if (spy !== !!S.spyglass) { S.spyglass = spy; spyOverlay(spy); if (spy) Sfx.play('spyglass', 0.6); }
    // brushing
    if (hd && hd.kind === 'brush' && mouseR && target && BL[target.id] && BL[target.id].suspicious && !S.uiOpen) { const k = keyOf(target.x, target.y, target.z); if (BRUSH.k !== k) BRUSH = { k, t: 0 }; BRUSH.t += dt; S.swing = 1;
      if (Math.random() < dt * 10) { Particles.emit(target.x + 0.5 + target.nx * 0.55, target.y + 0.5 + target.ny * 0.55, target.z + 0.5 + target.nz * 0.55, 2, [[0.85, 0.78, 0.6]], 0.8, 0.4, 6, 0.3); Sfx.play('brush', 0.5); }
      if (BRUSH.t >= 2.5) { const d = BL[target.id]; const it = brushLoot(d.suspicious); dropItem(it, 1, target.x + 0.5 + target.nx * 0.7, target.y + 0.5 + target.ny * 0.7, target.z + 0.5 + target.nz * 0.7, false); world.set(target.x, target.y, target.z, d.suspicious === 'sand' ? B.SAND : B.GRAVEL); mpBlock(target.x, target.y, target.z, world.get(target.x, target.y, target.z)); if (typeof damageHeld === 'function') damageHeld(1); Sfx.play('brush_done', 0.8); BRUSH = { k: null, t: 0 }; } }
    else BRUSH = { k: null, t: 0 };
    // maps in hand: draw and keep exploring
    const md = hd && hd.kind === 'fmap' && h.data ? h.data : null; mapHud(md && !S.uiOpen ? md : null); if (md && md.dim === world.dim) { MAPS.t = (MAPS.t || 0) - dt; if (MAPS.t <= 0) { MAPS.t = 1; mapUpdate(md, 48); } }
    return r; }; }
// ---------------- using items ----------------
const MOB_BUCKETS = { cod: 'cod_bucket', salmon: 'salmon_bucket', tropical_fish: 'tropical_fish_bucket', pufferfish: 'pufferfish_bucket', axolotl: 'axolotl_bucket', tadpole: 'tadpole_bucket' };
{ const _ua = useAction; useAction = function (eye, dir) {
    const h = player.held(); const hd = h && ITEMS[h.id]; const sneaking = kd('sneak'); const done = (snd, v, r) => { if (snd) Sfx.play(snd, v || 1, r); S.swing = 1; mouseR = false; };
    const toHeld = (id) => { if (S.mode === 'creative') { giveOrDrop(id, 1); return; } if (h.count > 1) { h.count--; giveOrDrop(id, 1); } else player.inv[handSlot()] = { id, count: 1 }; invDirty(); };
    // chest boats: sneak + use opens the chest
    if (targetBoat && targetBoat.chest && sneaking) { const b = targetBoat; const key = 'boat:' + b.id; if (!b.inv) b.inv = new Array(27).fill(null); world.chestInv.set(key, b.inv); Sfx.play('chest', 0.7); openUI('chest', key); $('chestTitle').textContent = (ITEMS[boatItemOf(b)] || {}).name || 'Boat with Chest'; mouseR = false; return; }
    // fish and friends into a bucket
    if (targetMob && h && h.id === IT.water_bucket && MOB_BUCKETS[targetMob.type] && IT[MOB_BUCKETS[targetMob.type]] !== undefined) { const m = targetMob; if (m.remove) m.remove(); m.dead = true; m.gone = true; G.mobs = G.mobs.filter(x => x !== m); toHeld(IT[MOB_BUCKETS[m.type]]); done('splash', 0.6, 1.3); return; }
    if (hd && hd.kind === 'mobbucket' && target && !targetMob) { const x = target.x + target.nx, y = target.y + target.ny, z = target.z + target.nz; if (replaceableAt(x, y, z) && world.dim !== 'nether') { if (typeof placeFluid === 'function') placeFluid(x, y, z, B.WATER); else world.set(x, y, z, B.WATER); const m = spawnMob(hd.mob, x + 0.5, y + 0.2, z + 0.5); if (m) m.persistent = true; if (S.mode !== 'creative') player.inv[handSlot()] = { id: IT.bucket, count: 1 }; invDirty(); done('splash', 0.7); } return; }
    // powder snow
    if (h && h.id === IT.bucket && target && !targetMob && target.id === B.POWDER_SNOW) { world.set(target.x, target.y, target.z, 0); mpBlock(target.x, target.y, target.z, 0); toHeld(IT.powder_snow_bucket); done('snow', 1); return; }
    if (hd && hd.kind === 'snowbucket' && target && !targetMob) { const x = target.x + target.nx, y = target.y + target.ny, z = target.z + target.nz; if (replaceableAt(x, y, z) && B.POWDER_SNOW !== undefined) { world.set(x, y, z, B.POWDER_SNOW); mpBlock(x, y, z, B.POWDER_SNOW); if (S.mode !== 'creative') player.inv[handSlot()] = { id: IT.bucket, count: 1 }; invDirty(); done('snow', 1); } return; }
    // frogspawn sits on still water
    if (h && h.id === B.FROGSPAWN) { const ft = raycast(eye, dir, 5, true); if (ft && ft.id === B.WATER && !world.get(ft.x, ft.y + 1, ft.z)) { world.set(ft.x, ft.y + 1, ft.z, B.FROGSPAWN); mpBlock(ft.x, ft.y + 1, ft.z, B.FROGSPAWN); useHeld(1); done('slime', 0.6); } return; }
    if (target && !targetMob && !isSpec()) { const { x, y, z } = target; const d = BL[target.id];
      // jukebox
      if (d && d.jukebox && !(sneaking && h)) { const k = keyOf(x, y, z); const inv = world.chestInv.get(k); if (inv && inv[0]) { const it = inv[0]; world.chestInv.delete(k); jukeStop(k); dropItem(it.id, 1, x + 0.5, y + 1.1, z + 0.5, false, xtra(it)); rsNotify(x, y, z); done(); return; }
        if (hd && hd.kind === 'disc') { world.chestInv.set(k, [Object.assign({}, h, { count: 1 })]); useHeld(1); jukeStart(x, y, z, hd.disc); rsNotify(x, y, z); done(); return; } }
      // fire charges: TNT and portals (candles and campfires are lit in 82_deco.js)
      if (hd && hd.kind === 'firecharge') { if (target.id === B.TNT) { world.set(x, y, z, 0); primeTNT(x, y, z); useHeld(1); done('fireball', 0.7); return; }
        const px = x + target.nx, py = y + target.ny, pz = z + target.nz; if (world.get(px, py, pz) === 0 && typeof tryLightPortal === 'function' && tryLightPortal(px, py, pz)) { Sfx.play('portal', 1); toast('The portal flickers to life', 2); useHeld(1); done('fireball', 0.7); return; }
        Particles.emit(px + 0.5, py + 0.2, pz + 0.5, 8, [[1, 0.6, 0.1], [1, 0.9, 0.3]], 1.5, 0.5, -1, 0.3); useHeld(1); done('fireball', 0.6); return; }
      // turtle eggs stack up to 4 on sand
      if (h && h.id === B.TURTLE_EGG && d && d.turtleEgg && d.st.eggs < 4 && !sneaking) { world.set(x, y, z, FAMILY.turtle_egg.ids[(d.st.eggs + 1) + ',' + d.st.hatch]); useHeld(1); done('stone', 0.6, 1.4); return; } }
    if (hd && !S.uiOpen) {
      if (hd.kind === 'spyglass') return;
      if (hd.kind === 'horn') { if (S.useCD > 0) return; S.useCD = 7; Sfx.at('goat_horn', player.pos.clone(), 1); done(); return; }
      if (hd.kind === 'rcompass') { mouseR = false; const L = S.lastDeath; if (!L || L.dim !== world.dim) toast('The needle spins wildly', 2); else { const dx = L.pos[0] - player.pos.x, dz = L.pos[2] - player.pos.z; const a = Math.atan2(dx, -dz) * 180 / Math.PI; const dirs = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']; toast('Last death: ' + Math.round(Math.hypot(dx, dz)) + ' blocks ' + dirs[((Math.round(a / 45) % 8) + 8) % 8], 3); } return; }
      if (hd.kind === 'kbook') { useHeld(1); toast('New recipes unlocked!', 2); done('levelup', 0.4); return; }
      if (hd.kind === 'wbook' || hd.kind === 'rbook') { mouseR = false; bookUI(h, hd.kind === 'wbook'); return; }
      if (hd.kind === 'emap') { mouseR = false; const s = 0, size = 128; const x0 = Math.floor((player.pos.x + 64) / size) * size - 64, z0 = Math.floor((player.pos.z + 64) / size) * size - 64; const data = { id: 'm' + Date.now().toString(36) + (Math.random() * 1e6 | 0), x0, z0, scale: s, dim: world.dim };
        mapUpdate(data, 0); const it = { id: IT.filled_map, count: 1, data }; if (S.mode === 'creative' || h.count > 1) { if (S.mode !== 'creative') h.count--; giveOrDrop(IT.filled_map, 1, { data }); } else player.inv[handSlot()] = it; invDirty(); done('page', 0.8); return; }
      if (hd.kind === 'bundle' && h.data && h.data.items && h.data.items.length) { const e = player.eye(), dv = lookDir(); for (const s of h.data.items) { const it = dropItem(s.id, s.count, e.x + dv.x * 0.5, e.y - 0.3, e.z + dv.z * 0.5, false, xtra(s)); if (it && it.vel) it.vel.set(dv.x * 3, 1.5, dv.z * 3); } h.data.items = []; invDirty(); done('cloth', 0.8); return; } }
    return _ua.apply(this, arguments); }; }
// ---------------- breaking ----------------
{ const _obr = onBlockRemoved; onBlockRemoved = function (x, y, z, id) { const r = _obr.apply(this, arguments); const d = BL[id]; if (d && d.jukebox) { const k = keyOf(x, y, z); const inv = G.world.chestInv.get(k); if (inv && inv[0]) dropItem(inv[0].id, 1, x + 0.5, y + 0.8, z + 0.5, false, xtra(inv[0])); G.world.chestInv.delete(k); jukeStop(k); } return r; }; }
// ---------------- eggs: turtle eggs hatch at night, frogspawn hatches into tadpoles ----------------
function eggTick(x, y, z, id) { const d = BL[id];
  if (d.turtleEgg) { const night = S.time > 0.52 && S.time < 0.98; if (!night && Math.random() > 0.002) return; if (Math.random() > 0.3) return; if (world.get(x, y - 1, z) !== B.SAND) return;
    if (d.st.hatch < 2) { world.set(x, y, z, FAMILY.turtle_egg.ids[d.st.eggs + ',' + (d.st.hatch + 1)]); Sfx.at('egg_crack', new V3(x + 0.5, y, z + 0.5), 0.6); }
    else { world.set(x, y, z, 0); for (let i = 0; i < d.st.eggs; i++) { const m = spawnMob('turtle', x + 0.5, y + 0.1, z + 0.5); if (m && typeof setBaby === 'function') setBaby(m, true, 1200); else if (m) { m.baby = true; m.growT = 1200; } } Sfx.at('egg_crack', new V3(x + 0.5, y, z + 0.5), 0.9); } return; }
  if (d.frogspawn) { if (Math.random() > 0.08) return; world.set(x, y, z, 0); const n = 2 + (Math.random() * 5 | 0); for (let i = 0; i < n; i++) spawnMob(MOBS.tadpole ? 'tadpole' : 'frog', x + 0.5, y - 0.6, z + 0.5); } }
{ const _ss = shapeSupported; shapeSupported = function (x, y, z, id) { const d = BL[id]; if (d && d.support === 'onwater') return world.get(x, y - 1, z) === B.WATER; return _ss.apply(this, arguments); }; }
// ---------------- turtle shell: 10 s of water breathing when you go under ----------------
function turtleTick() { const P = player; const helm = P.inv[37]; if (!helm || helm.id !== IT.turtle_helmet || P.dead) return; const headWet = isWater(world.get(Math.floor(P.pos.x), Math.floor(P.pos.y + 1.6), Math.floor(P.pos.z)));
  if (!headWet) { const e = P.effects && P.effects.water_breathing; if (!e || e.t < 10) giveEffect('water_breathing', 10, 0); } }
// ---------------- the clock ----------------
{ const _uw = updateWater; updateWater = function (dt) { const r = _uw.apply(this, arguments); try { jukeTick(); turtleTick(); if (player.dead && !S.deathRec) { S.deathRec = true; S.lastDeath = { pos: player.pos.toArray(), dim: world.dim }; } else if (!player.dead) S.deathRec = false; } catch (e) { console.error(e); } return r; }; }
// ---------------- loot: discs, sherds, shells ----------------
if (typeof addLoot === 'function') { addLoot('dungeon', [['music_disc_13', 1, 1, 0.1], ['music_disc_cat', 1, 1, 0.1], ['music_disc_mall', 1, 1, 0.03], ['music_disc_chirp', 1, 1, 0.03]]); addLoot('stronghold', [['music_disc_otherside', 1, 1, 0.02], ['music_disc_far', 1, 1, 0.03]]); addLoot('fortress', [['music_disc_pigstep', 1, 1, 0.04]]);
  addLoot('shipwreck', [['heart_of_the_sea', 1, 1, 0.1], ['nautilus_shell', 1, 2, 0.15]]); addLoot('mineshaft', [['music_disc_blocks', 1, 1, 0.02], ['music_disc_stal', 1, 1, 0.02]]); addLoot('pyramid', [['music_disc_ward', 1, 1, 0.02], ['music_disc_strad', 1, 1, 0.02]]); addLoot('jungle_temple', [['music_disc_mellohi', 1, 1, 0.03], ['music_disc_wait', 1, 1, 0.03]]);
  addLoot('end_city', [['music_disc_relic', 1, 1, 0.03], ['music_disc_creator', 1, 1, 0.03], ['music_disc_precipice', 1, 1, 0.03], ['music_disc_tears', 1, 1, 0.02], ['music_disc_creator_music_box', 1, 1, 0.02], ['music_disc_lava_chicken', 1, 1, 0.02], ['music_disc_11', 1, 1, 0.02]]); addLoot('igloo', [['disc_fragment_5', 1, 2, 0.2]]); addLoot('house', [['goat_horn', 1, 1, 0.05], ['writable_book', 1, 1, 0.06], ['map', 1, 1, 0.08]]); }
if (MOBS.drowned) MOBS.drowned.drops = (MOBS.drowned.drops || []).concat([['nautilus_shell', 1, 1, 0.03]]);
if (typeof FISH_LOOT !== 'undefined') FISH_LOOT.treasure.push(['nautilus_shell', 1]);
// ---------------- suspicious sand in deserts and beaches, suspicious gravel on cold sea floors ----------------
{ const _dec = decorate; decorate = function (world, S2, cx, cz) { const r0 = _dec.apply(this, arguments); if (world.dim !== 'overworld') return r0; const g = world.gen; const r = mulberry32(ihash(cx, cz, 9173, world.seed)); const bx = cx * 16, bz = cz * 16;
    const b0 = g.column(bx + 8, bz + 8).b; const want = b0 === BIO.DESERT ? 0.05 : b0 === BIO.BEACH ? 0.03 : b0 === BIO.OCEAN ? 0.04 : 0;
    if (want && r() < want) { const n = 1 + (r() * 3 | 0); for (let i = 0; i < n; i++) { const x = bx + (r() * 16 | 0), z = bz + (r() * 16 | 0); const col = g.column(x, z); const y = col.h - 2 - (r() * 2 | 0); if (y > 2) S2.hard.push(x, y, z, b0 === BIO.OCEAN && col.h < SEA - 12 ? B.SUSPICIOUS_GRAVEL : B.SUSPICIOUS_SAND); } }
    return r0; }; }
// ---------------- sounds ----------------
{ const _pl = Sfx.play; Sfx.play = function (name, v = 1, rate) { if (!this.ctx) return _pl.apply(this, arguments); if (!(v >= 0.02)) return;
    switch (name) {
      case 'goat_horn': { const f = 180 + Math.random() * 120; this.tone(f, f * 1.02, 2.2, 0.16 * v, 'sawtooth'); this.tone(f * 1.5, f * 1.52, 2, 0.06 * v, 'sawtooth'); this.tone(f * 0.5, f * 0.5, 2.2, 0.08 * v, 'triangle'); return; }
      case 'spyglass': this.tone(1200, 1500, 0.08, 0.03 * v, 'sine'); return;
      case 'brush': this.nz(0.08, 3500, 0.15 * v, 'bandpass', 1); return;
      case 'brush_done': this.nz(0.2, 1800, 0.3 * v, 'bandpass', 1); this.tone(600, 900, 0.12, 0.05 * v, 'triangle'); return;
      case 'egg_crack': this.nz(0.06, 3000, 0.3 * v, 'highpass'); return;
      case 'page': this.nz(0.12, 2600, 0.2 * v, 'bandpass', 0.8); return;
      case 'cloth': this.nz(0.1, 900, 0.25 * v, 'lowpass'); return;
      case 'fireball': this.nz(0.3, 600, 0.4 * v, 'lowpass'); return;
    }
    return _pl.apply(this, arguments); }; }
// ---------------- creative order ----------------
{ const keys = ['jukebox', ...DISCS.map(d => 'music_disc_' + d[0]), 'disc_fragment_5', ...WOODDATA().filter(w => !w.nether).flatMap(w => w.k === 'bamboo' ? ['bamboo_raft', 'bamboo_chest_raft'] : [w.k === 'oak' ? 'boat' : w.k + '_boat', w.k + '_chest_boat']),
    'cod_bucket', 'salmon_bucket', 'tropical_fish_bucket', 'pufferfish_bucket', 'axolotl_bucket', 'tadpole_bucket', 'powder_snow_bucket', 'fire_charge', 'spyglass', 'goat_horn', 'recovery_compass', 'knowledge_book', 'writable_book', 'written_book', 'map', 'bundle', 'brush', ...SHERDS.map(s => s + '_pottery_sherd'), 'suspicious_sand', 'suspicious_gravel', 'nautilus_shell', 'heart_of_the_sea', 'turtle_helmet', 'turtle_egg', 'frogspawn'];
  const ids = keys.map(k => IT[k]).filter(v => v !== undefined); const set = new Set(ids); const rest = ITEM_IDS.filter(i => !set.has(i)); rest.push(...ids); ITEM_IDS.length = 0; ITEM_IDS.push(...rest);
  FUEL[IT.jukebox] = 15; for (const w of WOODDATA()) if (!w.nether) for (const k of [w.k + '_boat', w.k + '_chest_boat', 'bamboo_raft', 'bamboo_chest_raft']) if (IT[k] !== undefined) FUEL[IT[k]] = 60; }
