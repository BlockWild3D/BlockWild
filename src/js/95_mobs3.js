// ================= CREAKING, COPPER GOLEM, WANDERING TRADER, ILLUSIONER; BUILDING GOLEMS =================
// Creaking (The Garden Awakens): some pale oaks in pale gardens hide a creaking heart in the trunk. At night, with pale
// oak logs above and below it, the heart wakes (its eyes glow) and makes a creaking nearby. A creaking only moves
// when nobody is looking at it; while its heart lives, hits do nothing but make the heart grow resin clumps and
// show you where the heart is. Break the heart and its creaking crumbles; at dawn it crumbles too. Eyeblossoms in
// pale gardens open at night and close by day.
// Golems: a carved pumpkin (or jack o'lantern) on two snow blocks makes a snow golem, on a T of four iron blocks an
// iron golem (one you made never attacks you), on a copper block a copper golem - the copper block turns into a
// copper chest. Copper golems take items out of copper chests and put them into chests that already hold the same
// item (or empty ones) within 32 blocks. They age like copper (honeycomb waxes them, an axe scrapes them) and a fully
// oxidized golem eventually freezes into a copper golem statue; use a statue to change its pose, scrape it with
// an axe to bring the golem back.
// Wandering trader: every 20 minutes there's a chance (2.5%, rising to 7.5%) that one walks up with two trader llamas
// on leads. It sells plants, dyes, coral, shells and other odd things for emeralds, drinks an invisibility potion
// at night and milk at dawn, and wanders off after 40 minutes.
// Illusioner: an illager archer that blinds you and splits into decoys (spawn egg only, like Minecraft).
// ================= CREAKING =================
const BARK_C = [96, 86, 80];
MOBS.creaking = { name: 'Creaking', hp: 1, w: 0.9, h: 2.7, speed: 3.4, kind: 'hostile', dmg: 3, snd: 'creak', egg: [[95, 95, 95], [252, 120, 36]], drops: [],
  build(m, r) { const bark = fur(BARK_C, 8, { speck: [[120, 110, 104], 0.2], extra: (f, set, fw, fh) => { for (let y = 0; y < fh; y++) if ((y * 3 + fw) % 7 === 0) for (let x = 0; x < fw; x++) set(x, y, [70, 62, 58]); } });
    m.legs = []; for (const x of [-0.16, 0.16]) { const p = pivot(r, x, 1.05, 0); sbox(m, p, 0.2, 1.05, 0.2, 0, -0.52, 0, 'crk_leg', bark); m.legs.push(p); }
    sbox(m, r, 0.6, 0.95, 0.3, 0, 1.52, 0, 'crk_body', fur([110, 100, 92], 8, { extra: (f, set, fw, fh) => { if (f === 'front') for (let y = 1; y < fh - 1; y += 2) set(fw >> 1, y, [240, 130, 40]); } }));
    m.arms = []; for (const x of [-0.4, 0.4]) { const p = pivot(r, x, 1.95, 0); sbox(m, p, 0.18, 1.25, 0.18, 0, -0.6, 0, 'crk_arm', bark); m.arms.push(p); }
    const h = pivot(r, 0, 2.0, 0); m.head = h; sbox(m, h, 0.56, 0.62, 0.5, 0, 0.32, 0, 'crk_head', fur(BARK_C, 8, { extra: (f, set, fw) => { if (f !== 'front') return; set(1, 3, [255, 150, 40], true); set(fw - 2, 3, [255, 150, 40], true); set(2, 3, [255, 200, 110], true); set(fw - 3, 3, [255, 200, 110], true); } }));
    for (const [x, y, rz] of [[-0.2, 0.68, 0.5], [0.22, 0.72, -0.4], [0, 0.78, 0]]) { const p = pivot(h, x, y, 0); p.rotation.z = rz; sbox(m, p, 0.06, 0.3, 0.06, 0, 0.15, 0, 'crk_twig', fur([80, 72, 66], 4)); } } };
MOB_PITCH.creaking = 0.7;
function watchedByPlayer(m) { const P = player; if (P.dead || S.mode === 'spectator') return false; const e = P.eye(); const c = new V3(m.pos.x, m.pos.y + m.h * 0.6, m.pos.z); const d = c.clone().sub(e); const L = d.length(); if (L > 48) return false; d.multiplyScalar(1 / L);
  const look = lookDir(); if (look.dot(d) < 0.62) return false; return lineOfSight(e, c) || lineOfSight(e, new V3(m.pos.x, m.pos.y + 0.3, m.pos.z)); }
const HEART_LINK = new Map(); // heart key -> creaking
function crumble(m) { if (m.dead) return; m.dead = true; m.gone = true; Particles.emit(m.pos.x, m.pos.y + 1.3, m.pos.z, 30, [[0.45, 0.4, 0.36], [0.95, 0.55, 0.2]], 2, 1.2, 4, 0.9); Sfx.at('wood', m.pos, 1, 0.5); if (m.remove) m.remove(); }
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) {
    if (this.type !== 'creaking' || this.dead) return _u.call(this, dt);
    if (this.heart) { const [x, y, z] = this.heart.split(',').map(Number); const hid = world.get(x, y, z); const hb = BL[hid];
      if (!hb || !hb.heart || G.daylight > 0.55 || Math.hypot(this.pos.x - x, this.pos.z - z) > 34) { HEART_LINK.delete(this.heart); crumble(this); return; } }
    const watched = isSurv() && watchedByPlayer(this); this.frozen = watched;
    if (watched) { this.vel.x = 0; this.vel.z = 0; this.lightT = (this.lightT || 0) - dt; if (this.lightT <= 0) { this.lightT = 0.3; this.light = Math.max(G.minLight || 0, world.lightAt(this.pos.x, this.pos.y + 1, this.pos.z, G.daylight)); } if (this.colorize) this.colorize();
      if (this.wasMoving) { this.wasMoving = false; Sfx.at('creak', this.pos, 0.6); } return; }
    this.wasMoving = true; return _u.call(this, dt); }; }
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, na) {
    if (this.type === 'creaking' && this.heart && !this.dead) { const [x, y, z] = this.heart.split(',').map(Number); this.hurtT = 0.3; Sfx.at('creak', this.pos, 1, 1.3);
      // a trail of particles from the creaking to its heart, and the heart grows resin on the logs around it
      const a = new V3(this.pos.x, this.pos.y + 1.4, this.pos.z), b = new V3(x + 0.5, y + 0.5, z + 0.5); for (let i = 0; i <= 12; i++) { const p = a.clone().lerp(b, i / 12); Particles.emit(p.x, p.y, p.z, 1, [[1, 0.6, 0.2]], 0.2, 0.5, 0, 0.1); }
      if (!isClientMP()) for (let t = 0; t < 6; t++) { const dx = (Math.random() * 5 | 0) - 2, dy = (Math.random() * 5 | 0) - 2, dz = (Math.random() * 5 | 0) - 2; const X = x + dx, Y = y + dy, Z = z + dz; if (world.get(X, Y, Z)) continue;
        for (const [n, f] of [[[0, 0, 1], 2], [[-1, 0, 0], 3], [[0, 0, -1], 4], [[1, 0, 0], 5], [[0, -1, 0], 0], [[0, 1, 0], 1]]) { const sid = world.get(X + n[0], Y + n[1], Z + n[2]); if (BL[sid] && /pale_oak_log|creaking_heart/.test(BL[sid].key || BL[sid].fam || '')) { world.set(X, Y, Z, B.RESIN_CLUMP + f); mpBlock(X, Y, Z, B.RESIN_CLUMP + f); t = 9; break; } } }
      return; }
    return _h.apply(this, arguments); }; }
// hearts and eyeblossoms near you: wake / sleep with the night, make creakings
{ const _ub = updateBoats; let scanT = 0; updateBoats = function (dt) { const r = _ub(dt); if (!world || world.dim !== 'overworld' || isClientMP()) return r; scanT -= dt; if (scanT > 0) return r; scanT = 1;
    const P = player.pos, night = G.daylight < 0.45;
    for (const c of world.chunks.values()) { const ox = c.cx * 16, oz = c.cz * 16; if (Math.abs(ox + 8 - P.x) > 64 || Math.abs(oz + 8 - P.z) > 64) continue;
      for (const j of chunkIdx(c).pg) { const id = c.d[j]; const b = BL[id]; if (!b) continue; const y = (j / 256) | 0, x = ox + (j & 15), z = oz + ((j >> 4) & 15);
        if (b.eyeblossom) { const want = night ? B.OPEN_EYEBLOSSOM : B.CLOSED_EYEBLOSSOM; if (id !== want && Math.random() < 0.15) { world.set(x, y, z, want); mpBlock(x, y, z, want); } continue; }
        if (!b.heart) continue; const logOk = (yy) => { const k = BL[world.get(x, yy, z)]; return k && /pale_oak_log/.test(k.fam || k.key || '') && (!k.st || !k.st.axis || k.st.axis === 'y'); };
        const awake = night && logOk(y - 1) && logOk(y + 1); const want = awake ? B['CREAKING_HEART#AWAKE'] : B.CREAKING_HEART; if (id !== want) { world.set(x, y, z, want); mpBlock(x, y, z, want); }
        const k = x + ',' + y + ',' + z; const cur = HEART_LINK.get(k); if (cur && (cur.dead || cur.gone)) HEART_LINK.delete(k);
        if (awake && !HEART_LINK.has(k) && isSurv() && Math.hypot(P.x - x, P.z - z) < 32) for (let t = 0; t < 12; t++) { const sx = x + (Math.random() * 25 | 0) - 12, sz = z + (Math.random() * 25 | 0) - 12; for (let sy = y + 6; sy > y - 8; sy--) if (SOLID[world.get(sx, sy - 1, sz)] && !world.get(sx, sy, sz) && !world.get(sx, sy + 1, sz) && !world.get(sx, sy + 2, sz)) { const m = spawnMob('creaking', sx + 0.5, sy, sz + 0.5); if (m) { m.heart = k; HEART_LINK.set(k, m); Sfx.at('creak', m.pos, 1, 0.8); } t = 99; break; } } } }
    return r; }; }
{ const _set = World.prototype.set; World.prototype.set = function (x, y, z, id) { const prev = this.get(x, y, z); const r = _set.apply(this, arguments); const pb = BL[prev], nb = BL[id];
    if (pb && pb.heart && !(nb && nb.heart) && this === G.world) { const k = x + ',' + y + ',' + z; const m = HEART_LINK.get(k); if (m) { HEART_LINK.delete(k); crumble(m); } } return r; }; }
// world generation: hearts in some pale oak trunks, eyeblossoms on the pale garden floor
{ const _po = TREES.pale_oak; TREES.pale_oak = function (put, x, y, z, r) { const heart = r() < 0.2; const hy = y + 2 + (r() * 3 | 0); let placed = false;
    return _po.call(this, (px, py, pz, id, isLog) => { if (heart && !placed && px === x && pz === z && py === hy && BL[id] && /pale_oak_log/.test(BL[id].key)) { placed = true; return put(px, py, pz, B.CREAKING_HEART, true); } return put(px, py, pz, id, isLog); }, x, y, z, r); }; }
{ const _dec = decorate; decorate = function (world, S, cx, cz) { const r0 = _dec.apply(this, arguments); if (world.dim !== 'overworld') return r0; const g = world.gen; const bx = cx * 16, bz = cz * 16; if (g.column(bx + 8, bz + 8).b !== BIO.PALE_GARDEN) return r0;
    const r = mulberry32(ihash(cx, cz, 6481, world.seed)); for (let k = 0; k < 2; k++) { if (r() > 0.6) continue; const x0 = bx + (r() * 16 | 0), z0 = bz + (r() * 16 | 0); for (let i = 0; i < 8; i++) { const x = x0 + (r() * 5 | 0) - 2, z = z0 + (r() * 5 | 0) - 2; const col = g.column(x, z); if (col.b !== BIO.PALE_GARDEN || col.h <= SEA) continue; S.soft.push(x, col.h, z, B.CLOSED_EYEBLOSSOM); } }
    return r0; }; }
// ================= BUILDING GOLEMS =================
function isCopperBlock(id) { const k = BL[id] && BL[id].key; return !!k && /^(waxed_)?(exposed_|weathered_|oxidized_)?copper(_block)?$/.test(k); }
function copperAgeOf(id) { const k = BL[id].key; return k.includes('oxidized') ? 3 : k.includes('weathered') ? 2 : k.includes('exposed') ? 1 : 0; }
{ const _pb = placeBlock; placeBlock = function (hit, id) { const d = BL[id]; const r = _pb.apply(this, arguments); if (!r || !d || !(d.fam === 'carved_pumpkin' || d.fam === 'jack_o_lantern' || d.key === 'carved_pumpkin' || d.key === 'jack_o_lantern') || isClientMP()) return r;
    let x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz; if (!BL[world.get(x, y, z)] || !/carved_pumpkin|jack_o_lantern/.test(BL[world.get(x, y, z)].fam || BL[world.get(x, y, z)].key)) return r;
    const g = (dx, dy, dz) => world.get(x + dx, y + dy, z + dz); const clear = (cells) => { for (const [a, b, c] of cells) { world.set(x + a, y + b, z + c, 0); mpBlock(x + a, y + b, z + c, 0); Particles.blockBreak(x + a, y + b, z + c, B.SNOW_BLOCK, 4); } };
    if (g(0, -1, 0) === B.SNOW_BLOCK && g(0, -2, 0) === B.SNOW_BLOCK) { clear([[0, 0, 0], [0, -1, 0], [0, -2, 0]]); spawnMob('snow_golem', x + 0.5, y - 2, z + 0.5); return r; }
    if (g(0, -1, 0) === B.IRON_BLOCK && g(0, -2, 0) === B.IRON_BLOCK) for (const [ax, az] of [[1, 0], [0, 1]]) if (g(ax, -1, az) === B.IRON_BLOCK && g(-ax, -1, -az) === B.IRON_BLOCK && !SOLID[g(ax, -2, az)] && !SOLID[g(-ax, -2, -az)]) {
      clear([[0, 0, 0], [0, -1, 0], [0, -2, 0], [ax, -1, az], [-ax, -1, -az]]); const m = spawnMob('iron_golem', x + 0.5, y - 2, z + 0.5); if (m) { m.playerMade = true; m.persistent = true; } return r; }
    const below = g(0, -1, 0); if (isCopperBlock(below)) { const age = copperAgeOf(below), waxed = BL[below].key.startsWith('waxed_'); world.set(x, y, z, 0); mpBlock(x, y, z, 0);
      const ck = (waxed ? 'waxed_' : '') + cuAge(age) + 'copper_chest'; const cid = FAMILY[ck] ? FAMILY[ck].ids[(playerFacing() + 2) % 4] || FAMILY[ck].base : B.CHEST; world.set(x, y - 1, z, cid); mpBlock(x, y - 1, z, cid);
      const m = spawnMob('copper_golem', x + 0.5, y, z + 0.5, { age, waxed }); if (m) m.persistent = true; Particles.emit(x + 0.5, y + 0.5, z + 0.5, 16, [[1, 0.6, 0.4]], 2, 0.8, -1, 0.8); Sfx.play('armor', 0.8, 1.3); return r; }
    return r; }; }
// a golem you built never turns on you
{ const _ht = hostileTarget; hostileTarget = function (m, range) { if (m && m.playerMade) return null; return _ht.apply(this, arguments); }; }
{ const _r = mobRecord; mobRecord = function (m) { const r = _r.apply(this, arguments); if (m.playerMade) r.pm = 1; if (m.type === 'copper_golem') { r.cg = { age: m.cgAge, waxed: m.cgWaxed, t: Math.round(m.ageT || 0), hold: m.cgHold || null }; } return r; };
  const _f = mobFromRecord; mobFromRecord = function (rec) { if (rec && rec.cg) { rec.age = rec.cg.age; } const m = _f.apply(this, arguments); if (m && rec) { if (rec.pm) m.playerMade = true; if (rec.cg) { m.cgWaxed = rec.cg.waxed; m.ageT = rec.cg.t; m.cgHold = rec.cg.hold; } } return m; }; }
// ================= COPPER GOLEM =================
MOBS.copper_golem = { name: 'Copper Golem', hp: 12, w: 0.5, h: 1.0, speed: 2.0, kind: 'passive', persist: true, snd: 'cg', egg: [[214, 124, 84], [90, 168, 140]], drops: [['copper_ingot', 1, 3, 1]],
  build(m, r) { const o = m.opts || {}; const age = clamp((o.rec && o.rec.cg ? o.rec.cg.age : o.age) || 0, 0, 3); m.cgAge = age; m.cgWaxed = !!o.waxed; const C = cgCol(age); const P = fur(C, 6, { speck: [shadeC(C, 1.2), 0.12] });
    m.legs = []; for (const x of [-0.1, 0.1]) { const p = pivot(r, x, 0.25, 0); sbox(m, p, 0.16, 0.25, 0.18, 0, -0.125, 0, 'cg_leg' + age, P); m.legs.push(p); }
    sbox(m, r, 0.5, 0.38, 0.36, 0, 0.44, 0, 'cg_body' + age, P);
    m.arms = []; for (const x of [-0.31, 0.31]) { const p = pivot(r, x, 0.6, 0); sbox(m, p, 0.12, 0.34, 0.12, 0, -0.15, 0, 'cg_arm' + age, P); m.arms.push(p); }
    const h = pivot(r, 0, 0.63, 0); m.head = h; sbox(m, h, 0.46, 0.32, 0.42, 0, 0.16, 0, 'cg_head' + age, fur(C, 6, { extra: (f, set, fw, fh) => { if (f !== 'front') return; for (const x of [1, 2, fw - 3, fw - 2]) { set(x, 1, [250, 236, 180]); set(x, 2, [250, 236, 180]); } } }));
    sbox(m, h, 0.1, 0.16, 0.1, 0, 0.12, 0.25, 'cg_nose' + age, fur(shadeC(C, 0.85), 4)); sbox(m, h, 0.05, 0.22, 0.05, 0, 0.42, 0, 'cg_rod' + age, fur(shadeC(C, 1.1), 3)); sbox(m, h, 0.1, 0.1, 0.1, 0, 0.56, 0, 'cg_rodtip' + age, fur(shadeC(C, 1.2), 3)); } };
MOB_XP.copper_golem = [0, 0];
const CHEST_IDS = () => { if (CHEST_IDS.s) return CHEST_IDS.s; const s = new Set(); for (const d of BL) if (d && d.use === 'chest' && !d.ender && !(d.slots && d.slots !== 27)) s.add(d.id); return (CHEST_IDS.s = s); };
function nearChests(m, copper) { const out = []; const cx0 = Math.floor(m.pos.x) >> 4, cz0 = Math.floor(m.pos.z) >> 4, S2 = CHEST_IDS();
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { const c = world.getChunk(cx0 + dx, cz0 + dz); if (!c) continue;
    for (const j of chunkIdx(c).chest) { const id = c.d[j]; if (!S2.has(id)) continue; const isCu = BL[id].copperChest !== undefined; if (isCu !== copper) continue; const y = (j / 256) | 0, x = c.cx * 16 + (j & 15), z = c.cz * 16 + ((j >> 4) & 15);
      if (Math.abs(x + 0.5 - m.pos.x) > 32 || Math.abs(z + 0.5 - m.pos.z) > 32 || Math.abs(y - m.pos.y) > 8) continue; out.push({ x, y, z, d: Math.hypot(x + 0.5 - m.pos.x, y - m.pos.y, z + 0.5 - m.pos.z) }); } }
  return out.sort((a, b) => a.d - b.d); }
function cgShowHold(m) { if (m.holdMesh) { m.root.remove(m.holdMesh); m.holdMesh = null; } if (!m.cgHold) { if (m.arms) for (const a of m.arms) a.rotation.x = 0; return; }
  const id = m.cgHold.id; const mesh = isCubeItem(id) ? new THREE.Mesh(blockGeo(id), handMat) : flatItemMesh(id); mesh.scale.setScalar(isCubeItem(id) ? 0.28 : 0.45); mesh.position.set(0, 0.55, 0.32); m.root.add(mesh); m.holdMesh = mesh; if (m.arms) for (const a of m.arms) a.rotation.x = -1.2; }
MOBS.copper_golem.tick = (m, dt) => { if (isClientMP()) return false;
  if (m.cgHold !== m.cgShown) { m.cgShown = m.cgHold; cgShowHold(m); }
  // ageing (not while waxed): a stage every 10-15 minutes; fully oxidized for a while, it freezes into a statue
  if (!m.cgWaxed) { m.ageT = (m.ageT || 0) + dt; if (m.ageT > 600 + (m.idHash || (m.idHash = Math.random() * 300))) { m.ageT = 0;
      if (m.cgAge < 3) cgReplace(m, m.cgAge + 1); else { const x = Math.floor(m.pos.x), y = Math.floor(m.pos.y), z = Math.floor(m.pos.z); if (!world.get(x, y, z)) { const F = FAMILY['oxidized_copper_golem_statue']; const f = ((Math.round(-m.yaw / (Math.PI / 2)) % 4) + 6) % 4; const sid = F.ids[f + ',' + (Math.random() * 4 | 0)] || F.base; world.set(x, y, z, sid); mpBlock(x, y, z, sid); if (m.cgHold) dropItem(m.cgHold.id, m.cgHold.count, m.pos.x, m.pos.y + 0.5, m.pos.z, true, m.cgHold.extra); m.dead = true; m.gone = true; if (m.remove) m.remove(); return true; } } } }
  // sorting: fetch from a copper chest, deliver to a chest that holds the same item (or an empty one)
  m.cgT = (m.cgT || 0) - dt; if (m.cgWait > 0) { m.cgWait -= dt; return false; }
  if (!m.cgGoal || m.cgT <= 0) { m.cgT = 3;
    if (!m.cgHold) { const src = nearChests(m, true).find(p => { const ct = contAt(p.x, p.y, p.z); return ct && ct.arr.some(Boolean); }); m.cgGoal = src ? { ...src, mode: 'fetch' } : null; }
    else { const all = nearChests(m, false).map(p => ({ p, ct: contAt(p.x, p.y, p.z) })).filter(o => o.ct); const id = m.cgHold.id; const room = (ct) => ct.arr.some(s => !s || (s.id === id && !xtra(s) && s.count < stackMax(id)));
      let pick = all.find(o => o.ct.arr.some(s => s && s.id === id) && room(o.ct)) || all.find(o => !o.ct.arr.some(Boolean)); m.cgGoal = pick ? { ...pick.p, mode: 'deliver' } : (m.cgSrc ? { ...m.cgSrc, mode: 'return' } : null); } }
  const G0 = m.cgGoal; if (!G0) return false; const tp = new V3(G0.x + 0.5, G0.y, G0.z + 0.5); const d = steerTo(m, tp, 1.2); m.goalBoost = true;
  if (d < 1.6 && Math.abs(m.pos.y - G0.y) < 2.5) { const ct = contAt(G0.x, G0.y, G0.z); m.cgGoal = null; m.cgWait = 1; Sfx.at('chest', m.pos, 0.4, 1.3);
    if (!ct) return false;
    if (G0.mode === 'fetch' && !m.cgHold) { const i = ct.arr.findIndex(Boolean); if (i >= 0) { const s = ct.arr[i]; const n = Math.min(16, s.count); m.cgHold = { id: s.id, count: n, extra: xtra(s) }; s.count -= n; if (!s.count) ct.arr[i] = null; m.cgSrc = { x: G0.x, y: G0.y, z: G0.z }; } }
    else if (m.cgHold) { const h = m.cgHold; for (let i = 0; i < ct.arr.length && h.count > 0; i++) { const s = ct.arr[i]; if (s && s.id === h.id && !xtra(s) && !h.extra) { const k = Math.min(stackMax(h.id) - s.count, h.count); s.count += k; h.count -= k; } }
      for (let i = 0; i < ct.arr.length && h.count > 0; i++) if (!ct.arr[i]) { ct.arr[i] = Object.assign({ id: h.id, count: h.count }, h.extra || {}); h.count = 0; } if (h.count <= 0) m.cgHold = null; }
    if (S.uiOpen) renderInvUI && renderInvUI(); }
  return false; };
function cgReplace(m, age, waxed = m.cgWaxed) { const n = spawnMob('copper_golem', m.pos.x, m.pos.y, m.pos.z, { age, waxed }); if (!n) return; n.yaw = m.yaw; n.cgHold = m.cgHold; n.persistent = true; n.cgWaxed = waxed; m.dead = true; m.gone = true; if (m.remove) m.remove(); G.mobs = G.mobs.filter(x => x !== m); return n; }
{ const _mi = mobInteract; mobInteract = function (m, sneaking) { if (m && m.type === 'copper_golem' && !m.dead) { const h = player.held(); const hd = h && ITEMS[h.id];
      if (hd && hd.kind === 'tool' && hd.tool === 'axe' && (m.cgWaxed || m.cgAge > 0)) { if (m.cgWaxed) m.cgWaxed = false; else cgReplace(m, m.cgAge - 1); damageHeld(1); S.swing = 1; SpriteFX.emit('glint', m.pos.x, m.pos.y + 0.6, m.pos.z, 10, { size: 0.22, spd: 1.2, life: 0.7, spread: 0.6, tint: [[0.6, 0.9, 0.8]] }) || Particles.emit(m.pos.x, m.pos.y + 0.6, m.pos.z, 10, [[0.6, 0.9, 0.8]], 1.5, 0.6, -1, 0.5); Sfx.play('wood', 1, 1.3); return true; }
      if (h && h.id === IT.honeycomb && !m.cgWaxed) { m.cgWaxed = true; useHeld(1); S.swing = 1; SpriteFX.emit('glint', m.pos.x, m.pos.y + 0.6, m.pos.z, 10, { size: 0.22, spd: 1.2, life: 0.7, spread: 0.6, tint: [[1, 0.85, 0.4]] }) || Particles.emit(m.pos.x, m.pos.y + 0.6, m.pos.z, 10, [[1, 0.85, 0.4]], 1.5, 0.6, -1, 0.5); return true; } }
    return _mi.apply(this, arguments); }; }
// statues: face you when placed; use one to change its pose; scrape one with an axe to wake the golem
{ const _pb = placeBlock; placeBlock = function (hit, id) { const d = BL[id]; if (!d || d.statue === undefined || !hit) return _pb.apply(this, arguments); const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz; if (!replaceableAt(x, y, z) || !SOLID[world.get(x, y - 1, z)]) return false;
    const F = FAMILY[d.fam]; const sid = F.ids[((playerFacing() + 2) % 4) + ',0'] || F.base; world.set(x, y, z, sid); mpBlock(x, y, z, sid); Sfx.play('stone', 0.8, 1.2); return true; }; }
{ const _ua = useAction; useAction = function (eye, dir) { if (target && !targetMob) { const d = BL[target.id]; if (d && d.statue !== undefined) { const h = player.held(); const hd = h && ITEMS[h.id]; const { x, y, z } = target; mouseR = false; S.swing = 1;
      if (hd && hd.kind === 'tool' && hd.tool === 'axe') { world.set(x, y, z, 0); mpBlock(x, y, z, 0); const m = spawnMob('copper_golem', x + 0.5, y, z + 0.5, { age: Math.max(0, d.statue - 1) }); if (m) { m.persistent = true; m.yaw = (d.st.facing || 0) * Math.PI / 2; } damageHeld(1); Sfx.play('wood', 1, 1.3); return; }
      if (!h) { const F = FAMILY[d.fam]; const nid = F.ids[d.st.facing + ',' + ((d.st.pose + 1) % 4)]; if (nid) { world.set(x, y, z, nid); mpBlock(x, y, z, nid); Sfx.play('stone', 0.6, 1.5); } return; } } }
    return _ua.apply(this, arguments); }; }
// copper chests age (and wax / scrape) like copper blocks
for (let a = 0; a < 4; a++) for (const f of [0, 1, 2, 3]) { const id = FAMILY[cuAge(a) + 'copper_chest'].ids[f], wid = FAMILY['waxed_' + cuAge(a) + 'copper_chest'].ids[f];
  if (a < 3) CU_NEXT[id] = FAMILY[cuAge(a + 1) + 'copper_chest'].ids[f]; if (a > 0) CU_PREV[id] = FAMILY[cuAge(a - 1) + 'copper_chest'].ids[f]; CU_WAX[id] = wid; CU_UNWAX[wid] = id; }
// ================= WANDERING TRADER AND TRADER LLAMAS =================
PROFS.wandering_trader = Object.assign({}, PROFS[Object.keys(PROFS)[0]] || {}, { name: 'Wandering Trader' });
const WT_COMMON = ['sea_pickle*1', 'slime_ball*1', 'glowstone*2', 'nautilus_shell*1', 'fern*1', 'sugar_cane*1', 'pumpkin*1', 'kelp*1', 'cactus*1', 'dandelion*1', 'rose*1', 'allium*1', 'azure_bluet*1', 'red_tulip*1', 'orange_tulip*1', 'white_tulip*1', 'pink_tulip*1', 'oxeye_daisy*1', 'cornflower*1', 'lily_of_the_valley*1',
  'wheat_seeds*1', 'beetroot_seeds*1', 'pumpkin_seeds*1', 'melon_seeds*1', 'oak_sapling*1', 'spruce_sapling*1', 'birch_sapling*1', 'jungle_sapling*1', 'acacia_sapling*1', 'dark_oak_sapling*1', 'cherry_sapling*1', 'mangrove_propagule*1', 'pale_oak_sapling*1',
  'red_dye*3', 'white_dye*3', 'blue_dye*3', 'pink_dye*3', 'black_dye*3', 'green_dye*3', 'light_gray_dye*3', 'magenta_dye*3', 'yellow_dye*3', 'gray_dye*3', 'purple_dye*3', 'light_blue_dye*3', 'lime_dye*3', 'orange_dye*3', 'brown_dye*3', 'cyan_dye*3',
  'brain_coral_block*1', 'bubble_coral_block*1', 'fire_coral_block*1', 'horn_coral_block*1', 'tube_coral_block*1', 'vine*1', 'brown_mushroom*1', 'red_mushroom*1', 'lily_pad*2', 'small_dripleaf*2', 'sand*8', 'red_sand*4', 'pointed_dripstone*2', 'rooted_dirt*2', 'moss_block*2'];
const WT_RARE = [['tropical_fish_bucket*1', 5], ['pufferfish_bucket*1', 5], ['packed_ice*1', 3], ['blue_ice*1', 6], ['gunpowder*1', 1], ['podzol*3', 3], ['oak_log*8', 1], ['spruce_log*8', 1], ['birch_log*8', 1], ['jungle_log*8', 1], ['acacia_log*8', 1], ['dark_oak_log*8', 1], ['cherry_log*8', 1], ['mangrove_log*8', 1], ['pale_oak_log*8', 1], ['iron_pickaxe*1', 1]];
function traderOffers() { const r = mulberry32((Math.random() * 1e9) | 0); const out = []; const pool = WT_COMMON.slice().sort(() => r() - 0.5);
  for (const s of pool) { if (out.length >= 5) break; const price = /coral|nautilus|glowstone|pumpkin/.test(s) ? (s.startsWith('nautilus') ? 5 : 3) : /sapling|propagule/.test(s) ? 5 : /seeds/.test(s) ? 1 : 1; const o = makeOffer({ a: 'emerald*' + price, s, u: /sapling|propagule|nautilus|coral/.test(s) ? 8 : 12, x: 1, m: 0.05 }, r); if (o) out.push(o); }
  const rare = WT_RARE[r() * WT_RARE.length | 0]; const o = makeOffer({ a: 'emerald*' + rare[1], s: rare[0], u: 6, x: 1, m: 0.05 }, r); if (o) out.push(o); return out; }
MOBS.wandering_trader = { name: 'Wandering Trader', hp: 20, w: 0.6, h: 1.95, speed: 1.8, kind: 'passive', snd: 'hmm', egg: [[64, 98, 162], [228, 196, 70]], drops: [],
  build(m, r) { MOBS.villager.build(m, r); m.dressed = true; sbox(m, r, 0.56, 1.05, 0.34, 0, 0.95, 0, 'wt_robe', fur([58, 92, 156], 7, { extra: (f, set, fw, fh) => { for (let x = 0; x < fw; x++) { set(x, fh - 1, [214, 180, 60]); set(x, 0, [214, 180, 60]); } if (f === 'front') for (let y = 0; y < fh; y++) set(fw >> 1, y, [214, 180, 60]); } }));
    if (m.head) sbox(m, m.head, 0.56, 0.12, 0.56, 0, 0.5, 0, 'wt_hood', fur([50, 80, 140], 6)); } };
MOB_PITCH.wandering_trader = 1.05;
MOBS.trader_llama = { name: 'Trader Llama', hp: 22, w: 0.9, h: 1.87, speed: 2.0, kind: 'passive', snd: 'baa', egg: [[234, 164, 59], [64, 98, 162]], drops: [['leather', 0, 2, 1]],
  build(m, r) { MOBS.llama.build(m, r); sbox(m, r, 0.66, 0.06, 1.0, 0, 1.25, -0.05, 'tl_blanket', fur([58, 92, 156], 5, { extra: (f, set, fw, fh) => { for (let y = 0; y < fh; y++) { set(0, y, [214, 180, 60]); set(fw - 1, y, [214, 180, 60]); } } })); sbox(m, r, 0.7, 0.36, 0.08, 0, 1.08, 0.3, 'tl_drape', fur([214, 180, 60], 5)); } };
if (MOBS.llama.tick) MOBS.trader_llama.tick = MOBS.llama.tick;
MOB_XP.trader_llama = [1, 3]; MOB_XP.wandering_trader = [0, 0];
MOBS.wandering_trader.tick = (m, dt) => { if (!m.vd) m.vd = { prof: 'wandering_trader', lvl: 5, xp: 0, offers: traderOffers(), restocks: 0, rday: -1, seed: 1 };
  m.wtAge = (m.wtAge || 0) + dt; if (m.wtAge > 2400 && !m.customName && !m.tradingWith && !isClientMP()) { for (const l of G.mobs) if (l.leashTo === m) { l.gone = true; l.dead = true; if (l.remove) l.remove(); } m.gone = true; m.dead = true; if (m.remove) m.remove(); return true; }
  const night = G.daylight < 0.4; if (night !== m.invis) { m.invis = night; Sfx.at(night ? 'eat' : 'eat', m.pos, 0.5, 1.4); if (m.root) m.root.visible = !night; }
  if (m.tradingWith) { m.wMove = 0; m.yaw = Math.atan2(player.pos.x - m.pos.x, player.pos.z - m.pos.z); return false; } return false; };
{ const _mi = mobInteract; mobInteract = function (m, sneaking) { if (m && m.type === 'wandering_trader' && !m.dead) { if (!m.vd) MOBS.wandering_trader.tick(m, 0); openTrade(m); if (S.panel) { S.panel.title = 'Wandering Trader'; if (typeof renderInvUI === 'function') renderInvUI(); } return true; } return _mi.apply(this, arguments); }; }
// leads: trader llamas follow their trader
MOBS.trader_llama.tick = ((prev) => (m, dt) => { const t = m.leashTo; if (t && (t.dead || t.gone)) m.leashTo = null;
  if (m.leashTo) { const d = m.pos.distanceTo(t.pos); if (d > 4) steerTo(m, t.pos, 3); if (d > 12) { m.pos.copy(t.pos).add(new V3(1, 0, 1)); }
    if (!m.lead) { const geo = new THREE.BufferGeometry().setFromPoints([new V3(), new V3()]); m.lead = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x5a4028 })); G.scene.add(m.lead); }
    const p = m.lead.geometry.attributes.position; p.setXYZ(0, m.pos.x, m.pos.y + 1.4, m.pos.z + 0.3); p.setXYZ(1, t.pos.x, t.pos.y + 1.0, t.pos.z); p.needsUpdate = true; m.lead.visible = !t.invis || true; }
  else if (m.lead) { G.scene.remove(m.lead); m.lead = null; }
  return prev ? prev(m, dt) : false; })(MOBS.trader_llama.tick);
{ const _rm = Mob.prototype.remove; Mob.prototype.remove = function () { if (this.lead) { G.scene.remove(this.lead); this.lead = null; } return _rm.apply(this, arguments); }; }
S.wtChance = 0.025; S.wtT = 1200;
function spawnWanderingTrader(force) { const P = player.pos; for (let t = 0; t < 30; t++) { const a = Math.random() * Math.PI * 2, d = force ? 6 + Math.random() * 6 : 24 + Math.random() * 24; const x = Math.floor(P.x + Math.cos(a) * d), z = Math.floor(P.z + Math.sin(a) * d); if (!world.loaded(x, z)) continue; const y = surfaceSpawnY(x, z); if (y <= SEA || !freeAt(x, y, z, 2)) continue;
    const m = spawnMob('wandering_trader', x + 0.5, y, z + 0.5); if (!m) return null; for (const s of [-1, 1]) { const l = spawnMob('trader_llama', x + 0.5 + s * 1.5, y, z + 1.5); if (l) l.leashTo = m; } return m; } return null; }
{ const _us = updateSpawning; updateSpawning = function (dt) { const r = _us.apply(this, arguments); if (!world || world.dim !== 'overworld' || isClientMP() || !S.rules.doMobSpawning) return r;
    S.wtT -= dt; if (S.wtT <= 0) { S.wtT = 1200; if (!G.mobs.some(m => m.type === 'wandering_trader' && !m.dead) && Math.random() < S.wtChance) { if (spawnWanderingTrader()) S.wtChance = 0.025; } else S.wtChance = Math.min(0.075, S.wtChance + 0.025); }
    return r; }; }
// ================= ILLUSIONER =================
Object.assign(EFFECTS, { blindness: 'Blindness' });
MOBS.illusioner = { name: 'Illusioner', hp: 32, w: 0.6, h: 1.95, speed: 2.2, kind: 'hostile', dmg: 3, snd: 'hmm', ranged: true, egg: [[19, 89, 155], [149, 155, 155]], drops: [],
  shoot(m, P) { m.atkCD = 2 + Math.random(); shootArrow(new V3(m.pos.x, m.pos.y + 1.5, m.pos.z), P.eye().add(new V3(0, -0.3, 0)), 'mob', 4); },
  build(m, r) { illagerModel(m, r, 'illu', [40, 70, 140], [24, 44, 96]); const bow = pivot(m.arms[1], 0, -0.66, 0.1); sbox(m, bow, 0.05, 0.7, 0.05, 0, 0, 0, 'skel_bow', fur([110, 76, 42], 5)); } };
MOB_XP.illusioner = [5, 5];
MOBS.illusioner.tick = (m, dt) => { if (isClientMP() || !isSurv() || player.dead) return false; m.spellT = (m.spellT === undefined ? 4 : m.spellT) - dt; const d = m.pos.distanceTo(player.pos);
  if (m.spellT <= 0 && d < 18) { m.spellT = 10 + Math.random() * 4; Sfx.at('vwoop', m.pos, 0.8, 0.7); SpriteFX.emit('spell', m.pos.x, m.pos.y + 1.2, m.pos.z, 20, { size: 0.3, grav: -1, spd: 1.2, life: 1, spread: 0.8, tint: [[0.3, 0.4, 1]] }) || Particles.emit(m.pos.x, m.pos.y + 1.2, m.pos.z, 20, [[0.3, 0.4, 1]], 2, 0.8, -1, 0.8);
    if (Math.random() < 0.5) giveEffect('blindness', 20, 0);
    else { m.mirrorT = 3; if (!m.mirrors) { m.mirrors = []; for (let i = 0; i < 4; i++) { const g = m.root.clone(true); G.scene.add(g); m.mirrors.push(g); } } } }
  if (m.mirrors) { m.mirrorT -= dt; const on = m.mirrorT > 0; m.mirrors.forEach((g, i) => { g.visible = on; const a = i * Math.PI / 2 + (m.age || 0); g.position.set(m.pos.x + Math.cos(a) * 2.2, m.pos.y, m.pos.z + Math.sin(a) * 2.2); g.rotation.y = m.yaw; }); if (m.root) m.root.visible = !on || Math.random() < 0.5; if (!on) { for (const g of m.mirrors) G.scene.remove(g); m.mirrors = null; if (m.root) m.root.visible = true; } }
  return false; };
{ const _rm = Mob.prototype.remove; Mob.prototype.remove = function () { if (this.mirrors) { for (const g of this.mirrors) G.scene.remove(g); this.mirrors = null; } return _rm.apply(this, arguments); }; }
function blindOverlay(k) { let el = document.getElementById('blindOv'); if (!el) { el = document.createElement('div'); el.id = 'blindOv'; el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0;background:radial-gradient(circle at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.92) 22%, #000 40%)'; document.body.appendChild(el); } el.style.opacity = k.toFixed(2); }
{ const _up = updatePlayer; let k = 0; updatePlayer = function (dt) { const r = _up.apply(this, arguments); const want = player.effects.blindness && !player.dead ? 1 : 0; k += (want - k) * Math.min(1, dt * 3); blindOverlay(k); return r; }; }
// ---------- sounds ----------
{ const _pl = Sfx.play; Sfx.play = function (name, v = 1, rate) { if (!this.ctx || v < 0.02) return _pl.apply(this, arguments);
    switch (name) { case 'creak': this.nz(0.45, 380 * (rate || 1), 0.4 * v, 'bandpass', 6); this.tone(110 * (rate || 1), 70, 0.4, 0.06 * v, 'sawtooth'); return;
      case 'cg': this.tone(900 * (rate || 1), 1300, 0.06, 0.05 * v, 'square'); this.tone(600, 800, 0.05, 0.04 * v, 'triangle'); return; }
    return _pl.apply(this, arguments); }; }
for (const k of ['creaking', 'copper_golem', 'wandering_trader', 'trader_llama', 'illusioner']) { if (MOBS[k] && !MOBS[k].snd) MOBS[k].snd = 'hmm'; }
