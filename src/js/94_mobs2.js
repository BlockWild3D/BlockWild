// ================= MOUNTS AND THEIR RIDERS (Mounts of Mayhem, Chase the Skies, Spring to Life, Tiny Takeover) =================
// Skeleton horses (tamed, from skeleton traps in thunderstorms - see 96_weather) and zombie horses: zombie horsemen
// (a spear-wielding zombie on a zombie horse) spawn at night in plains, savannas and forests; kill the rider, then
// tame the horse with red mushrooms. Zombie horses burn in daylight unless they wear horse armor.
// Camel husks: at night in deserts, ridden by a spear-wielding husk with a parched behind it; kill both and tame the
// camel husk with a rabbit's foot. Neither undead mount can breed.
// The parched: a desert skeleton (half the desert's skeletons) that doesn't burn and shoots arrows of Weakness.
// Nautiluses swim in every ocean; zombie nautiluses (coral ones in warm oceans) carry a trident-wielding drowned.
// Tame either with pufferfish, saddle it and ride it underwater (Breath of the Nautilus: no air lost); sprint to dash.
// Nautilus armor protects it.
// Dried ghasts (found in soul sand valleys or crafted) soak in water for 20 minutes and hatch a ghastling, which grows
// into a happy ghast in 20 more (snowballs speed that up and heal it). Put a harness on a happy ghast and fly it:
// it goes where you look, jump to climb.
// Pigs, cows and chickens come in temperate, warm and cold breeds by biome; cold chickens lay blue eggs and warm
// ones brown eggs. A golden dandelion stops a baby animal growing up (use it again to let it grow).
// ---------- mobs riding mobs ----------
function mountMob(rider, mount, seatY, seatZ = 0) { rider.mountOf = mount; rider.seat = [seatY, seatZ]; (mount.mobRiders || (mount.mobRiders = [])).push(rider); rider.persistent = mount.persistent; }
function liveRiders(m) { return (m.mobRiders || []).filter(r => !r.dead && !r.gone); }
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) {
    const M = this.mountOf; if (M && (M.dead || M.gone)) { this.mountOf = null; }
    if (this.mountOf) { const r = _u.call(this, dt); const s = Math.sin(M.yaw), c = Math.cos(M.yaw);
      this.pos.set(M.pos.x + s * this.seat[1], M.pos.y + this.seat[0], M.pos.z + c * this.seat[1]); this.vel.set(0, 0, 0); this.onGround = true; if (this.root) this.root.position.copy(this.pos);
      if (this.legs) for (const l of this.legs) l.rotation.x = -1.3; return r; }
    // a mount with a hostile rider carries it at the player
    const R = this.mobRiders && liveRiders(this); if (R && R.length && !this.tamedBy && !isClientMP()) { const P = player; const hostile = R.some(r => r.t.kind === 'hostile');
      if (hostile && isSurv() && !P.dead && P.pos.distanceTo(this.pos) < 32) { const d = steerTo(this, P.pos, 1.6); this.goalBoost = true; if (d < 1.4 && this.onGround && Math.random() < dt) this.vel.y = 5; } }
    return _u.call(this, dt); }; }
// riders don't take fall damage from their mount moving; when the mount dies the riders drop off
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, na) { if (this.mountOf && kb) kb = 0; return _h.call(this, dmg, src, kb, na); }; }
// ---------- skeleton horse, zombie horse, camel husk (horse-like mounts) ----------
const UNDEAD_MOUNT = new Set(['skeleton_horse', 'zombie_horse', 'camel_husk']);
function undeadHorsePaints(kind) { const bone = [214, 214, 206], dk = [60, 60, 60], ZH = [74, 120, 70], ZD = [40, 70, 40];
  if (kind === 'skeleton') { const b = fur(bone, 5, { extra: (f, set, fw, fh) => { if (f === 'top' || f === 'bottom') return; for (let y = 1; y < fh - 1; y += 2) for (let x = 1; x < fw - 1; x++) if ((x + y) % 4 !== 0) set(x, y, dk); } });
    return { body: b, leg: fur(bone, 5, { extra: (f, set, fw, fh) => { for (let x = 0; x < fw; x++) set(x, fh >> 1, [150, 150, 146]); } }), head: fur(bone, 5, { extra: (f, set, fw) => { if (f === 'left' || f === 'right') { set(f === 'left' ? 2 : fw - 3, 2, [20, 20, 20]); set(f === 'left' ? 2 : fw - 3, 3, [20, 20, 20]); } } }), muzzle: fur(bone, 4, { extra: (f, set, fw) => { if (f === 'front') { set(1, 2, dk); set(fw - 2, 2, dk); } } }), mane: fur([190, 190, 184], 6), tail: fur([190, 190, 184], 6) }; }
  return { body: fur(ZH, 7, { speck: [[110, 150, 96], 0.15], extra: (f, set, fw, fh) => { if (f === 'left' || f === 'right') for (let y = 2; y < fh - 2; y += 2) for (let x = 2; x < fw - 2; x += 3) set(x, y, bone); } }), leg: fur(ZH, 6, { foot: [2, [30, 40, 28]] }),
    head: fur(ZH, 6, { extra: (f, set, fw) => { if (f === 'left' || f === 'right') { set(f === 'left' ? 2 : fw - 3, 2, [160, 30, 20]); } } }), muzzle: fur([96, 130, 86], 5, { extra: (f, set, fw) => { if (f === 'front') { set(1, 2, ZD); set(fw - 2, 2, ZD); } } }), mane: fur(ZD, 8), tail: fur(ZD, 8) }; }
for (const [key, name, kind, egg] of [['skeleton_horse', 'Skeleton Horse', 'skeleton', [[104, 104, 80], [229, 229, 216]]], ['zombie_horse', 'Zombie Horse', 'zombie', [[49, 81, 49], [151, 194, 151]]]]) {
  MOBS[key] = Object.assign({}, MOBS.horse, { name, hp: 15, egg, snd: 'neigh', burns: kind === 'zombie', drops: kind === 'skeleton' ? [['bone', 0, 2, 1]] : [['rotten_flesh', 2, 3, 1]], undeadMount: kind,
    build(m, r) { const o = m.opts || (m.opts = {}); const code = kind === 'skeleton' ? 90 : 91; o.genes = Object.assign(rollHorse(), (o.rec && o.rec.h) || {}, { c: code, mk: 0, hp: 15, spd: 4.5 + Math.random() * 1.5, jmp: 0.5 + Math.random() * 0.25, tamed: kind === 'skeleton' ? 1 : 0 }); if (o.rec && o.rec.h) o.rec.h.c = code;
      const hp0 = horsePaints; horsePaints = () => undeadHorsePaints(kind); try { MOBS.horse.build(m, r); } finally { horsePaints = hp0; } } });
  MOB_XP[key] = [1, 3]; MOB_PITCH[key] = kind === 'skeleton' ? 1.3 : 0.8; UNDEAD.add(key); BREED_FOOD[key] = []; }
const HUSKC = [176, 140, 96], HUSKD = [130, 98, 64];
MOBS.camel_husk = Object.assign({}, MOBS.camel, { name: 'Camel Husk', hp: 32, egg: [[176, 140, 96], [96, 70, 46]], burns: false, undeadMount: 'husk', drops: [['rotten_flesh', 0, 2, 1]],
  build(m, r) { const C = HUSKC, C2 = HUSKD; const o = m.opts || {}; m.hg = Object.assign(rollHorse(), o.rec && o.rec.h ? o.rec.h : {}, { hp: 32, spd: 4.2, jmp: 0.42, c: 0, mk: 0 }); if (!(o.rec && o.rec.h && o.rec.h.tamed)) m.hg.tamed = 0;
    const ribs = (f, set, fw, fh) => { if (f === 'left' || f === 'right') for (let y = 3; y < fh - 2; y += 2) for (let x = 3; x < fw - 3; x++) if (x % 5) set(x, y, [226, 214, 186]); };
    sbox(m, r, 0.9, 0.7, 1.6, 0, 1.65, 0, 'cmh_body', fur(C, 7, { bottom: C2, speck: [[150, 116, 80], 0.15], extra: ribs })); sbox(m, r, 0.6, 0.45, 0.7, 0, 2.2, -0.05, 'cmh_hump', fur(C2, 6, { speck: [[110, 84, 56], 0.2] }));
    m.legs = quadLegs(m, r, 0.3, 1.3, 0.28, 0.6, 'cmh_leg', fur(C, 5, { foot: [2, [120, 90, 60]], extra: (f, set, fw, fh) => { for (let x = 0; x < fw; x++) set(x, fh >> 1, [214, 200, 170]); } }));
    const neck = pivot(r, 0, 1.75, 0.75); neck.rotation.x = 0.25; const hp = pivot(neck, 0, 0, 0); m.head = hp; m.neck = neck;
    sbox(m, hp, 0.38, 0.95, 0.38, 0, 0.45, 0.05, 'cmh_neck', fur(C, 6)); sbox(m, hp, 0.42, 0.4, 0.75, 0, 0.98, 0.28, 'cmh_head', fur(C, 5, { extra: (f, set, fw) => { if (f === 'left' || f === 'right') set(f === 'left' ? 3 : fw - 4, 2, [40, 20, 10]); if (f === 'front') for (let x = 1; x < fw - 1; x++) set(x, 4, [226, 214, 186]); } }));
    for (const s of [-1, 1]) sbox(m, hp, 0.1, 0.06, 0.18, s * 0.24, 1.12, 0.08, 'cmh_ear', fur(C2, 3));
    m.tail = pivot(r, 0, 1.85, -0.8); m.tail.rotation.x = 0.3; sbox(m, m.tail, 0.1, 0.6, 0.1, 0, -0.3, 0, 'cmh_tail', fur(C2, 4));
    const LE = [116, 66, 34]; m.saddleParts = [sbox(m, r, 0.95, 0.12, 0.9, 0, 2.08, 0.15, 'cml_saddle', fur(LE, 5)), sbox(m, r, 0.98, 0.5, 0.12, 0, 1.9, 0.15, 'cml_girth', fur([86, 46, 22], 4))]; m.reins = []; for (const p of m.saddleParts) p.visible = false; m.armorParts = []; m.horseBody = r; } });
MOB_XP.camel_husk = [1, 3]; UNDEAD.add('camel_husk'); BREED_FOOD.camel_husk = [];
{ const _so = seatOnHorse; seatOnHorse = function (P, m) { _so(P, m); if (m.type === 'camel_husk') P.pos.y += 0.9; }; }
// zombie horses burn in daylight unless armored; nobody can tame an undead mount while its rider lives
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { if (this.type === 'zombie_horse' && this.t) { const arm = this.hg && this.hg.armor >= 0; if (arm !== this.armSun) { this.armSun = arm; this.t = Object.assign({}, this.t, { burns: !arm }); } } return _u.call(this, dt); }; }
const TAME_FOOD = { zombie_horse: 'red_mushroom', camel_husk: 'rabbit_foot', nautilus: 'pufferfish', zombie_nautilus: 'pufferfish' };
{ const _mi = mobInteract; mobInteract = function (m, sneaking) {
    if (m && TAME_FOOD[m.type] && !m.dead) { const h = player.held(); const k = h && ITEMS[h.id] ? ITEMS[h.id].key : null; const tamed = m.hg ? m.hg.tamed : m.tamed;
      if (liveRiders(m).length) { Sfx.at('hmm', m.pos, 0.6, 0.6); return true; }
      if (!tamed) { if (k === TAME_FOOD[m.type] || (m.type.endsWith('nautilus') && k === 'pufferfish_bucket')) { if (S.mode !== 'creative') { if (k === 'pufferfish_bucket') player.inv[handSlot()] = { id: IT.water_bucket, count: 1 }; else useHeld(1); invDirty(); } S.swing = 1;
          if (Math.random() < 1 / 3) { if (m.hg) { mset(m, { tamed: 1 }); applyHorseGenes(m); } else { m.tamed = true; m.owner = myName(); } hearts(m, 6); Sfx.at('levelup', m.pos, 0.4, 1.6); } else smoke(m, 6); m.hp = Math.min(m.maxHp || m.t.hp, m.hp + 2); return true; }
        if (m.hg) { smoke(m, 4); Sfx.at('neigh_angry', m.pos, 0.6); return true; } }
    }
    return _mi.apply(this, arguments); }; }
// ---------- the parched ----------
const PARCH = [200, 180, 140];
MOBS.parched = { name: 'Parched', hp: 16, w: 0.6, h: 1.99, speed: 2.1, kind: 'hostile', dmg: 3, snd: 'rattle', burns: false, ranged: true, egg: [[200, 180, 140], [110, 80, 60]],
  drops: [['bone', 0, 2, 1], ['arrow', 0, 2, 1]],
  shoot(m, P) { shootArrow(new V3(m.pos.x, m.pos.y + 1.5, m.pos.z), P.eye().add(new V3(0, -0.3, 0)), 'mob', 3); const a = G.projectiles[G.projectiles.length - 1]; if (a) a.effect = ['weakness', 9, 0]; },
  build(m, r) { humanoidS(m, r, 'parched', skelPaints(PARCH, [90, 64, 40]), false, 1, { aw: 0.12, lw: 0.12, bw: 0.42, bd: 0.2, lx: 0.1 });
    sbox(m, r, 0.5, 0.6, 0.3, 0, 1.2, 0, 'parched_wrap', fur([170, 140, 100], 8, { speck: [[140, 110, 76], 0.25], extra: (f, set, fw, fh, rr) => { for (let x = 0; x < fw; x++) if (rr() < 0.4) set(x, fh - 1, [0, 0, 0, 0]); } }));
    sbox(m, m.head, 0.56, 0.18, 0.56, 0, 0.42, 0, 'parched_hood', fur([180, 150, 106], 6)); const bow = pivot(m.arms[1], 0, -0.66, 0.1); sbox(m, bow, 0.05, 0.7, 0.05, 0, 0, 0, 'skel_bow', fur([110, 76, 42], 5)); } };
MOB_XP.parched = [5, 5]; UNDEAD.add('parched'); MOB_PITCH.parched = 0.85;
// ---------- spears and tridents in riders' hands ----------
function giveSpear(m, col) { if (!m.arms || m.spearMesh) return; const g = pivot(m.arms[1], 0, -0.62, 0.08); g.rotation.x = 1.3; sbox(m, g, 0.05, 1.3, 0.05, 0, 0.2, 0, 'rider_spear_shaft', fur([110, 80, 50], 4)); sbox(m, g, 0.1, 0.24, 0.1, 0, 0.92, 0, 'rider_spear_head' + col.join('_'), fur(col, 5)); m.spearMesh = g; m.t = Object.assign({}, m.t, { dmg: (m.t.dmg || 3) + 2 }); }
// ---------- nautilus and zombie nautilus ----------
const NAUT_SHELL = [232, 214, 190], NAUT_STRIPE = [190, 96, 60];
function nautilusBuild(kind) { return function (m, r) { const zombie = kind !== 'nautilus', coral = kind === 'coral' || (m.opts && m.opts.coral);
    const shell = coral ? [214, 120, 150] : zombie ? [176, 200, 210] : NAUT_SHELL, stripe = coral ? [120, 200, 170] : zombie ? [70, 120, 80] : NAUT_STRIPE, flesh = zombie ? [70, 110, 70] : [214, 150, 120];
    const sp = fur(shell, 5, { extra: (f, set, fw, fh) => { if (f === 'top' || f === 'bottom') return; for (let x = 0; x < fw; x += 3) for (let y = 0; y < fh; y++) set(x, y, stripe); if (zombie) for (let k = 0; k < 4; k++) set((k * 5 + 2) % fw, (k * 3 + 1) % fh, [60, 140, 70]); } });
    m.shell = sbox(m, r, 0.9, 0.9, 0.95, 0, 0.55, -0.12, 'naut_shell' + kind + (coral ? 'c' : ''), sp);
    sbox(m, r, 0.62, 0.5, 0.35, 0, 0.42, 0.45, 'naut_body' + kind, fur(flesh, 5, { extra: (f, set, fw) => { if (f === 'left' || f === 'right') set(f === 'left' ? fw - 2 : 1, 1, [20, 20, 20]); } }));
    m.tent = []; for (let i = 0; i < 6; i++) { const p = pivot(r, -0.22 + (i % 3) * 0.22, 0.3 + Math.floor(i / 3) * 0.15, 0.6); sbox(m, p, 0.08, 0.08, 0.42, 0, 0, 0.2, 'naut_tent' + kind, fur(flesh, 4)); m.tent.push(p); }
    m.nArmor = sbox(m, r, 0.98, 0.3, 1.0, 0, 1.02, -0.12, 'naut_armor_plate', fur([210, 210, 214], 4)); m.nArmor.visible = false;
    m.saddleN = sbox(m, r, 0.6, 0.1, 0.5, 0, 1.04, -0.1, 'naut_saddle', fur([116, 66, 34], 5)); m.saddleN.visible = false; }; }
MOBS.nautilus = { name: 'Nautilus', hp: 15, w: 0.95, h: 1.1, speed: 2.2, kind: 'neutral', dmg: 4, snd: 'squish', egg: [[232, 214, 190], [190, 96, 60]], drops: [['nautilus_shell', 0, 1, 1]], swimmer: true, build: nautilusBuild('nautilus') };
MOBS.zombie_nautilus = { name: 'Zombie Nautilus', hp: 15, w: 0.95, h: 1.1, speed: 2.4, kind: 'neutral', dmg: 4, snd: 'squish', egg: [[176, 200, 210], [70, 120, 80]], drops: [['rotten_flesh', 0, 2, 1]], swimmer: true, build: nautilusBuild('zombie') };
UNDEAD.add('zombie_nautilus'); MOB_XP.nautilus = [1, 3]; MOB_XP.zombie_nautilus = [1, 3];
for (const k of ['nautilus', 'zombie_nautilus']) MOBS[k].tick = (m, dt) => { if (m.nArmor) m.nArmor.visible = !!m.nautArmor; if (m.saddleN) m.saddleN.visible = !!m.saddled;
  // dash at whoever angered it (or at the player when its rider is hostile)
  m.dashT = (m.dashT || 0) - dt; const angry = (m.angryAt === 'player' || liveRiders(m).some(r => r.t.kind === 'hostile')) && isSurv() && !player.dead;
  if (angry && inWater(m, 0.5) && m.pos.distanceTo(player.pos) < 16) { const d = player.pos.clone().add(new V3(0, 0.8, 0)).sub(m.pos); const L = d.length(); m.yaw = Math.atan2(d.x, d.z);
    if (m.dashT <= 0 && L < 9) { m.dashT = 3; d.normalize().multiplyScalar(12); m.vel.copy(d); Sfx.at('bow', m.pos, 0.4, 0.6); } else if (L > 2) { d.normalize().multiplyScalar(3); m.vel.lerp(d, Math.min(1, dt * 2)); }
    if (L < 1.6 && (m.atkCD || 0) <= 0) { m.atkCD = 1; player.hurt(m.t.dmg, m.pos, 'a ' + m.t.name); } m.atkCD = (m.atkCD || 0) - dt; }
  if (m.tent) m.tent.forEach((t, i) => { t.rotation.x = Math.sin((m.age || 0) * 4 + i) * 0.3; });
  return swimTick(m, dt, { speed: m.t.speed, range: 10, agile: 1.5, dry: 30 }); };
// nautilus armor and saddles
{ const _mi = mobInteract; mobInteract = function (m, sneaking) {
    if (m && (m.type === 'nautilus' || m.type === 'zombie_nautilus') && !m.dead && m.tamed && !liveRiders(m).length) { const h = player.held(); const hd = h && ITEMS[h.id];
      if (hd && hd.kind === 'nautilus_armor' && !m.nautArmor) { m.nautArmor = { id: h.id, def: hd.ndef }; useHeld(1); Sfx.at('armor', m.pos, 0.8); S.swing = 1; return true; }
      if (h && h.id === IT.saddle && !m.saddled) { m.saddled = true; useHeld(1); Sfx.at('saddle', m.pos, 0.8); S.swing = 1; return true; }
      if (h && h.id === IT.shears && m.nautArmor) { dropItem(m.nautArmor.id, 1, m.pos.x, m.pos.y + 0.6, m.pos.z); m.nautArmor = null; S.swing = 1; return true; }
      if (m.saddled && !sneaking) { rideMob(m); m.freeRide = 'swim'; return true; } }
    return _mi.apply(this, arguments); }; }
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, na) { if (this.nautArmor && dmg > 0) dmg *= 1 - Math.min(20, this.nautArmor.def) / 25; if ((this.type === 'nautilus' || this.type === 'zombie_nautilus') && src && !na && !this.tamed) this.angryAt = 'player';
    const was = this.dead; const r = _h.call(this, dmg, src, kb, na); if (!was && this.dead) { if (this.saddled) dropItem(IT.saddle, 1, this.pos.x, this.pos.y + 0.5, this.pos.z); if (this.nautArmor) dropItem(this.nautArmor.id, 1, this.pos.x, this.pos.y + 0.5, this.pos.z); } return r; }; }
// ---------- dried ghast, ghastling, happy ghast ----------
const GH_WHITE = [244, 244, 242];
function ghastFace(happy) { return (f, set, fw, fh) => { if (f !== 'front') return; const ey = Math.round(fh * 0.38), mx = fw >> 1; for (const ex of [Math.round(fw * 0.28), Math.round(fw * 0.72) - 1]) { set(ex, ey, [40, 40, 44]); set(ex + 1, ey, [40, 40, 44]); set(ex, ey + 1, [70, 70, 74]); set(ex + 1, ey + 1, [70, 70, 74]); }
  if (happy) { for (let x = mx - 2; x <= mx + 1; x++) set(x, ey + 4, [80, 80, 84]); set(mx - 3, ey + 3, [80, 80, 84]); set(mx + 2, ey + 3, [80, 80, 84]); set(Math.round(fw * 0.2), ey + 2, [240, 170, 170]); set(Math.round(fw * 0.8), ey + 2, [240, 170, 170]); } }; }
function ghostBuild(size, key) { return function (m, r) { sbox(m, r, size, size, size, 0, size * 0.65, 0, key + '_body', fur(GH_WHITE, 3, { speck: [[226, 226, 224], 0.08], extra: ghastFace(true) }), { ppb: Math.max(4, Math.round(16 / size)) });
  m.tent = []; for (let i = 0; i < 9; i++) { const p = pivot(r, (-0.33 + (i % 3) * 0.33) * size, size * 0.15, (-0.33 + Math.floor(i / 3) * 0.33) * size); const L = size * [0.35, 0.5, 0.42][i % 3]; sbox(m, p, size * 0.07, L, size * 0.07, 0, -L / 2, 0, key + '_tent' + i % 3, fur([236, 236, 232], 3)); m.tent.push(p); }
  if (key === 'hghast') { m.harness = pivot(r, 0, 0, 0); m.harnessCol = null; m.goggles = sbox(m, r, size * 0.84, size * 0.14, size * 0.06, 0, size * 0.92, size * 0.51, 'hghast_goggles', fur([110, 90, 70], 3, { extra: (f, set, fw) => { if (f === 'front') for (const x of [Math.round(fw * 0.28), Math.round(fw * 0.72) - 1]) { set(x, 0, [170, 220, 240]); set(x + 1, 0, [170, 220, 240]); } } })); m.goggles.visible = false; } }; }
MOBS.ghastling = { name: 'Ghastling', hp: 20, w: 1.1, h: 1.1, speed: 1.6, kind: 'passive', fly: true, persist: true, snd: 'ghast', egg: [[244, 244, 242], [190, 190, 196]], drops: [], build: ghostBuild(1, 'ghastling') };
MOBS.happy_ghast = { name: 'Happy Ghast', hp: 20, w: 4, h: 4, speed: 2, kind: 'passive', fly: true, persist: true, snd: 'ghast', egg: [[244, 244, 242], [120, 170, 220]], drops: [], build: ghostBuild(4, 'hghast') };
MOB_PITCH.ghastling = 2; MOB_PITCH.happy_ghast = 1.4;
function harnessLook(m) { if (!m.harness) return; while (m.harness.children.length) m.harness.remove(m.harness.children[0]); if (m.goggles) m.goggles.visible = !!m.harnessed; if (!m.harnessed) return; const col = ITEMS[m.harnessed] && ITEMS[m.harnessed].hcol || [200, 60, 60];
  sbox(m, m.harness, 4.06, 0.5, 4.06, 0, 3.7, 0, 'hghast_harness' + col.join('_'), fur(col, 4, { extra: (f, set, fw, fh) => { for (let x = 0; x < fw; x++) set(x, 0, shadeC(col, 0.7)); } })); sbox(m, m.harness, 1.6, 0.14, 1.6, 0, 4.66, 0, 'hghast_seat', fur([120, 76, 40], 3)); }
const ghastFlyTick = (m, dt, o) => { m.age = (m.age || 0) + dt; m.hurtT = Math.max(0, (m.hurtT || 0) - dt); m.lightT = (m.lightT || 0) - dt; if (m.lightT <= 0) { m.lightT = 0.3; m.light = Math.max(G.minLight || 0, world.lightAt(m.pos.x, m.pos.y + m.h / 2, m.pos.z, G.daylight)); }
  const P = player; const h = P.held(); const lure = h && (h.id === IT.snowball || (o.harnessLure && ITEMS[h.id] && ITEMS[h.id].kind === 'harness')) && P.pos.distanceTo(m.pos) < 16 && !P.dead;
  let goal = null; if (lure) goal = P.pos.clone().add(new V3(0, o.size * 0.6, 0)); else if (m.harnessed && o.size > 2) goal = null; else { m.wT = (m.wT || 0) - dt; if (m.wT <= 0 || !m.wGoal) { m.wT = 4 + Math.random() * 6; m.wGoal = m.pos.clone().add(new V3((Math.random() - 0.5) * 16, (Math.random() - 0.4) * 4, (Math.random() - 0.5) * 16)); const gh = world.surfaceY(Math.floor(m.wGoal.x), Math.floor(m.wGoal.z)); if (m.wGoal.y < gh + 1) m.wGoal.y = gh + 1 + Math.random() * 6; } goal = m.wGoal; }
  if (goal) { const d = goal.clone().sub(m.pos); const L = d.length(); if (L > (lure ? o.size + 1.5 : 1)) { d.multiplyScalar(Math.min(1, m.t.speed / L)); m.vel.lerp(d, Math.min(1, dt * 1.5)); m.yaw = Math.atan2(d.x, d.z); } else m.vel.multiplyScalar(Math.pow(0.2, dt)); }
  else m.vel.multiplyScalar(Math.pow(0.1, dt));
  if (m.tent) m.tent.forEach((t, i) => { t.rotation.x = Math.sin(m.age * 2 + i) * 0.25; t.rotation.z = Math.cos(m.age * 1.7 + i * 2) * 0.2; });
  moveEntity(m, dt); m.root.position.copy(m.pos); m.root.rotation.y = m.yaw; if (m.colorize) m.colorize(); return true; };
MOBS.ghastling.tick = (m, dt) => { if (!isClientMP()) { if (m.growT === undefined) m.growT = 1200; if (!m.noGrow) m.growT -= dt;
    if (m.growT <= 0) { const g = spawnMob('happy_ghast', m.pos.x, m.pos.y, m.pos.z); if (g) g.persistent = true; m.dead = true; m.gone = true; if (m.remove) m.remove(); Sfx.at('levelup', m.pos, 0.3, 0.6); return true; } }
  return ghastFlyTick(m, dt, { size: 1 }); };
MOBS.happy_ghast.tick = (m, dt) => { if (m.harnessed !== m.harnessShown) { m.harnessShown = m.harnessed; harnessLook(m); } if (m.rider === 'local') return true; return ghastFlyTick(m, dt, { size: 4, harnessLure: true }); };
{ const _mi = mobInteract; mobInteract = function (m, sneaking) {
    if (m && (m.type === 'ghastling' || m.type === 'happy_ghast') && !m.dead) { const h = player.held(); const hd = h && ITEMS[h.id];
      if (h && h.id === IT.snowball) { if (m.type === 'ghastling') m.growT = (m.growT === undefined ? 1200 : m.growT) * 0.9; m.hp = Math.min(m.t.hp, m.hp + 1); useHeld(1); hearts(m, 3); S.swing = 1; Sfx.at('chirp', m.pos, 0.6, 1.4); return true; }
      if (m.type === 'happy_ghast') {
        if (hd && hd.kind === 'harness' && !m.harnessed) { m.harnessed = h.id; useHeld(1); Sfx.at('saddle', m.pos, 1); S.swing = 1; return true; }
        if (h && h.id === IT.shears && m.harnessed) { dropItem(m.harnessed, 1, m.pos.x, m.pos.y + 1, m.pos.z); m.harnessed = 0; S.swing = 1; return true; }
        if (m.harnessed && !sneaking) { rideMob(m); m.freeRide = 'fly'; return true; } }
      if (h && IT.golden_dandelion !== undefined && h.id === IT.golden_dandelion && m.type === 'ghastling') { m.noGrow = !m.noGrow; useHeld(1); S.swing = 1; return true; } }
    return _mi.apply(this, arguments); }; }
// riding where you look: the happy ghast flies, the nautilus swims
{ const _ru = rideUpdate; rideUpdate = function (P, dt) { const m = P.riding; if (!m || !m.mobRide || !m.freeRide) return _ru.apply(this, arguments);
    if (m.dead || m.gone) { P.riding = null; m.freeRide = null; return; } if (!S.uiOpen && kd('sneak')) { m.freeRide = null; mobDismount(); return; }
    let f = 0, s = 0; if (!S.uiOpen) { if (kd('forward') || keys.ArrowUp) f++; if (kd('back') || keys.ArrowDown) f--; if (kd('right') || keys.ArrowRight) s++; if (kd('left') || keys.ArrowLeft) s--; f += T.my; s += T.mx; }
    const fly = m.freeRide === 'fly'; const inW = inWater(m, 0.4); const dash = !fly && (kd('sprint') || P.sprinting) && f > 0;
    m.dashCD = Math.max(0, (m.dashCD || 0) - dt); if (dash && m.dashCD <= 0 && inW) { m.dashCD = 2.5; m.dashT = 0.6; Sfx.at('bow', m.pos, 0.5, 0.6); } m.dashT = Math.max(0, (m.dashT || 0) - dt);
    const sp = fly ? 6 : inW ? (m.type === 'zombie_nautilus' ? 4.4 : 4) * (m.dashT > 0 ? 2.6 : 1) : 0.8;
    const cy = Math.cos(P.pitch), dirx = -Math.sin(P.yaw) * cy, diry = Math.sin(P.pitch), dirz = -Math.cos(P.yaw) * cy; const sx = Math.cos(P.yaw), sz = -Math.sin(P.yaw);
    const want = new V3(dirx * f + sx * s * 0.7, (fly || inW) ? diry * f : 0, dirz * f + sz * s * 0.7).multiplyScalar(sp);
    if (!S.uiOpen && kd('jump')) want.y += fly ? 4 : inW ? 3 : 0;
    if (fly || inW) m.vel.lerp(want, Math.min(1, dt * (fly ? 2.5 : 3))); else { m.vel.x = want.x; m.vel.z = want.z; m.vel.y = Math.max(m.vel.y - 28 * dt, -30); }
    if (f || s) m.yaw = P.yaw + Math.PI;
    moveEntity(m, dt); m.root.position.copy(m.pos); m.root.rotation.y = m.yaw; if (m.animate) m.animate(dt);
    const seat = fly ? m.h + 0.05 : 0.95; P.pos.set(m.pos.x, m.pos.y + seat, m.pos.z); P.vel.copy(m.vel); P.onGround = true; P.peak = null; P.sprinting = false; P.sneaking = false; P.swimming = false;
    if (!fly && player.effects) player.effects.breath_of_the_nautilus = { t: 1, amp: 0 }; }; }
Object.assign(EFFECTS, { breath_of_the_nautilus: 'Breath of the Nautilus' });
// air doesn't run out while Breath of the Nautilus lasts
{ const _ua = updateAir; updateAir = function (dt, fl) { if (player.effects && player.effects.breath_of_the_nautilus) { const r = _ua.call(this, 0, fl); return r; } return _ua.apply(this, arguments); }; }
// dried ghasts soak up water: placed in water (or right next to it) they move a stage every 5 minutes and hatch after 20
{ const _ub = updateBoats; let scanT = 0; const prog = new Map(); updateBoats = function (dt) { const r = _ub(dt); if (!world || isClientMP()) return r; scanT -= dt; if (scanT > 0) return r; scanT = 2; const P = player.pos; const DG = [B.DRIED_GHAST, B['DRIED_GHAST#1'], B['DRIED_GHAST#2'], B['DRIED_GHAST#3']];
    for (const c of world.chunks.values()) { const ox = c.cx * 16, oz = c.cz * 16; if (Math.abs(ox + 8 - P.x) > 64 || Math.abs(oz + 8 - P.z) > 64) continue;
      for (const j of chunkIdx(c).dg) { const id = c.d[j]; const st = DG.indexOf(id); if (st < 0) continue; const y = (j / 256) | 0, x = ox + (j & 15), z = oz + ((j >> 4) & 15); const k = x + ',' + y + ',' + z;
        const wet = [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]].some(([a, b, cc]) => FKIND[world.get(x + a, y + b, z + cc)] === 1) || c.wl && c.wl.has && c.wl.has(j);
        if (!wet) { prog.delete(k); continue; } const t = (prog.get(k) || 0) + 2; prog.set(k, t); if (Math.random() < 0.05) Particles.emit(x + 0.5, y + 0.6, z + 0.5, 2, [[0.8, 0.9, 1]], 0.5, 0.4, -1, 0.3);
        if (t >= 300) { prog.delete(k); if (st < 3) { world.set(x, y, z, DG[st + 1]); mpBlock(x, y, z, DG[st + 1]); } else { world.set(x, y, z, 0); mpBlock(x, y, z, 0); const g = spawnMob('ghastling', x + 0.5, y + 0.2, z + 0.5); if (g) g.persistent = true; Sfx.at('chirp', new V3(x, y, z), 0.8, 1.6); } } } }
    return r; }; }
// dried ghasts lie in soul sand valleys, near the bones of nether fossils
{ const _gn = genNetherChunk; genNetherChunk = function (w, c) { const r = _gn.apply(this, arguments); try { const g = w.gen; if (!g || !g.biome) return r; const bx = c.cx * 16, bz = c.cz * 16; if (g.biome(bx + 8, bz + 8) !== 3 || rnd01(c.cx, c.cz, 7717, w.seed) > 0.08) return r;
      const d = c.d; for (let t = 0; t < 30; t++) { const lx = 2 + (rnd01(c.cx, t, c.cz, w.seed + 1) * 12 | 0), lz = 2 + (rnd01(c.cx, t, c.cz, w.seed + 2) * 12 | 0); for (let y = 100; y > 20; y--) { const j = (y * 16 + lz) * 16 + lx; if (d[j] === 0 && (d[j - 256] === B.SOUL_SAND || d[j - 256] === B.SOUL_SOIL)) { d[j] = B.DRIED_GHAST; return r; } } } } catch (e) { } return r; }; }
// ---------- farm animal breeds (Spring to Life) ----------
const WARM_B = (() => { let s = null; return () => s || (s = new Set([BIO.DESERT, BIO.SAVANNA, BIO.BADLANDS, BIO.JUNGLE, BIO.MANGROVE_SWAMP])); })(), COLD_B = (() => { let s = null; return () => s || (s = new Set([BIO.SNOWY, BIO.TAIGA])); })();
function climateAt(x, z) { if (!world || world.dim !== 'overworld') return 'temperate'; const c = world.gen.column(Math.floor(x), Math.floor(z)); if (WARM_B().has(c.b) || c.v === BV.WARM_OCEAN) return 'warm'; if (COLD_B().has(c.b) || (typeof FROZEN_V === 'function' && FROZEN_V().has(c.v)) || c.v === BV.GROVE || c.v === BV.SNOWY_SLOPES) return 'cold'; return 'temperate'; }
const FARM_V = new Set(['pig', 'cow', 'chicken']);
{ const _sm = spawnMob; spawnMob = function (type, x, y, z, opts) { if (FARM_V.has(type)) { opts = Object.assign({}, opts || {}); if (!opts.fv) opts.fv = (opts.rec && opts.rec.fv) || S.nextFV || climateAt(x, z); } const m = _sm(type, x, y, z, opts); if (m && FARM_V.has(type)) m.fv = opts.fv; return m; }; }
{ const _r = mobRecord; mobRecord = function (m) { const r = _r.apply(this, arguments); if (m.fv && m.fv !== 'temperate') r.fv = m.fv; return r; }; }
const FV_PAL = { pig: { warm: [[178, 98, 70], [140, 72, 52]], cold: [[120, 96, 84], [86, 66, 58]] }, cow: { warm: [[170, 84, 44], [230, 210, 180]], cold: [[156, 104, 60], [214, 196, 160]] }, chicken: { warm: [[210, 130, 60], [180, 96, 40]], cold: [[110, 110, 116], [80, 80, 86]] } };
{ const pigB = MOBS.pig.build, cowB = MOBS.cow.build, chB = MOBS.chicken.build;
  const fvOf = (m) => (m.opts && m.opts.fv) || 'temperate';
  MOBS.pig.build = function (m, r) { const v = fvOf(m); if (v === 'temperate') return pigB.call(this, m, r); const [C, D] = FV_PAL.pig[v];
    sbox(m, r, 0.62, 0.55, 0.95, 0, 0.64, 0, 'pig_body_' + v, fur(C, 7, v === 'cold' ? { speck: [D, 0.35] } : { patch: [D, 0.6], speck: [shadeC(C, 1.15), 0.1] }));
    if (v === 'cold') sbox(m, r, 0.7, 0.2, 1.0, 0, 0.92, 0, 'pig_fluff', fur(D, 9, { speck: [shadeC(D, 1.3), 0.3] }));
    const h = pivot(r, 0, 0.78, 0.48); m.head = h; sbox(m, h, 0.5, 0.5, 0.45, 0, 0, 0.16, 'pig_head_' + v, fur(C, 6, { extra: (f, set, fw) => { if (f === 'front') { set(1, 3, WHT); set(2, 3, BLK); set(fw - 3, 3, BLK); set(fw - 2, 3, WHT); } } }));
    sbox(m, h, 0.3, 0.2, 0.06, 0, -0.07, 0.41, 'pig_snout_' + v, fur(shadeC(C, 1.15), 4, { extra: (f, set, fw) => { if (f === 'front') { set(1, 1, [70, 40, 30]); set(fw - 2, 1, [70, 40, 30]); } } }));
    if (v === 'warm') for (const s of [-1, 1]) sbox(m, h, 0.06, 0.12, 0.06, s * 0.2, -0.2, 0.42, 'pig_tusk', fur([236, 226, 200], 3));
    m.legs = quadLegs(m, r, 0.22, 0.37, 0.18, 0.3, 'pig_leg_' + v, fur(C, 6, { foot: [2, shadeC(D, 0.6)] })); m.tail = pivot(r, 0, 0.8, -0.48); sbox(m, m.tail, 0.07, 0.07, 0.16, 0, 0.02, -0.07, 'pig_tail_' + v, fur(D, 4)); };
  MOBS.cow.build = function (m, r) { const v = fvOf(m); if (v === 'temperate') return cowB.call(this, m, r); const [C, D] = FV_PAL.cow[v];
    sbox(m, r, 0.8, 0.72, 1.15, 0, 0.97, 0, 'cow_body_' + v, fur(C, 7, v === 'cold' ? { speck: [shadeC(C, 0.8), 0.3], bottom: shadeC(C, 0.8) } : { patch: [D, 0.66], bottom: D }));
    if (v === 'cold') { sbox(m, r, 0.9, 0.3, 1.2, 0, 0.64, 0, 'cow_shag', fur(shadeC(C, 0.85), 9, { extra: (f, set, fw, fh, rr) => { for (let x = 0; x < fw; x++) if (rr() < 0.5) set(x, fh - 1, [0, 0, 0, 0]); } })); }
    sbox(m, r, 0.3, 0.12, 0.26, 0, 0.56, -0.25, 'cow_udder', fur([236, 170, 170], 4));
    const h = pivot(r, 0, 1.2, 0.6); m.head = h; sbox(m, h, 0.55, 0.5, 0.4, 0, 0, 0.12, 'cow_head_' + v, fur(C, 6, { extra: (f, set, fw, fh) => { if (f !== 'front') return; set(1, 3, WHT); set(2, 3, BLK); set(fw - 3, 3, BLK); set(fw - 2, 3, WHT); if (v === 'cold') for (let x = 0; x < fw; x++) set(x, 0, shadeC(C, 0.75)); } }));
    sbox(m, h, 0.42, 0.22, 0.08, 0, -0.13, 0.35, 'cow_muzzle_' + v, fur(v === 'warm' ? [200, 150, 120] : [190, 160, 140], 4, { extra: (f, set, fw) => { if (f === 'front') { set(1, 1, [96, 66, 60]); set(fw - 2, 1, [96, 66, 60]); } } }));
    for (const s of [-1, 1]) { const hp = pivot(h, s * 0.27, 0.22, 0.1); if (v === 'warm') { hp.rotation.z = -s * 1.1; sbox(m, hp, 0.08, 0.34, 0.08, 0, 0.17, 0, 'cow_horn_warm', fur([236, 226, 200], 4, { topc: [120, 110, 90], topRows: [2, [150, 140, 120]] })); } else { hp.rotation.z = -s * 0.6; sbox(m, hp, 0.08, 0.16, 0.08, 0, 0.08, 0, 'cow_horn', fur([226, 220, 200], 4)); } }
    m.legs = quadLegs(m, r, 0.24, 0.62, 0.24, 0.4, 'cow_leg_' + v, fur(C, 6, { foot: [2, [44, 36, 32]] })); m.tail = pivot(r, 0, 1.28, -0.58); sbox(m, m.tail, 0.07, 0.6, 0.07, 0, -0.3, 0, 'cow_tail_' + v, fur(C, 4, { foot: [3, [40, 30, 24]] })); };
  MOBS.chicken.build = function (m, r) { const v = fvOf(m); if (v === 'temperate') return chB.call(this, m, r); const [C, D] = FV_PAL.chicken[v];
    sbox(m, r, 0.38, 0.36, 0.5, 0, 0.47, 0, 'ch_body_' + v, fur(C, 5, { speck: [D, 0.2] })); sbox(m, r, 0.3, v === 'warm' ? 0.3 : 0.22, 0.1, 0, v === 'warm' ? 0.66 : 0.62, -0.27, 'ch_tail_' + v, fur(v === 'warm' ? [60, 80, 70] : D, 4));
    const h = pivot(r, 0, 0.74, 0.22); m.head = h; sbox(m, h, 0.25, 0.32, 0.2, 0, 0, 0, 'ch_head_' + v, fur(v === 'cold' ? [130, 130, 136] : C, 4, { extra: (f, set, fw) => { if (f === 'front') { set(0, 1, BLK); set(fw - 1, 1, BLK); } if (f === 'left' || f === 'right') set(1, 1, BLK); } }));
    sbox(m, h, 0.16, 0.08, 0.12, 0, 0, 0.15, 'ch_beak', fur([244, 176, 44], 4, { foot: [1, [214, 140, 30]] })); sbox(m, h, 0.08, 0.12, 0.06, 0, -0.1, 0.12, 'ch_wattle', fur([214, 40, 40], 4)); sbox(m, h, 0.06, 0.08, 0.16, 0, 0.2, 0.02, 'ch_comb', fur([214, 40, 40], 4));
    m.wings = [pivot(r, -0.21, 0.58, 0), pivot(r, 0.21, 0.58, 0)]; for (const w of m.wings) sbox(m, w, 0.06, 0.26, 0.38, 0, -0.1, 0, 'ch_wing_' + v, fur(D, 4));
    m.legs = []; for (const x of [-0.08, 0.08]) { const p = pivot(r, x, 0.29, 0); sbox(m, p, 0.05, 0.29, 0.05, 0, -0.145, 0, 'ch_leg', fur([232, 170, 40], 4)); sbox(m, p, 0.14, 0.03, 0.14, 0, -0.28, 0.04, 'ch_foot', fur([232, 170, 40], 4)); m.legs.push(p); } }; }
// babies take a parent's breed; eggs: cold chickens lay blue eggs, warm ones brown; thrown eggs hatch that breed
{ const _ss = spawnShared; spawnShared = function (type, x, y, z, baby) { if (FARM_V.has(type) && S.breedFV) { S.nextFV = S.breedFV; try { return _ss.apply(this, arguments); } finally { S.nextFV = null; } } return _ss.apply(this, arguments); }; }
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { if (FARM_V.has(this.type) && this.loveT > 0) S.breedFV = this.fv; const r = _u.call(this, dt); S.breedFV = null; return r; }; }
{ const _di = dropItem; dropItem = function (id, n, x, y, z, a, b) { if (id === IT.egg && S.layingFV) id = S.layingFV === 'cold' ? IT.blue_egg : S.layingFV === 'warm' ? IT.brown_egg : id; return _di.call(this, id, n, x, y, z, a, b); }; }
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { if (this.type === 'chicken' && this.fv && this.fv !== 'temperate') { S.layingFV = this.fv; try { return _u.call(this, dt); } finally { S.layingFV = null; } } return _u.call(this, dt); }; }
{ const _ua = useAction; useAction = function (eye, dir) { const h = player.held(); const hd = h && ITEMS[h.id]; if (hd && hd.kind === 'egg' && hd.eggVar) { S.thrownFV = hd.eggVar; const n0 = G.projectiles.length; const r = _ua.apply(this, arguments); for (let i = n0; i < G.projectiles.length; i++) if (G.projectiles[i].kind === 'egg') G.projectiles[i].fv = hd.eggVar; S.thrownFV = null; return r; } return _ua.apply(this, arguments); }; }
{ const _pi = projImpact; projImpact = function (a, mob) { if (a.kind === 'egg' && a.fv) { S.nextFV = a.fv; try { return _pi(a, mob); } finally { S.nextFV = null; } } return _pi(a, mob); }; }
// ---------- golden dandelion: a baby stops (or starts again) growing up ----------
{ const _mi = mobInteract; mobInteract = function (m, sneaking) { const h = player.held(); if (m && m.baby && h && IT.golden_dandelion !== undefined && h.id === IT.golden_dandelion && !m.dead) { m.ageLock = !m.ageLock; useHeld(1); S.swing = 1; Particles.emit(m.pos.x, m.pos.y + m.h, m.pos.z, 6, [[1, 0.85, 0.3]], 0.8, 0.6, -1, 0.4); Sfx.at('chirp', m.pos, 0.5, 1.2); return true; } return _mi.apply(this, arguments); }; }
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { if (this.ageLock && this.baby) this.growT += dt; return _u.call(this, dt); }; }
{ const _r = mobRecord; mobRecord = function (m) { const r = _r.apply(this, arguments); if (m.ageLock) r.al = 1; if (m.harnessed) r.hn = m.harnessed; if (m.nautArmor) r.na = m.nautArmor; if (m.saddled && (m.type === 'nautilus' || m.type === 'zombie_nautilus')) r.sa = 1; if (m.type === 'ghastling' && m.growT !== undefined) r.gt = Math.round(m.growT); if ((m.type === 'nautilus' || m.type === 'zombie_nautilus') && m.tamed) r.tm = 1; return r; };
  const _f = mobFromRecord; mobFromRecord = function (rec) { const m = _f.apply(this, arguments); if (m && rec) { if (rec.al) m.ageLock = true; if (rec.hn) m.harnessed = rec.hn; if (rec.na) m.nautArmor = rec.na; if (rec.gt !== undefined) m.growT = rec.gt; } return m; }; }
// ---------- natural spawning ----------
{ const _sm = spawnMob; spawnMob = function (type, x, y, z, opts) {
    if (!S.natSpawn || !world || world.dim !== 'overworld' || S.jockeyBusy) return _sm(type, x, y, z, opts);
    const col = world.gen.column(Math.floor(x), Math.floor(z)); const sky = world.skyAt(Math.floor(x), Math.floor(y + 1), Math.floor(z)) >= 1;
    if (type === 'skeleton' && col.b === BIO.DESERT && sky && Math.random() < 0.5) type = 'parched';
    const jockey = (mountT, riderT, seatY, extra) => { S.jockeyBusy = true; try { const mt = _sm(mountT, x, y, z); if (!mt) return null; const rd = _sm(riderT, x, y + seatY, z); if (rd) { mountMob(rd, mt, seatY, extra ? 0.35 : 0); giveSpear(rd, [200, 200, 206]); rd.jockey = true; } if (extra) { const r2 = _sm(extra, x, y + seatY, z); if (r2) { mountMob(r2, mt, seatY, -0.55); r2.jockey = true; } } return rd || mt; } finally { S.jockeyBusy = false; } };
    if (type === 'zombie' && sky && (col.b === BIO.PLAINS || col.b === BIO.SAVANNA || col.b === BIO.FOREST) && Math.random() < 0.05) return jockey('zombie_horse', 'zombie', 1.15);
    if (type === 'husk' && sky && col.b === BIO.DESERT && Math.random() < 0.05) return jockey('camel_husk', 'husk', 1.85, 'parched');
    return _sm(type, x, y, z, opts); }; }
// drowned sometimes ride zombie nautiluses; nautiluses swim in every ocean
{ const _sm = spawnMob; spawnMob = function (type, x, y, z, opts) { const m = _sm(type, x, y, z, opts);
    if (m && type === 'drowned' && S.natSpawn && !S.jockeyBusy && world && world.dim === 'overworld' && inWater(m, 0.5) && Math.random() < 0.12) { const col = world.gen.column(Math.floor(x), Math.floor(z)); S.jockeyBusy = true;
      try { const n = _sm('zombie_nautilus', x, y - 0.6, z, { coral: col.v === BV.WARM_OCEAN }); if (n) { mountMob(m, n, 0.9); m.jockey = true; } } finally { S.jockeyBusy = false; } }
    return m; }; }
{ const _ocg = onChunkGen; onChunkGen = function (c, hints, cols, w) { _ocg(c, hints, cols, w); if (w !== world || !cols || w.dim !== 'overworld' || Math.random() > 0.035) return;
    const lx = 3 + (Math.random() * 10 | 0), lz = 3 + (Math.random() * 10 | 0); const col = cols[lz * 16 + lx]; if (col.b !== BIO.OCEAN || col.h > SEA - 6 || (typeof isRiver === 'function' && isRiver(col))) return;
    const y = col.h + 1 + Math.random() * (SEA - col.h - 3); spawnMob('nautilus', c.cx * 16 + lx + 0.5, y, c.cz * 16 + lz + 0.5); }; world && (world.onChunkGen = onChunkGen); }
// creative inventory order
{ const keys = ['resin_clump', 'resin_block', 'resin_bricks', 'chiseled_resin_bricks', 'resin_brick', 'creaking_heart', 'open_eyeblossom', 'closed_eyeblossom', 'dried_ghast', ...COLORDATA().map(c => c[0] + '_harness'), 'golden_dandelion',
    'leaf_litter', 'wildflowers', 'firefly_bush', 'bush', 'cactus_flower', 'short_dry_grass', 'tall_dry_grass', 'blue_egg', 'brown_egg', 'copper_chest', 'exposed_copper_chest', 'weathered_copper_chest', 'oxidized_copper_chest', 'waxed_copper_chest', 'copper_golem_statue',
    'copper_nautilus_armor', 'iron_nautilus_armor', 'golden_nautilus_armor', 'diamond_nautilus_armor', 'netherite_nautilus_armor'];
  const ids = keys.map(k => IT[k]).filter(v => v !== undefined); const set = new Set(ids); const rest = ITEM_IDS.filter(i => !set.has(i)); rest.push(...ids); ITEM_IDS.length = 0; ITEM_IDS.push(...rest); }
