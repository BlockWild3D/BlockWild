// ================= VILLAGE LIFE: villagers sleep in beds, Java Edition iron golem summoning =================
// Villagers claim a bed (like a job site), walk home at dusk (12000 ticks), lie down and sleep until morning. A villager
// wakes if hurt or if its bed is broken. Every village house now has a bed (02_world.js buildHouse).
// Iron golems follow Java Edition rules:
//  - Panic: a villager that sees a zombie or illager nearby tries every 5 seconds; it needs 3 villagers (itself
//    included) that slept in the last 24000 ticks, all within a 10x10x10 box.
//  - Gossip: 5 villagers with jobs that slept and worked in the last 24000 ticks, within the same box, now and then
//    talk themselves into a golem; slower than panic.
//  - A villager that has seen an iron golem within 16 blocks in the last 30 seconds will not help, and after a summon
//    every villager within 10 blocks waits 30 seconds.
//  - The golem appears in a 16x13x16 volume around the summoner, on a block with a solid top (full block, top slab or
//    upside-down stairs; never glass or a bottom slab), with a clear 2x3x2 space above it.
//  - Built golems: a carved pumpkin or jack o'lantern placed last on a T of iron blocks, whether you place it, a
//    dispenser places it, or you shear a plain pumpkin that is already on top.
const DAY_T = 24000;
const absTicks = () => S.day * DAY_T + timeTicks();
const bedTime = () => { const t = timeTicks(); return t >= 12000 && t < 23850; };
const bedKey = (x, y, z) => x + ',' + y + ',' + z;
function bedClaims() { return world.bedClaims || (world.bedClaims = new Map()); }
function findVillagerBed(m) {
  const cx0 = Math.floor(m.pos.x) >> 4, cz0 = Math.floor(m.pos.z) >> 4; const C = bedClaims(); let best = null, bd = 48 * 48;
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) { const c = world.getChunk(cx0 + dx, cz0 + dz); if (!c || !c.d) continue; const ix = chunkIdx(c).bed; if (!ix.length) continue;
    for (const j of ix) { const x = (cx0 + dx) * 16 + (j & 15), z = (cz0 + dz) * 16 + ((j >> 4) & 15), y = j >> 8; if (Math.abs(y - m.pos.y) > 10) continue; const k = bedKey(x, y, z);
      const o = C.get(k); if (o && o !== m && !o.dead && !o.gone) continue; if (m.badBeds && m.badBeds.has(k)) continue; if (!bedPartner(x, y, z)) continue; const d = (x + 0.5 - m.pos.x) ** 2 + (z + 0.5 - m.pos.z) ** 2; if (d < bd) { bd = d; best = [x, y, z]; } } }
  return best;
}
// a small breadth-first path search over walkable cells (step up 1, drop up to 3), enough to get around walls and in at
// a door; ends next to the goal cell
function standable(x, y, z) { return !world.solid(x, y, z) && !world.solid(x, y + 1, z) && (world.solid(x, y - 1, z) || (BL[world.get(x, y - 1, z)] || {}).bedPart) && !(BL[world.get(x, y, z)] || {}).fluid; }
function villagerPath(sx, sy, sz, gx, gy, gz, maxN) { // A* with a bucket queue (all steps cost 1)
  const key = (x, y, z) => ((x - sx + 512) * 1024 + (z - sz + 512)) * 512 + (y & 511); const prev = new Map(); const gs = new Map(); const bk = [];
  const hh = (x, y, z) => Math.abs(x - gx) + Math.abs(z - gz) + Math.abs(y - gy); const push = (c, g) => { const f = g + hh(c[0], c[1], c[2]); (bk[f] || (bk[f] = [])).push(c); };
  prev.set(key(sx, sy, sz), null); gs.set(key(sx, sy, sz), 0); push([sx, sy, sz], 0); let n = 0, fi = 0;
  while (n++ < maxN) { while (fi < bk.length && !(bk[fi] && bk[fi].length)) fi++; if (fi >= bk.length) break; const c = bk[fi].pop(); const [x, y, z] = c; const g = gs.get(key(x, y, z));
    if (Math.abs(x - gx) + Math.abs(z - gz) <= 1 && Math.abs(y - gy) <= 1) { const out = []; let k = c; while (k) { out.push(k); k = prev.get(key(k[0], k[1], k[2])); } return out.reverse(); }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz; if (Math.abs(nx - sx) > 64 || Math.abs(nz - sz) > 64) continue;
      for (const dy of [0, 1, -1, -2, -3]) { const ny = y + dy; if (dy === 1 && world.solid(x, y + 2, z)) continue; if (dy < 0) { let open = true; for (let k = 0; k > dy; k--) if (world.solid(nx, y + k, nz) || world.solid(nx, y + k + 1, nz)) open = false; if (!open) continue; }
        if (!standable(nx, ny, nz)) continue; const k = key(nx, ny, nz); if (!gs.has(k) || gs.get(k) > g + 1) { gs.set(k, g + 1); prev.set(k, c); push([nx, ny, nz], g + 1); if (fi > g + 1 + hh(nx, ny, nz)) fi = g + 1 + hh(nx, ny, nz); } break; } } }
  return null; }
function followPath(m, dt) { const p = m.vPath; if (!p || !p.length) return false; const w = p[0]; const dx = w[0] + 0.5 - m.pos.x, dz = w[2] + 0.5 - m.pos.z;
  if (dx * dx + dz * dz < (p.length > 1 ? 0.5 : 0.2) && Math.abs(m.pos.y - w[1]) < 1.2) { p.shift(); return p.length > 0; }
  m.wYaw = Math.atan2(dx, dz); m.wMove = 1; m.wT = 0.4; return true; }
function lieDown(m, head, foot) { const D = [head[0] - foot[0], head[2] - foot[2]];
  m.vSleep = { head, hid: world.get(head[0], head[1], head[2]), px: foot[0] + 0.5 - D[0] * 0.45, py: foot[1] + 0.5625, pz: foot[2] + 0.5 - D[1] * 0.45, yaw: Math.atan2(-D[0], -D[1]) };
  m.vel.set(0, 0, 0); m.wMove = 0; }
function wakeUp(m) { const s = m.vSleep; m.vSleep = null; if (m.root) { m.root.rotation.x = 0; } if (!s) return;
  const foot = bedPartner(s.head[0], s.head[1], s.head[2]) || s.head; m.pos.set(foot[0] + 0.5, foot[1] + 0.6, foot[2] + 0.5); }
function villagerNight(m, dt) {
  const v = vData(m);
  if (m.vSleep) { const s = m.vSleep; if (!bedTime() || m.hurtT > 0 || world.get(s.head[0], s.head[1], s.head[2]) !== s.hid || m.tradingWith) { wakeUp(m); return false; }
    m.pos.set(s.px, s.py, s.pz); m.vel.set(0, 0, 0); m.yaw = s.yaw; m.wMove = 0; v.slept = absTicks(); return true; }
  if (!bedTime() || m.tradingWith || villagerPanicking(m)) return false;
  v.bt = (v.bt || 0) - dt;
  if (v.bed) { const [x, y, z] = v.bed.split(',').map(Number); if (world.loaded(x, z) && (!BL[world.get(x, y, z)] || BL[world.get(x, y, z)].bedPart !== 'head')) { bedClaims().delete(v.bed); v.bed = null; m.vPath = null; } }
  if (!v.bed && v.bt <= 0) { v.bt = 5; const b = findVillagerBed(m); if (b) { v.bed = bedKey(b[0], b[1], b[2]); bedClaims().set(v.bed, m); m.vPath = null; } }
  if (!v.bed) return false;
  const head = v.bed.split(',').map(Number); if (!world.loaded(head[0], head[2])) return false; bedClaims().set(v.bed, m);
  const foot = bedPartner(head[0], head[1], head[2]); if (!foot) return false;
  const fc = new V3(foot[0] + 0.5, foot[1], foot[2] + 0.5); const d = Math.hypot(fc.x - m.pos.x, fc.z - m.pos.z);
  if (d < 1.6 && Math.abs(m.pos.y - foot[1]) < 1.3) { m.vPath = null; lieDown(m, head, foot); return true; }
  if (d > 80) return false;
  // walk home along a path; look for a new one now and then, or when stuck
  m.pathT = (m.pathT || 0) - dt; m.stuckT = (m.stuckT || 0) + dt; let stuck = false; if (m.stuckT > 2) { stuck = !!m.lastPP && m.pos.distanceTo(m.lastPP) < 0.3; m.stuckT = 0; m.lastPP = m.pos.clone(); }
  if (!m.vPath || m.pathT <= 0 || stuck) { m.pathT = 8; const sx = Math.floor(m.pos.x), sy = Math.floor(m.pos.y + 0.2), sz = Math.floor(m.pos.z); m.vPath = villagerPath(sx, sy, sz, foot[0], foot[1], foot[2], 6000) || null; if (m.vPath) { m.vPath.shift(); m.noPathN = 0; }
    else if (++m.noPathN >= 2) { (m.badBeds || (m.badBeds = new Set())).add(v.bed); bedClaims().delete(v.bed); v.bed = null; m.noPathN = 0; v.bt = 0; return false; } }
  if (!followPath(m, dt)) { steerTo(m, fc, 0.2); m.wT = 0.5; }
  return false;
}
{ const prev = MOBS.villager.tick; MOBS.villager.tick = function (m, dt) { if (!isClientMP() && villagerNight(m, dt)) return true; return prev ? prev(m, dt) : false; }; }
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { const r = _u.apply(this, arguments); if (this.root && this.type === 'villager') {
    if (this.vSleep && !this.dead) { this.root.rotation.order = 'YXZ'; this.root.rotation.set(-Math.PI / 2, this.vSleep.yaw, 0); this.root.position.set(this.vSleep.px, this.vSleep.py, this.vSleep.pz); if (this.head) this.head.rotation.set(0, 0, 0); }
    else if (this.root.rotation.x) this.root.rotation.x = 0; } return r; }; }
// sleeping villagers stay sleeping through a save
{ const _mr = mobRecord; mobRecord = function (m) { const r = _mr(m); if (m.vSleep) r.vs = m.vSleep.head; return r; };
  const _mf = mobFromRecord; mobFromRecord = function (rec) { const m = _mf(rec); if (m && rec.vs && m.type === 'villager') m.pendingBed = rec.vs; return m; }; }
// ---------- iron golem summoning (Java Edition) ----------
const PANIC_R = { zombie: 8, husk: 8, drowned: 8, zombie_villager: 8, zombified_piglin: 0, vindicator: 10, evoker: 12, illusioner: 12, pillager: 15, ravager: 12, vex: 8, zoglin: 10 };
function villagerPanicking(m) {
  if (m.hurtT > 0 || (m.panicT || 0) > G.simT) return true;
  for (const o of G.mobs) { const r = PANIC_R[o.type]; if (!r || o.dead) continue; const dx = o.pos.x - m.pos.x, dz = o.pos.z - m.pos.z, dy = o.pos.y - m.pos.y; if (dx * dx + dy * dy + dz * dz < r * r) { m.panicT = G.simT + 4; m.panicFrom = o; return true; } }
  return false;
}
const sleptRecently = (v) => v.slept != null && absTicks() - v.slept <= DAY_T;
const workedRecently = (v) => v.worked != null && absTicks() - v.worked <= DAY_T;
function sawGolem(m) { const now = G.simT; if (G.mobs.some(g => g.type === 'iron_golem' && !g.dead && g.pos.distanceTo(m.pos) < 16)) m.gSeen = now; return m.gSeen != null && now - m.gSeen < 30; }
const coolingDown = (m) => (m.gCool || 0) > G.simT;
// a spawn block needs a solid top face: a full opaque cube, a top or double slab, or upside-down stairs
function golemFloor(id) { const d = BL[id]; if (!d || !id) return false; if (d.shape === 'slab') return d.st.type !== 'bottom'; if (d.shape === 'stairs') return d.st.half === 'top'; if (d.shape) return false;
  return !!SOLID[id] && d.opaque !== false && !d.leaves && !d.fluid && !(d.h && d.h < 1) && !/glass|ice$/.test(d.key || ''); }
// room for the golem: nothing in the 2x3x2 above may be a full block (air, water, carpets, plants are fine)
function golemFits(x, y, z) { for (let a = 0; a <= 1; a++) for (let b = 0; b <= 2; b++) for (let c = 0; c <= 1; c++) { const id = world.get(x + a, y + b, z + c); const d = BL[id]; if (!id) continue;
    if (d.fluid && id !== B.WATER) return false; if (SOLID[id] && !d.shape && !(d.h && d.h < 0.25)) return false; if (d.shape && d.shape !== 'carpet' && SOLID[id]) return false; } return true; }
function summonGolem(m) {
  const bx = Math.floor(m.pos.x), by = Math.floor(m.pos.y), bz = Math.floor(m.pos.z);
  for (let t = 0; t < 10; t++) { const x = bx + (Math.random() * 16 | 0) - 8, z = bz + (Math.random() * 16 | 0) - 8;
    for (let y = by + 6; y >= by - 6; y--) { if (!golemFloor(world.get(x, y - 1, z)) || !golemFits(x, y, z)) continue;
      const g = spawnShared('iron_golem', x + 1, y, z + 1); if (g) { g.vhome = [m.pos.x, m.pos.z]; Particles.emit(x + 1, y + 1, z + 1, 12, [[0.8, 0.8, 0.8]], 1.5, 0.8, -1, 0.8); } return g; } }
  return null;
}
golemCheck = function (m) {
  if (!S.rules.doMobSpawning || m.baby || m.vSleep || isClientMP()) return; const v = vData(m);
  if (sawGolem(m) || coolingDown(m) || !sleptRecently(v)) return;
  const panic = villagerPanicking(m); const now = G.simT;
  if (panic) { if (now - (m.gTry || -99) < 5) return; m.gTry = now; }
  else { if (!v.ws || !workedRecently(v)) return; if (now - (m.gGossip || -99) < 15) return; m.gGossip = now; if (Math.random() > 0.35) return; }
  const need = panic ? 3 : 5;
  const ok = (o) => o.type === 'villager' && !o.dead && !o.baby && Math.abs(o.pos.x - m.pos.x) <= 5 && Math.abs(o.pos.y - m.pos.y) <= 5 && Math.abs(o.pos.z - m.pos.z) <= 5 && sleptRecently(vData(o)) && !sawGolem(o) && !coolingDown(o) && (panic || (vData(o).ws && workedRecently(vData(o))));
  let n = 0; for (const o of G.mobs) if (ok(o) && ++n >= need) break; if (n < need) return;
  if (!summonGolem(m)) return;
  for (const o of G.mobs) if (o.type === 'villager' && !o.dead && o.pos.distanceTo(m.pos) <= 10) o.gCool = now + 30;
};
// remember work: a villager standing at its job site during work hours has worked today
{ const prev = MOBS.villager.tick; MOBS.villager.tick = function (m, dt) { const r = prev(m, dt); const v = vData(m);
    if (m.pendingBed) { const h = m.pendingBed; m.pendingBed = null; const f = world.loaded(h[0], h[2]) && bedPartner(h[0], h[1], h[2]); if (f && bedTime()) { v.bed = bedKey(h[0], h[1], h[2]); bedClaims().set(v.bed, m); lieDown(m, h, f); } }
    if (v.ws && isWorkTime() && !m.vSleep) { m.wkT = (m.wkT || 0) - dt; if (m.wkT <= 0) { m.wkT = 2; const [x, y, z] = v.ws.split(',').map(Number); if (Math.hypot(m.pos.x - x - 0.5, m.pos.z - z - 0.5) < 2.6) v.worked = absTicks(); } }
    // panicking villagers run from what scared them
    if (!m.vSleep && m.panicFrom && (m.panicT || 0) > G.simT && !m.tradingWith) { const o = m.panicFrom; if (!o.dead) { const a = new V3(m.pos.x * 2 - o.pos.x, m.pos.y, m.pos.z * 2 - o.pos.z); steerTo(m, a, 0); m.wT = 0.4; } }
    return r; }; }
// ---------- built golems: the pumpkin goes on last, however it gets there ----------
function carvedId(fam, f) { const k = f === 2 ? fam : fam + '#' + f; const d = BL.find(q => q && q.key === k); return d ? d.id : B[fam.toUpperCase()]; }
function checkBuiltGolem(x, y, z) {
  const id = world.get(x, y, z); const d = BL[id]; if (!d || !/^(carved_pumpkin|jack_o_lantern)$/.test(d.fam || d.key)) return;
  const g = (dx, dy, dz) => world.get(x + dx, y + dy, z + dz);
  const clear = (cells) => { for (const [a, b, c] of cells) { world.set(x + a, y + b, z + c, 0); mpBlock(x + a, y + b, z + c, 0); Particles.blockBreak(x + a, y + b, z + c, B.IRON_BLOCK, 4); } };
  if (g(0, -1, 0) === B.SNOW_BLOCK && g(0, -2, 0) === B.SNOW_BLOCK) { clear([[0, 0, 0], [0, -1, 0], [0, -2, 0]]); spawnMob('snow_golem', x + 0.5, y - 2, z + 0.5); return; }
  if (g(0, -1, 0) === B.IRON_BLOCK && g(0, -2, 0) === B.IRON_BLOCK) for (const [ax, az] of [[1, 0], [0, 1]]) if (g(ax, -1, az) === B.IRON_BLOCK && g(-ax, -1, -az) === B.IRON_BLOCK && !SOLID[g(ax, -2, az)] && !SOLID[g(-ax, -2, -az)]) {
    clear([[0, 0, 0], [0, -1, 0], [0, -2, 0], [ax, -1, az], [-ax, -1, -az]]); const m = spawnMob('iron_golem', x + 0.5, y - 2, z + 0.5); if (m) { m.playerMade = true; m.persistent = true; } return; }
}
{ const PUMPKINS = new Set(); for (const d of BL) if (d && /^(carved_pumpkin|jack_o_lantern)$/.test(d.fam || d.key)) PUMPKINS.add(d.id);
  const _set = World.prototype.set; World.prototype.set = function (x, y, z, id) { const r = _set.apply(this, arguments);
    if (PUMPKINS.has(id) && this === G.world && S.started && !S.loading && !isClientMP()) queueMicrotask(() => { if (world === this) checkBuiltGolem(x, y, z); }); return r; }; }
