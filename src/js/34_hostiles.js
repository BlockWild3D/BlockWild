// ================= MORE HOSTILE MOBS (Minecraft) =================
// Husk (deserts, no burning, Hunger on hit), Stray (snowy places, Slowness arrows), Bogged (Poison arrows), Cave
// Spider (Poison bite), Witch (splash potions, drinks to heal), Slime (slime chunks below y 40, splits), Phantom
// (after 3 nights without sleep), Silverfish (infested stone in mountains and strongholds), Endermite (from ender
// pearls), Zombie Villager, Pillager (crossbow, at watchtowers), Vindicator (axe), Evoker (fangs, vexes, Totem
// of Undying), Vex, Ravager, Breeze (wind charges). Also: the Mace (smash attacks), wind charges, Totem of Undying.

// ---------- shared helpers ----------
const ILL_SKIN = [150, 156, 150], ILL_DARK = [52, 56, 62];
function illagerModel(m, r, k, coat, coatDark, opt = {}) {
  const head = fur(ILL_SKIN, 5, { extra: (f, set, fw, fh) => { if (f === 'top') return; if (f === 'front') { for (let x = 1; x < fw - 1; x++) set(x, 2, [60, 56, 54]); set(1, 3, WHT); set(2, 3, opt.eye || [40, 90, 60]); set(fw - 3, 3, opt.eye || [40, 90, 60]); set(fw - 2, 3, WHT); for (let x = 2; x < fw - 2; x++) set(x, 7, [96, 96, 96]); } if (f !== 'front' && f !== 'bottom') for (let x = 0; x < fw; x++) set(x, 0, [44, 42, 40]); } });
  const body = fur(coat, 6, { extra: (f, set, fw, fh) => { if (f === 'top' || f === 'bottom') return; for (let x = 0; x < fw; x++) { set(x, 5, coatDark); set(x, fh - 1, coatDark); } if (f === 'front') for (let y = 6; y < fh; y++) set(fw >> 1, y, coatDark); } });
  humanoidS(m, r, k, { head, body, arm: fur(coat, 6, { foot: [2, ILL_SKIN] }), leg: fur(opt.legs || [40, 42, 48], 6, { foot: [2, [30, 30, 34]] }) }, false);
  sbox(m, m.head, 0.12, 0.25, 0.12, 0, 0.12, 0.3, k + '_nose', fur([138, 142, 138], 4));
}
function lookAtP(m, P, dt) { const dx = P.pos.x - m.pos.x, dz = P.pos.z - m.pos.z; m.yaw += angWrap(Math.atan2(dx, dz) - m.yaw) * Math.min(1, dt * 8); }
function hostileTarget(m, range = 16) { const P = G.player; if (!P || P.dead || !isSurv() || P.isProxy && P.dead) return null; return P.pos.distanceTo(m.pos) < range ? P : null; }

// ---------- husk, stray, bogged, zombie villager ----------
const HUSK = [196, 172, 128];
MOBS.husk = { name: 'Husk', hp: 20, w: 0.65, h: 2.07, speed: 2.3, kind: 'hostile', dmg: 3, snd: 'groan', egg: [[121, 115, 97], [230, 204, 148]],
  drops: [['rotten_flesh', 0, 2, 1], ['iron_ingot', 1, 1, 0.025]], onHit(m, P) { giveEffect('hunger', 7, 0); },
  build(m, r) { humanoidS(m, r, 'husk', { head: fur(HUSK, 7, { speck: [[150, 130, 96], 0.14], extra: (f, set) => { if (f !== 'front') return; dots(set, [[1, 4], [2, 4], [5, 4], [6, 4]], [30, 24, 16]); dots(set, [[2, 6], [3, 6], [4, 6], [5, 6]], [120, 100, 70]); } }),
    body: fur([108, 90, 70], 7, { speck: [[86, 70, 52], 0.2] }), arm: fur(HUSK, 7, { topRows: [3, [108, 90, 70]] }), leg: fur([88, 78, 66], 6, { foot: [2, HUSK] }) }, true, 1.06); } };
const STRAY = [176, 196, 196];
MOBS.stray = { name: 'Stray', hp: 20, w: 0.6, h: 1.99, speed: 2.1, kind: 'hostile', dmg: 3, snd: 'rattle', burns: true, ranged: true, egg: [[97, 118, 118], [221, 234, 234]],
  drops: [['bone', 0, 2, 1], ['arrow', 0, 2, 1]],
  shoot(m, P) { shootArrow(new V3(m.pos.x, m.pos.y + 1.5, m.pos.z), P.eye().add(new V3(0, -0.3, 0)), 'mob', 3); const a = G.projectiles[G.projectiles.length - 1]; if (a) a.effect = ['slowness', 30, 0]; },
  build(m, r) { humanoidS(m, r, 'stray', skelPaints(STRAY, [40, 60, 64]), false, 1, { aw: 0.12, lw: 0.12, bw: 0.42, bd: 0.2, lx: 0.1 });
    sbox(m, r, 0.52, 0.8, 0.3, 0, 1.12, 0, 'stray_cloak', fur([96, 118, 116], 8, { speck: [[70, 90, 90], 0.2], extra: (f, set, fw, fh, rr) => { for (let x = 0; x < fw; x++) if (rr() < 0.5) set(x, fh - 1, [0, 0, 0, 0]); } }));
    const bow = pivot(m.arms[1], 0, -0.66, 0.1); sbox(m, bow, 0.05, 0.7, 0.05, 0, 0, 0, 'skel_bow', fur([110, 76, 42], 5)); } };
MOBS.bogged = { name: 'Bogged', hp: 16, w: 0.6, h: 1.99, speed: 2.1, kind: 'hostile', dmg: 3, snd: 'rattle', burns: true, ranged: true, egg: [[138, 152, 120], [55, 70, 44]],
  drops: [['bone', 0, 2, 1], ['arrow', 0, 2, 1]],
  shoot(m, P) { m.atkCD += 1.6; shootArrow(new V3(m.pos.x, m.pos.y + 1.5, m.pos.z), P.eye().add(new V3(0, -0.3, 0)), 'mob', 3); const a = G.projectiles[G.projectiles.length - 1]; if (a) a.effect = ['poison', 4, 0]; },
  build(m, r) { humanoidS(m, r, 'bog', skelPaints([170, 180, 140], [50, 64, 40]), false, 1, { aw: 0.12, lw: 0.12, bw: 0.42, bd: 0.2, lx: 0.1 });
    for (const [x, z, c] of [[-0.12, 0.05, [200, 60, 50]], [0.14, -0.08, [170, 130, 90]]]) { sbox(m, m.head, 0.04, 0.12, 0.04, x, 0.55, z, 'bog_stem', fur([220, 214, 190], 3)); sbox(m, m.head, 0.16, 0.07, 0.16, x, 0.63, z, 'bog_cap' + c[0], fur(c, 4)); }
    const bow = pivot(m.arms[1], 0, -0.66, 0.1); sbox(m, bow, 0.05, 0.7, 0.05, 0, 0, 0, 'skel_bow', fur([110, 76, 42], 5)); } };
MOBS.zombie_villager = { name: 'Zombie Villager', hp: 20, w: 0.6, h: 1.95, speed: 2.3, kind: 'hostile', dmg: 3, snd: 'groan', burns: true, egg: [[86, 60, 41], [121, 153, 101]],
  drops: [['rotten_flesh', 0, 2, 1], ['carrot', 1, 1, 0.025], ['potato', 1, 1, 0.025], ['iron_ingot', 1, 1, 0.025]],
  build(m, r) { const h = humanoidS(m, r, 'zvil', { body: fur(ROBE, 6, { speck: [[96, 66, 40], 0.2] }), arm: fur(ZG, 7, { topRows: [3, ROBE] }), leg: fur([84, 84, 88], 5, { foot: [2, ZG] }) }, true);
    sbox(m, h, 0.46, 0.55, 0.46, 0, 0.27, 0, 'zvil_head', fur(ZG, 6, { speck: [[68, 116, 52], 0.15], extra: (f, set, fw) => { if (f !== 'front') return; for (let x = 1; x < fw - 1; x++) set(x, 3, [50, 80, 40]); set(1, 4, [200, 30, 20]); set(fw - 2, 4, [200, 30, 20]); } }));
    sbox(m, h, 0.1, 0.22, 0.1, 0, 0.16, 0.28, 'zvil_nose', fur([80, 120, 60], 4)); } };
for (const k of ['husk', 'stray', 'bogged', 'zombie_villager']) { MOB_XP[k] = [5, 5]; UNDEAD.add(k); }
MOB_PITCH.husk = 0.85; MOB_PITCH.stray = 0.9; MOB_PITCH.bogged = 1.1; MOB_PITCH.zombie_villager = 1.05;

// ---------- cave spider, silverfish, endermite ----------
MOBS.cave_spider = { name: 'Cave Spider', hp: 12, w: 0.7, h: 0.5, speed: 3.1, kind: 'neutral', darkHostile: true, dmg: 2, snd: 'hissS', climbs: true, egg: [[12, 66, 76], [163, 0, 0]],
  drops: [['string', 0, 2, 1], ['spider_eye', 0, 1, 0.33]], onHit(m, P) { if (S.difficulty !== 'easy') giveEffect('poison', S.difficulty === 'hard' ? 15 : 7, 0); },
  build(m, r) { const g = pivot(r, 0, 0, 0); g.scale.setScalar(0.7); MOBS.spider.build(m, g); const tint = new THREE.Color(0.45, 0.78, 0.9); for (const mt of m.mats) if (!mt[2]) mt[1] = tint; } };
MOBS.spider.drops = [['string', 0, 2, 1], ['spider_eye', 0, 1, 0.33]];
MOBS.silverfish = { name: 'Silverfish', hp: 8, w: 0.4, h: 0.3, speed: 3.2, kind: 'hostile', dmg: 1, snd: 'hissS', egg: [[110, 110, 110], [48, 48, 48]], drops: [],
  build(m, r) { m.segs = []; const SF = [140, 140, 146]; for (let i = 0; i < 5; i++) { const p = pivot(r, 0, 0.12, 0.22 - i * 0.11); const s = [0.18, 0.26, 0.3, 0.24, 0.16][i]; sbox(m, p, s, [0.12, 0.18, 0.22, 0.16, 0.1][i], 0.12, 0, 0, 0, 'sf_seg' + i, fur(i === 0 ? [120, 120, 126] : SF, 8, { speck: [[90, 90, 96], 0.2] })); m.segs.push(p); } m.head = m.segs[0]; } };
MOBS.endermite = { name: 'Endermite', hp: 8, w: 0.4, h: 0.3, speed: 3.2, kind: 'hostile', dmg: 2, snd: 'hissS', egg: [[22, 22, 22], [110, 50, 160]], drops: [],
  build(m, r) { m.segs = []; for (let i = 0; i < 4; i++) { const p = pivot(r, 0, 0.12, 0.18 - i * 0.12); sbox(m, p, [0.2, 0.28, 0.26, 0.16][i], [0.14, 0.2, 0.18, 0.12][i], 0.13, 0, 0, 0, 'em_seg' + i, fur([46, 30, 60], 8, { speck: [[140, 70, 200], 0.15] })); m.segs.push(p); } m.head = m.segs[0]; } };
for (const k of ['silverfish', 'endermite']) { MOB_XP[k] = [3, 3]; MOBS[k].tick = (m, dt) => { if (m.segs) m.segs.forEach((s, i) => s.position.x = Math.sin(m.age * 14 - i * 1.2) * 0.04 * Math.min(1, Math.hypot(m.vel.x, m.vel.z))); if (m.type === 'endermite') { m.life = (m.life || 0) + dt; if (m.life > 120 && !m.dead) { m.gone = true; } if (Math.random() < dt * 3) Particles.emit(m.pos.x, m.pos.y + 0.2, m.pos.z, 1, [[0.6, 0.2, 0.9]], 0.5, 0.5, -1, 0.3); } return false; }; }
MOB_XP.cave_spider = [5, 5];
// silverfish call their friends out of nearby infested stone when hurt
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src) {
    const r = _h.apply(this, arguments);
    if (this.type === 'silverfish' && !this.remote && !this.dead && !isClientMP()) { const w = G.world; const bx = Math.floor(this.pos.x), by = Math.floor(this.pos.y), bz = Math.floor(this.pos.z); let n = 0;
      for (let dx = -6; dx <= 6 && n < 6; dx++) for (let dy = -3; dy <= 3 && n < 6; dy++) for (let dz = -6; dz <= 6 && n < 6; dz++) { const id = w.get(bx + dx, by + dy, bz + dz); if (BL[id] && BL[id].infested && Math.random() < 0.5) { w.set(bx + dx, by + dy, bz + dz, B[BL[id].infested.toUpperCase()]); mpBlock(bx + dx, by + dy, bz + dz, B[BL[id].infested.toUpperCase()]); spawnMob('silverfish', bx + dx + 0.5, by + dy, bz + dz + 0.5); n++; } } }
    return r;
  }; }
// breaking infested stone lets a silverfish out (not with Silk Touch, not in Creative)
{ const _bb = breakBlock; breakBlock = function (x, y, z) { const id = world.get(x, y, z); const r = _bb.apply(this, arguments); if (BL[id] && BL[id].infested && S.mode !== 'creative' && !heldEnch('silk_touch') && !isClientMP()) spawnMob('silverfish', x + 0.5, y, z + 0.5); return r; }; }
// ender pearls: 5% chance of an endermite where you land
{ const _pi = projImpact; projImpact = function (a, mob) { const r = _pi(a, mob); if (a.kind === 'pearl' && Math.random() < 0.05 && !isClientMP()) spawnMob('endermite', player.pos.x, player.pos.y, player.pos.z); return r; }; }

// ---------- slime ----------
MOBS.slime = { name: 'Slime', hp: 16, w: 2.04, h: 2.04, speed: 2, kind: 'hostile', ai: 'magma', snd: 'squish', egg: [[81, 160, 70], [126, 191, 110]], drops: [],
  slimeDmg: (s) => s >= 4 ? 4 : s >= 2 ? 2 : 0,
  splitDrops(m) { if (m.size === 1) { const n = Math.floor(Math.random() * 3); if (n) dropItem(IT.slime_ball, n, m.pos.x, m.pos.y + 0.3, m.pos.z); } },
  build(m, r) { sbox(m, r, 1, 1, 1, 0, 0.5, 0, 'sl_body', (f, set, fw, fh, rr) => { for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) set(x, y, vary([110, 196, 92], rr, 8)); if (f === 'front') { dots(set, [[2, 2], [5, 2]], [30, 70, 30]); dots(set, [[4, 5]], [40, 90, 40]); } }, { ppb: 8 });
    sbox(m, r, 0.6, 0.6, 0.6, 0, 0.45, 0, 'sl_core', fur([80, 160, 70], 6)); for (const mt of m.mats) { mt[0].transparent = true; mt[0].opacity = 0.85; } } };
MOB_XP.slime = [1, 4]; MOB_PITCH.slime = 1.2;
// slime chunks: 1 in 10 chunks, from the world seed (like Java's rule)
function isSlimeChunk(cx, cz) { const h = ihash(cx, cz, (world.seed | 0) ^ 987234911, 7); return (h % 10) === 0; }

// ---------- witch and splash potions ----------
MOBS.witch = { name: 'Witch', hp: 26, w: 0.6, h: 1.95, speed: 2.0, kind: 'hostile', snd: 'hmm', egg: [[52, 0, 0], [81, 161, 81]],
  drops: [['glass_bottle', 0, 2, 0.4], ['glowstone_dust', 0, 2, 0.4], ['gunpowder', 0, 2, 0.4], ['redstone', 0, 2, 0.4], ['spider_eye', 0, 2, 0.4], ['sugar', 0, 2, 0.4], ['stick', 0, 2, 0.4]],
  build(m, r) { MOBS.villager.build(m, r); const ROB = [70, 30, 90];
    for (const mt of m.mats) mt[0].userData = mt[0].userData || {};
    sbox(m, r, 0.54, 0.97, 0.36, 0, 1.0, 0, 'witch_robe', fur(ROB, 7, { speck: [[110, 60, 130], 0.15] }));
    sbox(m, m.head, 0.6, 0.08, 0.6, 0, 0.56, 0, 'witch_brim', fur([40, 70, 40], 6)); sbox(m, m.head, 0.38, 0.3, 0.38, 0, 0.74, -0.02, 'witch_hat', fur([40, 70, 40], 6, { foot: [1, [90, 40, 120]] })); sbox(m, m.head, 0.2, 0.22, 0.2, 0, 0.98, -0.08, 'witch_tip', fur([40, 70, 40], 5));
    sbox(m, m.head, 0.05, 0.05, 0.05, 0.04, 0.12, 0.34, 'witch_wart', fur([60, 120, 60], 2)); } };
MOB_XP.witch = [5, 5];
PROJ.potion = { grav: 20, size: 0.28, color: 0x7a40c0, trail: [[0.6, 0.3, 0.8]] };
const POTION_COL = { poison: [[0.3, 0.6, 0.2]], slowness: [[0.4, 0.5, 0.6]], weakness: [[0.45, 0.45, 0.45]], instant_damage: [[0.45, 0.1, 0.1]] };
MOBS.witch.tick = function (m, dt) {
  const P = hostileTarget(m, 16); m.potT = (m.potT || 2) - dt; m.drinkT = Math.max(0, (m.drinkT || 0) - dt);
  if (m.drinkT > 0) { if (Math.random() < dt * 8) Particles.emit(m.pos.x, m.pos.y + 1.6, m.pos.z, 1, [[0.9, 0.3, 0.4]], 0.4, 0.4, -1, 0.3); if (m.drinkT <= dt) { m.hp = Math.min(m.maxHp, m.hp + 4); } }
  else if (m.hp < m.maxHp * 0.5 && Math.random() < dt * 0.25) { m.drinkT = 1.6; Sfx.at('eat', m.pos, 0.6); }
  if (P && m.potT <= 0 && m.drinkT <= 0) { const d = m.pos.distanceTo(P.pos);
    if (d < 10 && lineOfSight(new V3(m.pos.x, m.pos.y + 1.6, m.pos.z), P.eye())) {
      m.potT = 3; const eff = d <= 3 && !effLevel('weakness') ? 'weakness' : !effLevel('slowness') && d >= 8 ? 'slowness' : P.health >= 8 && !effLevel('poison') ? 'poison' : 'instant_damage';
      const from = new V3(m.pos.x, m.pos.y + 1.6, m.pos.z); const tgt = P.pos.clone().add(new V3(P.vel.x * 0.4, 1.1, P.vel.z * 0.4)); const dir = tgt.clone().sub(from); const L = dir.length(); dir.normalize(); const v = dir.multiplyScalar(14); v.y += 0.5 * 20 * (L / 14) + 1;
      const p = spawnProj('potion', from, v, 'mob', 0, m); p.potion = eff; p.mesh.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(...POTION_COL[eff][0]) }); m.armSwing = 0.3; Sfx.at('bow', m.pos, 0.5, 1.3);
    } }
  return false;
};
{ const _pi = projImpact; projImpact = function (a, mob) {
    if (a.kind !== 'potion') return _pi(a, mob); a.done = true; const c = POTION_COL[a.potion] || [[0.6, 0.3, 0.8]];
    Particles.emit(a.pos.x, a.pos.y, a.pos.z, 40, c, 4, 0.8, -2, 2); Sfx.at('glass_break', a.pos, 0.8);
    const P = player; const d = P.pos.clone().add(new V3(0, 0.9, 0)).distanceTo(a.pos); if (d > 4 || P.dead || !isSurv()) return; const k = 1 - d / 4;
    if (a.potion === 'instant_damage') { P.hurtCD = 0; P.hurt(Math.round(6 * k), null, 'magic', 0); }
    else giveEffect(a.potion, Math.round({ poison: 45, slowness: 90, weakness: 90 }[a.potion] * 0.75 * k), 0);
  }; }
{ const _up = updateProjectiles; updateProjectiles = function (dt) { for (const a of G.projectiles) if (a.kind === 'potion' && a.owner === 'mob' && !a.done && Math.abs(a.pos.x - player.pos.x) < 0.5 && Math.abs(a.pos.z - player.pos.z) < 0.5 && a.pos.y > player.pos.y && a.pos.y < player.pos.y + 1.9) projImpact(a, null); return _up.apply(this, arguments); }; }

// ---------- phantom ----------
MOBS.phantom = { name: 'Phantom', hp: 20, w: 0.9, h: 0.5, speed: 6, kind: 'hostile', dmg: 4, snd: 'ghast', burns: true, egg: [[67, 81, 138], [136, 255, 0]], drops: [['phantom_membrane', 0, 1, 1]],
  build(m, r) { const PH = [70, 84, 140]; sbox(m, r, 0.4, 0.2, 0.75, 0, 0.25, 0, 'ph_body', fur(PH, 8, { speck: [[50, 60, 110], 0.2] })); const h = pivot(r, 0, 0.25, 0.42); m.head = h; sbox(m, h, 0.42, 0.22, 0.3, 0, 0, 0.12, 'ph_head', fur(PH, 6, { extra: (f, set, fw) => { if (f === 'front') dots(set, [[0, 1], [1, 1], [fw - 2, 1], [fw - 1, 1]], [150, 255, 60], true); } }));
    m.wings = []; for (const s of [-1, 1]) { const w = pivot(r, s * 0.2, 0.3, 0); sbox(m, w, 0.75, 0.05, 0.55, s * 0.38, 0, 0, 'ph_wing', fur([96, 110, 170], 8, { speck: [[60, 70, 120], 0.25] })); m.wings.push(w); }
    m.tail = pivot(r, 0, 0.25, -0.38); sbox(m, m.tail, 0.18, 0.1, 0.5, 0, 0, -0.25, 'ph_tail', fur(PH, 6)); } };
MOB_XP.phantom = [5, 5]; UNDEAD.add('phantom'); MOB_PITCH.phantom = 1.6;
MOBS.phantom.tick = function (m, dt) {
  const P = hostileTarget(m, 64); m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.atkCD -= dt;
  m.lightT -= dt; if (m.lightT <= 0) { m.lightT = 0.3; m.light = Math.max(G.minLight || 0, G.world.lightAt(m.pos.x, m.pos.y, m.pos.z, G.daylight)); }
  if (G.daylight > 0.62 && G.world.skyAt(Math.floor(m.pos.x), Math.floor(m.pos.y + 1), Math.floor(m.pos.z)) >= 1) { m.burnT = Math.max(m.burnT || 0, 1); if (Math.random() < dt) m.hurt(1, null, 0, true); }
  const c = m.circ || (m.circ = { a: Math.random() * 6.28, r: 8 + Math.random() * 6, h: 8 + Math.random() * 6 });
  let want;
  if (P) { m.swoopT = (m.swoopT == null ? 4 : m.swoopT) - dt;
    if (m.swoopT <= 0 && !m.swoop) { m.swoop = true; m.swoopT = 6 + Math.random() * 4; Sfx.at('ghast', m.pos, 0.4, 1.8); }
    if (m.swoop) { want = P.pos.clone().add(new V3(0, 0.9, 0)).sub(m.pos); if (want.length() < 1.1 && m.atkCD <= 0) { m.atkCD = 1; P.hurt(m.t.dmg, m.pos, 'a Phantom', 0.7); m.swoop = false; c.h = 10; } if (want.length() < 0.8 || m.hitH) m.swoop = false; want.normalize().multiplyScalar(11); }
    else { c.a += dt * 0.6; const tx = P.pos.x + Math.cos(c.a) * c.r, tz = P.pos.z + Math.sin(c.a) * c.r, ty = P.pos.y + c.h; want = new V3(tx - m.pos.x, ty - m.pos.y, tz - m.pos.z); const L = want.length(); want.multiplyScalar(Math.min(7, L) / Math.max(L, 0.01)); }
  } else { c.a += dt * 0.3; want = new V3(Math.cos(c.a) * 4, Math.sin(m.age) * 0.5, Math.sin(c.a) * 4); }
  const k = Math.min(1, dt * 2.5); m.vel.x += (want.x - m.vel.x) * k; m.vel.y += (want.y - m.vel.y) * k; m.vel.z += (want.z - m.vel.z) * k;
  moveEntity(m, dt); m.yaw += angWrap(Math.atan2(m.vel.x, m.vel.z) - m.yaw) * Math.min(1, dt * 6);
  m.root.position.copy(m.pos); m.root.rotation.y = m.yaw; m.body.rotation.x = clamp(-m.vel.y * 0.08, -0.7, 0.7);
  if (m.wings) m.wings.forEach((w, i) => w.rotation.z = Math.sin(m.age * 7) * 0.5 * (i ? -1 : 1)); if (m.tail) m.tail.rotation.x = Math.sin(m.age * 7 + 1) * 0.3;
  m.colorize(); m.sndT -= dt; if (m.sndT <= 0) { m.sndT = 5 + Math.random() * 8; Sfx.at('ghast', m.pos, 0.25, 1.9); }
  return true;
};
// insomnia: Minecraft counts time since you last slept; after 3 days phantoms come at night
S.restT = 0;
function spawnPhantoms(dt) {
  if (!world || world.dim !== 'overworld' || isClientMP() || player.dead) return;
  if (isSurv() && !S.sleeping) S.restT += dt * 20; if (S.sleeping) S.restT = 0;
  S.phT = (S.phT || 60) - dt; if (S.phT > 0) return; S.phT = 60 + Math.random() * 60;
  if (!S.rules.doMobSpawning || !isSurv() || S.difficulty === 'peaceful' || G.daylight > 0.38 || S.restT < 72000) return;
  if (player.pos.y < SEA || world.skyAt(Math.floor(player.pos.x), Math.floor(player.pos.y + 2), Math.floor(player.pos.z)) < 1) return;
  if (Math.random() * 72000 > S.restT - 72000 + 1) return; // more likely the longer you go without sleep
  const n = 1 + Math.floor(Math.random() * ({ easy: 1, normal: 2, hard: 3 }[S.difficulty] || 2));
  for (let i = 0; i < n; i++) spawnMob('phantom', player.pos.x + (Math.random() - 0.5) * 6, player.pos.y + 20 + Math.random() * 14, player.pos.z + (Math.random() - 0.5) * 6);
}
{ const _die = Player.prototype.die; Player.prototype.die = function () { S.restT = 0; return _die.apply(this, arguments); }; }

// ---------- illagers: pillager, vindicator, evoker (+ vex), ravager ----------
MOBS.pillager = { name: 'Pillager', hp: 24, w: 0.6, h: 1.95, speed: 2.3, kind: 'hostile', dmg: 4, snd: 'hmm', ranged: true, egg: [[83, 47, 54], [149, 155, 155]],
  drops: [['arrow', 0, 2, 1], ['crossbow', 1, 1, 0.085]],
  shoot(m, P) { m.atkCD = 2.6 + Math.random(); const from = new V3(m.pos.x, m.pos.y + 1.5, m.pos.z); const d = P.eye().add(new V3(0, -0.3, 0)).sub(from); const L = d.length(); d.normalize(); const v = d.multiplyScalar(36); v.y += 0.5 * 20 * (L / 36); spawnProj('arrow', from, v, 'mob', 4); Sfx.at('bow', m.pos, 0.7, 0.8); },
  build(m, r) { illagerModel(m, r, 'pill', [66, 70, 76], [40, 44, 50]); const cb = pivot(m.arms[1], 0, -0.66, 0.12); cb.rotation.x = 1.4; sbox(m, cb, 0.36, 0.06, 0.06, 0, 0, 0.1, 'pill_xbow', fur([110, 76, 46], 5)); sbox(m, cb, 0.06, 0.06, 0.4, 0, 0, 0, 'pill_stock', fur([96, 66, 40], 5)); } };
MOBS.vindicator = { name: 'Vindicator', hp: 24, w: 0.6, h: 1.95, speed: 3.1, kind: 'hostile', dmg: 13, snd: 'hmm', egg: [[149, 155, 155], [37, 92, 98]],
  drops: [['emerald', 0, 1, 1]],
  build(m, r) { illagerModel(m, r, 'vind', [60, 64, 70], [36, 40, 46]); const ax = pivot(m.arms[1], 0, -0.62, 0.05); ax.rotation.x = 1.2; sbox(m, ax, 0.05, 0.7, 0.05, 0, 0.3, 0, 'vind_handle', fur([110, 76, 46], 4)); sbox(m, ax, 0.05, 0.22, 0.24, 0, 0.6, 0.1, 'vind_axe', fur([180, 180, 186], 5)); } };
MOBS.evoker = { name: 'Evoker', hp: 24, w: 0.6, h: 1.95, speed: 2.0, kind: 'hostile', snd: 'hmm', egg: [[149, 155, 155], [30, 30, 30]],
  drops: [['emerald', 0, 1, 1], ['totem_of_undying', 1, 1, 1]],
  build(m, r) { illagerModel(m, r, 'evok', [36, 36, 42], [140, 110, 30], { legs: [36, 36, 42] }); sbox(m, r, 0.54, 0.95, 0.32, 0, 1.0, 0, 'evok_robe', fur([30, 30, 36], 6, { extra: (f, set, fw, fh) => { if (f === 'front') for (let y = 0; y < fh; y++) set(fw >> 1, y, [190, 150, 40]); } })); } };
MOBS.vex = { name: 'Vex', hp: 14, w: 0.4, h: 0.8, speed: 5, kind: 'hostile', dmg: 9, snd: 'vwoop', egg: [[122, 144, 164], [232, 237, 241]], drops: [],
  build(m, r) { const VX = [180, 196, 210]; const g = pivot(r, 0, 0, 0); g.scale.setScalar(0.42); humanoidS(m, g, 'vex', { head: fur(VX, 5, { extra: (f, set) => { if (f === 'front') dots(set, [[1, 3], [2, 3], [5, 3], [6, 3]], [40, 40, 60]); } }), body: fur(VX, 5), arm: fur(VX, 5), leg: fur(VX, 5) }, false);
    sword(m, m.arms[1], [196, 196, 200], 0.6); m.wings = []; for (const s of [-1, 1]) { const w = pivot(g, s * 0.2, 1.35, -0.15); sbox(m, w, 0.6, 0.5, 0.04, s * 0.32, 0, 0, 'vex_wing', fur([220, 230, 240], 4)); m.wings.push(w); } for (const mt of m.mats) { mt[0].transparent = true; mt[0].opacity = 0.75; } } };
MOBS.ravager = { name: 'Ravager', hp: 100, w: 1.95, h: 2.2, speed: 2.4, kind: 'hostile', dmg: 12, kb: 2, snd: 'grunt', egg: [[93, 89, 82], [71, 66, 61]], drops: [['saddle', 1, 1, 1]],
  build(m, r) { const RV = [100, 96, 90]; sbox(m, r, 1.3, 1.1, 2.0, 0, 1.75, -0.1, 'rav_body', fur(RV, 8, { speck: [[80, 76, 70], 0.2], bottom: [70, 66, 60] }));
    const h = pivot(r, 0, 1.9, 1.0); m.head = h; sbox(m, h, 1.0, 1.1, 0.9, 0, 0, 0.45, 'rav_head', fur(RV, 7, { extra: (f, set, fw) => { if (f === 'front') { set(2, 3, [30, 30, 30]); set(fw - 3, 3, [30, 30, 30]); } } }));
    for (const s of [-1, 1]) { sbox(m, h, 0.12, 0.6, 0.12, s * 0.58, 0.6, 0.3, 'rav_horn', fur([220, 210, 190], 4)); }
    m.legs = quadLegs(m, r, 0.42, 1.2, 0.48, 0.65, 'rav_leg', fur([80, 76, 70], 7, { foot: [3, [56, 52, 48]] })); } };
for (const k of ['pillager', 'vindicator', 'evoker', 'vex', 'ravager']) MOB_XP[k] = k === 'ravager' ? [20, 20] : k === 'evoker' ? [10, 10] : [5, 5];
MOB_PITCH.pillager = 0.9; MOB_PITCH.vindicator = 0.85; MOB_PITCH.evoker = 0.8; MOB_PITCH.ravager = 0.6; MOB_PITCH.vex = 1.8;
// evoker: fangs from the ground toward you every 5 s, 3 vexes every 17 s, keeps its distance
MOBS.evoker.tick = function (m, dt) {
  const P = hostileTarget(m, 20); if (!P) return false; m.spellT = (m.spellT == null ? 2 : m.spellT) - dt; m.vexT = (m.vexT == null ? 4 : m.vexT) - dt;
  if (m.spellT <= 0) { m.spellT = 5; m.castT = 1; const from = m.pos.clone(); const dir = P.pos.clone().sub(from); dir.y = 0; const L = Math.min(16, dir.length()); dir.normalize();
    for (let i = 1; i <= Math.max(3, Math.ceil(L)); i++) { const p = from.clone().addScaledVector(dir, i * 1.25); setTimeout(() => evokerFang(p.x, p.y, p.z), i * 60); } }
  if (m.vexT <= 0 && G.mobs.filter(v => v.type === 'vex').length < 8) { m.vexT = 17; m.castT = 1.5; for (let i = 0; i < 3; i++) { const v = spawnMob('vex', m.pos.x + (Math.random() - 0.5) * 2, m.pos.y + 1.2, m.pos.z + (Math.random() - 0.5) * 2); v.owner = m; v.life = 30 + Math.random() * 90; } Sfx.at('vwoop', m.pos, 0.8, 0.6); }
  m.castT = Math.max(0, (m.castT || 0) - dt); if (m.castT > 0 && m.arms) { for (const a of m.arms) { a.rotation.x = -2.6; a.rotation.z = Math.sin(m.age * 10) * 0.3; } Particles.emit(m.pos.x, m.pos.y + 2, m.pos.z, 1, [[0.7, 0.6, 0.9]], 0.6, 0.6, -1, 0.5); }
  const d = m.pos.distanceTo(P.pos); if (d < 6) { m.flee = 0.5; } return false;
};
function evokerFang(x, y, z) {
  if (!world) return; let yy = Math.floor(y); for (let k = 0; k < 4 && !world.solid(Math.floor(x), yy - 1, Math.floor(z)); k++) yy--; for (let k = 0; k < 4 && world.solid(Math.floor(x), yy, Math.floor(z)); k++) yy++;
  Particles.emit(x, yy + 0.3, z, 8, [[0.8, 0.8, 0.7], [0.5, 0.5, 0.45]], 3, 0.5, -6, 0.4); Sfx.at('shield', new V3(x, yy, z), 0.4, 1.4);
  const P = player; if (Math.abs(P.pos.x - x) < 0.8 && Math.abs(P.pos.z - z) < 0.8 && Math.abs(P.pos.y - yy) < 1.5) { P.hurtCD = 0; P.hurt(6, null, 'an Evoker', 0); }
  for (const m of G.mobs) if (!m.dead && m.type !== 'evoker' && m.type !== 'vex' && Math.abs(m.pos.x - x) < m.hw + 0.4 && Math.abs(m.pos.z - z) < m.hw + 0.4 && Math.abs(m.pos.y - yy) < 1.5) m.hurt(6, null, 0.2, true);
}
// vexes fly straight through walls
MOBS.vex.tick = function (m, dt) {
  const P = hostileTarget(m, 32); m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.atkCD -= dt; m.life = (m.life || 60) - dt; if (m.life <= 0) { m.hurt(1, null, 0, true); m.life = 1; }
  m.light = 1; let want = new V3(Math.sin(m.age) * 1.5, Math.sin(m.age * 1.3) * 0.5, Math.cos(m.age) * 1.5);
  if (P) { want = P.pos.clone().add(new V3(0, 1.2, 0)).sub(m.pos); const L = want.length(); if (L < 1.2 && m.atkCD <= 0) { m.atkCD = 1; P.hurt(m.t.dmg, m.pos, 'a Vex', 0.6); m.armSwing = 0.3; } want.multiplyScalar(Math.min(6, L * 2) / Math.max(L, 0.01)); }
  const k = Math.min(1, dt * 3); m.vel.lerp(want, k); m.pos.addScaledVector(m.vel, dt); m.yaw += angWrap(Math.atan2(m.vel.x, m.vel.z) - m.yaw) * Math.min(1, dt * 8);
  m.root.position.copy(m.pos); m.root.rotation.y = m.yaw; if (m.wings) m.wings.forEach((w, i) => w.rotation.y = Math.sin(m.age * 20) * 0.4 * (i ? -1 : 1));
  if (m.arms) { m.arms[1].rotation.x = -1.2 - (m.armSwing > 0 ? 0.8 : 0); m.armSwing = Math.max(0, (m.armSwing || 0) - dt); } m.colorize(); return true;
};

// ---------- breeze and wind charges ----------
MOBS.breeze = { name: 'Breeze', hp: 30, w: 0.6, h: 1.77, speed: 2.6, kind: 'hostile', snd: 'vwoop', egg: [[175, 148, 223], [146, 120, 199]], drops: [['breeze_rod', 1, 2, 1]],
  build(m, r) { const BZ = [170, 160, 220]; const h = pivot(r, 0, 1.35, 0); m.head = h; sbox(m, h, 0.5, 0.5, 0.5, 0, 0.1, 0, 'bz2_head', fur(BZ, 8, { speck: [[130, 120, 200], 0.2], extra: (f, set) => { if (f !== 'front') return; dots(set, [[1, 3], [2, 3], [5, 3], [6, 3]], [240, 250, 255], true); } }), { glowAll: false });
    m.rods = []; for (let i = 0; i < 3; i++) { const g = pivot(r, 0, 0.5 + i * 0.25, 0); sbox(m, g, 0.12, 0.5, 0.12, 0.35, 0, 0, 'bz2_rod', fur([140, 180, 230], 5)); m.rods.push(g); }
    m.swirl = []; for (let i = 0; i < 3; i++) { const g = pivot(r, 0, 0.15 + i * 0.32, 0); sbox(m, g, 0.5 - i * 0.1, 0.25, 0.5 - i * 0.1, 0, 0, 0, 'bz2_wind' + i, fur([200, 220, 250], 4)); m.swirl.push(g); } for (const p of m.swirl) p.children.forEach(c => { c.material.transparent = true; c.material.opacity = 0.55; }); } };
MOB_XP.breeze = [10, 10];
PROJ.wind = { grav: 0, size: 0.3, color: 0xcfe0ff, trail: [[0.8, 0.88, 1]] };
MOBS.breeze.tick = function (m, dt) {
  const P = hostileTarget(m, 16); if (m.rods) m.rods.forEach((g, i) => g.rotation.y = m.age * (2 + i)); if (m.swirl) m.swirl.forEach((g, i) => g.rotation.y = -m.age * (6 + i * 2));
  m.jumpT = (m.jumpT == null ? 2 : m.jumpT) - dt; m.shootT = (m.shootT == null ? 2 : m.shootT) - dt;
  if (P) { lookAtP(m, P, dt); const d = m.pos.distanceTo(P.pos);
    if (m.onGround && m.jumpT <= 0) { m.jumpT = 2 + Math.random() * 2; const a = Math.atan2(P.pos.x - m.pos.x, P.pos.z - m.pos.z) + (Math.random() - 0.5) * 2.4 + (d < 5 ? Math.PI : 0); m.vel.set(Math.sin(a) * 5, 10 + Math.random() * 3, Math.cos(a) * 5); Sfx.at('vwoop', m.pos, 0.4, 1.4); }
    if (m.shootT <= 0 && d < 16 && lineOfSight(new V3(m.pos.x, m.pos.y + 1.4, m.pos.z), P.eye())) { m.shootT = 2.2 + Math.random(); const from = new V3(m.pos.x, m.pos.y + 1.3, m.pos.z); fireAt('wind', from, P.eye().add(new V3(0, -0.5, 0)), 15, 'mob', 1, m); Sfx.at('vwoop', m.pos, 0.6, 1.1); } }
  if (!m.onGround) { m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.vel.y = Math.max(m.vel.y - 28 * dt, -30); moveEntity(m, dt); m.root.position.copy(m.pos); m.root.rotation.y = m.yaw; m.colorize(); return true; }
  return false;
};
// a wind burst: pushes everything nearby away; your own wind charges launch you (and spare you fall damage)
function windBurst(p, power, src) {
  Particles.emit(p.x, p.y, p.z, 30, [[0.85, 0.9, 1], [0.7, 0.8, 1]], 6, 0.6, 2, 1.2); Sfx.at('vwoop', p, 0.9, 0.6);
  const R = 2.5 + power * 0.5;
  for (const m of G.mobs) { if (m.dead || m === src || m.type === 'breeze') continue; const c = m.pos.clone().add(new V3(0, m.h / 2, 0)); const d = c.distanceTo(p); if (d > R) continue; const k = (1 - d / R) * 10 * power; const dir = c.sub(p).normalize(); m.vel.x += dir.x * k; m.vel.z += dir.z * k; m.vel.y = Math.max(m.vel.y, Math.abs(dir.y) * k * 0.6 + k * 0.5); }
  const P = player; const c = P.pos.clone().add(new V3(0, 0.9, 0)); const d = c.distanceTo(p);
  if (d < R && !P.dead) { const k = (1 - d / R) * 12 * power; const dir = c.sub(p).normalize(); if (P.riding) return; P.vel.x += dir.x * k; P.vel.z += dir.z * k; P.vel.y = Math.max(P.vel.y, dir.y * k + k * 0.6); P.peak = null; P.windSafeT = 2; }
}
{ const _pi = projImpact; projImpact = function (a, mob) {
    if (a.kind !== 'wind') return _pi(a, mob); a.done = true;
    if (mob && !mob.dead && a.owner === 'player') mob.hurt(1, a.pos, 0.2);
    windBurst(a.pos, a.owner === 'player' ? 1.1 : 0.7, a.src);
  }; }
// your fall after a wind burst is cushioned (Minecraft: the fall is measured from where the burst hit you)
{ const _up = updatePlayer; updatePlayer = function (dt) { const P = player; if (P.windSafeT > 0) { P.windSafeT -= dt; if (P.vel.y > 0) P.peak = null; } return _up.apply(this, arguments); }; }
// mob wind charges that hit the player also burst there
{ const _up = updateProjectiles; updateProjectiles = function (dt) { for (const a of G.projectiles) if (a.kind === 'wind' && a.owner === 'mob' && !a.done && Math.abs(a.pos.x - player.pos.x) < 0.5 && Math.abs(a.pos.z - player.pos.z) < 0.5 && a.pos.y > player.pos.y && a.pos.y < player.pos.y + 1.9) { if (isSurv()) { player.hurtCD = 0; player.hurt(1, a.pos.clone(), 'a Breeze', 0); } projImpact(a, null); } return _up.apply(this, arguments); }; }
// breezes are never hit by projectiles: they deflect them
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, noAnger) { if (this.type === 'breeze' && this.deflectNext) { this.deflectNext = false; return; } return _h.apply(this, arguments); }; }
{ const _up = updateProjectiles; updateProjectiles = function (dt) { for (const a of G.projectiles) if (a.owner === 'player' && !a.done && a.kind === 'arrow') for (const m of G.mobs) if (m.type === 'breeze' && !m.dead && hitsMob(m, a.pos, 0.3)) { a.vel.multiplyScalar(-0.6); a.owner = 'mob'; m.deflectNext = true; Sfx.at('vwoop', m.pos, 0.5, 1.5); } return _up.apply(this, arguments); }; }
// throwing wind charges (0.5 s cooldown)
{ const _ua = useAction; useAction = function (eye, dir) { const h = player.held(); if (h && ITEMS[h.id].kind === 'wind_charge') { if (S.windCD > performance.now()) return; S.windCD = performance.now() + 500; useHeld(1); spawnProj('wind', eye.clone().addScaledVector(dir, 0.5), dir.clone().multiplyScalar(30), 'player', 1); Sfx.play('vwoop', 0.5, 1.2); S.swing = 1; return; } return _ua(eye, dir); }; }

// ---------- the mace ----------
Object.assign(ENCH, { density: { name: 'Density', max: 5, for: 'mace', excl: 'mdmg', w: 5 }, breach: { name: 'Breach', max: 4, for: 'mace', excl: 'mdmg', w: 2 }, wind_burst: { name: 'Wind Burst', max: 3, for: 'mace', w: 2 } });
{ const _ec = enchCat; enchCat = function (id) { const it = ITEMS[id]; if (it && it.kind === 'mace') return 'mace'; return _ec(id); };
  const _ef = enchantFits; enchantFits = function (id, en) { if (enchCat(id) === 'mace') { const E = ENCH[en]; return !!E && (E.for === 'mace' || E.for === '*' || ['smite', 'bane_of_arthropods', 'fire_aspect'].includes(en)); } return _ef(id, en); };
  const _ea = enchantability; enchantability = function (id) { if (id === IT.mace) return 15; return _ea(id); }; }
// smash attack: falling more than 1.5 blocks adds 4 per block for the first 3, 2 per block for the next 5, then 1
// per block (Density adds 0.5 per block per level); it cancels your fall damage and knocks nearby mobs back
function maceBonus(mob) {
  const P = player; const h = P.held(); if (!h || h.id !== IT.mace || P.onGround || P.peak == null) return 0;
  const fall = P.peak - P.pos.y; if (fall <= 1.5) return 0;
  let b = 4 * Math.min(3, fall) + 2 * clamp(fall - 3, 0, 5) + Math.max(0, fall - 8); b += 0.5 * enchOf(h, 'density') * fall;
  P.peak = P.pos.y; P.vel.y = Math.max(P.vel.y, 0);
  Particles.emit(mob.pos.x, mob.pos.y + 0.2, mob.pos.z, 40, [[0.55, 0.45, 0.35], [0.4, 0.4, 0.4]], 6, 0.8, 8, 1.6); Sfx.play('boom', 0.35); G.shake = Math.min(1, 0.2 + fall * 0.03);
  for (const m of G.mobs) { if (m === mob || m.dead) continue; const d = m.pos.distanceTo(mob.pos); if (d < 3.5) { const dir = m.pos.clone().sub(mob.pos); dir.y = 0; dir.normalize(); const k = (3.5 - d) * 2.5; m.vel.x += dir.x * k; m.vel.z += dir.z * k; m.vel.y = Math.max(m.vel.y, 4); } }
  const wb = enchOf(h, 'wind_burst'); if (wb) { P.vel.y = 6 + 3.5 * wb; P.windSafeT = 3; }
  damageHeld(1); return b;
}
{ const _me = meleeExtra; meleeExtra = function (mob) { return _me(mob) + (mob ? maceBonus(mob) : 0); }; }

// ---------- Totem of Undying ----------
// held in either hand, it saves you from death once (not from the void): 1 health, Regeneration II, Absorption II,
// Fire Resistance
{ const _die = Player.prototype.die; Player.prototype.die = function (cause) {
    const slot = cause === 'the void' ? -1 : this.inv[this.sel] && this.inv[this.sel].id === IT.totem_of_undying ? this.sel : this.inv[36] && this.inv[36].id === IT.totem_of_undying ? 36 : -1;
    if (slot < 0 || !isSurv()) return _die.apply(this, arguments);
    this.inv[slot] = null; invDirty(); this.dead = false; this.health = 1; this.hurtCD = 1; this.effects = {}; giveEffect('regeneration', 45, 1); giveEffect('absorption', 5, 1); giveEffect('fire_resistance', 40, 0); updateHearts();
    Particles.emit(this.pos.x, this.pos.y + 1, this.pos.z, 60, [[0.9, 0.8, 0.2], [0.3, 0.8, 0.3]], 5, 1.2, -2, 1.2); Sfx.play('levelup', 0.8); toast('Totem of Undying!', 2);
  }; }

// ---------- natural spawning ----------
// swap in the biome variants (husks in deserts, strays in snow, zombie villagers 5%), witches (1.2%), slimes in
// slime chunks below y 40, pillagers around watchtowers, phantoms
{ const _us = updateSpawning; updateSpawning = function (dt) { S.natSpawn = true; let r; try { r = _us.apply(this, arguments); } finally { S.natSpawn = false; } spawnPhantoms(dt); spawnExtras(dt); return r; }; }
{ const _sm = spawnMob; spawnMob = function (type, x, y, z, opts) {
    if (S.natSpawn && world && world.dim === 'overworld') {
      const b = world.gen.biome ? world.gen.column(Math.floor(x), Math.floor(z)).b : -1; const sky = world.skyAt(Math.floor(x), Math.floor(y + 1), Math.floor(z)) >= 1;
      if (type === 'zombie') { if (b === BIO.DESERT && sky && Math.random() < 0.8) type = 'husk'; else if (Math.random() < 0.05) type = 'zombie_villager'; }
      else if (type === 'skeleton' && b === BIO.SNOWY && sky && Math.random() < 0.8) type = 'stray';
      if (Math.random() < 0.012 && type !== 'enderman') type = 'witch';
    }
    return _sm(type, x, y, z, opts);
  }; }
let extraT = 0;
function spawnExtras(dt) {
  extraT -= dt; if (extraT > 0 || !world || isClientMP() || !S.rules.doMobSpawning || !isSurv() || S.difficulty === 'peaceful' || world.dim !== 'overworld') return; extraT = 2;
  const P = player.pos;
  // slimes
  if (G.mobs.filter(m => m.type === 'slime').length < 6) { const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 24; const x = Math.floor(P.x + Math.cos(a) * d), z = Math.floor(P.z + Math.sin(a) * d);
    if (world.loaded(x, z) && isSlimeChunk(x >> 4, z >> 4)) { const y0 = clamp(Math.floor(P.y) + (Math.random() * 20 | 0) - 10, 2, YOFF + 39); for (let y = y0; y > 2; y--) if (freeAt(x, y, z, 3) && SOLID[world.get(x, y - 1, z)] && freeAt(x + 1, y, z, 2) && freeAt(x, y, z + 1, 2)) { if (Math.random() < 0.5) spawnMob('slime', x + 0.5, y, z + 0.5, { size: [1, 2, 4][Math.random() * 3 | 0] }); break; } } }
  // pillagers near watchtowers
  if (G.mobs.filter(m => m.type === 'pillager').length < 6) for (const S2 of world.structCache.values()) { if (!S2.kinds) continue; for (const k of S2.kinds) { if (k[0] !== 'tower') continue; const dx = k[1] - P.x, dz = k[2] - P.z; if (dx * dx + dz * dz > 64 * 64 || dx * dx + dz * dz < 18 * 18) continue;
      if (Math.random() < 0.3) { const x = Math.floor(k[1] + (Math.random() - 0.5) * 20), z = Math.floor(k[2] + (Math.random() - 0.5) * 20); const y = surfaceSpawnY(x, z); if (y > 0 && freeAt(x, y, z)) spawnMob('pillager', x + 0.5, y, z + 0.5); } } }
}
// infested stone: in mountains (like Minecraft's windswept hills) and strongholds
for (const [k, base] of [['infested_stone', 'stone'], ['infested_cobblestone', 'cobblestone'], ['infested_stone_bricks', 'stone_bricks'], ['infested_deepslate', 'deepslate']]) {
  const bd = BL[B[base.toUpperCase()]]; const id = BL.length; const d = Object.assign({}, bd, { id, key: k, name: 'Infested ' + bd.name, hardness: bd.hardness / 2, infested: base, drop: null, hidden: false });
  BL.push(d); B[k.toUpperCase()] = id; SOLID[id] = SOLID[B[base.toUpperCase()]]; OPAQUE[id] = OPAQUE[B[base.toUpperCase()]];
  if (typeof LIGHT !== 'undefined') LIGHT[id] = 0; if (typeof FKIND !== 'undefined') FKIND[id] = 0;
}

{ const _go = World.prototype.genOverworld; World.prototype.genOverworld = function (c) {
    const cols = _go.call(this, c); const g = this.gen; const bx = c.cx * 16, bz = c.cz * 16;
    if (g.column(bx + 8, bz + 8).b === BIO.MOUNTAINS) { const r = mulberry32(ihash(c.cx, c.cz, 7331, this.seed)); const d = c.d; const IS = B.INFESTED_STONE, ID = B.INFESTED_DEEPSLATE;
      for (let t = 0; t < 7; t++) { const x0 = r() * 16 | 0, z0 = r() * 16 | 0, y0 = YOFF + (r() * 64 | 0); for (let k = 0; k < 9; k++) { const x = clamp(x0 + (r() * 3 | 0) - 1, 0, 15), y = y0 + (r() * 3 | 0) - 1, z = clamp(z0 + (r() * 3 | 0) - 1, 0, 15); const j = (y * 16 + z) * 16 + x; if (d[j] === B.STONE) d[j] = IS; else if (d[j] === B.DEEPSLATE) d[j] = ID; } } }
    return cols;
  }; }
{ const _bs = buildStronghold; buildStronghold = function (w, c, sh) { const r = _bs.apply(this, arguments); const rr = mulberry32(ihash(c.cx, c.cz, 9917, w.seed)); const d = c.d; for (let j = 0; j < d.length; j++) if (d[j] === B.STONE_BRICKS && rr() < 0.06) d[j] = B.INFESTED_STONE_BRICKS; return r; }; }
