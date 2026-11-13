// ================= DROWNED AND TRIDENTS (Minecraft) =================
// Drowned: underwater zombies of oceans and rivers. They swim after you, burn in daylight, and some (6.25%) carry
// a trident they throw (8 damage) and drop 25% of the time. They also drop rotten flesh and copper. A zombie that
// stays underwater for 30 seconds turns into a drowned.
// Trident: 9 damage up close; hold use for half a second and release to throw it (8 damage). Loyalty brings it
// back, Riptide launches you when you're in water instead of throwing, Impaling adds 2.5 damage per level to sea
// creatures. Channeling needs a thunderstorm (BlockWild has no weather yet).
Object.assign(ENCH, {
  loyalty: { name: 'Loyalty', max: 3, for: 'trident', excl: 'rip', w: 5 }, riptide: { name: 'Riptide', max: 3, for: 'trident', excl: 'rip', w: 2 },
  channeling: { name: 'Channeling', max: 1, for: 'trident', excl: 'rip', w: 1 }, impaling: { name: 'Impaling', max: 5, for: 'trident', w: 2 },
});
{ const _ec = enchCat; enchCat = function (id) { const it = ITEMS[id]; if (it && it.kind === 'trident') return 'trident'; return _ec(id); };
  const _ef = enchantFits; enchantFits = function (id, en) { const c = enchCat(id); if (c === 'trident') return !!ENCH[en] && (ENCH[en].for === 'trident' || ENCH[en].for === '*'); return _ef(id, en); };
  const _ea = enchantability; enchantability = function (id) { if (id === IT.trident) return 1; return _ea(id); }; }
const AQUATIC = new Set(['drowned', 'guardian', 'elder_guardian', 'squid', 'glow_squid', 'dolphin', 'cod', 'salmon', 'pufferfish', 'tropical_fish', 'turtle', 'axolotl']);
// extra melee damage on top of the item (Impaling, Mace smash...)
function meleeExtra(mob) { const h = player.held(); if (!h) return 0; let d = 0; const imp = enchOf(h, 'impaling'); if (imp && mob && AQUATIC.has(mob.type)) d += 2.5 * imp; return d; }

// ---------- the drowned ----------
const DROWN_SKIN = [86, 140, 128], DROWN_DARK = [52, 96, 88];
MOBS.drowned = { name: 'Drowned', hp: 20, w: 0.6, h: 1.95, speed: 2.3, kind: 'hostile', dmg: 3, snd: 'groan', burns: true, egg: [[143, 241, 215], [121, 156, 101]],
  drops: [['rotten_flesh', 0, 2, 1], ['copper_ingot', 1, 1, 0.11]],
  build(m, r) {
    humanoidS(m, r, 'drw', {
      head: fur(DROWN_SKIN, 7, { speck: [DROWN_DARK, 0.18], topRows: [2, [64, 110, 96]], extra: (f, set) => { if (f !== 'front') return; dots(set, [[1, 4], [2, 4], [5, 4], [6, 4]], [120, 255, 255], true); dots(set, [[2, 6], [3, 6], [4, 6], [5, 6]], [40, 70, 64]); } }),
      body: fur([96, 128, 84], 8, { speck: [[60, 110, 120], 0.25], extra: (f, set, fw, fh, rr) => { for (let x = 0; x < fw; x++) if (rr() < 0.4) set(x, fh - 1, DROWN_SKIN); } }),
      arm: fur(DROWN_SKIN, 7, { speck: [DROWN_DARK, 0.2], topRows: [3, [96, 128, 84]] }),
      leg: fur([70, 96, 116], 7, { speck: [DROWN_DARK, 0.2], foot: [2, DROWN_SKIN] }) }, true);
    const o = m.opts || {}; m.hasTrident = o.trident != null ? o.trident : (o.rec ? !!o.rec.trident : Math.random() < 0.0625);
    if (m.hasTrident) { const g = pivot(m.arms[1], 0, -0.62, 0.05); g.rotation.x = 1.2; sbox(m, g, 0.05, 1.1, 0.05, 0, 0.2, 0, 'drw_trident', fur([66, 140, 130], 6, { topRows: [3, [130, 220, 200]] })); for (const dx of [-0.08, 0.08]) sbox(m, g, 0.04, 0.16, 0.04, dx, 0.7, 0, 'drw_prong', fur([130, 220, 200], 4)); }
  },
};
MOB_PITCH.drowned = 0.8; MOB_XP.drowned = [5, 5]; UNDEAD.add('drowned');
function nearestTargetPos(m) { const P = G.player; return P && !P.dead && isSurv() ? P : null; }
// swimming: drowned move freely through water toward their target, sinking slowly when idle
MOBS.drowned.tick = function (m, dt) {
  const w = G.world; const inW = inWater(m, 0.6); const P = nearestTargetPos(m);
  // throw the trident from range
  if (m.hasTrident && P) { const d = m.pos.distanceTo(P.pos); m.throwT = (m.throwT || 2) - dt; if (d > 3.5 && d < 18 && m.throwT <= 0 && lineOfSight(new V3(m.pos.x, m.pos.y + 1.6, m.pos.z), P.eye())) { m.throwT = 3; const from = new V3(m.pos.x, m.pos.y + 1.6, m.pos.z); const tgt = P.eye().add(new V3(0, -0.4, 0)); const dir = tgt.clone().sub(from); const L = dir.length(); dir.normalize(); const v = dir.multiplyScalar(26); v.y += 0.5 * 20 * (L / 26); const p = spawnProj('trident', from, v, 'mob', 8, m); p.mobThrown = true; m.armSwing = 0.4; Sfx.at('bow', m.pos, 0.6, 0.7); } }
  if (!inW) return false; // on land: normal zombie behaviour
  const t = m.t; m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.atkCD -= dt; m.angry -= dt;
  m.lightT -= dt; if (m.lightT <= 0) { m.lightT = 0.3; m.light = Math.max(G.minLight || 0, w.lightAt(m.pos.x, m.pos.y + 1.4, m.pos.z, G.daylight)); }
  let want = new V3();
  if (P && P.pos.distanceTo(m.pos) < 24 && (inWater(P, 0.2) || P.pos.distanceTo(m.pos) < 8)) {
    want.copy(P.pos).sub(m.pos); want.y += 0.4; const L = want.length(); if (L > 0.01) want.multiplyScalar(2.4 / L);
    m.yaw += angWrap(Math.atan2(want.x, want.z) - m.yaw) * Math.min(1, dt * 6); m.chasing = true;
    const dist = m.pos.distanceTo(P.pos); if (dist < 1.6 + m.hw && m.atkCD <= 0) { m.atkCD = 1; P.hurt(t.dmg, m.pos, 'a Drowned', 1); m.armSwing = 0.3; }
  } else { m.chasing = false; m.swimT = (m.swimT || 0) - dt; if (m.swimT <= 0) { m.swimT = 2 + Math.random() * 3; m.swimYaw = Math.random() * Math.PI * 2; } want.set(Math.sin(m.swimYaw) * 0.8, -0.35, Math.cos(m.swimYaw) * 0.8); m.yaw += angWrap(m.swimYaw - m.yaw) * Math.min(1, dt * 2); }
  const k = Math.min(1, dt * 3); m.vel.x += (want.x - m.vel.x) * k; m.vel.y += (want.y - m.vel.y) * k; m.vel.z += (want.z - m.vel.z) * k;
  moveEntity(m, dt); if (m.hitH && m.chasing) m.vel.y = 2.5;
  m.animate(dt); if (m.legs) m.legs.forEach((l, i) => l.rotation.x = Math.sin(m.age * 6 + i * Math.PI) * 0.5);
  return true;
};
// zombies drown into drowned after 30 seconds underwater (15 of them shaking)
{ const _zt = MOBS.zombie.tick; MOBS.zombie.tick = function (m, dt) {
    if (_zt && _zt(m, dt)) return true;
    const under = FKIND[G.world.get(Math.floor(m.pos.x), Math.floor(m.pos.y + 1.7), Math.floor(m.pos.z))] === 1;
    m.drownT = under ? (m.drownT || 0) + dt : 0;
    if (m.drownT > 15) m.root.position.x += (Math.random() - 0.5) * 0.05;
    if (m.drownT > 30 && !isClientMP()) { m.gone = true; const d = spawnMob('drowned', m.pos.x, m.pos.y, m.pos.z, { trident: false }); d.yaw = m.yaw; d.root.scale.setScalar(1); Particles.emit(m.pos.x, m.pos.y + 1, m.pos.z, 16, [[0.6, 0.8, 0.9]], 2, 0.6, -1, 0.6); }
    return false;
  }; }
function isClientMP() { return typeof MP !== 'undefined' && MP.active && MP.role === 'client'; }
// generic per-type hook: t.tick(m, dt) can take over a mob's update (return true)
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { const t = this.t; if (!this.dead && t.tick && t.tick(this, dt)) return; return _u.call(this, dt); }; }
// drowned drop their trident 25% of the time; persist whether they carry one
{ const _dl = Mob.prototype.dropLoot; Mob.prototype.dropLoot = function () { if (this.type === 'drowned' && this.hasTrident && !this.remote && Math.random() < 0.25 + 0.04 * (this.lootingLv || 0)) dropItem(IT.trident, 1, this.pos.x, this.pos.y + 0.8, this.pos.z, true, { dmg: 50 + (Math.random() * 150 | 0) }); return _dl.apply(this, arguments); }; }

// natural spawning: drowned in deep water, mostly at night or in the dark
let drownSpawnT = 0;
function spawnDrowned(dt) {
  drownSpawnT -= dt; if (drownSpawnT > 0 || !world || world.dim !== 'overworld' || !S.rules.doMobSpawning || !isSurv() || S.difficulty === 'peaceful' || isClientMP()) return; drownSpawnT = 1.5;
  if (G.mobs.filter(m => m.type === 'drowned').length >= 6) return;
  const P = player.pos; const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 24; const x = Math.floor(P.x + Math.cos(a) * d), z = Math.floor(P.z + Math.sin(a) * d);
  if (!world.loaded(x, z)) return; let top = -1; for (let y = SEA + 2; y > 4; y--) { if (FKIND[world.get(x, y, z)] === 1) { top = y; break; } if (SOLID[world.get(x, y, z)]) break; } if (top < 0) return;
  let bot = top; while (bot > 2 && FKIND[world.get(x, bot - 1, z)] === 1) bot--; if (top - bot < 2) return;
  const y = bot + Math.floor(Math.random() * Math.max(1, top - bot - 1)); const L = lightLevels(x, y, z); if (L.block > 0 || L.sky > 7) return;
  if (Math.random() < 0.6) spawnMob('drowned', x + 0.5, y, z + 0.5);
}
{ const _us = updateSpawning; updateSpawning = function (dt) { const r = _us.apply(this, arguments); spawnDrowned(dt); return r; }; }

// ---------- tridents ----------
PROJ.trident = { grav: 20, critTrail: [[0.6, 0.95, 0.9]] };
{ const _pm = projMesh; projMesh = function (kind) {
    if (kind !== 'trident') return _pm(kind);
    const g = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: 0x4a9a8e });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.2), mat); g.add(shaft);
    const pm = new THREE.MeshLambertMaterial({ color: 0x9be8d6 }); for (const dx of [-0.1, 0, 0.1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, dx ? 0.22 : 0.3), pm); p.position.set(dx, 0, 0.62 + (dx ? 0.05 : 0.08)); g.add(p); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.04), pm); bar.position.z = 0.55; g.add(bar);
    return g;
  }; }
// throwing: hold use like a bow (at least 0.5 s), release to throw
S.tridentT = -1;
function tridentHeld() { const h = player.held(); return h && h.id === IT.trident ? h : null; }
{ const _ui = updateInteraction; updateInteraction = function (dt) {
    const h = tridentHeld();
    if (!h || S.uiOpen || player.dead || S.mode === 'spectator') { S.tridentT = -1; return _ui.apply(this, arguments); }
    if (mouseR && !(targetMob && typeof mobWantsItem === 'function' && targetMob.hg)) { if (S.tridentT < 0) S.tridentT = 0; S.tridentT += dt; const mr = mouseR; mouseR = false; try { return _ui.apply(this, arguments); } finally { mouseR = mr; } }
    if (S.tridentT >= 0.5) { releaseTrident(h); }
    S.tridentT = -1; return _ui.apply(this, arguments);
  }; }
function releaseTrident(h) {
  const P = player; const rip = enchOf(h, 'riptide'); const eye = P.eye(), dir = lookDir();
  if (rip) { // Riptide: only in water (or rain); launches you instead of throwing
    if (!inWater(P, 0.4) && !inWater(P, 1.2)) return;
    const sp = 3 * (1 + rip) / 4 * 20 * 0.55; P.vel.copy(dir).multiplyScalar(sp); P.riptideT = 0.6 + 0.15 * rip; P.peak = null; damageHeld(1); Sfx.play('vwoop', 0.5, 0.7); S.swing = 1; return;
  }
  const p = spawnProj('trident', eye.clone().addScaledVector(dir, 0.5), dir.clone().multiplyScalar(50), 'player', 8);
  p.item = Object.assign({}, h); p.slot = P.sel; p.life = 60; p.noPickup = S.mode === 'creative'; p.loyalty = enchOf(h, 'loyalty'); p.impaling = enchOf(h, 'impaling');
  if (S.mode !== 'creative') { P.inv[P.sel] = null; invDirty(); damageSlotObj(p.item, 1); }
  Sfx.play('bow', 0.6, 0.6); S.swing = 1;
}
function damageSlotObj(s, n) { const max = maxDur(s.id); if (!max || S.mode !== 'survival') return; const ub = enchOf(s, 'unbreaking'); for (let i = 0; i < n; i++) if (Math.random() < 1 / (ub + 1)) s.dmg = (s.dmg || 0) + 1; }
// riptide keeps your momentum and spins into mobs
{ const _up = updatePlayer; updatePlayer = function (dt) {
    const P = player; const keep = P.riptideT > 0 ? P.vel.clone() : null; const r = _up.apply(this, arguments);
    if (keep) { P.riptideT -= dt; const k = Math.exp(-dt * 1.5); P.vel.set(keep.x * k, keep.y * k, keep.z * k); P.peak = null;
      for (const m of G.mobs) if (!m.dead && m.pos.distanceTo(P.pos) < 1.6 + m.hw && !(P.ripHit && P.ripHit.has(m))) { (P.ripHit || (P.ripHit = new Set())).add(m); m.hurt(8, P.pos, 1); }
      if (P.riptideT <= 0) P.ripHit = null; }
    return r;
  }; }
// a thrown trident: hits a mob (and falls), sticks in the ground, or flies back with Loyalty
{ const _pi = projImpact; projImpact = function (a, mob) {
    if (a.kind !== 'trident') return _pi(a, mob);
    if (a.owner === 'mob') { a.done = true; return; }
    if (mob && a.hitMob) return;
    if (mob && !mob.dead && !a.returning) { const dmg = 8 + (a.impaling && AQUATIC.has(mob.type) ? 2.5 * a.impaling : 0); mob.hurt(dmg, G.player.pos, 0.6); Sfx.at('hurt', mob.pos, 0.4, 0.8); a.vel.multiplyScalar(-0.1); a.vel.y = -2; a.hitMob = true; if (!a.loyalty) return; }
    if (a.loyalty) { a.returning = true; a.done = false; a.life = 30; return; }
    a.done = true; if (a.noPickup) return; const it = dropItem(a.item.id, 1, a.pos.x, a.pos.y, a.pos.z, false, xtra(a.item)); if (it) { it.vel.set(0, 0, 0); it.pickDelay = 0.2; }
  }; }
{ const _up = updateProjectiles; updateProjectiles = function (dt) {
    const P = G.player;
    for (const a of G.projectiles) if (a.kind === 'trident' && a.returning && !a.done) {
      const to = P.eye().sub(a.pos); const L = to.length(); a.vel.copy(to.multiplyScalar(Math.min(60, (8 + 6 * a.loyalty) + L * 2) / Math.max(L, 0.01)));
      a.pos.addScaledVector(a.vel, dt); a.mesh.position.copy(a.pos); a.mesh.lookAt(P.eye());
      if (L < 1.2) { a.done = true; G.scene.remove(a.mesh); Sfx.play('pop', 0.6, 0.7); if (S.mode !== 'creative') { if (!P.inv[a.slot]) { P.inv[a.slot] = a.item; invDirty(); } else giveOrDrop(a.item.id, 1, xtra(a.item)); } }
    }
    const ret = G.projectiles.filter(a => a.kind === 'trident' && a.returning); for (const a of ret) a._skip = true;
    const keep = G.projectiles; G.projectiles = keep.filter(a => !a._skip);
    const r = _up.apply(this, arguments);
    for (const a of ret) { a._skip = false; if (!a.done) G.projectiles.push(a); }
    for (const a of G.projectiles) if (a.kind === 'trident' && !a.returning && a.mesh) a.mesh.lookAt(a.pos.x + a.vel.x, a.pos.y + a.vel.y, a.pos.z + a.vel.z);
    return r;
  }; }
// first-person: raise the trident over the shoulder while charging a throw
{ const _uh = updateHand; updateHand = function (dt, light) {
    const r = _uh.apply(this, arguments); if (!tridentHeld() || !handMesh) return r;
    const k = S.tridentT >= 0 ? Math.min(1, S.tridentT / 0.5) : 0; S.tridPose = (S.tridPose || 0) + (k - (S.tridPose || 0)) * Math.min(1, dt * 12);
    const q = S.tridPose; handGroup.position.y += 0.18 * q; handGroup.position.z += 0.15 * q; handGroup.position.x -= 0.05 * q;
    handMesh.rotation.set(HELD_ROT[0] + (Math.PI - 0.2 - HELD_ROT[0]) * q, HELD_ROT[1], HELD_ROT[2] + (Math.PI / 4 - HELD_ROT[2]) * q);
    return r;
  }; }
