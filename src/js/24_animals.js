// ================= ANIMALS (Minecraft rules) =================
// Persistence: passive and tamed mobs are kept with their chunk when it unloads and saved with the world, so herds
// and your horses stay where you left them. Breeding: feed two adults of the same kind their food (cows and sheep
// wheat, pigs carrots or potatoes, chickens seeds, tamed horses golden carrots or golden apples); they find each
// other and make a baby (5 minute cooldown, 1-7 experience). Babies grow up in 20 minutes; feeding them speeds it
// up by 10%. Animals follow you while you hold their food. Shears shear sheep (grass regrows the wool), a bucket
// milks cows, chickens lay eggs every 5-10 minutes and thrown eggs can hatch chicks.
// Horses: herds of 2-6 on plains, 7 coats x 5 markings, 15-30 health, speed 4.9-14.6 blocks/s, jumps 1.1-5.3
// blocks. Tame one by riding it until it stops bucking (each failed try raises its temper by 5; feeding raises it
// too). A saddle lets you steer; hold jump to charge a jump; horse armor protects it. Sneak + use (or your
// inventory key while riding) opens the horse's saddle and armor slots.

// ---------- small helpers ----------
const angWrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const isClient = () => typeof MP !== 'undefined' && MP.active && MP.role === 'client';
function hearts(m, n = 1) { Particles.emit(m.pos.x, m.pos.y + m.h + 0.2, m.pos.z, n, [[1, 0.25, 0.35], [0.95, 0.1, 0.2]], 0.6, 0.9, -1.5, Math.max(0.4, m.hw)); }
function smoke(m, n = 6) { Particles.emit(m.pos.x, m.pos.y + m.h * 0.7, m.pos.z, n, [[0.55, 0.55, 0.55], [0.35, 0.35, 0.35]], 1, 0.7, -1, Math.max(0.4, m.hw)); }

// extra synthesized sounds (no recorded samples for these)
{ const _play = Sfx.play.bind(Sfx);
  Sfx.play = function (name, v = 1, rate) {
    if (!this.ctx || v < 0.02) return _play(name, v, rate);
    if (this.has && this.has(name)) return _play(name, v, rate);
    const c = this.ctx, t = c.currentTime;
    const whinny = (f0, dur, vol) => { const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), f = c.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 1.35, t + dur * 0.25); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + dur);
      lfo.frequency.value = 22; lg.gain.value = f0 * 0.08; lfo.connect(lg); lg.connect(o.frequency); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.2;
      o.connect(f); f.connect(g); g.connect(this.out || c.destination); this.env(g, t, 0.03, dur, vol); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05); };
    switch (name) {
      case 'neigh': whinny(520 * (rate || 1), 0.9, 0.11 * v); this.nz(0.25, 900, 0.18 * v, 'lowpass'); return;
      case 'neigh_hurt': whinny(700 * (rate || 1), 0.35, 0.12 * v); return;
      case 'neigh_angry': whinny(620, 0.7, 0.14 * v); this.nz(0.4, 600, 0.3 * v, 'lowpass'); return;
      case 'hoof': this.nz(0.06, 380, 0.45 * v, 'lowpass'); this.tone(140, 90, 0.05, 0.06 * v, 'sine'); return;
      case 'snip': this.nz(0.07, 5000, 0.3 * v, 'highpass'); setTimeout(() => this.nz(0.06, 4200, 0.25 * v, 'highpass'), 90); return;
      case 'milk': this.nz(0.3, 900, 0.25 * v, 'lowpass'); this.tone(300, 200, 0.2, 0.04 * v, 'sine'); return;
      case 'saddle': this.nz(0.2, 900, 0.35 * v, 'bandpass', 1.5); this.tone(180, 140, 0.12, 0.05 * v, 'triangle'); return;
    }
    return _play(name, v, rate);
  };
}

// ---------- persistence ----------
function mobPersistent(m) { return !!(m && !m.dead && !m.gone && !m.isBoss && !m.remote && m.t && (m.t.kind === 'passive' || m.tamed)); }
function stashOf(w) { return w.mobStash || (w.mobStash = new Map()); }
function mobRecord(m) {
  const r = { t: m.type, p: [+m.pos.x.toFixed(2), +m.pos.y.toFixed(2), +m.pos.z.toFixed(2)], y: +m.yaw.toFixed(2), hp: +m.hp.toFixed(1) };
  if (m.baby) r.b = Math.round(m.growT); if (m.loveCD > 0) r.lc = Math.round(m.loveCD); if (m.sheared) r.sh = 1; if (m.eggT) r.e = Math.round(m.eggT);
  if (m.hg) r.h = Object.assign({}, m.hg);
  return r;
}
function mobFromRecord(rec) {
  if (!MOBS[rec.t]) return null;
  const m = spawnMob(rec.t, rec.p[0], rec.p[1], rec.p[2], { rec }); m.yaw = rec.y || 0; m.root.scale.setScalar(1); m.age = 5;
  if (m.hg) { applyHorseGenes(m); m.horseInit = true; }
  if (rec.hp) m.hp = Math.min(m.maxHp, rec.hp);
  if (rec.b) setBaby(m, true, rec.b); if (rec.lc) m.loveCD = rec.lc; if (rec.sh) setSheared(m, true); if (rec.e) m.eggT = rec.e;
  return m;
}
function stashMob(m) {
  if (isClient() || !mobPersistent(m) || !G.world) return false;
  const k = ckey(Math.floor(m.pos.x) >> 4, Math.floor(m.pos.z) >> 4); const st = stashOf(G.world);
  if (!st.has(k)) st.set(k, []); st.get(k).push(mobRecord(m)); return true;
}
let restoreT = 0;
function restoreStashed(dt) {
  restoreT -= dt; if (restoreT > 0 || !world || isClient()) return; restoreT = 0.5;
  const st = stashOf(world);
  for (const [k, list] of st) if (world.chunks.has(k)) { st.delete(k); for (const rec of list) mobFromRecord(rec); }
}
// chunk keys that already had their structures and animals generated, packed small for the save
function packKeys(set) { const a = [...set].sort((x, y) => x - y); let prev = 0; return a.map(v => { const d = v - prev; prev = v; return d.toString(36); }).join(','); }
function unpackKeys(s) { const out = new Set(); if (!s) return out; let v = 0; for (const p of s.split(',')) { v += parseInt(p, 36); out.add(v); } return out; }
{ const _pack = packWorld; packWorld = function (w) {
    const r = _pack(w); const mobs = {};
    for (const [k, list] of stashOf(w)) mobs[k] = list.slice();
    if (w === world && !isClient()) for (const m of G.mobs) if (mobPersistent(m)) { const k = ckey(Math.floor(m.pos.x) >> 4, Math.floor(m.pos.z) >> 4); (mobs[k] || (mobs[k] = [])).push(mobRecord(m)); }
    r.mobs = mobs; r.gen = packKeys(w.hintsDone); return r;
  };
  const _unpack = unpackWorld; unpackWorld = function (w, d) {
    const r = _unpack(w, d); if (!d) return r;
    if (d.mobs) { const st = stashOf(w); st.clear(); for (const k in d.mobs) st.set(Number(k), d.mobs[k]); }
    if (d.gen) w.hintsDone = unpackKeys(d.gen);
    return r;
  };
  const _travel = travelTo; travelTo = function () { for (const m of G.mobs) if (mobPersistent(m)) { stashMob(m); } return _travel.apply(this, arguments); };
}

// ---------- babies ----------
function setBaby(m, on, growT) {
  m.baby = !!on; m.growT = on ? (growT || 1200) : 0;
  const t = m.t; const k = on ? 0.5 : 1;
  m.baseScale = k; m.body.scale.setScalar(k); m.hw = (t.w / 2) * k; m.h = t.h * k;
  if (m.head) m.head.scale.setScalar(on ? 1.45 : 1);
}

// ---------- sheep ----------
function setSheared(m, on) { m.sheared = !!on; if (m.wool) for (const w of m.wool) w.visible = !on; if (m.skinBody) m.skinBody.visible = !!on; }

// ---------- what each animal eats ----------
const BREED_FOOD = { cow: ['wheat'], sheep: ['wheat'], pig: ['carrot', 'potato'], chicken: ['wheat_seeds'], horse: ['golden_carrot', 'golden_apple'] };
const TEMPT_FOOD = { cow: ['wheat'], sheep: ['wheat'], pig: ['carrot', 'potato'], chicken: ['wheat_seeds'] };
// horse food: [health healed, temper added, seconds a foal grows]
const HORSE_FOOD = { sugar: [1, 3, 30], wheat: [2, 3, 20], apple: [3, 3, 60], golden_carrot: [4, 5, 60], golden_apple: [10, 10, 240], hay_block: [10, 0, 180] };
const itemKey = (id) => id != null && ITEMS[id] ? ITEMS[id].key : null;
function mobWantsItem(m, id) {
  const k = itemKey(id); if (!k || !m || m.dead) return false;
  if (m.hg) return !!HORSE_FOOD[k] || (k === 'saddle' && m.tamed && !m.baby) || (ITEMS[id].kind === 'horse_armor' && m.tamed && !m.baby);
  return !!((BREED_FOOD[m.type] || []).includes(k) || (TEMPT_FOOD[m.type] || []).includes(k));
}

// ---------- horses ----------
const HORSE_COATS = [['White', [232, 228, 220], [204, 198, 188]], ['Creamy', [204, 160, 106], [176, 132, 82]], ['Chestnut', [156, 86, 44], [126, 66, 32]], ['Brown', [104, 66, 40], [82, 50, 30]], ['Black', [44, 40, 40], [30, 28, 28]], ['Gray', [124, 120, 116], [100, 96, 92]], ['Dark Brown', [68, 44, 30], [52, 34, 22]]];
const HORSE_MARKS = ['None', 'White', 'White Field', 'White Dots', 'Black Dots'];
const HORSE_ARMOR = ['leather', 'iron', 'golden', 'diamond'];
// Minecraft: jump strength j (blocks per tick) -> jump height in blocks
const horseJumpHeight = (j) => -0.1817584952 * j * j * j + 3.689713992 * j * j + 2.128599134 * j - 0.343930367;
function rollHorse(rnd = Math.random) {
  return { c: rnd() * 7 | 0, mk: rnd() * 5 | 0, hp: 15 + (rnd() * 8 | 0) + (rnd() * 9 | 0), spd: +((0.45 + rnd() * 0.3 + rnd() * 0.3 + rnd() * 0.3) * 0.25 * 43.17).toFixed(2), jmp: +(0.4 + rnd() * 0.2 + rnd() * 0.2 + rnd() * 0.2).toFixed(3), tamed: 0, temper: 0, saddle: 0, armor: -1, owner: '' };
}
function foalGenes(a, b) {
  const r = rollHorse(); const pick = (x, y, z, wx, wy) => { const q = Math.random(); return q < wx ? x : q < wx + wy ? y : z; };
  return Object.assign(r, { c: pick(a.c, b.c, r.c, 4 / 9, 4 / 9), mk: pick(a.mk, b.mk, r.mk, 0.4, 0.4), hp: Math.round((a.hp + b.hp + r.hp) / 3), spd: +((a.spd + b.spd + r.spd) / 3).toFixed(2), jmp: +((a.jmp + b.jmp + r.jmp) / 3).toFixed(3) });
}
function horsePaints(c, mk) {
  const [, base, dark] = HORSE_COATS[c]; const W = [236, 234, 228], D = [26, 22, 20];
  const opt = { bottom: dark };
  if (mk === 2) opt.patch = [W, 0.56]; if (mk === 3) opt.speck = [W, 0.09]; if (mk === 4) opt.speck = [D, 0.09];
  const body = fur(base, 6, Object.assign({ seed: c * 7 + mk }, opt));
  const leg = fur(base, 6, Object.assign({}, opt, { foot: mk === 1 ? [6, W] : [2, [40, 34, 30]], bottom: [40, 34, 30] }));
  const head = fur(base, 6, Object.assign({}, opt, { extra: (f, set, fw, fh) => { if (mk === 1 && (f === 'top' || f === 'front')) for (let y = 0; y < fh; y++) { set((fw >> 1), y, W); if (f === 'top') set((fw >> 1) - 1, y, W); } if (f === 'left' || f === 'right') { set(f === 'left' ? 2 : fw - 3, 2, [20, 16, 14]); set(f === 'left' ? 2 : fw - 3, 1, [240, 240, 236]); } } }));
  const muzzle = fur(shadeC(base, 0.8), 5, { extra: (f, set, fw, fh) => { if (mk === 1 && f !== 'bottom') for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (f === 'top' || f === 'front' || x > 1) set(x, y, W); if (f === 'front') { set(1, 2, [30, 24, 22]); set(fw - 2, 2, [30, 24, 22]); } } });
  const maneC = c === 0 ? [214, 206, 192] : c === 1 ? [150, 108, 64] : shadeC(dark, 0.6);
  return { body, leg, head, muzzle, mane: fur(maneC, 9, { speck: [shadeC(maneC, 1.3), 0.15] }), tail: fur(maneC, 9, { speck: [shadeC(maneC, 1.3), 0.15] }) };
}
MOBS.horse = { name: 'Horse', hp: 22, w: 1.3965, h: 1.6, speed: 2.4, kind: 'passive', snd: 'neigh', grazer: true, drops: [['leather', 0, 2, 1]], build(m, r) {
  const o = m.opts || {}; const nx = o.netx && o.netx.h; const g = m.hg = o.rec && o.rec.h ? Object.assign(rollHorse(), o.rec.h) : nx ? Object.assign(rollHorse(), { c: nx[0], mk: nx[1] }) : (o.genes || rollHorse());
  const P = horsePaints(g.c, g.mk); const k = 'c' + g.c + 'm' + g.mk;
  sbox(m, r, 0.625, 0.625, 1.375, 0, 1.0, 0, 'hz_body' + k, P.body);
  m.legs = quadLegs(m, r, 0.25, 0.69, 0.19, 0.5, 'hz_leg' + k, P.leg);
  const neck = pivot(r, 0, 1.18, 0.5); neck.rotation.x = 0.52;
  const hp = pivot(neck, 0, 0, 0); m.head = hp;
  sbox(m, hp, 0.25, 0.75, 0.44, 0, 0.375, 0, 'hz_neck' + k, P.body);
  sbox(m, hp, 0.3125, 0.3125, 0.44, 0, 0.62, 0.3, 'hz_head' + k, P.head);
  const mz = pivot(hp, 0, 0.62, 0.52); mz.rotation.x = 0.35; sbox(m, mz, 0.25, 0.28, 0.34, 0, -0.06, 0.14, 'hz_muz' + k, P.muzzle);
  for (const s of [-1, 1]) sbox(m, hp, 0.11, 0.19, 0.0625, s * 0.1, 0.86, 0.12, 'hz_ear' + k, P.body);
  sbox(m, hp, 0.13, 0.95, 0.14, 0, 0.42, -0.24, 'hz_mane' + k, P.mane);
  m.tail = pivot(r, 0, 1.24, -0.68); m.tail.rotation.x = 0.55; sbox(m, m.tail, 0.19, 0.88, 0.25, 0, -0.42, 0, 'hz_tail' + k, P.tail);
  // saddle and bridle (shown once saddled)
  const LE = [116, 66, 34], LE2 = [86, 46, 22], MET = [190, 190, 196];
  m.saddleParts = [
    sbox(m, r, 0.66, 0.1, 0.62, 0, 1.36, -0.02, 'hz_saddle', fur(LE, 5, { topRows: [1, [140, 82, 44]] })),
    sbox(m, r, 0.3, 0.12, 0.1, 0, 1.44, 0.24, 'hz_pommel', fur(LE2, 4)),
    sbox(m, r, 0.3, 0.12, 0.1, 0, 1.44, -0.3, 'hz_cantle', fur(LE2, 4)),
    sbox(m, r, 0.7, 0.42, 0.1, 0, 1.16, 0.04, 'hz_girth', fur(LE2, 4)),
    sbox(m, r, 0.06, 0.32, 0.06, -0.37, 1.02, 0.04, 'hz_strap', fur([60, 56, 52], 3)), sbox(m, r, 0.06, 0.32, 0.06, 0.37, 1.02, 0.04, 'hz_strap', fur([60, 56, 52], 3)),
    sbox(m, r, 0.1, 0.06, 0.14, -0.38, 0.85, 0.04, 'hz_stirrup', fur(MET, 3)), sbox(m, r, 0.1, 0.06, 0.14, 0.38, 0.85, 0.04, 'hz_stirrup', fur(MET, 3)),
    sbox(m, hp, 0.33, 0.06, 0.06, 0, 0.62, 0.55, 'hz_bit', fur(MET, 3)),
    sbox(m, hp, 0.335, 0.05, 0.46, 0, 0.7, 0.3, 'hz_bridle', fur(LE2, 3)),
  ];
  m.reins = [sbox(m, hp, 0.03, 0.03, 0.62, -0.17, 0.5, 0.25, 'hz_rein', fur(LE2, 2)), sbox(m, hp, 0.03, 0.03, 0.62, 0.17, 0.5, 0.25, 'hz_rein', fur(LE2, 2))];
  for (const p of m.reins) p.rotation.x = -0.55;
  for (const p of m.saddleParts.concat(m.reins)) p.visible = false;
  m.neck = neck; m.armorParts = []; m.horseBody = r;
} };
MOB_PITCH.horse = 1; if (typeof MOB_XP !== 'undefined') MOB_XP.horse = [1, 3];
function horseArmorDef(m) { const a = m.hg && m.hg.armor; return a >= 0 ? ITEMS[IT[HORSE_ARMOR[a] + '_horse_armor']].hdef : 0; }
function applyHorseLook(m) {
  if (!m.hg) return; const g = m.hg; const sad = !!g.saddle && !m.baby;
  for (const p of m.saddleParts) p.visible = sad; for (const p of m.reins) p.visible = sad && m.rider != null;
  const want = m.baby ? -1 : g.armor; if (m.armorShown === want) return; m.armorShown = want;
  for (const p of m.armorParts) { p.parent.remove(p); m.mats = m.mats.filter(x => x[0] !== p.material); p.material.dispose(); } m.armorParts = [];
  if (want < 0) return;
  const mat = HORSE_ARMOR[want]; const col = ITEMS[IT[mat + '_horse_armor']].hcol;
  const plate = fur(col, mat === 'leather' ? 7 : 5, { topRows: [1, shadeC(col, 1.15)], extra: (f, set, fw, fh) => { if (f === 'top' || f === 'bottom') return; for (let x = 0; x < fw; x++) set(x, fh - 1, shadeC(col, 0.6)); } });
  const r = m.horseBody, hp = m.head;
  m.armorParts.push(sbox(m, r, 0.69, 0.5, 1.44, 0, 1.08, 0, 'hz_arm_body_' + mat, plate));
  m.armorParts.push(sbox(m, hp, 0.29, 0.6, 0.48, 0, 0.42, 0, 'hz_arm_neck_' + mat, plate));
  m.armorParts.push(sbox(m, hp, 0.35, 0.18, 0.48, 0, 0.74, 0.3, 'hz_arm_head_' + mat, plate));
  for (const p of m.armorParts) p.layers.enable(1);
  if (m.saddleParts[0].visible) m.armorParts[0].scale.set(1, 0.98, 1);
}
function applyHorseGenes(m) { if (!m.hg) return; m.maxHp = m.hg.hp; if (m.hp > m.maxHp) m.hp = m.maxHp; m.tamed = !!m.hg.tamed; applyHorseLook(m); }

// ---------- network state for animals ----------
Mob.prototype.netx = function () {
  if (!BREED_FOOD[this.type]) return 0;
  const o = {}; let any = false;
  if (this.baby) { o.b = 1; any = true; } if (this.sheared) { o.s = 1; any = true; } if (this.loveT > 0) { o.l = 1; any = true; }
  if (this.hg) { const g = this.hg; o.h = [g.c, g.mk, g.tamed ? 1 : 0, g.saddle ? 1 : 0, g.armor, Math.ceil(this.hp), g.hp, g.temper, g.spd, g.jmp, this.rider != null || this.riderPeer ? 1 : 0]; any = true; }
  return any ? o : 0;
};
Mob.prototype.applyNetx = function (ex) {
  if (!BREED_FOOD[this.type]) return; ex = ex || {};
  if (!!ex.b !== !!this.baby) setBaby(this, !!ex.b); if (!!ex.s !== !!this.sheared) setSheared(this, !!ex.s);
  this.loveT = ex.l ? 1 : 0;
  if (ex.h && this.hg) { const h = ex.h, g = this.hg; g.tamed = h[2]; g.saddle = h[3]; g.armor = h[4]; if (this.rider !== 'local') this.hp = h[5]; g.hp = h[6]; g.temper = h[7]; g.spd = h[8]; g.jmp = h[9]; this.takenBy = h[10] && this.rider !== 'local'; applyHorseGenes(this); }
};
// change a mob's state here and, for the host's mobs seen by a client, on the host too
const MOBSET_KEYS = ['tamed', 'owner', 'temper', 'saddle', 'armor', 'hp', 'loveT', 'sheared', 'growT', 'loveCD'];
function applyMobSet(m, set) {
  for (const k in set) {
    if (!MOBSET_KEYS.includes(k)) continue; const v = set[k];
    if (m.hg && (k === 'tamed' || k === 'owner' || k === 'temper' || k === 'saddle' || k === 'armor')) m.hg[k] = v;
    else if (k === 'hp') m.hp = Math.min(m.maxHp, v);
    else if (k === 'sheared') setSheared(m, v);
    else if (k === 'growT') { if (v <= 0) setBaby(m, false); else m.growT = v; }
    else m[k] = v;
  }
  if (m.hg) applyHorseGenes(m);
}
function mset(m, set) { applyMobSet(m, set); if (m.remote) mpToHost({ t: 'mobset', id: m.nid, set }); }
// a mob made by a client's action (a chick from an egg) is made on the host so everyone shares it
function spawnShared(type, x, y, z, baby) {
  if (isClient() && MP.proxyMode) { mpToHost({ t: 'aspawn', type, x, y, z, baby: baby ? 1 : 0 }); return null; }
  const m = spawnMob(type, x, y, z); if (baby) setBaby(m, true); return m;
}

// ---------- feeding, breeding and other right-click uses on animals ----------
function consumeHeldFood() { if (S.mode !== 'creative') useHeld(1); S.swing = 1; Sfx.play('eat', 0.6); }
function mobInteract(m, sneaking) {
  const P = player; const h = P.held(); const hd = h && ITEMS[h.id]; const k = hd ? hd.key : null;
  if (m.dead || m === P.riding) return false;
  // horses
  if (m.hg) {
    if (sneaking && m.tamed && !m.baby) { openHorseUI(m); return true; }
    if (k && HORSE_FOOD[k] && feedHorse(m, k)) return true;
    if (hd && hd.kind === 'saddle' && m.tamed && !m.baby && !m.hg.saddle) { mset(m, { saddle: 1 }); useHeld(1); Sfx.at('saddle', m.pos, 1); S.swing = 1; return true; }
    if (hd && hd.kind === 'horse_armor' && m.tamed && !m.baby && m.hg.armor < 0) { mset(m, { armor: HORSE_ARMOR.indexOf(hd.hmat) }); useHeld(1); Sfx.play('armor', 0.8); S.swing = 1; return true; }
    if (!m.baby) { mountHorse(m); return true; }
    return false;
  }
  // shearing and milking
  if (m.type === 'sheep' && hd && hd.kind === 'shears' && !m.baby && !m.sheared) {
    mset(m, { sheared: true }); damageHeld(1); Sfx.at('snip', m.pos, 1); S.swing = 1;
    const n = 1 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) { const it = dropItem(IT.wool, 1, m.pos.x, m.pos.y + 0.9, m.pos.z, false); if (it && it.vel) it.vel.set((Math.random() - 0.5) * 2, 3 + Math.random() * 1.5, (Math.random() - 0.5) * 2); }
    return true;
  }
  if (m.type === 'cow' && h && h.id === IT.bucket && !m.baby) { replaceHeld(IT.milk_bucket); Sfx.at('milk', m.pos, 1); S.swing = 1; return true; }
  // breeding food
  const food = BREED_FOOD[m.type]; if (!food || !k || !food.includes(k)) return false;
  if (m.baby) { mset(m, { growT: m.growT * 0.9 }); consumeHeldFood(); smoke(m, 3); Particles.emit(m.pos.x, m.pos.y + m.h, m.pos.z, 4, [[0.4, 0.9, 0.4]], 0.6, 0.6, -1, 0.4); return true; }
  if (m.loveT > 0 || m.loveCD > 0) return true; // MC: they take no more food while in love or recovering
  mset(m, { loveT: 30 }); consumeHeldFood(); hearts(m, 4); return true;
}
function feedHorse(m, k) {
  const [heal, temper, grow] = HORSE_FOOD[k]; const g = m.hg; let ate = false; const set = {};
  if (m.hp < m.maxHp && heal) { set.hp = Math.min(m.maxHp, m.hp + heal); ate = true; }
  if (m.baby && grow) { set.growT = Math.max(0, m.growT - grow); ate = true; }
  if (!g.tamed && temper && g.temper < 100) { set.temper = Math.min(100, g.temper + temper); ate = true; }
  if (g.tamed && !m.baby && BREED_FOOD.horse.includes(k) && m.loveT <= 0 && !(m.loveCD > 0)) { set.loveT = 30; ate = true; }
  if (!ate) return false;
  mset(m, set); consumeHeldFood(); if (set.loveT) hearts(m, 5); else Particles.emit(m.pos.x, m.pos.y + m.h, m.pos.z, 4, [[0.4, 0.9, 0.4]], 0.6, 0.6, -1, 0.5);
  if (m.head) m.grazeT = 0.8; Sfx.at('neigh', m.pos, 0.4, 1.2); return true;
}
function breed(a, b) {
  a.loveT = b.loveT = 0; a.loveCD = b.loveCD = 300;
  const x = (a.pos.x + b.pos.x) / 2, y = Math.max(a.pos.y, b.pos.y), z = (a.pos.z + b.pos.z) / 2;
  const baby = spawnMob(a.type, x, y, z, a.hg ? { genes: foalGenes(a.hg, b.hg) } : undefined);
  setBaby(baby, true); if (baby.hg) { applyHorseGenes(baby); baby.hp = baby.maxHp; baby.horseInit = true; }
  for (const m of [a, b, baby]) hearts(m, 6);
  spawnOrb(x, y + 0.5, z, 1 + (Math.random() * 7 | 0));
}
// nearest player holding one of the given items, within range (the host also checks friends)
function nearestTempter(m, foods, range) {
  let best = null, bd = range * range;
  const consider = (pos, key) => { if (!key || !foods.includes(key)) return; const d = pos.distanceToSquared(m.pos); if (d < bd) { bd = d; best = pos; } };
  const P = player; if (!P.dead && S.mode !== 'spectator') consider(P.pos, itemKey(P.held() && P.held().id));
  if (typeof MP !== 'undefined' && MP.active && MP.role === 'host') for (const av of MP.avatars.values()) if (av.dim === world.dim && !av.dead) consider(av.pos, av.held || null);
  return best;
}
function steerTo(m, pos, stopAt) {
  const dx = pos.x - m.pos.x, dz = pos.z - m.pos.z; const d = Math.hypot(dx, dz);
  m.wYaw = Math.atan2(dx, dz); m.wMove = d > stopAt ? 1 : 0; m.wT = 0.3; return d;
}

// ---------- per-mob update ----------
const _animalUpdate = Mob.prototype.update;
Mob.prototype.update = function (dt) {
  const t = this.t;
  if (this.hg && !this.horseInit) { this.horseInit = true; applyHorseGenes(this); if (!this.opts || !this.opts.rec) this.hp = this.maxHp; }
  if (this.dead || !BREED_FOOD[this.type]) return _animalUpdate.call(this, dt);
  // a horse someone is riding: the rider moves it (here or on a friend's computer)
  if (this.rider === 'local' || (this.riderPeer && performance.now() - (this.rideT || 0) < 2500)) {
    this.age += dt; this.hurtT = Math.max(0, this.hurtT - dt); this.lightT -= dt;
    if (this.lightT <= 0) { this.lightT = 0.3; this.light = Math.max(G.minLight || 0, world.lightAt(this.pos.x, this.pos.y + 1, this.pos.z, G.daylight)); }
    this.animate(dt); horseAnim(this, dt); return;
  }
  if (this.riderPeer) this.riderPeer = null;
  this.loveT = Math.max(0, (this.loveT || 0) - dt); this.loveCD = Math.max(0, (this.loveCD || 0) - dt);
  if (this.loveT > 0 && Math.random() < dt * 2.5) hearts(this);
  if (this.baby) { this.growT -= dt; if (this.growT <= 0) setBaby(this, false); }
  // where to walk: a partner when in love, a player holding food, or a parent for babies
  if (this.flee <= 0) {
    let goal = null, stop = 1.2;
    if (this.loveT > 0 && !this.baby) {
      let mate = null, md = 64;
      for (const o of G.mobs) { if (o === this || o.type !== this.type || o.dead || o.baby || !(o.loveT > 0) || o.remote) continue; const d = o.pos.distanceToSquared(this.pos); if (d < md) { md = d; mate = o; } }
      if (mate) { goal = mate.pos; stop = 0.9 + this.hw; if (md < (1.3 + this.hw) ** 2 && this.loveT < 29 && mate.loveT > 0 && !isClient()) { breed(this, mate); goal = null; } }
    }
    if (!goal && TEMPT_FOOD[this.type]) { const p = nearestTempter(this, TEMPT_FOOD[this.type], 10); if (p) { goal = p; stop = 1.8 + this.hw; } }
    if (!goal && this.baby) { let par = null, pd = 100; for (const o of G.mobs) { if (o.type !== this.type || o.baby || o.dead || o === this) continue; const d = o.pos.distanceToSquared(this.pos); if (d < pd) { pd = d; par = o; } } if (par && pd > 9) { goal = par.pos; stop = 2.5; } }
    if (goal) { steerTo(this, goal, stop); this.goalBoost = true; } else this.goalBoost = false;
  } else this.goalBoost = false;
  // sheep regrow wool by eating grass
  if (this.sheared && !this.baby && this.onGround && Math.random() < dt / 25 && !isClient()) {
    const x = Math.floor(this.pos.x), y = Math.floor(this.pos.y) - 1, z = Math.floor(this.pos.z);
    if (world.get(x, y, z) === B.GRASS) { world.set(x, y, z, B.DIRT); mpBlock(x, y, z, B.DIRT); setSheared(this, false); this.grazeT = 1.4; }
  }
  // chickens lay an egg every 5-10 minutes
  if (this.type === 'chicken' && !this.baby && !isClient()) { if (!this.eggT) this.eggT = 300 + Math.random() * 300; this.eggT -= dt; if (this.eggT <= 0) { this.eggT = 300 + Math.random() * 300; dropItem(IT.egg, 1, this.pos.x, this.pos.y + 0.3, this.pos.z, false); Sfx.at('pop', this.pos, 0.6, 0.8); } }
  if (this.hg) { if (Math.random() < dt / 45 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 1); }
  const sp = t.speed; if (this.goalBoost) t.speed = sp * 1.7; // walking to food or a mate is quicker than wandering
  let r; try { r = _animalUpdate.call(this, dt); } finally { t.speed = sp; }
  if (this.hg) horseAnim(this, dt);
  return r;
};
// horses: graze with the whole neck, swish the tail, rear when bucking, gallop sounds
function horseAnim(m, dt) {
  if (!m.head) return; const hs = Math.hypot(m.vel.x, m.vel.z); if (m.stepOff) m.root.position.y -= m.stepOff;
  const ridden = m.rider != null || !!m.riderPeer || !!m.takenBy;
  const tgt = ridden ? (hs > 6 ? 0.35 : 0.1) + Math.sin(m.walk) * 0.08 * Math.min(1, hs / 4) : m.grazeT > 0 ? 1.9 : null;
  if (m.hpx == null) m.hpx = m.head.rotation.x;
  if (tgt != null) { m.hpx += (tgt - m.hpx) * Math.min(1, dt * 5); m.head.rotation.x = m.hpx; if (ridden) m.head.rotation.y *= 0.8; } else m.hpx = m.head.rotation.x;
  if (m.tail) m.tail.rotation.x = 0.55 + Math.min(0.6, hs * 0.05) + Math.sin(m.age * 1.3) * 0.05;
  m.rearT = Math.max(0, (m.rearT || 0) - dt);
  const rear = m.rearT > 0 ? Math.sin(Math.min(1, (1.2 - m.rearT) / 0.3) * Math.PI / 2) * (m.rearT < 0.3 ? m.rearT / 0.3 : 1) : 0;
  m.body.rotation.x = -rear * 0.75; m.body.position.z = -rear * 0.35; m.body.position.y += rear * 0.25;
  if (rear && m.legs) { m.legs[0].rotation.x = m.legs[1].rotation.x = -0.9 * rear + Math.sin(m.age * 14) * 0.3 * rear; }
  if (m.onGround && hs > 1.5) { m.hoofT = (m.hoofT || 0) - dt * hs; if (m.hoofT <= 0) { m.hoofT = hs > 7 ? 2.6 : 1.6; Sfx.at('hoof', m.pos, hs > 7 ? 0.5 : 0.3); } }
  if (m.reins) for (const p of m.reins) p.visible = !!m.hg.saddle && !m.baby && (m.rider != null || !!m.riderPeer || !!m.takenBy);
}
// remote horse ridden by this client: the client moves it
{ const _rmu = remoteMobUpdate; remoteMobUpdate = function (m, dt) { if (m.loveT > 0 && Math.random() < dt * 2.5) hearts(m); if (m.rider === 'local') { m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.animate(dt); horseAnim(m, dt); return; } const r = _rmu(m, dt); if (m.hg) horseAnim(m, dt); return r; }; }
// horse armor and riders
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb = 1, noAnger) {
    if (this.hg) { const a = horseArmorDef(this); if (a) dmg *= 1 - Math.min(20, a) / 25; if (this.rider != null || this.riderPeer) kb = 0; }
    return _h.call(this, dmg, src, kb, noAnger);
  };
  const _dl = Mob.prototype.dropLoot; Mob.prototype.dropLoot = function () {
    if (this.baby) { Sfx.mob(this, 'death', 0.8); return; }
    if (this.hg && !this.remote) { if (this.hg.saddle) dropItem(IT.saddle, 1, this.pos.x, this.pos.y + 0.8, this.pos.z); if (this.hg.armor >= 0) dropItem(IT[HORSE_ARMOR[this.hg.armor] + '_horse_armor'], 1, this.pos.x, this.pos.y + 0.8, this.pos.z); }
    if (this === player.riding) dismount();
    return _dl.call(this);
  };
}
// you can't target the horse you are sitting on
{ const _mr = mobRay; mobRay = function (m, eye, dir) { if (m === player.riding) return -1; return _mr(m, eye, dir); }; }

// ---------- riding ----------
const HORSE_SEAT = 1.08;
function mountHorse(m) {
  const P = player; if (P.riding || P.dead) return;
  if (m.rider != null || m.riderPeer || m.takenBy) { toast('Someone is already riding this horse', 1.5); return; }
  P.riding = m; m.rider = 'local'; P.swimming = false; P.sneaking = false; P.sprinting = false; P.flying = false; P.h = 1.8; m.rowing = 'horse';
  m.vel.set(0, m.vel.y, 0); S.hJump = -1; m.peak = null;
  if (!m.tamed) m.tameT = 1 + Math.random() * 2.5; else m.tameT = 0;
  seatOnHorse(P, m); Sfx.at('saddle', m.pos, 0.6); horseRideSync(m, true);
}
function boxBlocked(e) { const X0 = Math.floor(e.pos.x - e.hw), X1 = Math.floor(e.pos.x + e.hw - 1e-7), Y0 = Math.floor(e.pos.y), Y1 = Math.floor(e.pos.y + e.h - 1e-7), Z0 = Math.floor(e.pos.z - e.hw), Z1 = Math.floor(e.pos.z + e.hw - 1e-7); for (let x = X0; x <= X1; x++) for (let y = Y0; y <= Y1; y++) for (let z = Z0; z <= Z1; z++) if (world.solid(x, y, z)) return true; return false; }
function seatOnHorse(P, m) { P.pos.set(m.pos.x, m.pos.y - (m.stepOff || 0) + HORSE_SEAT, m.pos.z); P.vel.copy(m.vel); P.onGround = true; P.peak = null; P.flying = false; }
function horseDismount(P, m, thrown) {
  P.riding = null; if (m.rider === 'local') m.rider = null; m.tameT = 0; S.hJump = -1; show('jumpBar', false);
  const free = (x, y, z) => !world.solid(Math.floor(x), y, Math.floor(z)) && !world.solid(Math.floor(x), y + 1, Math.floor(z));
  let spot = null;
  for (const needGround of [true, false]) {
    for (let a = 0; a < 8 && !spot; a++) {
      const ang = m.yaw + Math.PI / 2 + a * Math.PI / 4; const x = m.pos.x + Math.sin(ang) * 1.3, z = m.pos.z + Math.cos(ang) * 1.3;
      for (const dy of [0, 1, -1]) { const y = Math.floor(m.pos.y + 0.2) + dy; if (free(x, y, z) && (!needGround || world.solid(Math.floor(x), y - 1, Math.floor(z)))) { spot = [x, y + 0.01, z]; break; } }
    }
    if (spot) break;
  }
  if (spot) P.pos.set(spot[0], spot[1], spot[2]); else P.pos.set(m.pos.x, m.pos.y + 1.7, m.pos.z);
  P.vel.set(0, thrown ? 4 : 0, 0); P.peak = null; horseRideSync(m, true);
}
function horseRide(P, dt) {
  const m = P.riding; if (!m || m.dead || m.gone) { P.riding = null; show('jumpBar', false); return; }
  let f = 0, s = 0; if (!S.uiOpen) { if (kd('forward') || keys.ArrowUp) f++; if (kd('back') || keys.ArrowDown) f--; if (kd('right') || keys.ArrowRight) s++; if (kd('left') || keys.ArrowLeft) s--; f += T.my; s += T.mx; }
  if (!S.uiOpen && kd('sneak') && !(m.tameT > 0)) { horseDismount(P, m); return; }
  if (keys.KeyJ) look(-300 * dt, 0); if (keys.KeyL) look(300 * dt, 0); if (keys.KeyI) look(0, -300 * dt); if (keys.KeyK) look(0, 300 * dt);
  f = clamp(f, -1, 1); s = clamp(s, -1, 1);
  const g = m.hg; const water = inWater(m, 0.6), lava = inLava(m, 0.3);
  // taming: an untamed horse bucks around, then either accepts you or throws you off
  if (m.tameT > 0) {
    m.tameT -= dt; f = 0; s = 0; if (Math.random() < dt * 3) m.buckYaw = m.yaw + (Math.random() - 0.5) * 3; m.yaw += angWrap((m.buckYaw || m.yaw) - m.yaw) * Math.min(1, dt * 3);
    const sp = 2.2; m.vel.x += (Math.sin(m.yaw) * sp - m.vel.x) * Math.min(1, dt * 4); m.vel.z += (Math.cos(m.yaw) * sp - m.vel.z) * Math.min(1, dt * 4);
    if (m.onGround && Math.random() < dt * 1.2) m.vel.y = 5;
    if (m.tameT <= 0) {
      if ((Math.random() * 100 | 0) < g.temper) { mset(m, { tamed: 1, owner: myName() }); hearts(m, 10); Sfx.at('neigh', m.pos, 0.8, 1.1); toast('The horse is tamed', 2); }
      else { mset(m, { temper: Math.min(100, g.temper + 5) }); m.rearT = 1.2; smoke(m, 10); Sfx.at('neigh_angry', m.pos, 1); m.vel.set(0, 0, 0); horseDismount(P, m, true); return; }
    }
  } else {
    const ctl = g.tamed && g.saddle && !m.baby;
    if (ctl) {
      m.yaw = angWrap(P.yaw + Math.PI);
      const fwd = f > 0 ? 1 : f < 0 ? -0.25 : 0, side = s * 0.5; const sp = g.spd * (water ? 0.35 : 1);
      const tx = (Math.sin(m.yaw) * fwd - Math.cos(m.yaw) * side) * sp, tz = (Math.cos(m.yaw) * fwd + Math.sin(m.yaw) * side) * sp;
      const k = m.onGround || water ? Math.min(1, dt * 6) : Math.min(1, dt * 1.2);
      m.vel.x += (tx - m.vel.x) * k; m.vel.z += (tz - m.vel.z) * k;
      // jump: hold to charge (full after 0.5 s, then it slips back toward 80%), release to leap
      const jumpKey = !S.uiOpen && kd('jump');
      if (jumpKey && m.onGround && !water) { if (S.hJump < 0) S.hJump = 0; S.hJump += dt; }
      const pow = S.hJump < 0 ? 0 : S.hJump <= 0.5 ? S.hJump / 0.5 : Math.min(1, 0.8 + 0.2 / Math.max(1, (S.hJump - 0.45) * 20));
      if (!jumpKey && S.hJump >= 0) { if (m.onGround && pow > 0.05) { const p2 = pow >= 0.9 ? 1 : 0.4 + 0.4 * pow / 0.9; const h = Math.max(0.6, horseJumpHeight(g.jmp * p2)); m.vel.y = Math.sqrt(2 * 28 * h) + 28 * dt * 0.5; if (fwd > 0) { m.vel.x += Math.sin(m.yaw) * 1.2 * p2; m.vel.z += Math.cos(m.yaw) * 1.2 * p2; } Sfx.at('neigh', m.pos, 0.25, 1.3); } S.hJump = -1; }
      show('jumpBar', true); $('jumpBar').firstChild.style.width = Math.round(pow * 100) + '%';
    } else {
      show('jumpBar', false); const k = Math.min(1, dt * 6); m.vel.x -= m.vel.x * k; m.vel.z -= m.vel.z * k;
      if (f || s) { if (!g.saddle && g.tamed && S.useCD <= 0 && !m.hintShown) { m.hintShown = true; toast('Put a saddle on the horse to steer it', 2.5); } }
    }
  }
  // physics (the horse steps up full blocks, floats in water)
  if (water || lava) { m.vel.y = Math.min(m.vel.y + 30 * dt, 1.6); m.vel.x *= 0.96; m.vel.z *= 0.96; } else m.vel.y = Math.max(m.vel.y - 28 * dt, -50);
  const wasGround = m.onGround, want = new V3(m.vel.x, 0, m.vel.z), p0 = m.pos.clone(); moveEntity(m, dt);
  // horses step up full blocks (step height 1): retry the move one block higher if that gets further
  if (m.hitH && wasGround && want.lengthSq() > 0.25) {
    const e = { pos: p0.clone(), vel: new V3(want.x, 0, want.z), hw: m.hw, h: m.h };
    e.pos.y = Math.floor(p0.y + 0.01) + 1.001;
    if (!boxBlocked(e)) { moveEntity(e, dt); const gotH = Math.hypot(e.pos.x - p0.x, e.pos.z - p0.z), had = Math.hypot(m.pos.x - p0.x, m.pos.z - p0.z); if (gotH > had + 0.02) { m.stepOff = (m.stepOff || 0) + (e.pos.y - m.pos.y); m.pos.copy(e.pos); m.vel.x = want.x; m.vel.z = want.z; m.vel.y = 0; m.onGround = true; } }
  }
  m.stepOff = Math.max(0, (m.stepOff || 0) - dt * 7);
  // fall damage: Minecraft horses take ceil(fall / 2 - 3), and so does the rider
  if (!m.onGround && !water) m.peak = m.peak == null ? m.pos.y : Math.max(m.peak, m.pos.y);
  else { if (m.peak != null && m.onGround && S.rules.fallDamage) { const dmg = Math.ceil((m.peak - m.pos.y) * 0.5 - 3); if (dmg > 0) { m.hurt(dmg, null, 0, true); if (S.mode === 'survival') { P.hurtCD = 0; P.hurt(dmg, null, 'fall damage', 0); } } } m.peak = null; }
  if (m.pos.y < -80) { m.gone = true; P.riding = null; return; }
  P.sprinting = false; P.sneaking = false; P.swimming = false;
  seatOnHorse(P, m);
  m.syncT = (m.syncT || 0) - dt; if (m.syncT <= 0) { m.syncT = 0.1; horseRideSync(m, false); }
}
function horseRideSync(m, reliable) {
  if (typeof MP === 'undefined' || !MP.active || MP.role !== 'client' || !m.remote) return;
  mpToHost({ t: 'hride', id: m.nid, x: +m.pos.x.toFixed(2), y: +m.pos.y.toFixed(2), z: +m.pos.z.toFixed(2), yaw: +m.yaw.toFixed(3), on: m.rider === 'local' ? 1 : 0 }, !reliable);
}
// boats and horses share the riding hooks
{ const _ru = rideUpdate; rideUpdate = function (P, dt) { if (P.riding && P.riding.hg) return horseRide(P, dt); return _ru(P, dt); };
  const _dm = dismount; dismount = function () { const P = player; if (P.riding && P.riding.hg) return horseDismount(P, P.riding); return _dm.apply(this, arguments); };
  const _sp = sitPose; sitPose = function (model, on, rowing) {
    if (rowing !== 'horse' || !on || !model) return _sp(model, on, rowing === 'horse' ? false : rowing);
    _sp(model, true, false); const P2 = model.P;
    P2.legR.rotation.x = P2.legL.rotation.x = -0.42; P2.legR.rotation.z = 0.42; P2.legL.rotation.z = -0.42; P2.armR.rotation.x = P2.armL.rotation.x = -0.55;
  };
  const _oi = openInv; openInv = function () { const m = player.riding; if (m && m.hg && m.tamed) return openHorseUI(m); return _oi.apply(this, arguments); };
}

// ---------- horse HUD: health hearts instead of food, jump bar over the XP bar ----------
const mountImgs = [];
function renderMountHearts() {
  const m = player.riding; const row = $('mountRow'); const on = !!(m && m.hg && S.mode === 'survival');
  const key = on ? Math.ceil(m.hp) + '/' + m.maxHp : ''; if (key === renderMountHearts.last) return; renderMountHearts.last = key;
  row.style.display = on ? 'flex' : 'none'; if (!on) return;
  const n = Math.ceil(m.maxHp / 2); while (mountImgs.length < n) { const im = document.createElement('img'); row.appendChild(im); mountImgs.push(im); }
  const h = Math.max(0, Math.ceil(m.hp));
  for (let i = 0; i < mountImgs.length; i++) { const im = mountImgs[i]; if (i >= n) { im.style.display = 'none'; continue; } im.style.display = ''; const v = h - i * 2; im.src = HEART[v >= 2 ? 2 : v === 1 ? 1 : 0]; }
}

// ---------- the horse's saddle and armor slots (a small panel in the inventory screen) ----------
slotEls.panel = [];
S.panel = null;
function openHorseUI(m) {
  if (player.dead) return;
  const g = m.hg; const slots = [g.saddle ? { id: IT.saddle, count: 1 } : null, g.armor >= 0 ? { id: IT[HORSE_ARMOR[g.armor] + '_horse_armor'], count: 1 } : null];
  S.panel = { title: (g.tamed ? 'Horse' : 'Horse') + '  ' + Math.ceil(m.hp) + '/' + g.hp + ' HP · ' + (g.spd).toFixed(1) + ' blocks/s · jumps ' + horseJumpHeight(g.jmp).toFixed(1) + ' blocks', slots, ghosts: [IT.saddle, IT.iron_horse_armor],
    accept: (i, s) => i === 0 ? ITEMS[s.id].kind === 'saddle' : ITEMS[s.id].kind === 'horse_armor',
    changed: () => { const a = slots[1] ? HORSE_ARMOR.indexOf(ITEMS[slots[1].id].hmat) : -1; const sd = slots[0] ? 1 : 0; if (sd !== (g.saddle ? 1 : 0) || a !== g.armor) { if (sd && !g.saddle) Sfx.play('saddle', 0.8); mset(m, { saddle: sd, armor: a }); } },
    mob: m };
  openUI('panel');
}
{ const _ca = contArr; contArr = function (c) { if (c === 'panel') return S.panel ? S.panel.slots : null; return _ca(c); };
  const _sc = slotClick; slotClick = function (cont, i, button, shift) {
    const pn = S.panel;
    if (pn && cont === 'panel') { const c = S.cursor; if (c && !pn.accept(i, c)) return; if (c && c.count > 1 && !pn.slots[i]) { pn.slots[i] = Object.assign({}, c, { count: 1 }); c.count--; Sfx.play('click', 0.5); invDirty(); renderInvUI(); pn.changed(); return; } const r = _sc(cont, i, button, shift); pn.changed(); return r; }
    if (pn && cont === 'inv' && shift) { const s = player.inv[i]; if (s) for (let k = 0; k < pn.slots.length; k++) if (!pn.slots[k] && pn.accept(k, s)) { pn.slots[k] = Object.assign({}, s, { count: 1 }); s.count--; if (!s.count) player.inv[i] = null; Sfx.play('click', 0.5); invDirty(); renderInvUI(); pn.changed(); return; } }
    return _sc(cont, i, button, shift);
  };
  const _rui = renderInvUI; renderInvUI = function () { const r = _rui.apply(this, arguments); const pn = S.panel; if (pn && S.uiOpen === 'panel') pn.slots.forEach((s, i) => { const el = slotEls.panel[i]; if (!el) return; paintSlot(el, s); el.classList.toggle('empty', !s); if (!s && pn.ghosts && pn.ghosts[i] != null) { el.firstChild.src = ICON[pn.ghosts[i]]; } }); return r; };
  const _ou = openUI; openUI = function (kind, key) {
    const r = _ou(kind, key); const on = kind === 'panel' && S.panel; show('panelArea', !!on);
    if (on) { $('panelTitle').textContent = S.panel.title; const body = $('panelBody'); body.innerHTML = ''; slotEls.panel = []; S.panel.slots.forEach((_, i) => makeSlot('panel', i, body)); show('rightPanel', false); renderInvUI(); }
    else S.panel = null;
    return r;
  };
  const _cl = closeInv; closeInv = function (noLock) { const r = _cl(noLock); S.panel = null; show('panelArea', false); return r; };
}

// ---------- use action: animals first, then eggs ----------
{ const _ua = useAction; useAction = function (eye, dir) {
    const sneaking = kd('sneak'); const h = player.held(); const hd = h && ITEMS[h.id];
    if (targetMob && !targetMob.dead && mobInteract(targetMob, sneaking)) { mouseR = false; S.useCD = 0.3; return; }
    if (hd && hd.kind === 'egg' && !(target && BL[target.id].use && !sneaking)) { useHeld(1); spawnProj('egg', eye.clone().addScaledVector(dir, 0.5), dir.clone().multiplyScalar(18), 'player', 0); Sfx.play('bow', 0.4, 1.4); S.useCD = 0.25; S.swing = 1; return; }
    return _ua(eye, dir);
  }; }
PROJ.egg = { grav: 20, size: 0.2, color: 0xefe4c8 };
{ const _pi = projImpact; projImpact = function (a, mob) {
    if (a.kind !== 'egg') return _pi(a, mob);
    a.done = true; Particles.emit(a.pos.x, a.pos.y, a.pos.z, 8, [[0.95, 0.92, 0.82], [0.85, 0.8, 0.66]], 1.5, 0.4, 10, 0.2);
    if (mob && !mob.dead) mob.hurt(0, a.pos.clone().addScaledVector(a.vel, -0.2), 0.3, true);
    if (Math.random() < 1 / 8) { const n = Math.random() < 1 / 32 ? 4 : 1; for (let i = 0; i < n; i++) spawnShared('chicken', a.pos.x, a.pos.y, a.pos.z, true); }
  }; }

// ---------- multiplayer messages ----------
{ const _on = onPeerMsg; onPeerMsg = function (peer, m) {
    switch (m.t) {
      case 'mobset': { if (MP.role !== 'host') return; const mob = G.mobs.find(x => x.nid === m.id); if (mob && !mob.dead) applyMobSet(mob, m.set || {}); return; }
      case 'hride': { if (MP.role !== 'host') return; const mob = G.mobs.find(x => x.nid === m.id); if (!mob || mob.dead) return;
        if (m.on) { if (mob.rider === 'local') return; const now = performance.now(); const dtm = Math.max(0.05, (now - (mob.rideT || now - 100)) / 1000); mob.vel.set((m.x - mob.pos.x) / dtm, (m.y - mob.pos.y) / dtm, (m.z - mob.pos.z) / dtm); mob.pos.set(m.x, m.y, m.z); mob.yaw = m.yaw; mob.riderPeer = peer.id; mob.rideT = now; mob.root.position.copy(mob.pos); mob.root.rotation.y = mob.yaw; }
        else if (mob.riderPeer === peer.id) { mob.riderPeer = null; mob.pos.set(m.x, m.y, m.z); mob.vel.set(0, 0, 0); }
        return; }
      case 'aspawn': { if (MP.role !== 'host' || !MOBS[m.type] || BREED_FOOD[m.type] === undefined) return; const mob = spawnMob(m.type, m.x, m.y, m.z); if (m.baby) setBaby(mob, true); return; }
    }
    return _on(peer, m);
  };
  const _rm = removeAvatar; removeAvatar = function (id) { for (const m of G.mobs) if (m.riderPeer === id) m.riderPeer = null; return _rm.apply(this, arguments); };
}

// ---------- per-frame hooks ----------
{ const _ub = updateBoats; updateBoats = function (dt) { const r = _ub(dt); restoreStashed(dt); renderMountHearts(); return r; }; }
{ const _ce = clearEntities; clearEntities = function () { if (player.riding && player.riding.hg) { player.riding = null; show('jumpBar', false); } return _ce.apply(this, arguments); }; }
