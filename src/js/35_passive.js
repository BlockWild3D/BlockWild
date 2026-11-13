// ================= MORE ANIMALS AND FRIENDLY MOBS (Minecraft) =================
// Wolves (tame with bones: they follow you, sit, and fight what you fight), cats (tame with raw fish; creepers and
// phantoms keep away), ocelots, foxes, rabbits, goats, polar bears, pandas, llamas, donkeys and mules (ride like
// horses; horse + donkey = mule), camels (ride with a saddle), mooshrooms, iron golems (guard villages), snow
// golems, armadillos, sniffers, bats, parrots, bees, allays, frogs. Bone meal grows crops.
const QB = (m, r, k, o) => { // a four-legged body from a few numbers
  const B0 = o.body; sbox(m, r, B0[0], B0[1], B0[2], 0, B0[3], B0[4] || 0, k + '_body', o.bodyP);
  const H = o.head; const h = pivot(r, 0, H[3], H[4]); m.head = h; sbox(m, h, H[0], H[1], H[2], 0, H[5] || 0, H[6] || H[2] / 2 - 0.05, k + '_head', o.headP);
  if (o.snout) sbox(m, h, o.snout[0], o.snout[1], o.snout[2], 0, o.snout[3], o.snout[4], k + '_snout', o.snoutP || o.headP);
  if (o.ears) for (const s of [-1, 1]) { const e = pivot(h, s * o.ears[3], o.ears[4], o.ears[5]); if (o.ears[6]) e.rotation.z = s * o.ears[6]; sbox(m, e, o.ears[0], o.ears[1], o.ears[2], 0, o.ears[1] / 2, 0, k + '_ear', o.earP || o.headP); }
  const L = o.legs; m.legs = quadLegs(m, r, L[0], L[1], L[2], L[3], k + '_leg', o.legP || o.bodyP);
  if (o.tail) { m.tail = pivot(r, 0, o.tail[3], o.tail[4]); m.tail.rotation.x = o.tail[5] || 0; sbox(m, m.tail, o.tail[0], o.tail[1], o.tail[2], 0, -o.tail[1] / 2, 0, k + '_tail', o.tailP || o.bodyP); }
  return h;
};
const eyes = (c, y = 3, w = 1) => (f, set, fw) => { if (f !== 'front') return; for (let i = 0; i < w; i++) { set(1 + i, y, c); set(fw - 2 - i, y, c); } };
const pick = (m, n) => { const o = m.opts || {}; const v = o.v != null ? o.v : o.rec && o.rec.v != null ? o.rec.v : o.netx && o.netx.v != null ? o.netx.v : Math.floor(Math.random() * n); m.var = v; return v; };
const isOwner = (m) => m.tamed && (!m.owner || m.owner === myName());
PROJ.spit = { grav: 8, size: 0.16, color: 0xe8e8e0 };
{ const _nx = Mob.prototype.netx; Mob.prototype.netx = function () { const o = _nx.call(this); if (this.var == null && !this.tamed && !this.sitting) return o; const r = o || {}; if (this.var != null) r.v = this.var; if (this.tamed) r.tm = 1; if (this.sitting) r.st = 1; return r; };
  const _ax = Mob.prototype.applyNetx; Mob.prototype.applyNetx = function (ex) { _ax.call(this, ex); if (!ex) return; if (ex.tm && !this.tamed) { this.tamed = true; if (this.onTamed) this.onTamed(); } this.sitting = !!ex.st; }; }

// ---------- pets: taming, sitting, following, fighting for you ----------
const TAME = { wolf: ['bone', 1 / 3], cat: [['cod', 'salmon'], 1 / 3], parrot: [['wheat_seeds'], 1 / 10] };
const PET_HEAL = { wolf: ['raw_pork', 'cooked_pork', 'raw_beef', 'steak', 'raw_chicken', 'cooked_chicken', 'rotten_flesh', 'mutton', 'cooked_mutton', 'rabbit', 'cooked_rabbit'], cat: ['cod', 'salmon'] };
function petInteract(m) {
  const h = player.held(); const k = h ? ITEMS[h.id].key : null; const T = TAME[m.type]; if (!T) return false;
  if (!m.tamed) { const items = [].concat(T[0]); if (!k || !items.includes(k)) return (BREED_FOOD[m.type] || []).includes(k); useHeld(1); S.swing = 1;
    if (Math.random() < T[1] && !(m.angry > 0)) { mset(m, { tamed: true, owner: myName(), sitting: true }); hearts(m, 7); Sfx.at(m.t.snd, m.pos, 0.8); toast('Tamed!', 1.5); } else smoke(m, 6); return true; }
  if (!isOwner(m)) return false;
  if (k && PET_HEAL[m.type] && PET_HEAL[m.type].includes(k) && m.hp < m.maxHp) { mset(m, { hp: Math.min(m.maxHp, m.hp + 4) }); useHeld(1); hearts(m, 2); S.swing = 1; return true; }
  if (k && (BREED_FOOD[m.type] || []).includes(k)) return false; // breeding
  mset(m, { sitting: !m.sitting }); return true;
}
MOBSET_KEYS.push('sitting', 'var');
{ const _am = applyMobSet; applyMobSet = function (m, set) { const r = _am(m, set); if (set.tamed && m.onTamed) m.onTamed(); return r; }; }
{ const _mi = mobInteract; mobInteract = function (m, sneaking) { if (TAME[m.type] && !m.dead && petInteract(m)) return true; return _mi(m, sneaking); }; }
// who you last hit, and who last hit you: tamed wolves join in
{ const _mh = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src) { if (src && src === player.pos && !this.tamed) player.lastHit = this; return _mh.apply(this, arguments); }; }
{ const _ph = Player.prototype.hurt; Player.prototype.hurt = function (dmg, src) { if (src) { let best = null, bd = 9; for (const m of G.mobs) { if (m.dead || m.tamed) continue; const d = m.pos.distanceToSquared(src); if (d < bd) { bd = d; best = m; } } if (best) player.lastHurtBy = best; } return _ph.apply(this, arguments); }; }
function petTick(m, dt, o) {
  if (!m.tamed || m.loveT > 0 || m.baby) return false; const P = player; const own = isOwner(m);
  m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.atkCD -= dt; m.lightT -= dt; if (m.lightT <= 0) { m.lightT = 0.3; m.light = Math.max(G.minLight || 0, G.world.lightAt(m.pos.x, m.pos.y + 0.5, m.pos.z, G.daylight)); }
  let goal = null, speed = m.t.speed * 1.4, stop = 2.2;
  const foe = o.fights && own ? [P.lastHit, P.lastHurtBy].find(f => f && !f.dead && !f.gone && f !== m && f.pos.distanceTo(m.pos) < 20) : null;
  if (m.sitting) { m.vel.x *= 0.5; m.vel.z *= 0.5; }
  else if (foe) { goal = foe.pos; stop = 0.8 + foe.hw; speed = m.t.speed * 1.6; if (m.pos.distanceTo(foe.pos) < 1.4 + foe.hw && m.atkCD <= 0) { m.atkCD = 0.8; foe.hurt(o.dmg || 4, m.pos, 0.8); } }
  else if (own && !P.dead) { const d = m.pos.distanceTo(P.pos); if (d > 12 && P.onGround) { const a = Math.random() * 6.28; m.pos.set(P.pos.x + Math.cos(a) * 2, P.pos.y, P.pos.z + Math.sin(a) * 2); m.vel.set(0, 0, 0); } else if (d > 6) goal = P.pos; }
  if (goal) { const dx = goal.x - m.pos.x, dz = goal.z - m.pos.z; const d = Math.hypot(dx, dz); m.yaw += angWrap(Math.atan2(dx, dz) - m.yaw) * Math.min(1, dt * 8); const mv = d > stop ? speed : 0; m.vel.x += (Math.sin(m.yaw) * mv - m.vel.x) * Math.min(1, dt * 10); m.vel.z += (Math.cos(m.yaw) * mv - m.vel.z) * Math.min(1, dt * 10); }
  else if (!m.sitting) { m.vel.x *= 0.85; m.vel.z *= 0.85; }
  const water = inWater(m, 0.4); if (water) m.vel.y = Math.min(m.vel.y + 30 * dt, 2); else m.vel.y = Math.max(m.vel.y - 28 * dt, -40);
  moveEntity(m, dt); if (m.hitH && m.onGround && goal) m.vel.y = 8.2;
  m.animate(dt); if (m.sitting && m.legs) { m.body.rotation.x = -0.35; m.body.position.y -= 0.12; m.legs[2].rotation.x = m.legs[3].rotation.x = -1.3; }
  else m.body.rotation.x = 0;
  return true;
}

// ---------- wolf ----------
const WOLF = [214, 210, 204];
MOBS.wolf = { name: 'Wolf', hp: 8, w: 0.6, h: 0.85, speed: 2.6, kind: 'neutral', dmg: 4, snd: 'snort', persist: true, egg: [[215, 211, 211], [206, 175, 150]], drops: [],
  build(m, r) { QB(m, r, 'wolf', { body: [0.36, 0.36, 0.6, 0.6, -0.04], bodyP: fur(WOLF, 7, { speck: [[180, 176, 170], 0.15], topc: [190, 186, 180] }), head: [0.38, 0.36, 0.3, 0.68, 0.32, 0, 0.1], headP: fur(WOLF, 6, { extra: eyes([30, 30, 30], 3) }),
      snout: [0.18, 0.16, 0.2, -0.08, 0.32], snoutP: fur([196, 190, 184], 4, { extra: (f, set, fw) => { if (f === 'front') { set(fw >> 1, 0, [30, 30, 30]); set((fw >> 1) - 1, 0, [30, 30, 30]); } } }),
      ears: [0.12, 0.14, 0.06, 0.12, 0.18, 0.08], legs: [0.12, 0.42, 0.1, 0.22], tail: [0.1, 0.42, 0.1, 0.62, -0.32, 0.8] });
    sbox(m, r, 0.42, 0.4, 0.3, 0, 0.66, 0.18, 'wolf_mane', fur(WOLF, 9, { speck: [[180, 176, 170], 0.2] }));
    m.collar = sbox(m, m.head, 0.4, 0.07, 0.32, 0, -0.18, 0.04, 'wolf_collar', fur([200, 40, 40], 3)); m.collar.visible = false; m.onTamed = () => { if (m.collar) m.collar.visible = true; m.maxHp = 40; }; } };
MOBS.wolf.tick = (m, dt) => petTick(m, dt, { fights: true, dmg: 4 });
// wild wolves hunt skeletons, and skeletons keep away from wolves
{ const _wt = MOBS.wolf.tick; MOBS.wolf.tick = function (m, dt) { if (_wt(m, dt)) return true; if (Math.random() < dt) { const s = G.mobs.find(o => (o.type === 'skeleton' || o.type === 'stray' || o.type === 'rabbit') && !o.dead && o.pos.distanceTo(m.pos) < 12); if (s) m.prey = s; } if (m.prey && !m.prey.dead && m.prey.pos.distanceTo(m.pos) < 16) { steerTo(m, m.prey.pos, 0.9); m.goalBoost = true; if (m.prey.pos.distanceTo(m.pos) < 1.5 && (m.atkCD || 0) <= 0) { m.atkCD = 1; m.prey.hurt(4, m.pos, 0.6); } } else m.prey = null; return false; }; }
// ---------- cats and ocelots ----------
const CAT_COATS = [[[60, 60, 64], [36, 36, 40]], [[226, 150, 80], [190, 110, 50]], [[150, 150, 150], [100, 100, 104]], [[240, 236, 230], [200, 196, 190]], [[110, 80, 60], [70, 50, 36]], [[236, 236, 236], [40, 40, 40]], [[200, 160, 120], [150, 110, 80]]];
function catModel(m, r, coat, spot, k) {
  QB(m, r, k, { body: [0.26, 0.26, 0.62, 0.42, 0], bodyP: fur(coat, 6, { speck: [spot, 0.25] }), head: [0.3, 0.26, 0.28, 0.52, 0.34, 0.02, 0.1], headP: fur(coat, 5, { extra: eyes([90, 200, 90], 3) }),
    snout: [0.14, 0.08, 0.06, -0.06, 0.26], snoutP: fur([236, 200, 190], 3), ears: [0.06, 0.08, 0.06, 0.09, 0.14, 0.08], legs: [0.08, 0.3, 0.07, 0.2], tail: [0.06, 0.5, 0.06, 0.48, -0.3, 0.6] });
}
MOBS.cat = { name: 'Cat', hp: 10, w: 0.6, h: 0.7, speed: 2.4, kind: 'passive', snd: 'chirp', variants: 7, egg: [[239, 200, 140], [158, 120, 90]], drops: [['string', 0, 2, 1]],
  build(m, r) { const v = pick(m, 7); const [c, s] = CAT_COATS[v]; catModel(m, r, c, s, 'cat' + v); m.collar = sbox(m, m.head, 0.32, 0.05, 0.3, 0, -0.14, 0.02, 'cat_collar', fur([200, 40, 40], 3)); m.collar.visible = false; m.onTamed = () => { if (m.collar) m.collar.visible = true; }; } };
MOBS.cat.tick = (m, dt) => petTick(m, dt, {});
MOBS.ocelot = { name: 'Ocelot', hp: 10, w: 0.6, h: 0.7, speed: 3.2, kind: 'passive', snd: 'chirp', egg: [[239, 222, 125], [86, 76, 54]], drops: [], build(m, r) { catModel(m, r, [230, 200, 110], [90, 70, 40], 'ocelot'); } };
// creepers and phantoms keep away from cats and ocelots
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { if ((this.type === 'creeper' || this.type === 'phantom') && !this.dead && Math.random() < dt * 4) { const c = G.mobs.find(o => (o.type === 'cat' || o.type === 'ocelot') && !o.dead && o.pos.distanceTo(this.pos) < 6); if (c) { this.flee = 2; this.fuse = 0; if (this.type === 'phantom') { this.swoop = false; this.vel.y += 4; } } } if ((this.type === 'creeper') && this.flee > 0) { const c = G.mobs.find(o => (o.type === 'cat' || o.type === 'ocelot') && !o.dead && o.pos.distanceTo(this.pos) < 8); if (c) { const a = Math.atan2(this.pos.x - c.pos.x, this.pos.z - c.pos.z); this.wYaw = a; this.wMove = 1; this.wT = 0.5; this.angry = 0; } } return _u.call(this, dt); }; }
// ---------- fox, rabbit ----------
MOBS.fox = { name: 'Fox', hp: 10, w: 0.6, h: 0.7, speed: 3.0, kind: 'passive', snd: 'chirp', variants: 2, egg: [[213, 178, 147], [204, 103, 25]], drops: [],
  build(m, r) { const v = pick(m, 2); const C = v ? [236, 236, 236] : [226, 120, 40], D = v ? [200, 200, 204] : [236, 236, 230];
    QB(m, r, 'fox' + v, { body: [0.36, 0.3, 0.6, 0.42, 0], bodyP: fur(C, 6, { bottom: D }), head: [0.4, 0.3, 0.3, 0.5, 0.36, 0.02, 0.1], headP: fur(C, 5, { extra: (f, set, fw, fh) => { eyes([20, 20, 20], 2)(f, set, fw); if (f === 'front') for (let x = 0; x < fw; x++) set(x, fh - 1, D); } }),
      snout: [0.16, 0.12, 0.14, -0.08, 0.3], snoutP: fur(D, 3, { extra: (f, set, fw) => { if (f === 'front') set(fw >> 1, 0, [20, 20, 20]); } }), ears: [0.1, 0.12, 0.04, 0.12, 0.15, 0.06], legs: [0.1, 0.28, 0.1, 0.2], legP: fur([40, 30, 26], 4),
      tail: [0.18, 0.6, 0.18, 0.46, -0.32, 1.1], tailP: fur(C, 6, { foot: [3, D] }) }); } };
MOBS.rabbit = { name: 'Rabbit', hp: 3, w: 0.4, h: 0.5, speed: 2.6, kind: 'passive', snd: 'chirp', variants: 5, egg: [[153, 92, 54], [115, 81, 59]], drops: [['rabbit_hide', 0, 1, 1], ['rabbit', 0, 1, 1], ['rabbit_foot', 1, 1, 0.1]],
  build(m, r) { const v = pick(m, 5); const C = [[150, 104, 70], [236, 236, 236], [40, 36, 36], [220, 200, 150], [120, 120, 120]][v];
    QB(m, r, 'rab' + v, { body: [0.28, 0.26, 0.4, 0.26, -0.02], bodyP: fur(C, 6), head: [0.26, 0.24, 0.24, 0.4, 0.2, 0.02, 0.08], headP: fur(C, 5, { extra: eyes([20, 20, 20], 2) }), ears: [0.06, 0.24, 0.03, 0.06, 0.12, 0], legs: [0.08, 0.14, 0.08, 0.14], tail: [0.12, 0.1, 0.1, 0.32, -0.22, 0], tailP: fur([240, 240, 240], 3) }); } };
MOBS.rabbit.tick = (m, dt) => { if (m.onGround && Math.hypot(m.vel.x, m.vel.z) > 0.3 && Math.random() < dt * 4) m.vel.y = 5.5; return false; };
// ---------- goat, polar bear, panda, mooshroom, armadillo, sniffer ----------
MOBS.goat = { name: 'Goat', hp: 10, w: 0.9, h: 1.3, speed: 2.0, kind: 'passive', snd: 'baa', grazer: true, egg: [[165, 147, 124], [85, 72, 60]], drops: [],
  build(m, r) { const G2 = [226, 222, 214]; QB(m, r, 'goat', { body: [0.56, 0.6, 0.86, 0.9, 0], bodyP: fur(G2, 8, { speck: [[200, 196, 188], 0.2] }), head: [0.32, 0.38, 0.5, 1.15, 0.42, 0.02, 0.14], headP: fur(G2, 6, { extra: eyes([40, 30, 20], 3) }), ears: [0.06, 0.14, 0.08, 0.2, 0.14, -0.05, 1.3], legs: [0.18, 0.62, 0.16, 0.28], legP: fur(G2, 6, { foot: [2, [60, 50, 40]] }), tail: [0.1, 0.18, 0.08, 1.1, -0.44, 0.4] });
    for (const s of [-1, 1]) { const hn = pivot(m.head, s * 0.1, 0.18, 0.02); hn.rotation.x = -0.5; sbox(m, hn, 0.07, 0.3, 0.07, 0, 0.15, 0, 'goat_horn', fur([190, 180, 160], 3)); }
    sbox(m, m.head, 0.1, 0.14, 0.06, 0, -0.26, 0.3, 'goat_beard', fur([240, 240, 236], 4)); } };
MOBS.goat.tick = (m, dt) => { if (m.hitH && m.onGround) m.vel.y = 10; return false; };
BREED_FOOD.goat = ['wheat']; TEMPT_FOOD.goat = ['wheat'];
MOBS.polar_bear = { name: 'Polar Bear', hp: 30, w: 1.4, h: 1.4, speed: 2.4, kind: 'neutral', dmg: 6, snd: 'grunt', egg: [[242, 242, 242], [149, 149, 148]], drops: [['cod', 0, 2, 0.75], ['salmon', 0, 2, 0.25]],
  build(m, r) { const PB = [238, 238, 234]; QB(m, r, 'pb', { body: [0.86, 0.86, 1.4, 0.98, -0.05], bodyP: fur(PB, 6, { speck: [[220, 220, 216], 0.2] }), head: [0.44, 0.44, 0.4, 1.12, 0.64, 0, 0.2], headP: fur(PB, 5, { extra: eyes([30, 30, 30], 3) }), snout: [0.24, 0.18, 0.18, -0.1, 0.46], snoutP: fur(PB, 3, { extra: (f, set, fw) => { if (f === 'front') { set(1, 0, [40, 40, 40]); set(fw - 2, 0, [40, 40, 40]); } } }), ears: [0.12, 0.1, 0.06, 0.18, 0.22, 0.12], legs: [0.36, 0.56, 0.24, 0.48] }); } };
MOBS.panda = { name: 'Panda', hp: 20, w: 1.3, h: 1.25, speed: 1.5, kind: 'passive', snd: 'grunt', egg: [[231, 231, 231], [27, 27, 34]], drops: [],
  build(m, r) { const W = [236, 236, 234], K = [36, 36, 40]; QB(m, r, 'panda', { body: [0.84, 0.82, 1.2, 0.86, 0], bodyP: fur(W, 4, { extra: (f, set, fw, fh) => { if (f === 'top' || f === 'bottom') return; for (let x = 0; x < fw; x++) for (let y = 0; y < fh; y++) if (y < fh * 0.45 && (f === 'front' || f === 'back' || x > fw * 0.15 && x < fw * 0.5)) set(x, y, K); } }), head: [0.6, 0.5, 0.5, 1.0, 0.62, 0, 0.18], headP: fur(W, 4, { extra: (f, set, fw) => { if (f !== 'front') return; for (const x of [1, 2, fw - 3, fw - 2]) for (const y of [3, 4]) set(x, y, K); set(2, 3, [240, 240, 240]); set(fw - 3, 3, [240, 240, 240]); } }), snout: [0.24, 0.16, 0.1, -0.12, 0.5], snoutP: fur(W, 3), ears: [0.14, 0.14, 0.06, 0.24, 0.22, 0.05], earP: fur(K, 3), legs: [0.3, 0.52, 0.28, 0.4], legP: fur(K, 4) }); } };
MOBS.mooshroom = { name: 'Mooshroom', hp: 10, w: 0.9, h: 1.4, speed: 1.2, kind: 'passive', snd: 'moo', grazer: true, egg: [[160, 13, 17], [183, 183, 183]], drops: [['raw_beef', 1, 3, 1], ['leather', 0, 2, 1]],
  build(m, r) { MOBS.cow.build(m, r); const tint = new THREE.Color(1.0, 0.45, 0.42); for (const mt of m.mats) mt[1] = tint; for (const [x, z] of [[-0.2, 0.2], [0.18, -0.25], [0, 0]]) { sbox(m, r, 0.04, 0.16, 0.04, x, 1.42, z, 'moo_stem', fur([220, 214, 200], 2)); sbox(m, r, 0.2, 0.08, 0.2, x, 1.52, z, 'moo_cap', fur([200, 40, 40], 3, { speck: [[240, 240, 230], 0.3] })); } } };
BREED_FOOD.mooshroom = ['wheat']; TEMPT_FOOD.mooshroom = ['wheat'];
MOBS.armadillo = { name: 'Armadillo', hp: 12, w: 0.7, h: 0.65, speed: 1.6, kind: 'passive', snd: 'chirp', egg: [[173, 113, 107], [130, 74, 72]], drops: [],
  build(m, r) { const A = [190, 120, 110], A2 = [150, 90, 84]; QB(m, r, 'arm', { body: [0.46, 0.38, 0.6, 0.38, 0], bodyP: fur(A, 5, { extra: (f, set, fw, fh) => { if (f === 'bottom') return; for (let x = 0; x < fw; x++) for (let y = 0; y < fh; y++) if ((x + (f === 'top' ? y : 0)) % 3 === 0) set(x, y, A2); } }), head: [0.16, 0.2, 0.26, 0.42, 0.32, -0.02, 0.1], headP: fur([200, 150, 130], 4, { extra: eyes([20, 20, 20], 2) }), ears: [0.08, 0.12, 0.03, 0.08, 0.1, -0.04, 0.6], legs: [0.1, 0.2, 0.14, 0.2], legP: fur([170, 110, 100], 3), tail: [0.06, 0.3, 0.06, 0.32, -0.3, 1.0] }); } };
MOBS.armadillo.tick = (m, dt) => { // rolls up when a player is close and moving fast, or when hurt
  const P = player; const scared = (m.hurtT > 0) || (!P.dead && P.pos.distanceTo(m.pos) < 3 && Math.hypot(P.vel.x, P.vel.z) > 3.5); m.rollT = scared ? 4 : Math.max(0, (m.rollT || 0) - dt);
  m.brushT = (m.brushT == null ? 300 + Math.random() * 300 : m.brushT) - dt; if (m.brushT <= 0 && !isClientMP()) { m.brushT = 300 + Math.random() * 300; dropItem(IT.armadillo_scute, 1, m.pos.x, m.pos.y + 0.3, m.pos.z, false); }
  if (m.rollT > 0) { m.vel.x *= 0.5; m.vel.z *= 0.5; m.body.scale.set(m.baseScale, m.baseScale * 0.8, m.baseScale * 0.75); if (m.head) m.head.visible = false; if (m.legs) m.legs.forEach(l => l.visible = false); m.wMove = 0; m.wT = 0.5; }
  else { m.body.scale.setScalar(m.baseScale); if (m.head) m.head.visible = true; if (m.legs) m.legs.forEach(l => l.visible = true); }
  return false;
};
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, na) { if (this.type === 'armadillo' && this.rollT > 0) dmg = Math.max(0, dmg - 4); return _h.call(this, dmg, src, kb, na); }; }
BREED_FOOD.armadillo = ['spider_eye']; TEMPT_FOOD.armadillo = ['spider_eye'];
MOBS.sniffer = { name: 'Sniffer', hp: 14, w: 1.9, h: 1.75, speed: 1.0, kind: 'passive', snd: 'grunt', egg: [[135, 26, 24], [43, 173, 168]], drops: [],
  build(m, r) { const SN = [150, 40, 34], MO = [70, 140, 60]; QB(m, r, 'snf', { body: [1.3, 1.1, 1.8, 1.2, 0], bodyP: fur(SN, 7, { topRows: [3, MO], speck: [[120, 30, 26], 0.2] }), head: [0.8, 0.7, 0.7, 1.2, 0.95, -0.1, 0.3], headP: fur(SN, 6, { extra: eyes([20, 20, 20], 2, 2) }), snout: [0.8, 0.3, 0.3, -0.42, 0.62], snoutP: fur([210, 140, 110], 4), ears: [0.1, 0.3, 0.3, 0.42, -0.1, 0, 0.3], legs: [0.36, 0.7, 0.42, 0.62], legP: fur([110, 30, 26], 5) }); } };
// ---------- llama, donkey, mule, camel ----------
const LLAMA_COATS = [[220, 210, 180], [240, 240, 236], [120, 90, 60], [160, 130, 100]];
MOBS.llama = { name: 'Llama', hp: 22, w: 0.9, h: 1.87, speed: 2.0, kind: 'passive', snd: 'baa', variants: 4, persist: true, egg: [[194, 168, 112], [153, 90, 64]], drops: [['leather', 0, 2, 1]],
  build(m, r) { const v = pick(m, 4); const C = LLAMA_COATS[v]; QB(m, r, 'llama' + v, { body: [0.6, 0.62, 1.1, 1.1, -0.05], bodyP: fur(C, 8, { speck: [shadeC(C, 0.9), 0.3] }), head: [0.3, 0.9, 0.36, 1.3, 0.48, 0.42, 0.06], headP: fur(C, 6, { extra: (f, set, fw, fh) => { if (f === 'front') { set(1, 2, [30, 30, 30]); set(fw - 2, 2, [30, 30, 30]); } } }), snout: [0.24, 0.2, 0.24, 0.72, 0.28], ears: [0.08, 0.16, 0.06, 0.1, 0.9, 0.04], legs: [0.2, 0.8, 0.18, 0.4], tail: [0.12, 0.2, 0.1, 1.3, -0.56, 0.6] }); } };
MOBS.llama.tick = (m, dt) => { // spits at whoever hurt it
  if (m.angry > 0 && G.player && !G.player.dead && isSurv()) { m.spitT = (m.spitT || 0) - dt; const d = m.pos.distanceTo(G.player.pos); if (m.spitT <= 0 && d < 12) { m.spitT = 2; const from = new V3(m.pos.x, m.pos.y + 1.7, m.pos.z); const p = fireAt('spit', from, G.player.eye(), 18, 'mob', 1, m); p.cause = 'a Llama'; Sfx.at('squish', m.pos, 0.5); } m.wMove = 0; m.wT = 0.3; lookAtP(m, G.player, dt); }
  return false;
};
BREED_FOOD.llama = ['hay_block']; TEMPT_FOOD.llama = ['hay_block'];
HORSE_COATS.push(['Donkey', [134, 120, 104], [110, 98, 84]], ['Mule', [92, 62, 42], [70, 46, 30]]);
function equine(key, name, coat, spd, jmp, egg) {
  MOBS[key] = Object.assign({}, MOBS.horse, { name, egg, earH: 0.34, genes: () => ({ c: coat, mk: 0 }), build(m, r) { const o = m.opts || (m.opts = {}); const g = o.rec && o.rec.h ? Object.assign(rollHorse(), o.rec.h, { c: coat, mk: 0 }) : Object.assign(rollHorse(), o.genes || {}, { c: coat, mk: 0 }); if (!o.genes && !(o.rec && o.rec.h)) { g.spd = spd; g.jmp = jmp; } o.genes = g; if (o.rec) o.rec.h = g; MOBS.horse.build.call(this, m, r); m.body.scale.setScalar(0.88); m.baseScale = 0.88; } });
}
equine('donkey', 'Donkey', 7, 7.5, 0.5, [83, 71, 59], [133, 121, 107]); MOBS.donkey.egg = [[83, 71, 59], [133, 121, 107]];
equine('mule', 'Mule', 8, 7.5, 0.5); MOBS.mule.egg = [[27, 2, 0], [81, 51, 29]];
BREED_FOOD.donkey = ['golden_carrot', 'golden_apple']; BREED_FOOD.mule = []; MOB_XP.donkey = MOB_XP.mule = [1, 3];
// longer ears for donkeys and mules
{ const _b = MOBS.horse.build; MOBS.horse.build = function (m, r) { _b.call(this, m, r); if (m.t.earH) for (const c of m.head.children) if (c.isMesh && Math.abs(c.position.y - 0.86) < 0.01) { c.scale.y = m.t.earH / 0.19; c.position.y = 0.86 + (m.t.earH - 0.19) / 2; } }; }
MOBS.camel = Object.assign({}, MOBS.horse, { name: 'Camel', hp: 32, w: 1.7, h: 2.375, speed: 1.6, egg: [[252, 197, 101], [203, 145, 70]], grazer: false,
  genes: () => ({ c: 0, mk: 0, hp: 32, spd: 4.2, jmp: 0.42, tamed: 1 }),
  build(m, r) { const C = [232, 190, 120], C2 = [210, 160, 96]; const o = m.opts || {}; m.hg = Object.assign(rollHorse(), o.rec && o.rec.h ? o.rec.h : {}, { hp: 32, spd: 4.2, jmp: 0.42, tamed: 1, c: 0, mk: 0 });
    sbox(m, r, 0.9, 0.7, 1.6, 0, 1.65, 0, 'cml_body', fur(C, 6, { bottom: C2 })); sbox(m, r, 0.6, 0.45, 0.7, 0, 2.2, -0.05, 'cml_hump', fur(C2, 6));
    m.legs = quadLegs(m, r, 0.3, 1.3, 0.28, 0.6, 'cml_leg', fur(C, 5, { foot: [2, [180, 140, 90]] }));
    const neck = pivot(r, 0, 1.75, 0.75); neck.rotation.x = 0.25; const hp = pivot(neck, 0, 0, 0); m.head = hp; m.neck = neck;
    sbox(m, hp, 0.38, 0.95, 0.38, 0, 0.45, 0.05, 'cml_neck', fur(C, 6)); sbox(m, hp, 0.42, 0.4, 0.75, 0, 0.98, 0.28, 'cml_head', fur(C, 5, { extra: (f, set, fw) => { if (f === 'left' || f === 'right') set(f === 'left' ? 3 : fw - 4, 2, [30, 26, 20]); } }));
    for (const s of [-1, 1]) sbox(m, hp, 0.1, 0.06, 0.18, s * 0.24, 1.12, 0.08, 'cml_ear', fur(C2, 3));
    m.tail = pivot(r, 0, 1.85, -0.8); m.tail.rotation.x = 0.3; sbox(m, m.tail, 0.1, 0.6, 0.1, 0, -0.3, 0, 'cml_tail', fur(C2, 4));
    const LE = [116, 66, 34]; m.saddleParts = [sbox(m, r, 0.95, 0.12, 0.9, 0, 2.08, 0.15, 'cml_saddle', fur(LE, 5)), sbox(m, r, 0.98, 0.5, 0.12, 0, 1.9, 0.15, 'cml_girth', fur([86, 46, 22], 4))]; m.reins = []; for (const p of m.saddleParts) p.visible = false; m.armorParts = []; m.horseBody = r; } });
BREED_FOOD.camel = ['cactus']; TEMPT_FOOD.camel = ['cactus']; MOB_XP.camel = [1, 3];
// camels sit a rider higher
{ const _so = seatOnHorse; seatOnHorse = function (P, m) { _so(P, m); if (m.type === 'camel') P.pos.y += 0.9; }; }
// ---------- golems ----------
MOBS.iron_golem = { name: 'Iron Golem', hp: 100, w: 1.4, h: 2.7, speed: 1.5, kind: 'neutral', dmg: 14, kb: 2.5, snd: 'grunt', persist: true, egg: [[219, 205, 193], [116, 160, 76]], drops: [['iron_ingot', 3, 5, 1], ['rose', 0, 2, 1]],
  build(m, r) { const IG = [214, 206, 196], VN = [90, 140, 60]; sbox(m, r, 1.1, 0.9, 0.7, 0, 1.75, 0, 'ig_chest', fur(IG, 7, { speck: [VN, 0.08] })); sbox(m, r, 0.6, 0.5, 0.45, 0, 1.08, 0, 'ig_hip', fur(IG, 7));
    const h = pivot(r, 0, 2.2, 0.05); m.head = h; sbox(m, h, 0.5, 0.62, 0.5, 0, 0.28, 0, 'ig_head', fur(IG, 6, { extra: (f, set, fw) => { if (f === 'front') { for (let x = 1; x < fw - 1; x++) set(x, 3, [160, 150, 140]); set(2, 4, [200, 40, 30]); set(fw - 3, 4, [200, 40, 30]); } } })); sbox(m, h, 0.12, 0.25, 0.12, 0, 0.1, 0.3, 'ig_nose', fur(IG, 3));
    m.arms = []; for (const s of [-1, 1]) { const a = pivot(r, s * 0.7, 2.1, 0); sbox(m, a, 0.3, 1.8, 0.38, 0, -0.85, 0, 'ig_arm', fur(IG, 7, { speck: [VN, 0.12] })); m.arms.push(a); }
    m.legs = []; for (const s of [-1, 1]) { const l = pivot(r, s * 0.25, 1.0, 0); sbox(m, l, 0.4, 1.0, 0.36, 0, -0.5, 0, 'ig_leg', fur(IG, 7)); m.legs.push(l); } } };
MOBS.iron_golem.tick = (m, dt) => { // protects villagers: fights hostile mobs nearby
  if (m.angry > 0) return false;
  const foe = G.mobs.find(o => !o.dead && o !== m && (o.t.kind === 'hostile' && o.type !== 'creeper') && o.pos.distanceTo(m.pos) < 16);
  if (!foe) return false; steerTo(m, foe.pos, 1 + foe.hw); m.goalBoost = true; m.atkCD = (m.atkCD || 0) - dt;
  if (m.pos.distanceTo(foe.pos) < 2.2 + foe.hw && m.atkCD <= 0) { m.atkCD = 1.2; foe.hurt(7 + Math.random() * 14, m.pos, 1.5); foe.vel.y = 7; m.armSwing = 0.5; if (m.arms) for (const a of m.arms) a.rotation.x = -1.5; Sfx.at('grunt', m.pos, 0.6, 0.6); }
  return false;
};
MOBS.snow_golem = { name: 'Snow Golem', hp: 4, w: 0.7, h: 1.9, speed: 1.6, kind: 'passive', snd: 'chirp', persist: true, egg: [[217, 242, 242], [129, 166, 166]], drops: [],
  build(m, r) { const SN = [240, 246, 250]; sbox(m, r, 0.62, 0.62, 0.62, 0, 0.31, 0, 'sg_bot', fur(SN, 4)); sbox(m, r, 0.5, 0.5, 0.5, 0, 0.86, 0, 'sg_mid', fur(SN, 4));
    const h = pivot(r, 0, 1.12, 0); m.head = h; sbox(m, h, 0.5, 0.5, 0.5, 0, 0.25, 0, 'sg_head', fur([214, 120, 30], 6, { extra: (f, set, fw) => { if (f === 'front') { set(2, 3, [255, 220, 80]); set(fw - 3, 3, [255, 220, 80]); for (let x = 2; x < fw - 2; x++) set(x, 5, [255, 220, 80]); } } }));
    for (const s of [-1, 1]) { const a = pivot(r, s * 0.25, 0.95, 0); a.rotation.z = s * -1.1; sbox(m, a, 0.06, 0.5, 0.06, 0, 0.25, 0, 'sg_arm', fur([110, 76, 46], 3)); } } };
MOBS.snow_golem.tick = (m, dt) => { // throws snowballs at monsters, melts in hot or wet places, leaves snow
  m.ballT = (m.ballT || 1) - dt; const foe = G.mobs.find(o => !o.dead && o.t.kind === 'hostile' && o.pos.distanceTo(m.pos) < 10);
  if (foe && m.ballT <= 0) { m.ballT = 1; const p = fireAt('smallfire', new V3(m.pos.x, m.pos.y + 1.3, m.pos.z), foe.pos.clone().add(new V3(0, foe.h / 2, 0)), 16, 'golem', 0, m); p.mesh.material = new THREE.MeshBasicMaterial({ color: 0xf4f8ff }); p.snow = true; }
  if (inWater(m, 0.4) && Math.random() < dt) m.hurt(1, null, 0, true);
  return false;
};
// golem snowballs knock monsters back (3 damage to blazes)
{ const _up = updateProjectiles; updateProjectiles = function (dt) { for (const a of G.projectiles) if (a.owner === 'golem' && !a.done) { for (const m of G.mobs) if (!m.dead && m !== a.src && m.t.kind !== 'passive' && hitsMob(m, a.pos, 0.2)) { m.hurt(m.type === 'blaze' ? 3 : 0, a.pos.clone(), 0.5, true); a.done = true; Particles.emit(a.pos.x, a.pos.y, a.pos.z, 6, [[1, 1, 1]], 2, 0.4, 8, 0.3); break; } if (!a.done && G.world.solid(Math.floor(a.pos.x), Math.floor(a.pos.y), Math.floor(a.pos.z))) a.done = true; } return _up.apply(this, arguments); }; }
// ---------- flyers: bats, parrots, bees, allays ----------
function flyTick(m, dt, o) {
  m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.lightT -= dt; if (m.lightT <= 0) { m.lightT = 0.3; m.light = Math.max(G.minLight || 0, G.world.lightAt(m.pos.x, m.pos.y, m.pos.z, G.daylight)); }
  if (m.sitting) { m.vel.set(0, Math.max(m.vel.y - 20 * dt, -10), 0); moveEntity(m, dt); m.root.position.copy(m.pos); m.colorize(); if (m.wings) m.wings.forEach(w => w.rotation.z = 0); return true; }
  m.flyT = (m.flyT || 0) - dt; if (!m.home) m.home = m.pos.clone();
  if (m.flyT <= 0 || !m.flyGoal) { m.flyT = 1 + Math.random() * 3; const c = o.follow && o.follow() ? o.follow() : m.home; m.flyGoal = new V3(c.x + (Math.random() - 0.5) * o.range, c.y + 1 + Math.random() * o.up, c.z + (Math.random() - 0.5) * o.range); }
  const want = m.flyGoal.clone().sub(m.pos); const L = want.length(); want.multiplyScalar(Math.min(o.speed, L * 2) / Math.max(L, 0.01));
  if (m.hurtT > 0) want.y += 3; const k = Math.min(1, dt * 3); m.vel.lerp(want, k); moveEntity(m, dt); if (m.hitH) m.flyT = 0;
  m.yaw += angWrap(Math.atan2(m.vel.x, m.vel.z) - m.yaw) * Math.min(1, dt * 6); m.root.position.copy(m.pos); m.root.rotation.y = m.yaw;
  if (m.wings) m.wings.forEach((w, i) => w.rotation.z = Math.sin(m.age * o.flap) * 0.7 * (i ? -1 : 1)); m.colorize();
  m.sndT -= dt; if (m.sndT <= 0) { m.sndT = 4 + Math.random() * 8; if (m.pos.distanceTo(player.pos) < 16) Sfx.mob(m, null, 0.3); }
  return true;
}
const wingPair = (m, r, k, w, h, d, y, x, col) => { m.wings = []; for (const s of [-1, 1]) { const p = pivot(r, s * x, y, 0); sbox(m, p, w, h, d, s * w / 2, 0, 0, k + '_wing', fur(col, 5)); m.wings.push(p); } };
MOBS.bat = { name: 'Bat', hp: 6, w: 0.5, h: 0.9, speed: 3, kind: 'passive', snd: 'chirp', egg: [[76, 62, 48], [15, 15, 15]], drops: [],
  build(m, r) { const BT = [76, 62, 48]; sbox(m, r, 0.2, 0.3, 0.16, 0, 0.5, 0, 'bat_body', fur(BT, 6)); const h = pivot(r, 0, 0.7, 0); m.head = h; sbox(m, h, 0.24, 0.2, 0.2, 0, 0.08, 0, 'bat_head', fur(BT, 5, { extra: eyes([20, 20, 20], 1) })); for (const s of [-1, 1]) sbox(m, h, 0.06, 0.1, 0.04, s * 0.08, 0.22, 0, 'bat_ear', fur(BT, 3)); wingPair(m, r, 'bat', 0.42, 0.3, 0.03, 0.58, 0.08, [40, 32, 26]); } };
MOBS.bat.tick = (m, dt) => flyTick(m, dt, { range: 10, up: 4, speed: 4, flap: 26 });
MOB_PITCH.bat = 2.2;
const PARROT = [[220, 40, 40], [40, 120, 220], [100, 200, 60], [60, 200, 220], [170, 170, 170]];
MOBS.parrot = { name: 'Parrot', hp: 6, w: 0.5, h: 0.9, speed: 2, kind: 'passive', snd: 'chirp', variants: 5, persist: true, egg: [[13, 162, 249], [255, 0, 0]], drops: [['feather', 1, 2, 1]],
  build(m, r) { const v = pick(m, 5); const C = PARROT[v]; sbox(m, r, 0.24, 0.36, 0.24, 0, 0.36, 0, 'par_body' + v, fur(C, 6)); const h = pivot(r, 0, 0.6, 0.02); m.head = h; sbox(m, h, 0.2, 0.22, 0.2, 0, 0.1, 0, 'par_head' + v, fur(C, 5, { extra: eyes([20, 20, 20], 2) })); sbox(m, h, 0.08, 0.12, 0.1, 0, 0.04, 0.14, 'par_beak', fur([60, 60, 60], 3)); sbox(m, r, 0.14, 0.3, 0.06, 0, 0.2, -0.14, 'par_tail' + v, fur(C, 4)); wingPair(m, r, 'par' + v, 0.06, 0.3, 0.22, 0.4, 0.14, shadeC(C, 0.8)); for (const w of m.wings) w.children[0].position.set(0, -0.05, 0); m.legs = []; for (const x of [-0.05, 0.05]) { const p = pivot(r, x, 0.18, 0); sbox(m, p, 0.04, 0.18, 0.04, 0, -0.09, 0, 'par_leg', fur([80, 80, 80], 2)); m.legs.push(p); } } };
MOBS.parrot.tick = (m, dt) => flyTick(m, dt, { range: 8, up: 3, speed: 3, flap: 20, follow: () => m.tamed && isOwner(m) ? player.pos : null });
MOBS.bee = { name: 'Bee', hp: 10, w: 0.7, h: 0.6, speed: 2, kind: 'neutral', dmg: 2, snd: 'chirp', egg: [[237, 192, 81], [67, 36, 31]], drops: [],
  build(m, r) { sbox(m, r, 0.42, 0.42, 0.6, 0, 0.32, 0, 'bee_body', fur([236, 190, 70], 4, { extra: (f, set, fw, fh) => { if (f === 'front' || f === 'back') return; for (let x = 0; x < fw; x++) for (let y = 0; y < fh; y++) if ((f === 'top' || f === 'bottom' ? y : x) % 4 === 1) set(x, y, [60, 34, 26]); } }));
    const h = pivot(r, 0, 0.32, 0.3); m.head = h; sbox(m, h, 0.4, 0.4, 0.02, 0, 0, 0, 'bee_face', fur([236, 190, 70], 3, { extra: (f, set, fw) => { if (f === 'front') { set(1, 2, [30, 30, 40]); set(fw - 2, 2, [30, 30, 40]); } } })); wingPair(m, r, 'bee', 0.3, 0.02, 0.24, 0.56, 0.02, [220, 236, 250]); } };
MOBS.bee.tick = (m, dt) => { if (m.angry > 0 && !m.stung && G.player && !G.player.dead) { const P = G.player; const want = P.pos.clone().add(new V3(0, 1, 0)).sub(m.pos); const L = want.length(); if (L < 0.9) { m.stung = true; P.hurt(2, m.pos, 'a Bee', 0.3); if (S.difficulty !== 'easy') giveEffect('poison', S.difficulty === 'hard' ? 18 : 10, 0); setTimeout(() => { if (!m.dead) m.hurt(99, null, 0, true); }, 30000); } m.flyGoal = P.pos.clone().add(new V3(0, 1, 0)); m.flyT = 0.5; }
  return flyTick(m, dt, { range: 12, up: 3, speed: m.angry > 0 ? 6 : 3, flap: 40 }); };
MOBS.allay = { name: 'Allay', hp: 20, w: 0.35, h: 0.6, speed: 3, kind: 'passive', snd: 'chirp', persist: true, egg: [[0, 218, 255], [0, 173, 255]], drops: [],
  build(m, r) { const A = [110, 220, 255]; sbox(m, r, 0.2, 0.24, 0.14, 0, 0.3, 0, 'al_body', fur(A, 5)); const h = pivot(r, 0, 0.42, 0); m.head = h; sbox(m, h, 0.3, 0.3, 0.3, 0, 0.15, 0, 'al_head', fur(A, 5, { extra: eyes([20, 40, 80], 3) })); wingPair(m, r, 'al', 0.3, 0.3, 0.02, 0.4, 0.06, [220, 246, 255]); for (const mt of m.mats) { mt[0].transparent = true; mt[0].opacity = 0.85; } } };
// an allay you hand an item to brings you matching items it finds nearby
MOBS.allay.tick = (m, dt) => { const r = flyTick(m, dt, { range: 6, up: 2, speed: 4, flap: 18, follow: () => m.friend ? player.pos : null });
  if (m.wants && !isClientMP()) { m.seekT = (m.seekT || 0) - dt; if (m.seekT <= 0) { m.seekT = 0.5; const it = G.items.find(i => !i.gone && i.id === m.wants && i.pos.distanceTo(m.pos) < 32); if (it) { m.flyGoal = it.pos.clone(); m.flyT = 1; if (it.pos.distanceTo(m.pos) < 1.2) { it.pos.copy(player.pos).add(new V3(0, 1, 0)); it.vel.set(0, 0, 0); } } } }
  return r; };
{ const _mi = mobInteract; mobInteract = function (m, sneaking) { if (m.type === 'allay') { const h = player.held(); if (h) { m.wants = h.id; m.friend = true; hearts(m, 3); toast('The allay will collect ' + ITEMS[h.id].name, 1.5); } else { m.wants = null; } return true; } return _mi(m, sneaking); }; }
// ---------- frogs ----------
const FROG = [[200, 120, 60], [70, 140, 70], [210, 210, 200]];
MOBS.frog = { name: 'Frog', hp: 10, w: 0.5, h: 0.5, speed: 1.8, kind: 'passive', snd: 'chirp', variants: 3, egg: [[213, 120, 64], [255, 200, 120]], drops: [],
  build(m, r) { const v = pick(m, 3); const C = FROG[v]; sbox(m, r, 0.44, 0.24, 0.5, 0, 0.18, 0, 'frog_body' + v, fur(C, 5, { bottom: [230, 220, 190] })); const h = pivot(r, 0, 0.32, 0.12); m.head = h; sbox(m, h, 0.46, 0.18, 0.4, 0, 0.04, 0.06, 'frog_head' + v, fur(C, 5)); for (const s of [-1, 1]) sbox(m, h, 0.12, 0.1, 0.12, s * 0.14, 0.15, 0.08, 'frog_eye', fur([240, 240, 230], 2, { extra: (f, set) => { if (f === 'front') set(0, 0, [20, 20, 20]); } })); m.legs = quadLegs(m, r, 0.1, 0.12, 0.18, 0.18, 'frog_leg' + v, fur(C, 4)); } };
MOBS.frog.tick = (m, dt) => { if (m.onGround && Math.hypot(m.vel.x, m.vel.z) > 0.3 && Math.random() < dt * 2) m.vel.y = 6; const prey = Math.random() < dt * 2 ? G.mobs.find(o => o.type === 'slime' && o.size === 1 && !o.dead && o.pos.distanceTo(m.pos) < 3) : null; if (prey) { prey.hurt(99, m.pos, 0, true); if (!isClientMP()) dropItem(IT.slime_ball, 1, m.pos.x, m.pos.y + 0.3, m.pos.z); } return false; };
BREED_FOOD.frog = ['slime_ball']; TEMPT_FOOD.frog = ['slime_ball'];
// ---------- breeding foods, tempting, sounds, xp ----------
Object.assign(BREED_FOOD, { wolf: PET_HEAL.wolf, cat: ['cod', 'salmon'], ocelot: ['cod', 'salmon'], fox: ['sweet_berries'], rabbit: ['carrot', 'golden_carrot', 'dandelion'], panda: ['bamboo'], polar_bear: [], bee: ['rose', 'dandelion'], parrot: [], allay: [], bat: [], iron_golem: [], snow_golem: [], sniffer: ['torchflower_seeds'] });
Object.assign(TEMPT_FOOD, { rabbit: ['carrot', 'golden_carrot', 'dandelion'], ocelot: ['cod', 'salmon'], bee: ['rose', 'dandelion'], cat: ['cod', 'salmon'] });
for (const k of ['wolf', 'cat', 'ocelot', 'fox', 'rabbit', 'goat', 'polar_bear', 'panda', 'mooshroom', 'armadillo', 'sniffer', 'llama', 'bat', 'parrot', 'bee', 'allay', 'frog']) if (!MOB_XP[k]) MOB_XP[k] = [1, 3];
MOB_XP.iron_golem = [0, 0]; MOB_XP.snow_golem = [0, 0]; MOB_XP.bat = [0, 0];
Object.assign(MOB_PITCH, { cat: 1.6, ocelot: 1.5, fox: 1.4, rabbit: 2, wolf: 1.2, goat: 1.2, polar_bear: 0.7, panda: 0.8, llama: 1.1, parrot: 1.8, bee: 2.2, allay: 2, frog: 1.6, armadillo: 1.8, sniffer: 0.6, iron_golem: 0.5 });
MOBS.sheep.drops = [['wool', 1, 1, 1], ['mutton', 1, 2, 1]];
{ const _dl = Mob.prototype.dropLoot; Mob.prototype.dropLoot = function () { if (this.type === 'sheep' && this.sheared && !this.baby) { const t = this.t; const d = t.drops; t.drops = d.filter(x => x[0] !== 'wool'); try { return _dl.apply(this, arguments); } finally { t.drops = d; } } return _dl.apply(this, arguments); }; }
// ---------- bone meal: grows crops (2-5 stages), saplings-free grass sprouts flowers ----------
{ const _fu = farmUse; farmUse = function (h, hd) {
    if (hd && hd.kind === 'bonemeal' && target) { const id = target.id; const d = BL[id];
      if (d.crop !== undefined) { if (d.crop >= 3) return false; const n = Math.min(3, d.crop + 2 + (Math.random() * 4 | 0)); const nid = B[(d.cropBase || 'wheat_').toUpperCase() + n]; world.set(target.x, target.y, target.z, nid); mpBlock(target.x, target.y, target.z, nid); }
      else if (id === B.GRASS) { for (let k = 0; k < 14; k++) { const x = target.x + Math.round((Math.random() - 0.5) * 6), z = target.z + Math.round((Math.random() - 0.5) * 6); for (let dy = 1; dy >= -1; dy--) { const y = target.y + dy; if (world.get(x, y, z) === B.GRASS && !world.get(x, y + 1, z)) { const f = Math.random() < 0.8 ? B.TALL_GRASS : Math.random() < 0.5 ? B.ROSE : B.DANDELION; world.set(x, y + 1, z, f); mpBlock(x, y + 1, z, f); break; } } } }
      else if (id === B.SUGAR_CANE || id === B.CACTUS) return false; else return false;
      useHeld(1); S.swing = 1; S.useCD = 0.2; Particles.emit(target.x + 0.5, target.y + 1, target.z + 0.5, 10, [[0.4, 0.9, 0.4], [0.7, 1, 0.6]], 1.5, 0.8, -1, 0.8); return true; }
    return _fu(h, hd);
  }; }
// ---------- where they live (when a chunk is first made) and villages' iron golems ----------
{ const _og = onChunkGen; onChunkGen = function (c, hints, cols, w) {
    _og(c, hints, cols, w); if (w !== world || !cols || w.dim !== 'overworld') return;
    if (hints.some(h => h[0] === 'villager') && Math.random() < 0.15) { const v = hints.find(h => h[0] === 'villager'); spawnMob('cat', v[1] - 1, v[2], v[3]); }
    if (G.mobs.filter(m => m.t.kind === 'passive').length > 60 || Math.random() > 0.08) return;
    const lx = 3 + (Math.random() * 10 | 0), lz = 3 + (Math.random() * 10 | 0); const col = cols[lz * 16 + lx]; let tab = null;
    if (col.b === BIO.SNOWY) tab = { rabbit: 3, fox: 3, polar_bear: 1, wolf: 1 };
    else if (col.b === BIO.DESERT) tab = { rabbit: 1, camel: 1 };
    else if (col.b === BIO.FOREST) tab = { wolf: 1, rabbit: 2, fox: 1 };
    else if (col.b === BIO.MOUNTAINS) tab = col.h > SEA + 40 ? { goat: 4, llama: 2 } : { llama: 2, rabbit: 1 };
    else if (col.b === BIO.PLAINS) tab = { donkey: 1, rabbit: 2 };
    else if (col.b === BIO.BEACH) tab = { turtle: 1 };
    if (!tab) return; const type = pickWeighted(tab); if (!MOBS[type]) return;
    const n = { wolf: 4, rabbit: 2 + (Math.random() * 2 | 0), fox: 2, goat: 3, llama: 4, camel: 1, polar_bear: 2, donkey: 2, turtle: 4 }[type] || 2;
    for (let i = 0; i < n; i++) { const x = c.cx * 16 + clamp(lx + (Math.random() * 5 | 0) - 2, 0, 15), z = c.cz * 16 + clamp(lz + (Math.random() * 5 | 0) - 2, 0, 15); const y = surfaceSpawnY(x, z); if (y > SEA && freeAt(x, y, z, 2) && animalLightOk(x, y, z)) { const m = spawnMob(type, x + 0.5, y, z + 0.5); if (type === 'fox' && col.b === BIO.SNOWY) { /* snow foxes */ } if (Math.random() < 0.1 && BREED_FOOD[type]) setBaby(m, true); } }
  };
  world && (world.onChunkGen = onChunkGen); }
// bats in dark caves
{ const _us = updateSpawning; updateSpawning = function (dt) { const r = _us.apply(this, arguments); if (world && world.dim === 'overworld' && !isClientMP() && S.rules.doMobSpawning && Math.random() < 0.15 && G.mobs.filter(m => m.type === 'bat').length < 5) { const P = player.pos; const x = Math.floor(P.x + (Math.random() - 0.5) * 40), z = Math.floor(P.z + (Math.random() - 0.5) * 40), y = Math.floor(P.y + (Math.random() - 0.5) * 20); if (world.loaded(x, z) && y < SEA - 4 && freeAt(x, y, z, 2) && lightLevels(x, y, z).total <= 3 && world.skyAt(x, y, z) < 0.3) spawnMob('bat', x + 0.5, y, z + 0.5); } return r; }; }
