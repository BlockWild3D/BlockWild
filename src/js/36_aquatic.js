// ================= WATER MOBS (Minecraft) =================
// Cod, salmon, tropical fish and pufferfish swim in schools and flop and die on land; squid and glow squid
// (dark water deep down) squirt ink when hurt; dolphins follow swimmers and give Dolphin's Grace; turtles live on
// beaches; axolotls hunt fish and drowned and play dead; tadpoles grow into frogs.
Object.assign(EFFECTS, { dolphins_grace: "Dolphin's Grace" });
function swimTick(m, dt, o) {
  const w = G.world; m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.atkCD = (m.atkCD || 0) - dt;
  m.lightT -= dt; if (m.lightT <= 0) { m.lightT = 0.3; m.light = o.glow ? 1 : Math.max(G.minLight || 0, w.lightAt(m.pos.x, m.pos.y + m.h / 2, m.pos.z, G.daylight)); }
  const inW = inWater(m, m.h * 0.5);
  if (!inW && !o.land) { // flopping on land, drying out
    m.dryT = (m.dryT || 0) + dt; if (m.onGround && Math.random() < dt * 3) { m.vel.set((Math.random() - 0.5) * 3, 4, (Math.random() - 0.5) * 3); }
    if (m.dryT > (o.dry || 10) && Math.random() < dt) m.hurt(1, null, 0, true);
    m.vel.y = Math.max(m.vel.y - 28 * dt, -30); moveEntity(m, dt); m.root.position.copy(m.pos); m.root.rotation.set(0, m.yaw, Math.PI / 2); m.colorize(); return true;
  }
  m.dryT = 0; m.root.rotation.z = 0;
  if (o.land && !inW) return false; // turtles, axolotls on land: normal walking
  m.swimT = (m.swimT || 0) - dt;
  if (m.goal && o.follow) { const g = o.follow(m); if (g) { m.swimGoal = g; m.swimT = 0.4; } }
  if (m.swimT <= 0 || !m.swimGoal) { m.swimT = 1.5 + Math.random() * 3; const R = o.range || 6; for (let k = 0; k < 6; k++) { const g = m.pos.clone().add(new V3((Math.random() - 0.5) * R * 2, (Math.random() - 0.5) * R * 0.6, (Math.random() - 0.5) * R * 2)); if (FKIND[w.get(Math.floor(g.x), Math.floor(g.y), Math.floor(g.z))] === 1 && FKIND[w.get(Math.floor(g.x), Math.floor(g.y + 1), Math.floor(g.z))] === 1) { m.swimGoal = g; break; } } }
  // flee from players (fish) / follow schools
  let want = m.swimGoal ? m.swimGoal.clone().sub(m.pos) : new V3(); const L = want.length(); want.multiplyScalar(Math.min(o.speed, L * 1.5) / Math.max(L, 0.01));
  if (o.shy && !player.dead && player.pos.distanceTo(m.pos) < 4 && inWater(player, 0.5)) { want = m.pos.clone().sub(player.pos).normalize().multiplyScalar(o.speed * 1.6); }
  if (m.hurtT > 0) want.multiplyScalar(2);
  // don't jump out of the water (except dolphins)
  if (!o.jumps && FKIND[w.get(Math.floor(m.pos.x), Math.floor(m.pos.y + m.h + 0.2), Math.floor(m.pos.z))] !== 1) want.y = Math.min(want.y, -0.3);
  const k = Math.min(1, dt * (o.agile || 2.5)); m.vel.lerp(want, k); moveEntity(m, dt); if (m.hitH) m.swimT = 0;
  const hs = Math.hypot(m.vel.x, m.vel.z); if (hs > 0.05) m.yaw += angWrap(Math.atan2(m.vel.x, m.vel.z) - m.yaw) * Math.min(1, dt * 5);
  m.root.position.copy(m.pos); m.root.rotation.y = m.yaw; m.body.rotation.x = clamp(-m.vel.y * 0.15, -0.6, 0.6);
  if (m.tail) m.tail.rotation.y = Math.sin(m.age * (6 + hs * 4)) * 0.5;
  if (o.tick) o.tick(m, dt);
  m.colorize(); return true;
}
const fishModel = (m, r, k, C, D, size, fin) => { sbox(m, r, 0.16 * size, 0.26 * size, 0.5 * size, 0, 0.16 * size, 0, k + '_body', fur(C, 6, { bottom: D, extra: (f, set, fw) => { if (f === 'left' || f === 'right') set(f === 'left' ? fw - 2 : 1, 1, [20, 20, 20]); } })); m.tail = pivot(r, 0, 0.16 * size, -0.25 * size); sbox(m, m.tail, 0.03, 0.24 * size, 0.18 * size, 0, 0, -0.09 * size, k + '_tail', fur(fin || D, 4)); sbox(m, r, 0.03, 0.08 * size, 0.18 * size, 0, 0.32 * size, 0, k + '_fin', fur(fin || D, 3)); };
MOBS.cod = { name: 'Cod', hp: 3, w: 0.5, h: 0.3, speed: 2, kind: 'passive', snd: 'squish', egg: [[193, 167, 109], [229, 196, 147]], drops: [['cod', 1, 1, 1], ['bone_meal', 1, 1, 0.05]], build(m, r) { fishModel(m, r, 'cod', [176, 150, 110], [226, 210, 186], 1); } };
MOBS.salmon = { name: 'Salmon', hp: 3, w: 0.7, h: 0.4, speed: 2.2, kind: 'passive', snd: 'squish', egg: [[160, 18, 16], [14, 133, 101]], drops: [['salmon', 1, 1, 1], ['bone_meal', 1, 1, 0.05]], build(m, r) { fishModel(m, r, 'salmon', [176, 70, 60], [214, 170, 160], 1.4, [110, 120, 110]); } };
const TROP = [[[240, 120, 30], [250, 250, 250]], [[60, 120, 230], [250, 220, 60]], [[230, 60, 160], [250, 250, 250]], [[250, 220, 40], [40, 40, 40]], [[80, 200, 120], [250, 140, 40]], [[250, 250, 250], [220, 60, 50]]];
MOBS.tropical_fish = { name: 'Tropical Fish', hp: 3, w: 0.5, h: 0.4, speed: 2, kind: 'passive', snd: 'squish', variants: 6, egg: [[239, 109, 21], [255, 249, 239]], drops: [['tropical_fish', 1, 1, 1], ['bone_meal', 1, 1, 0.05]],
  build(m, r) { const v = pick(m, 6); const [C, D] = TROP[v]; sbox(m, r, 0.1, 0.36, 0.34, 0, 0.2, 0, 'trop' + v + '_body', fur(C, 4, { extra: (f, set, fw, fh) => { if (f === 'left' || f === 'right') for (let y = 0; y < fh; y++) set(Math.floor(fw / 2), y, D); } })); m.tail = pivot(r, 0, 0.2, -0.17); sbox(m, m.tail, 0.03, 0.26, 0.14, 0, 0, -0.07, 'trop' + v + '_tail', fur(D, 3)); } };
MOBS.pufferfish = { name: 'Pufferfish', hp: 3, w: 0.7, h: 0.7, speed: 1.4, kind: 'passive', snd: 'squish', egg: [[246, 183, 4], [55, 194, 242]], drops: [['pufferfish', 1, 1, 1], ['bone_meal', 1, 1, 0.05]],
  build(m, r) { sbox(m, r, 0.36, 0.36, 0.36, 0, 0.2, 0, 'puff_body', fur([226, 200, 60], 5, { extra: (f, set, fw, fh) => { if (f === 'front') { set(1, 2, [20, 20, 20]); set(fw - 2, 2, [20, 20, 20]); } for (let x = 0; x < fw; x += 2) set(x, 0, [240, 240, 230]); } })); m.tail = pivot(r, 0, 0.2, -0.18); sbox(m, m.tail, 0.03, 0.16, 0.12, 0, 0, -0.06, 'puff_tail', fur([200, 170, 50], 3)); } };
MOBS.squid = { name: 'Squid', hp: 10, w: 0.8, h: 0.8, speed: 1.6, kind: 'passive', snd: 'squish', egg: [[34, 61, 77], [112, 138, 153]], drops: [['ink_sac', 1, 3, 1]],
  build(m, r, glow) { const C = glow ? [40, 150, 150] : [44, 70, 96], D = glow ? [110, 230, 220] : [80, 110, 140]; sbox(m, r, 0.62, 0.8, 0.62, 0, 0.75, 0, (glow ? 'g' : '') + 'sq_body', fur(C, 6, { speck: [D, 0.2], extra: (f, set, fw) => { if (f === 'front') { set(2, 6, [240, 240, 240]); set(fw - 3, 6, [240, 240, 240]); } } }), glow ? { glowAll: true } : {});
    m.tent = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const p = pivot(r, Math.cos(a) * 0.22, 0.36, Math.sin(a) * 0.22); sbox(m, p, 0.1, 0.65, 0.1, 0, -0.32, 0, (glow ? 'g' : '') + 'sq_tent', fur(D, 4), glow ? { glowAll: true } : {}); m.tent.push(p); } } };
MOBS.glow_squid = Object.assign({}, MOBS.squid, { name: 'Glow Squid', egg: [[9, 89, 96], [133, 241, 188]], drops: [['glow_ink_sac', 1, 3, 1]], glowAll: true, build(m, r) { MOBS.squid.build(m, r, true); } });
MOBS.dolphin = { name: 'Dolphin', hp: 10, w: 0.9, h: 0.6, speed: 5, kind: 'neutral', dmg: 3, snd: 'chirp', egg: [[34, 54, 72], [249, 249, 249]], drops: [['cod', 0, 1, 1]],
  build(m, r) { const C = [110, 130, 150], D = [220, 228, 236]; sbox(m, r, 0.42, 0.42, 1.1, 0, 0.3, 0, 'dol_body', fur(C, 5, { bottom: D })); const h = pivot(r, 0, 0.32, 0.55); m.head = h; sbox(m, h, 0.36, 0.34, 0.3, 0, 0, 0.12, 'dol_head', fur(C, 4, { extra: (f, set, fw) => { if (f === 'left' || f === 'right') set(f === 'left' ? fw - 2 : 1, 2, [20, 20, 20]); } })); sbox(m, h, 0.14, 0.12, 0.26, 0, -0.08, 0.36, 'dol_beak', fur(D, 3));
    sbox(m, r, 0.06, 0.3, 0.24, 0, 0.62, -0.05, 'dol_fin', fur(C, 3)); m.tail = pivot(r, 0, 0.3, -0.55); sbox(m, m.tail, 0.2, 0.2, 0.4, 0, 0, -0.2, 'dol_tail', fur(C, 3)); sbox(m, m.tail, 0.6, 0.06, 0.18, 0, 0, -0.42, 'dol_fluke', fur(C, 3)); } };
MOBS.turtle = { name: 'Turtle', hp: 30, w: 1.2, h: 0.4, speed: 0.8, kind: 'passive', snd: 'squish', persist: true, egg: [[231, 231, 231], [0, 175, 175]], drops: [],
  build(m, r) { const SH = [70, 120, 70], SK = [140, 190, 120]; sbox(m, r, 1.0, 0.3, 1.1, 0, 0.26, 0, 'tur_shell', fur(SH, 6, { extra: (f, set, fw, fh) => { if (f === 'top') for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if ((x + y) % 5 === 0) set(x, y, [50, 90, 50]); } })); sbox(m, r, 0.9, 0.12, 1.0, 0, 0.08, 0, 'tur_belly', fur([210, 210, 180], 4));
    const h = pivot(r, 0, 0.22, 0.58); m.head = h; sbox(m, h, 0.3, 0.22, 0.3, 0, 0, 0.12, 'tur_head', fur(SK, 4, { extra: eyes([20, 20, 20], 1) })); m.legs = quadLegs(m, r, 0.12, 0.1, 0.42, 0.38, 'tur_leg', fur(SK, 3)); for (const l of m.legs) l.children[0].scale.set(2.2, 1, 1.4); } };
const AXO = [[240, 170, 190], [150, 110, 80], [240, 220, 120], [230, 230, 236], [80, 110, 220]];
MOBS.axolotl = { name: 'Axolotl', hp: 14, w: 0.75, h: 0.42, speed: 2.4, kind: 'passive', dmg: 2, snd: 'chirp', variants: 5, persist: true, egg: [[251, 193, 227], [168, 50, 101]], drops: [],
  build(m, r) { const v = pick(m, 5); const C = AXO[v]; sbox(m, r, 0.32, 0.2, 0.62, 0, 0.18, 0, 'axo_body' + v, fur(C, 4)); const h = pivot(r, 0, 0.2, 0.32); m.head = h; sbox(m, h, 0.44, 0.24, 0.3, 0, 0, 0.12, 'axo_head' + v, fur(C, 4, { extra: eyes([20, 20, 20], 1) })); for (const s of [-1, 1]) sbox(m, h, 0.04, 0.24, 0.14, s * 0.25, 0.1, 0.05, 'axo_gill' + v, fur(shadeC(C, 0.75), 3));
    m.tail = pivot(r, 0, 0.18, -0.3); sbox(m, m.tail, 0.04, 0.24, 0.5, 0, 0, -0.25, 'axo_tail' + v, fur(C, 3)); m.legs = quadLegs(m, r, 0.08, 0.12, 0.2, 0.2, 'axo_leg' + v, fur(C, 3)); } };
MOBS.tadpole = { name: 'Tadpole', hp: 6, w: 0.4, h: 0.3, speed: 1.6, kind: 'passive', snd: 'squish', egg: [[109, 83, 60], [22, 17, 11]], drops: [],
  build(m, r) { sbox(m, r, 0.2, 0.16, 0.2, 0, 0.1, 0.05, 'tad_body', fur([90, 70, 50], 3)); m.tail = pivot(r, 0, 0.1, -0.05); sbox(m, m.tail, 0.02, 0.12, 0.24, 0, 0, -0.12, 'tad_tail', fur([110, 90, 70], 2)); } };
const FISHY = new Set(['cod', 'salmon', 'tropical_fish', 'pufferfish']);
for (const k of ['cod', 'salmon', 'tropical_fish', 'pufferfish', 'tadpole']) MOBS[k].tick = (m, dt) => swimTick(m, dt, { speed: MOBS[k].speed, range: 6, shy: true, dry: 15,
  tick: k === 'pufferfish' ? (mm, d) => { const near = !player.dead && player.pos.distanceTo(mm.pos) < 2.5; mm.puff = clamp((mm.puff || 0) + (near ? d * 3 : -d), 0, 1); mm.body.scale.setScalar(mm.baseScale * (1 + mm.puff)); if (mm.puff > 0.8 && near && isSurv() && player.pos.distanceTo(mm.pos) < 1.3 && (mm.atkCD || 0) <= 0) { mm.atkCD = 1; player.hurt(1, mm.pos, 'a Pufferfish', 0.3); giveEffect('poison', 7, 0); } }
    : k === 'tadpole' ? (mm, d) => { mm.growT = (mm.growT == null ? 1200 : mm.growT) - d; if (mm.growT <= 0 && !isClientMP()) { mm.gone = true; spawnMob('frog', mm.pos.x, mm.pos.y, mm.pos.z); } } : null });
for (const k of ['squid', 'glow_squid']) MOBS[k].tick = (m, dt) => swimTick(m, dt, { speed: 1.6, range: 8, glow: k === 'glow_squid', agile: 1.2, tick: (mm) => { const p = (Math.sin(mm.age * 3) + 1) / 2; if (mm.tent) mm.tent.forEach((t, i) => { const a = i / 8 * Math.PI * 2; t.rotation.x = Math.sin(a) * (0.2 + p * 0.5); t.rotation.z = -Math.cos(a) * (0.2 + p * 0.5); }); mm.body.rotation.x = -1.2 * Math.min(1, Math.hypot(mm.vel.x, mm.vel.z) / 1.5); } });
MOBS.dolphin.tick = (m, dt) => swimTick(m, dt, { speed: 5, range: 12, jumps: true, agile: 3, dry: 60,
  follow: (mm) => !player.dead && inWater(player, 0.5) && player.pos.distanceTo(mm.pos) < 14 ? player.pos.clone().add(new V3(Math.sin(mm.age) * 2, 0, Math.cos(mm.age) * 2)) : null,
  tick: (mm, d) => { mm.goal = true; if (!player.dead && inWater(player, 0.5) && player.pos.distanceTo(mm.pos) < 9) giveEffect('dolphins_grace', 5, 0); if (inWater(mm, 0.3) && !inWater(mm, 0.9) && Math.random() < d * 0.3 && Math.hypot(mm.vel.x, mm.vel.z) > 3) mm.vel.y = 7; } });
MOBS.turtle.tick = (m, dt) => swimTick(m, dt, { speed: 1.2, range: 8, land: true });
MOBS.axolotl.tick = (m, dt) => {
  if (m.deadT > 0) { m.deadT -= dt; m.root.rotation.z = Math.PI / 2; m.vel.set(0, 0, 0); if (m.hp < m.maxHp && Math.random() < dt) m.hp++; return true; }
  return swimTick(m, dt, { speed: 2.4, range: 6, land: true, dry: 300, tick: (mm, d) => { const prey = G.mobs.find(o => (FISHY.has(o.type) && o.type !== 'pufferfish' || o.type === 'drowned' || o.type === 'guardian') && !o.dead && o.pos.distanceTo(mm.pos) < 8); if (prey) { mm.swimGoal = prey.pos.clone(); mm.swimT = 0.5; if (prey.pos.distanceTo(mm.pos) < 1.2 && (mm.atkCD || 0) <= 0) { mm.atkCD = 1; prey.hurt(2, mm.pos, 0.3); } } } }); };
// axolotls play dead when badly hurt; squid squirt ink
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, na) { const r = _h.call(this, dmg, src, kb, na);
    if (this.type === 'axolotl' && !this.dead && this.hp < 5 && !(this.deadT > 0) && Math.random() < 0.33) this.deadT = 10;
    if ((this.type === 'squid' || this.type === 'glow_squid') && !this.dead) Particles.emit(this.pos.x, this.pos.y + 0.6, this.pos.z, 30, this.type === 'squid' ? [[0.05, 0.05, 0.08], [0.15, 0.15, 0.2]] : [[0.3, 0.9, 0.85], [0.6, 1, 0.9]], 3, 1.2, 1, 1.2);
    return r; }; }
// Dolphin's Grace: much faster swimming
{ const _up = updatePlayer; updatePlayer = function (dt) { const r = _up.apply(this, arguments); const P = player; if (effLevel('dolphins_grace') && inWater(P, 0.4) && !P.riding) { const hs = Math.hypot(P.vel.x, P.vel.z); if (hs > 0.5 && hs < 9) { P.vel.x *= 1 + dt * 3; P.vel.z *= 1 + dt * 3; } } return r; }; }
// a baby turtle growing up drops a scute
{ const _sb = setBaby; setBaby = function (m, on, g) { const was = m.baby; const r = _sb(m, on, g); if (m.type === 'turtle' && was && !on && !isClientMP() && G.world) dropItem(IT.turtle_scute, 1, m.pos.x, m.pos.y + 0.3, m.pos.z); return r; }; }
Object.assign(BREED_FOOD, { turtle: ['seagrass'], axolotl: ['tropical_fish'], cod: [], salmon: [], tropical_fish: [], pufferfish: [], squid: [], glow_squid: [], dolphin: [], tadpole: [] });
Object.assign(MOB_XP, { cod: [1, 3], salmon: [1, 3], tropical_fish: [1, 3], pufferfish: [1, 3], squid: [1, 3], glow_squid: [1, 3], dolphin: [1, 3], turtle: [1, 3], axolotl: [1, 3], tadpole: [0, 0] });
Object.assign(MOB_PITCH, { cod: 1.5, salmon: 1.4, tropical_fish: 1.7, pufferfish: 1.6, squid: 0.8, glow_squid: 0.9, dolphin: 1.8, turtle: 0.8, axolotl: 1.7, tadpole: 2 });
// natural spawning in water: schools of fish, squid, dolphins in deep oceans, glow squid in dark water deep down
let waterSpawnT = 0;
function spawnWaterMobs(dt) {
  waterSpawnT -= dt; if (waterSpawnT > 0 || !world || world.dim !== 'overworld' || isClientMP() || !S.rules.doMobSpawning) return; waterSpawnT = 1.5;
  const count = (types) => G.mobs.filter(m => types.includes(m.type)).length; const P = player.pos;
  const a = Math.random() * Math.PI * 2, d = 18 + Math.random() * 26; const x = Math.floor(P.x + Math.cos(a) * d), z = Math.floor(P.z + Math.sin(a) * d); if (!world.loaded(x, z)) return;
  let top = -1; for (let y = SEA + 1; y > 4; y--) { const id = world.get(x, y, z); if (FKIND[id] === 1) { top = y; break; } if (SOLID[id]) break; }
  let bot = top; if (top > 0) while (bot > 2 && FKIND[world.get(x, bot - 1, z)] === 1) bot--;
  if (top > 0 && top - bot >= 3) {
    const y = bot + 1 + Math.floor(Math.random() * (top - bot - 2)); const deep = top - bot;
    const r = Math.random();
    if (r < 0.6 && count(['cod', 'salmon', 'tropical_fish', 'pufferfish']) < 14) { const k = pickWeighted({ cod: 60, salmon: 20, tropical_fish: 15, pufferfish: 5 }); const n = k === 'pufferfish' ? 1 : 3 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) spawnMob(k, x + 0.5 + (Math.random() - 0.5) * 2, y, z + 0.5 + (Math.random() - 0.5) * 2); }
    else if (r < 0.8 && count(['squid']) < 5 && deep >= 5) spawnMob('squid', x + 0.5, y, z + 0.5);
    else if (r < 0.9 && count(['dolphin']) < 3 && deep >= 10) { for (let i = 0; i < 2; i++) spawnMob('dolphin', x + 0.5 + i, y, z + 0.5); }
  }
  // glow squid: underground water in total darkness
  if (Math.random() < 0.2 && count(['glow_squid']) < 3) { const y2 = Math.floor(P.y) + (Math.random() * 20 | 0) - 10; const x2 = Math.floor(P.x + (Math.random() - 0.5) * 40), z2 = Math.floor(P.z + (Math.random() - 0.5) * 40);
    if (y2 < SEA - 20 && world.loaded(x2, z2) && FKIND[world.get(x2, y2, z2)] === 1 && FKIND[world.get(x2, y2 + 1, z2)] === 1 && lightLevels(x2, y2, z2).total === 0) spawnMob('glow_squid', x2 + 0.5, y2, z2 + 0.5); }
}
{ const _us = updateSpawning; updateSpawning = function (dt) { const r = _us.apply(this, arguments); spawnWaterMobs(dt); return r; }; }
// fish and squid don't count against the land animal cap, and are kept when you walk away only if named
{ const _mp = mobPersistent; mobPersistent = function (m) { if (m && m.t && (FISHY.has(m.type) || m.type === 'squid' || m.type === 'glow_squid' || m.type === 'dolphin' || m.type === 'tadpole' || m.type === 'bat')) return false; return _mp(m); }; }
