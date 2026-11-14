// ================= SIGNS, BANNERS, ITEM FRAMES, PAINTINGS, ARMOR STANDS AT RUN TIME (Minecraft rules) =================
// A sign opens its text editor when placed (right-click it again to edit; a dye colours its text). Item frames take one
// item; clicking again turns it 45 degrees (a comparator reads the turn), hitting it knocks the item out. A painting
// picks, at random, one of the biggest pictures that fits the wall around the clicked block. Armor stands wear armor:
// right-click with a piece to put it on, with an empty hand to take back the piece you point at.
// Text, items, pictures and armor are drawn as small 3D overlays near the player; the blocks themselves are in the world mesh.
const OV = { meshes: new Map(), watch: new Set(), world: null, t: 0, tex: new Map() };
const bdataOf = (w) => w.bdata || (w.bdata = new Map());
let ovWatchable = (id) => { const d = BL[id]; return !!(d && (d.sign || d.frame || (d.painting && false) || d.armorStand === 'lower')); };
{ const _pw = packWorld; packWorld = function (w) { const r = _pw.apply(this, arguments); if (w.bdata && w.bdata.size) r.bdata = Object.fromEntries(w.bdata); return r; }; }
{ const _uw = unpackWorld; unpackWorld = function (w, d) { const r = _uw.apply(this, arguments); if (d && d.bdata) w.bdata = new Map(Object.entries(d.bdata)); return r; }; }
// ---- support ----
const F4V = (f) => DV4[f];
{ const _ss = shapeSupported; shapeSupported = function (x, y, z, id) { const d = BL[id]; if (!d) return true;
    if (d.support === 'signwall') { const [ax, az] = F4V((d.st.facing + 2) % 4); return !!SOLID[world.get(x + ax, y, z + az)]; }
    if (d.support === 'hang') { const a = world.get(x, y + 1, z); return !!SOLID[a] || (BL[a] && (BL[a].fam === 'chain' || BL[a].hangSign)); }
    if (d.support === 'frame') { const v = RV[d.st.facing]; return !!SOLID[world.get(x - v[0], y - v[1], z - v[2])]; }
    if (d.support === 'standtop') { const b = BL[world.get(x, y - 1, z)]; return !!(b && b.armorStand === 'lower'); }
    if (d.armorStand === 'lower') { const u = BL[world.get(x, y + 1, z)]; return !!SOLID[world.get(x, y - 1, z)] && !!(u && u.armorStand === 'upper'); }
    return _ss.apply(this, arguments); }; }
// ---- paintings: original pictures, sized like Minecraft's (1x1 up to 4x4) ----
const PAINTINGS = [];
{ const S1 = [[1, 1, 7], [1, 2, 2], [2, 1, 5], [2, 2, 6], [4, 2, 1], [4, 3, 2], [3, 3, 3], [4, 4, 3]]; const styles = ['meadow', 'sea', 'night', 'blocks', 'vase', 'bust', 'peaks', 'dunes', 'woods', 'dusk', 'river', 'orchard'];
  let n = 0; for (const [w, h, c] of S1) for (let i = 0; i < c; i++) PAINTINGS.push({ w, h, style: styles[(n * 5 + i * 7) % styles.length], seed: 1000 + n++ }); }
function paintingCanvas(v) { const P = PAINTINGS[v]; const W = P.w * 16, H = P.h * 16; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const r = mulberry32(P.seed);
  const px = (x, y, col) => { g.fillStyle = 'rgb(' + col.map(v => Math.max(0, Math.min(255, v | 0))).join(',') + ')'; g.fillRect(x | 0, y | 0, 1, 1); };
  const vy = (col, k) => col.map(v => v + (r() * 2 - 1) * k); const sky = (top, bot, y) => mixc(top, bot, y / H);
  const ridge = (base, amp, freq, ph) => (x) => base + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.7 + ph * 3) * amp * 0.4;
  const s = P.style;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let col;
    if (s === 'meadow' || s === 'woods' || s === 'orchard' || s === 'river') { const hl = ridge(H * 0.55, H * 0.08, 0.25, P.seed)(x); col = y < hl ? sky([120, 170, 230], [200, 220, 240], y) : mixc([90, 150, 60], [50, 110, 40], (y - hl) / (H - hl)); if (s === 'river' && Math.abs(x - W / 2 - Math.sin(y * 0.3) * 3) < 1 + (y - hl) * 0.2 && y > hl) col = [70, 130, 200]; }
    else if (s === 'sea') { const hz = H * 0.5; col = y < hz ? sky([90, 140, 210], [220, 200, 170], y * 2) : mixc([40, 90, 150], [20, 50, 100], (y - hz) / (H - hz)); if (y > hz && (x + y * 3) % 7 === 0) col = [150, 190, 220]; }
    else if (s === 'night') { col = sky([10, 14, 40], [40, 40, 80], y); if (r() < 0.03) col = [240, 240, 220]; const hl = ridge(H * 0.75, H * 0.05, 0.3, P.seed)(x); if (y > hl) col = [16, 20, 24]; }
    else if (s === 'blocks') { const cx = Math.floor(x / (W / (P.w + 2))), cy = Math.floor(y / (H / (P.h + 2))); const rr = mulberry32(P.seed + cx * 31 + cy * 7)(); col = rr < 0.2 ? [200, 40, 40] : rr < 0.35 ? [40, 70, 170] : rr < 0.5 ? [230, 200, 60] : [235, 230, 220]; if (x % (W / (P.w + 2) | 0) === 0 || y % (H / (P.h + 2) | 0) === 0) col = [24, 24, 24]; }
    else if (s === 'vase' || s === 'bust') { col = mixc([110, 70, 50], [60, 40, 30], y / H); }
    else if (s === 'peaks') { const hl = ridge(H * 0.4, H * 0.15, 0.35, P.seed)(x); col = y < hl ? sky([150, 190, 240], [220, 230, 250], y) : y < hl + 3 ? [240, 244, 250] : mixc([110, 110, 120], [60, 80, 60], (y - hl) / (H - hl)); }
    else if (s === 'dunes') { const hl = ridge(H * 0.6, H * 0.06, 0.2, P.seed)(x); col = y < hl ? sky([240, 190, 110], [250, 230, 170], y) : mixc([220, 180, 110], [190, 140, 80], (y - hl) / (H - hl)); }
    else { const hz = H * 0.6; col = y < hz ? sky([60, 40, 90], [250, 130, 60], y / 0.6) : [40, 30, 40]; }
    px(x, y, vy(col, 5)); }
  // details
  if (s === 'meadow' || s === 'dusk' || s === 'dunes' || s === 'sea') { const sx = W * (0.25 + r() * 0.5), sy = H * 0.25, rr = Math.max(2, Math.min(W, H) * 0.12); g.fillStyle = s === 'dusk' ? '#ffb070' : '#fff2b0'; g.beginPath(); g.arc(sx, sy, rr, 0, 7); g.fill(); }
  if (s === 'woods' || s === 'orchard') for (let i = 0; i < P.w * 3; i++) { const tx = (i + 0.5) * W / (P.w * 3) + (r() - 0.5) * 3, ty = H * (0.5 + r() * 0.2); g.fillStyle = '#5a3a20'; g.fillRect(tx, ty, 1, H * 0.15); g.fillStyle = s === 'orchard' ? (r() < 0.5 ? '#3f8a30' : '#4f9a3a') : '#2e6a2a'; g.fillRect(tx - 2, ty - 4, 5, 5); if (s === 'orchard') { g.fillStyle = '#d03030'; g.fillRect(tx - 1, ty - 2, 1, 1); } }
  if (s === 'sea') { g.fillStyle = '#3a2a20'; const bx = W * (0.3 + r() * 0.4), by = H * 0.52; g.fillRect(bx - 3, by, 7, 2); g.fillStyle = '#eee'; g.fillRect(bx, by - 5, 1, 5); g.fillRect(bx + 1, by - 4, 2, 3); }
  if (s === 'night') { g.fillStyle = '#f4f0d0'; g.beginPath(); g.arc(W * 0.75, H * 0.25, Math.max(2, H * 0.1), 0, 7); g.fill(); g.fillStyle = '#0a0e28'; g.beginPath(); g.arc(W * 0.75 + 2, H * 0.25 - 1, Math.max(2, H * 0.1), 0, 7); g.fill(); }
  if (s === 'vase') { g.fillStyle = '#4060a0'; g.fillRect(W / 2 - 3, H * 0.55, 6, H * 0.35); g.fillStyle = '#2a8a3a'; g.fillRect(W / 2 - 1, H * 0.3, 2, H * 0.25); for (const [dx, col] of [[-3, '#e04060'], [2, '#f0d040'], [0, '#ffffff']]) { g.fillStyle = col; g.fillRect(W / 2 + dx - 1, H * 0.25 + Math.abs(dx), 3, 3); } }
  if (s === 'bust') { g.fillStyle = '#d8b090'; g.beginPath(); g.arc(W / 2, H * 0.4, Math.min(W, H) * 0.18, 0, 7); g.fill(); g.fillStyle = '#304060'; g.fillRect(W * 0.25, H * 0.6, W * 0.5, H * 0.4); g.fillStyle = '#3a2416'; g.fillRect(W / 2 - Math.min(W, H) * 0.18, H * 0.4 - Math.min(W, H) * 0.2, Math.min(W, H) * 0.36, Math.min(W, H) * 0.1); }
  // frame
  g.fillStyle = '#5a3c22'; g.fillRect(0, 0, W, 1); g.fillRect(0, H - 1, W, 1); g.fillRect(0, 0, 1, H); g.fillRect(W - 1, 0, 1, H); return c; }
const P_RIGHT = [[-1, 0], [0, -1], [1, 0], [0, 1]]; // the viewer's right, for a painting facing north, east, south, west
function placePainting(hit) { if (hit.ny !== 0) return false; const f = dirOf(hit.nx, hit.nz); const [rx, rz] = P_RIGHT[f]; const cx = hit.x + hit.nx, cy = hit.y, cz = hit.z + hit.nz; const back = DV4[(f + 2) % 4];
  const fits = (w, h, ox, oy) => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) { const x = cx + (i - ox) * rx, y = cy + j - oy, z = cz + (i - ox) * rz; if (y < 1 || y >= WH) return false; const id = world.get(x, y, z); if (id && !(PLANT[id] && !FKIND[id])) return false; if (!SOLID[world.get(x + back[0], y, z + back[1])]) return false; } return true; };
  let best = 0, cands = []; for (let v = 0; v < PAINTINGS.length; v++) { const P = PAINTINGS[v]; const ox = Math.floor((P.w - 1) / 2), oy = Math.floor((P.h - 1) / 2); if (!fits(P.w, P.h, ox, oy)) continue; const a = P.w * P.h; if (a > best) { best = a; cands = []; } if (a === best) cands.push(v); }
  if (!cands.length) return false; const v = cands[Math.random() * cands.length | 0]; const P = PAINTINGS[v]; const ox = Math.floor((P.w - 1) / 2), oy = Math.floor((P.h - 1) / 2);
  const ax = cx - ox * rx, ay = cy - oy, az = cz - ox * rz; const cell = FAMILY.painting.ids[String(f)]; const bd = bdataOf(world);
  for (let i = 0; i < P.w; i++) for (let j = 0; j < P.h; j++) { const x = ax + i * rx, y = ay + j, z = az + i * rz; world.set(x, y, z, cell); mpBlock(x, y, z, cell); bd.set(keyOf(x, y, z), { p: keyOf(ax, ay, az) }); }
  bd.set(keyOf(ax, ay, az), { p: keyOf(ax, ay, az), v, f, anchor: 1 }); OV.watch.add(keyOf(ax, ay, az)); Sfx.play('wood', 0.8, 1.2); return true; }
function removePainting(anchorKey, drop) { const bd = bdataOf(world); const a = bd.get(anchorKey); if (!a || !a.anchor) return; const P = PAINTINGS[a.v]; const [ax, ay, az] = anchorKey.split(',').map(Number); const [rx, rz] = P_RIGHT[a.f];
  for (let i = 0; i < P.w; i++) for (let j = 0; j < P.h; j++) { const x = ax + i * rx, y = ay + j, z = az + i * rz; const k = keyOf(x, y, z); bd.delete(k); if ((BL[world.get(x, y, z)] || {}).painting) { world.set(x, y, z, 0); mpBlock(x, y, z, 0); } }
  OV.watch.delete(anchorKey); if (drop && S.rules.doTileDrops !== false && S.mode !== 'creative') dropItem(IT.painting, 1, ax + 0.5, ay + 0.5, az + 0.5); Sfx.play('wood', 0.8, 0.9); }
// ---- placing ----
{ const _pb = placeBlock; placeBlock = function (hit, id) {
    const d = BL[id]; if (!d || !hit) return _pb.apply(this, arguments);
    const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz; const pf = playerFacing();
    if (d.painting) return placePainting(hit);
    if (!(d.sign || d.banner || d.frame || d.armorStand)) return _pb.apply(this, arguments);
    let vid;
    if (d.sign && d.hangSign) vid = hit.ny === -1 ? withState(id, { wall: 0, facing: (pf + 2) % 4 }) : hit.ny === 0 ? withState(id, { wall: 1, facing: dirOf(hit.nx, hit.nz) }) : null;
    else if (d.sign || d.banner) vid = hit.ny === 0 ? withState(id, { wall: 1, facing: dirOf(hit.nx, hit.nz) }) : hit.ny === 1 ? withState(id, { wall: 0, facing: (pf + 2) % 4 }) : null;
    else if (d.frame) vid = withState(id, { facing: d6of(hit.nx, hit.ny, hit.nz), rot: 0 });
    else if (d.armorStand) { if (hit.ny !== 1 || !replaceableAt(x, y, z) || !replaceableAt(x, y + 1, z)) return false; const lo = withState(id, { facing: (pf + 2) % 4, part: 'lower' }); world.set(x, y + 1, z, withState(id, { facing: (pf + 2) % 4, part: 'upper' })); const ok = _pb.call(this, hit, lo); if (!ok) world.set(x, y + 1, z, 0); return ok; }
    if (!vid) return false; if (!shapeSupported(x, y, z, vid)) return false;
    const ok = _pb.call(this, hit, vid);
    if (ok && d.sign && !isClientMP()) setTimeout(() => openSignEditor(x, y, z), 0);
    return ok; }; }
// ---- using ----
const ARMOR_IDX = { head: 0, chest: 1, legs: 2, feet: 3 };
{ const _ua = useAction; useAction = function (eye, dir) {
    const h = player.held(); const hd = h && ITEMS[h.id]; const sneaking = kd('sneak');
    if (target && !targetMob && !isSpec()) { const { x, y, z } = target; const id = target.id; const d = BL[id]; const done = (snd, v, r) => { if (snd) Sfx.play(snd, v || 1, r); S.swing = 1; mouseR = false; };
      if (d && d.sign && !(sneaking && h)) { if (hd && /_dye$/.test(hd.key)) { const bd = bdataOf(world); const e = bd.get(keyOf(x, y, z)) || { t: ['', '', '', ''] }; e.c = hd.key.replace('_dye', ''); bd.set(keyOf(x, y, z), e); useHeld(1); OV.meshes.delete(keyOf(x, y, z) + '!'); ovDrop(keyOf(x, y, z)); done('dye', 0.8); return; }
        done(); openSignEditor(x, y, z); return; }
      if (d && d.frame) { const k = keyOf(x, y, z); let inv = world.chestInv.get(k);
        if (!inv || !inv[0]) { if (h) { world.chestInv.set(k, [Object.assign({}, h, { count: 1 })]); useHeld(1); world.set(x, y, z, withState(id, { rot: 0 })); ovDrop(k); rsNotify(x, y, z); done('frame_add', 0.9); } else done(); return; }
        world.set(x, y, z, withState(id, { rot: (d.st.rot + 1) % 8 })); rsNotify(x, y, z); ovDrop(k); done('frame_rotate', 0.8); return; }
      if (d && d.armorStand) { const by = d.armorStand === 'upper' ? y - 1 : y; const k = keyOf(x, by, z); let inv = world.chestInv.get(k); if (!inv) { inv = [null, null, null, null]; world.chestInv.set(k, inv); }
        if (hd && hd.kind === 'armor' && ARMOR_IDX[hd.slot] !== undefined) { const i = ARMOR_IDX[hd.slot]; const old = inv[i]; inv[i] = Object.assign({}, h, { count: 1 }); useHeld(1); if (old) giveOrDrop(old.id, 1, xtra(old)); ovDrop(k); done('armor', 0.8); return; }
        if (!h) { const ly = (target.py !== undefined ? target.py : y + 0.5) - by; const i = ly > 1.45 ? 0 : ly > 0.85 ? 1 : ly > 0.4 ? 2 : 3; const order = [i, 1, 0, 2, 3]; for (const j of order) if (inv[j]) { const it = inv[j]; inv[j] = null; giveOrDrop(it.id, 1, xtra(it)); ovDrop(k); done('armor', 0.8); return; } } } }
    return _ua.apply(this, arguments); }; }
// a comparator behind an item frame reads its turn (1-8), empty frames give 0
{ const _cs = containerSignal; containerSignal = function (x, y, z) { const d = BL[world.get(x, y, z)]; if (d && d.frame) { const inv = world.chestInv.get(keyOf(x, y, z)); return inv && inv[0] ? d.st.rot + 1 : 0; } return _cs.apply(this, arguments); }; }
// ---- breaking ----
{ const _bb = breakBlock; breakBlock = function (x, y, z) { const id = world.get(x, y, z); const d = BL[id]; if (!d) return _bb.apply(this, arguments); const k = keyOf(x, y, z);
    if (d.frame) { const inv = world.chestInv.get(k); if (inv && inv[0]) { const it = inv[0]; world.chestInv.delete(k); if (S.mode !== 'creative') dropItem(it.id, 1, x + 0.5, y + 0.5, z + 0.5, false, xtra(it)); ovDrop(k); rsNotify(x, y, z); Sfx.play('frame_remove', 0.8); S.mineT = 0; return true; } }
    if (d.painting) { const e = bdataOf(world).get(k); removePainting(e ? e.p : k, true); Particles.blockBreak(x, y, z, B.PLANKS, 6); return true; }
    if (d.armorStand) { const by = d.armorStand === 'upper' ? y - 1 : y; const kk = keyOf(x, by, z); const inv = world.chestInv.get(kk); world.chestInv.delete(kk); ovDrop(kk);
      if (inv) for (const s of inv) if (s) dropItem(s.id, 1, x + 0.5, by + 0.8, z + 0.5, false, xtra(s));
      world.set(x, by, z, 0); world.set(x, by + 1, z, 0); mpBlock(x, by, z, 0); mpBlock(x, by + 1, z, 0); if (S.mode !== 'creative' && S.rules.doTileDrops !== false) dropItem(IT.armor_stand, 1, x + 0.5, by + 0.5, z + 0.5); Sfx.play('wood', 0.9); return true; }
    return _bb.apply(this, arguments); }; }
{ const _obr = onBlockRemoved; onBlockRemoved = function (x, y, z, id) { const r = _obr.apply(this, arguments); const d = BL[id]; if (!d) return r; const k = keyOf(x, y, z);
    if (d.sign) bdataOf(G.world).delete(k);
    if (d.frame) { const inv = G.world.chestInv.get(k); if (inv && inv[0]) dropItem(inv[0].id, 1, x + 0.5, y + 0.5, z + 0.5, false, xtra(inv[0])); G.world.chestInv.delete(k); }
    if (d.armorStand === 'lower') { const inv = G.world.chestInv.get(k); if (inv) for (const it of inv) if (it) dropItem(it.id, 1, x + 0.5, y + 0.8, z + 0.5, false, xtra(it)); G.world.chestInv.delete(k); }
    return r; }; }
// ---- the sign text editor ----
let SIGN_ED = null;
function openSignEditor(x, y, z) { if (S.uiOpen || player.dead) return; const k = keyOf(x, y, z); const d = BL[world.get(x, y, z)]; if (!d || !d.sign) return;
  let el = $('signEd'); if (!el) { el = document.createElement('div'); el.id = 'signEd';
    el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);z-index:60;flex-direction:column;gap:10px';
    el.innerHTML = '<div style="font-size:30px;color:#fff;text-shadow:2px 2px 0 #333">Edit Sign Message</div><div id="signBoard" style="background:#a07a48;border:4px solid #5a3c22;padding:14px 18px;display:flex;flex-direction:column;gap:4px"></div><button id="signDone" style="width:220px;height:44px;font-size:24px;background:#6e6e6e;border:2px solid #222;color:#fff;cursor:pointer">Done</button>';
    document.body.appendChild(el); const board = el.querySelector('#signBoard');
    for (let i = 0; i < 4; i++) { const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 15; inp.style.cssText = 'width:300px;height:34px;background:transparent;border:none;border-bottom:1px dashed rgba(0,0,0,.25);color:#111;font-family:VT323,monospace;font-size:28px;text-align:center;outline:none';
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); const n = board.children[i + 1]; if (n && e.key !== 'Enter') n.focus(); else if (e.key === 'Enter') { if (n) n.focus(); else closeSignEditor(); } } else if (e.key === 'ArrowUp') { e.preventDefault(); const p = board.children[i - 1]; if (p) p.focus(); } else if (e.key === 'Escape') { e.preventDefault(); closeSignEditor(); } });
      board.appendChild(inp); }
    el.querySelector('#signDone').addEventListener('pointerdown', (e) => { e.preventDefault(); closeSignEditor(); }); }
  const e = bdataOf(world).get(k) || { t: ['', '', '', ''] }; const ins = [...el.querySelectorAll('#signBoard input')]; ins.forEach((inp, i) => inp.value = e.t[i] || '');
  const BG = { oak: '#a07a48', spruce: '#6b4a2a', birch: '#d8c890', jungle: '#a8724a', acacia: '#b0603a', dark_oak: '#4a3018', mangrove: '#7a3430', cherry: '#e8b4b0', bamboo: '#d0b860', crimson: '#6a3048', warped: '#2a6a64', pale_oak: '#e4dcd0' };
  el.querySelector('#signBoard').style.background = BG[d.sign] || '#a07a48';
  SIGN_ED = k; S.uiOpen = 'sign'; for (const kk in keys) keys[kk] = false; mouseL = mouseR = false; el.style.display = 'flex'; releaseLock(); setTimeout(() => ins[0].focus(), 0); }
function closeSignEditor(noLock) { const el = $('signEd'); if (!el || !SIGN_ED) return; const ins = [...el.querySelectorAll('#signBoard input')]; const bd = bdataOf(world); const old = bd.get(SIGN_ED) || {};
  const t = ins.map(i => i.value.slice(0, 15)); if (BL[world.get(...SIGN_ED.split(',').map(Number))] && BL[world.get(...SIGN_ED.split(',').map(Number))].sign) bd.set(SIGN_ED, Object.assign(old, { t })); ovDrop(SIGN_ED); OV.watch.add(SIGN_ED);
  SIGN_ED = null; el.style.display = 'none'; ins.forEach(i => i.blur()); S.uiOpen = null; if (!noLock) requestLock(); }
{ const _ci = closeInv; closeInv = function (noLock) { if (S.uiOpen === 'sign') { closeSignEditor(noLock); return; } return _ci.apply(this, arguments); }; }
// ---- overlays: text, framed items, pictures and armor drawn near the player ----
function ovDrop(k) { const m = OV.meshes.get(k); if (m) { G.scene.remove(m.obj); m.obj.traverse(o => { if (o.material) { if (o.material.map && !o.material.map.shared) o.material.map.dispose(); o.material.dispose(); } if (o.geometry && !o.geometry.shared) o.geometry.dispose(); }); OV.meshes.delete(k); } }
function ovClear() { for (const k of [...OV.meshes.keys()]) ovDrop(k); }
function ovScan() { OV.watch.clear(); OV.world = world; ovClear(); for (const [ck, m] of world.edits) { const cx = Math.floor(ck / 65536) - 32768, cz = (ck % 65536) - 32768; for (const [i, id] of m) if (ovWatchable(id)) OV.watch.add(keyOf(cx * 16 + (i & 15), i >> 8, cz * 16 + ((i >> 4) & 15))); }
  for (const [k, e] of bdataOf(world)) if (e.anchor) OV.watch.add(k); }
{ const _set = World.prototype.set; World.prototype.set = function (x, y, z, id, record) { const mine = this === G.world; const old = mine ? this.get(x, y, z) : 0; const r = _set.apply(this, arguments);
    if (r !== false && mine) { const k = keyOf(x, y, z); if (ovWatchable(id)) { OV.watch.add(k); ovDrop(k); } else if (ovWatchable(old)) { OV.watch.delete(k); ovDrop(k); }
      if (BL[old] && BL[old].painting && !(BL[id] && BL[id].painting)) { const e = bdataOf(this).get(k); if (e) OV.pend = (OV.pend || []).concat([e.p]); } }
    return r; }; }
const SIGN_COL = { black: '#000000', white: '#ffffff', orange: '#e07a10', magenta: '#c040c0', light_blue: '#50a0e0', yellow: '#e0d030', lime: '#70c030', pink: '#f090b0', gray: '#505050', light_gray: '#9a9a9a', cyan: '#108080', purple: '#7a30b0', blue: '#2040a0', brown: '#704020', green: '#3a6a20', red: '#b02020' };
const ovPlane = (w, h, canvas, basic) => { const t = new THREE.CanvasTexture(canvas); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.05, side: THREE.FrontSide }); const g = new THREE.PlaneGeometry(w, h); return new THREE.Mesh(g, m); };
function ovBuild(k) { const [x, y, z] = k.split(',').map(Number); const id = world.get(x, y, z); const d = BL[id]; const bd = bdataOf(world);
  if (d && d.sign) { const e = bd.get(k); if (!e || !e.t || !e.t.some(Boolean)) return null; const c = document.createElement('canvas'); c.width = 224; c.height = 112; const g = c.getContext('2d'); g.font = '42px VT323, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = SIGN_COL[e.c] || '#000';
    e.t.forEach((line, i) => g.fillText(line, 112, 15 + i * 27)); const f = d.st.facing; const fv = [DV4[f][0], 0, DV4[f][1]];
    let off, cy, w = 1, h = 0.5; if (d.hangSign) { off = 1 / 16 + 0.004; cy = 5 / 16; w = 14 / 16; h = 10 / 16; } else if (d.signWall) { off = -0.375 + 0.004; cy = 0.5; } else { off = 0.75 / 16 + 0.004; cy = 0.75; }
    const m = ovPlane(w, h, c); m.position.set(x + 0.5 + fv[0] * off, y + cy, z + 0.5 + fv[2] * off); m.rotation.y = Math.atan2(fv[0], fv[2]);
    const grp = new THREE.Group(); grp.add(m); if (!d.signWall || d.hangSign) { const m2 = ovPlane(w, h, c); m2.position.set(x + 0.5 - fv[0] * off, y + cy, z + 0.5 - fv[2] * off); m2.rotation.y = Math.atan2(-fv[0], -fv[2]); if (d.hangSign) grp.add(m2); } return { obj: grp, light: [x, y, z] }; }
  if (d && d.frame) { const inv = world.chestInv.get(k); const it = inv && inv[0]; if (!it || !ICON_CANVAS[it.id]) return null; const v = RV[d.st.facing]; const m = ovPlane(0.55, 0.55, ICON_CANVAS[it.id]);
    const n = new V3(v[0], v[1], v[2]); m.quaternion.setFromUnitVectors(new V3(0, 0, 1), n); if (v[1]) m.rotateZ(Math.PI); m.rotateZ(-d.st.rot * Math.PI / 4); m.position.set(x + 0.5 - v[0] * (0.5 - 1.6 / 16), y + 0.5 - v[1] * (0.5 - 1.6 / 16), z + 0.5 - v[2] * (0.5 - 1.6 / 16)); return { obj: m, light: [x, y, z], glow: d.frame === 'glow_item_frame' }; }
  if (bd.get(k) && bd.get(k).anchor) { const e = bd.get(k); const P = PAINTINGS[e.v]; if (!P) return null; const can = OV.tex.get(e.v) || paintingCanvas(e.v); OV.tex.set(e.v, can); const [rx, rz] = P_RIGHT[e.f]; const fv = [DV4[e.f][0], 0, DV4[e.f][1]];
    const m = ovPlane(P.w, P.h, can); const off = -0.5 + 1 / 16 + 0.004; m.position.set(x + 0.5 + rx * (P.w - 1) / 2 + fv[0] * off, y + P.h / 2, z + 0.5 + rz * (P.w - 1) / 2 + fv[2] * off); m.rotation.y = Math.atan2(fv[0], fv[2]);
    // the edges of the canvas
    const back = new THREE.Mesh(new THREE.BoxGeometry(P.w, P.h, 1 / 16), new THREE.MeshLambertMaterial({ color: 0x5a3c22 })); back.position.copy(m.position).add(new V3(-fv[0] * (1 / 32 + 0.003), 0, -fv[2] * (1 / 32 + 0.003))); back.rotation.y = m.rotation.y; const grp = new THREE.Group(); grp.add(back); grp.add(m); return { obj: grp, light: [x + rx * (P.w >> 1), y + (P.h >> 1), z + rz * (P.w >> 1)] }; }
  if (d && d.armorStand === 'lower') { const inv = world.chestInv.get(k); if (!inv || !inv.some(Boolean)) return null; const grp = new THREE.Group(); const f = d.st.facing;
    const add = (b, col) => { const mat = new THREE.MeshLambertMaterial({ color: col }); const g = new THREE.BoxGeometry((b[3] - b[0]) / 16, (b[4] - b[1]) / 16, (b[5] - b[2]) / 16); const m = new THREE.Mesh(g, mat); m.position.set((b[0] + b[3]) / 32 - 0.5, (b[1] + b[4]) / 32, (b[2] + b[5]) / 32 - 0.5); grp.add(m); };
    const colOf = (s) => { const it = ITEMS[s.id]; if (s.dye !== undefined) return s.dye; const c = it.color; if (Array.isArray(c)) return (c[0] << 16) | (c[1] << 8) | c[2]; if (typeof c === 'number') return c; const mk = it.mat || ''; return { leather: 0x8a5a32, chainmail: 0x8a8a8a, iron: 0xd8d8d8, golden: 0xf0c830, gold: 0xf0c830, diamond: 0x50d0d0, netherite: 0x4a4048, turtle: 0x40a040 }[mk] || 0xaaaaaa; };
    if (inv[0]) add([3.5, 25.5, 3.5, 12.5, 34.5, 12.5], colOf(inv[0])); if (inv[1]) { add([3.5, 13, 5.5, 12.5, 25, 10.5], colOf(inv[1])); add([-0.5, 14, 6.5, 3, 25, 9.5], colOf(inv[1])); add([13, 14, 6.5, 16.5, 25, 9.5], colOf(inv[1])); }
    if (inv[2]) { add([3.5, 6, 5.5, 7.8, 14, 10.5], colOf(inv[2])); add([8.2, 6, 5.5, 12.5, 14, 10.5], colOf(inv[2])); } if (inv[3]) { add([3.5, 1, 5.5, 7.8, 6, 10.5], colOf(inv[3])); add([8.2, 1, 5.5, 12.5, 6, 10.5], colOf(inv[3])); }
    grp.position.set(x + 0.5, y, z + 0.5); grp.rotation.y = -f * Math.PI / 2; return { obj: grp, light: [x, y + 1, z], lambert: true }; }
  return null; }
function ovTick(dt) { if (!world || !G.scene) return; if (OV.world !== world) ovScan(); OV.t -= dt; if (OV.t > 0) return; OV.t = 0.25; const P = player.pos;
  if (OV.pend) { const list = OV.pend; OV.pend = null; for (const a of list) removePainting(a, true); }
  for (const k of OV.watch) { const [x, y, z] = k.split(',').map(Number); const near = Math.abs(x - P.x) < 56 && Math.abs(z - P.z) < 56 && Math.abs(y - P.y) < 40 && world.loaded(x, z);
    if (!near) { ovDrop(k); continue; } let m = OV.meshes.get(k); if (!m) { const r = ovBuild(k); if (!r) { OV.meshes.set(k, { obj: new THREE.Group(), empty: true }); continue; } m = r; OV.meshes.set(k, m); G.scene.add(m.obj); }
    if (m.light && !m.lambert) { const L = m.glow ? 1 : Math.max(0.18, world.lightAt(m.light[0] + 0.5, m.light[1] + 0.5, m.light[2] + 0.5, G.daylight)); m.obj.traverse(o => { if (o.material && o.material.color && o.material.map) o.material.color.setScalar(L); }); } }
  for (const k of [...OV.meshes.keys()]) if (!OV.watch.has(k)) ovDrop(k); }
{ const _uw = updateWater; updateWater = function (dt) { const r = _uw.apply(this, arguments); try { ovTick(dt); } catch (e) { console.error(e); } return r; }; }
// ---- sounds ----
{ const _pl = Sfx.play; Sfx.play = function (name, v = 1, rate) { if (!this.ctx) return _pl.apply(this, arguments); if (!(v >= 0.02)) return;
    switch (name) { case 'frame_add': this.nz(0.08, 1600, 0.3 * v, 'bandpass', 2); return; case 'frame_rotate': this.tone(900, 700, 0.05, 0.06 * v, 'triangle'); return; case 'frame_remove': this.nz(0.1, 1200, 0.35 * v, 'bandpass', 1.5); return; case 'dye': this.nz(0.12, 3000, 0.2 * v, 'bandpass', 1); return; }
    return _pl.apply(this, arguments); }; }
// ---- creative order and fuel ----
{ const keys = [...WOODDATA().flatMap(w => [w.k + '_sign', w.k + '_hanging_sign']), ...COLORDATA().map(c => c[0] + '_banner'), 'item_frame', 'glow_item_frame', 'painting', 'armor_stand'];
  const ids = keys.map(k => IT[k]).filter(v => v !== undefined); const set = new Set(ids); const rest = ITEM_IDS.filter(i => !set.has(i)); const at = rest.indexOf(IT.honey_bottle); rest.splice(at >= 0 ? at + 1 : rest.length, 0, ...ids); ITEM_IDS.length = 0; ITEM_IDS.push(...rest);
  for (const w of WOODDATA()) if (!w.nether) { if (IT[w.k + '_sign'] !== undefined) FUEL[IT[w.k + '_sign']] = 10; if (IT[w.k + '_hanging_sign'] !== undefined) FUEL[IT[w.k + '_hanging_sign']] = 10; } for (const c of COLORDATA()) if (IT[c[0] + '_banner'] !== undefined) FUEL[IT[c[0] + '_banner']] = 15; }
