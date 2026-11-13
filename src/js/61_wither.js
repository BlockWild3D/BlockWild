// ================= THE WITHER, ZOGLINS, BEACONS (Minecraft) =================
// Wither: build a T of four soul sand and put three wither skeleton skulls on top. It charges up for
// 10 seconds (invulnerable, gaining health), explodes, then flies around shooting wither skulls (explosion + Wither
// effect) at players and anything not undead, breaking blocks it touches. 300 health; below half it grows armour:
// arrows bounce off and it flies low. It drops a nether star.
// Wither skeletons drop their skulls 2.5% of the time (+1% per Looting level).
// Beacon: nether star + 5 glass + 3 obsidian. On a pyramid of iron/gold/emerald/diamond/netherite blocks (1-4
// levels) it gives a chosen effect to players nearby (20 + 10 x levels blocks); pay with an ingot, emerald or diamond.
// Zoglins: hoglins taken out of the Nether turn into zoglins after 15 seconds; zoglins attack everything.
MOBS.wither_skeleton.drops.push(['wither_skeleton_skull', 1, 1, 0.025]);
// ---------- summoning ----------
function witherPattern(x, y, z) { // (x,y,z) = a skull just placed; look for the T in both orientations
  const ss = (a, b, c) => { const id = world.get(a, b, c); return id === B.SOUL_SAND; }, sk = (a, b, c) => world.get(a, b, c) === B.WITHER_SKELETON_SKULL;
  for (const [dx, dz] of [[1, 0], [0, 1]]) for (let o = -2; o <= 0; o++) { const cx = x + dx * (o + 1), cz = z + dz * (o + 1); // centre skull column
    const mid = y - 1; if (!sk(cx - dx, y, cz - dz) || !sk(cx, y, cz) || !sk(cx + dx, y, cz + dz)) continue;
    if (ss(cx - dx, mid, cz - dz) && ss(cx, mid, cz) && ss(cx + dx, mid, cz + dz) && ss(cx, mid - 1, cz)) return [cx, mid - 1, cz, dx, dz]; }
  return null;
}
{ const _pb = placeBlock; placeBlock = function (t, id) { const r = _pb.apply(this, arguments);
    if (r && id === B.WITHER_SKELETON_SKULL && S.difficulty !== 'peaceful') { const x = t.x + t.nx, y = t.y + t.ny, z = t.z + t.nz; const p = witherPattern(x, y, z);
      if (p) { const [cx, by, cz, dx, dz] = p; for (const k of [-1, 0, 1]) { world.set(cx + dx * k, by + 1, cz + dz * k, 0); world.set(cx + dx * k, by + 2, cz + dz * k, 0); mpBlock(cx + dx * k, by + 1, cz + dz * k, 0); mpBlock(cx + dx * k, by + 2, cz + dz * k, 0); } world.set(cx, by, cz, 0); mpBlock(cx, by, cz, 0);
        const w = spawnMob('wither', cx + 0.5, by, cz + 0.5); w.spawnT = 10; w.hp = 1; toast('The Wither awakens!', 3); Sfx.play('roar', 1.2, 0.5); } }
    return r; }; }
// ---------- the Wither ----------
MOBS.wither = { name: 'Wither', hp: 300, w: 0.9, h: 3.5, speed: 3, kind: 'hostile', dmg: 8, fireproof: true, fly: true, persist: true, snd: 'roar', egg: [[20, 20, 20], [80, 80, 80]], drops: [['nether_star', 1, 1, 1]],
  build(m, r) { const C = [30, 30, 32], L = [64, 64, 68];
    sbox(m, r, 0.3, 1.2, 0.3, 0, 1.7, 0, 'wi_spine', fur(C, 6)); for (let i = 0; i < 3; i++) sbox(m, r, 1.0 - i * 0.12, 0.12, 0.5, 0, 1.6 + i * 0.32, 0.05, 'wi_rib' + i, fur(L, 4));
    sbox(m, r, 2.0, 0.3, 0.3, 0, 2.45, 0, 'wi_shoulder', fur(C, 6)); const tail = pivot(r, 0, 1.1, 0); m.tail = tail; sbox(m, tail, 0.25, 0.9, 0.25, 0, -0.45, 0, 'wi_tail', fur(C, 6));
    m.heads = []; for (const [x, s] of [[0, 0.8], [-0.95, 0.6], [0.95, 0.6]]) { const h = pivot(r, x, 2.6 + (x ? 0 : 0.15), 0); sbox(m, h, s, s, s, 0, s / 2, 0, 'wi_head' + s, fur(C, 5, { extra: (f, set, fw, fh) => { if (f === 'front') { const ex = Math.max(1, Math.round(fw * 0.25)), ey = Math.round(fh * 0.4); set(ex, ey, [235, 235, 245]); set(fw - 1 - ex, ey, [235, 235, 245]); for (let x2 = 0; x2 < fw; x2++) set(x2, ey + 1, [12, 12, 14]); for (let x2 = ex; x2 <= fw - 1 - ex; x2++) set(x2, fh - 3, [12, 12, 14]); } } })); m.heads.push(h); }
    m.head = m.heads[0]; } };
MOB_XP.wither = [50, 50]; MOB_PITCH.wither = 0.5; UNDEAD.add('wither'); UNDEAD.add('zoglin');
PROJ.witherskull = { grav: 0, size: 0.35, color: 0x202024, trail: [[0.2, 0.2, 0.25]] };
MOBS.wither.tick = function (m, dt) {
  m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.light = 1; m.lightT = 9; m.maxHp = 300;
  // charging up: hovering in place, glowing, healing to full
  if (m.spawnT > 0) { m.spawnT -= dt; m.hp = Math.min(300, m.hp + dt * 30); m.vel.set(0, 0.2, 0); moveEntity(m, dt); m.root.position.copy(m.pos); m.yaw += dt * 3; m.root.rotation.y = m.yaw; m.colorize(); if (Math.random() < dt * 30) Particles.emit(m.pos.x, m.pos.y + 2, m.pos.z, 2, [[0.4, 0.4, 1]], 2, 0.6, -1, 1);
    if (m.spawnT <= 0) { explode(m.pos.x, m.pos.y + 1.5, m.pos.z, 7, m, { cause: 'the Wither' }); Sfx.play('roar', 1.5, 0.4); } return true; }
  const P = player; const armored = m.hp < 150;
  // target: the player (survival), or the nearest living thing that isn't undead
  let tgt = null; if (!P.dead && isSurv() && P.pos.distanceTo(m.pos) < 40) tgt = P; else { let bd = 32; for (const o of G.mobs) { if (o === m || o.dead || o.isBoss || UNDEAD.has(o.type) || o.type === 'wither') continue; const d = o.pos.distanceTo(m.pos); if (d < bd) { bd = d; tgt = o; } } }
  const tp = tgt ? (tgt === P ? P.pos : tgt.pos) : null;
  // hover above the target, circling; lower when armoured
  m.ang = (m.ang || 0) + dt * 0.8; const hoverY = armored ? 1.5 : 5;
  const goal = tp ? new V3(tp.x + Math.cos(m.ang) * 6, tp.y + hoverY, tp.z + Math.sin(m.ang) * 6) : new V3(m.pos.x + Math.cos(m.ang) * 4, m.pos.y, m.pos.z + Math.sin(m.ang) * 4);
  const want = goal.sub(m.pos); const L = want.length(); want.multiplyScalar(Math.min(m.t.speed * 2.5, L * 1.5) / Math.max(L, 0.01)); m.vel.lerp(want, Math.min(1, dt * 2)); moveEntity(m, dt);
  // it breaks blocks in its way (Minecraft: when hurt and every so often)
  m.breakT = (m.breakT || 0) - dt; if ((m.hitH || m.breakT <= 0) && !isClientMP() && S.rules.mobGriefing !== false) { m.breakT = 1; for (let dx = -1; dx <= 1; dx++) for (let dy = 0; dy <= 3; dy++) for (let dz = -1; dz <= 1; dz++) { const x = Math.floor(m.pos.x) + dx, y = Math.floor(m.pos.y) + dy, z = Math.floor(m.pos.z) + dz; const id = world.get(x, y, z); if (id && !BLAST_PROOF.has(id) && id !== B.OBSIDIAN && !BL[id].fluid) { onBlockRemoved(x, y, z, id); world.set(x, y, z, 0); mpBlock(x, y, z, 0); } } }
  // wither skulls from all three heads
  m.shootT = (m.shootT == null ? 2 : m.shootT) - dt;
  if (tp && m.shootT <= 0) { m.shootT = armored ? 0.7 : 1.1; const hi = (m.shotN = ((m.shotN || 0) + 1) % 3); const h = m.heads[hi]; const from = new V3(m.pos.x + (hi === 1 ? -0.95 : hi === 2 ? 0.95 : 0), m.pos.y + 2.9, m.pos.z);
    const to = tgt === P ? P.eye() : new V3(tp.x, tp.y + (tgt.h || 1) / 2, tp.z); const blue = Math.random() < 0.05; const pr = fireAt('witherskull', from, to, blue ? 8 : 14, 'mob', 8, m); pr.cause = 'the Wither'; pr.effect = ['wither', 10, 1]; pr.blue = blue; pr.target = tgt === P ? null : tgt; Sfx.at('fireball', m.pos, 0.6, 0.6); }
  // look at the target; heads bob
  if (tp) { const yaw = Math.atan2(tp.x - m.pos.x, tp.z - m.pos.z); let dy = yaw - m.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; m.yaw += dy * Math.min(1, dt * 4); }
  m.heads.forEach((h, i) => { h.rotation.y = Math.sin(m.age * 1.3 + i) * 0.3; h.rotation.x = Math.sin(m.age * 0.9 + i * 2) * 0.15; }); if (m.tail) m.tail.rotation.x = 0.3 + Math.sin(m.age * 2) * 0.2;
  m.root.position.copy(m.pos); m.root.rotation.y = m.yaw; m.colorize(); if (armored) Particles.emit(m.pos.x, m.pos.y + 2, m.pos.z, 1, [[0.6, 0.6, 0.7]], 1, 0.5, 0, 1.2);
  // its skulls hit mobs too
  for (const a of G.projectiles) if (a.kind === 'witherskull' && a.target && !a.done && !a.target.dead && hitsMob(a.target, a.pos, 0.4)) projImpact(a, a.target);
  return true;
};
// wither skulls explode (power 1, or a blue skull's bigger blast) and give Wither
{ const _pi = projImpact; projImpact = function (a, mob) { if (a.kind !== 'witherskull') return _pi(a, mob); a.done = true; explode(a.pos.x, a.pos.y, a.pos.z, a.blue ? 1.5 : 1, a.src, { cause: 'the Wither' });
    if (mob && !mob.dead) { mob.hurt(8, a.pos, 0.5); if (typeof mobEffect === 'function') mobEffect(mob, 'wither', 10, 1); } }; }
// charging: invulnerable; no knockback. Below half health its armour makes arrows bounce off.
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, na) { if (this.type === 'wither') { if (this.spawnT > 0) return; kb = 0; } return _h.call(this, dmg, src, kb, na); }; }
{ const _up = updateProjectiles; updateProjectiles = function (dt) {
    for (const a of G.projectiles) { if (a.done || a.kind !== 'arrow' || a.owner !== 'player') continue; for (const m of G.mobs) if (m.type === 'wither' && !m.dead && m.hp < 150 && hitsMob(m, a.pos, 0.6)) { a.vel.multiplyScalar(-0.3); a.vel.y = 3; a.owner = 'none'; a.life = Math.min(a.life, 1.5); Sfx.at('shield', m.pos, 0.6); } }
    return _up(dt); }; }
// the boss bar
{ const _eu = EndFight.update.bind(EndFight); EndFight.update = function (dt) { const r = _eu(dt); const w = G.mobs.find(m => m.type === 'wither' && !m.dead && m.pos.distanceTo(player.pos) < 64);
    if (w) { show('bossbar', true); $('bossname').textContent = 'Wither'; $('bossfill').style.width = Math.max(0, w.hp / 300 * 100) + '%'; } else if (world.dim !== 'end') show('bossbar', false); return r; }; }
// ---------- zoglins ----------
MOBS.zoglin = Object.assign({}, MOBS.hoglin, { name: 'Zoglin', kind: 'hostile', dmg: 6, egg: [[200, 110, 110], [230, 230, 230]], drops: [['rotten_flesh', 1, 3, 1]], persist: false,
  build(m, r) { // pale, rotting hoglin with bare ribs and white tusks
    const SK = [196, 132, 122], DK = [150, 92, 86];
    sbox(m, r, 1.0, 0.9, 1.6, 0, 1.1, 0, 'zog_body', fur(SK, 10, { speck: [[226, 214, 200], 0.12], topc: [214, 160, 148], extra: (f, set, fw, fh) => { if (f === 'left' || f === 'right') for (let x = 3; x < fw - 3; x += 2) for (let y = 2; y < fh - 2; y++) set(x, y, [232, 226, 210]); } }));
    sbox(m, r, 0.3, 0.35, 1.3, 0, 1.68, 0.05, 'zog_mane', fur([236, 228, 214], 10, { speck: [[200, 190, 176], 0.3] }));
    const h = pivot(r, 0, 1.1, 0.85); m.head = h;
    sbox(m, h, 0.8, 0.7, 0.9, 0, -0.05, 0.4, 'zog_head', fur(SK, 10, { speck: [[150, 92, 86], 0.14], extra: (f, set, fw) => { if (f === 'front') { set(2, 3, [255, 255, 255]); set(fw - 3, 3, [255, 255, 255]); set(1, 3, [30, 20, 20]); set(fw - 2, 3, [30, 20, 20]); for (let x = 1; x < fw - 1; x++) set(x, 2, DK); } } }));
    sbox(m, h, 0.5, 0.3, 0.12, 0, -0.2, 0.88, 'zog_snout', fur([216, 156, 146], 5, { extra: (f, set, fw) => { if (f === 'front') { set(2, 2, [110, 60, 56]); set(fw - 3, 2, [110, 60, 56]); } } }));
    for (const sd of [-1, 1]) { sbox(m, h, 0.1, 0.4, 0.1, sd * 0.38, -0.1, 0.8, 'zog_tusk', fur([250, 248, 240], 3)); const e = pivot(h, sd * 0.45, 0.25, 0.3); e.rotation.z = sd * 0.5; sbox(m, e, 0.15, 0.28, 0.06, 0, 0, 0, 'zog_ear', fur(SK, 6)); }
    m.legs = quadLegs(m, r, 0.32, 0.66, 0.32, 0.55, 'zog_leg', fur(DK, 8, { foot: [3, [70, 50, 46]] })); } });
MOB_XP.zoglin = [5, 5];
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) {
    if ((this.type === 'hoglin' || this.type === 'piglin' || this.type === 'piglin_brute') && G.world && G.world.dim !== 'nether' && !this.dead && !isClientMP()) { this.zomT = (this.zomT || 0) + dt; if (this.zomT > 15) { const t = this.type === 'hoglin' ? 'zoglin' : 'zombified_piglin'; const p = this.pos.clone(); this.gone = true; this.dead = true; const z = spawnMob(t, p.x, p.y, p.z); Particles.emit(p.x, p.y + 1, p.z, 20, [[0.5, 0.7, 0.4]], 2, 0.8, 2, 0.6); Sfx.at('groan', p, 0.8); return; } }
    if (this.type === 'zoglin' && !this.dead) { // zoglins go for any mob nearby that isn't a zoglin or creeper
      this.preyT = (this.preyT || 0) - dt; if (this.preyT <= 0) { this.preyT = 1; this.prey = G.mobs.find(o => o !== this && !o.dead && !o.isBoss && o.type !== 'zoglin' && o.type !== 'creeper' && o.pos.distanceTo(this.pos) < 12) || null; }
      const o = this.prey; if (o && !o.dead && (!isSurv() || player.pos.distanceTo(this.pos) > o.pos.distanceTo(this.pos))) { steerTo(this, o.pos, 1.2 + o.hw); this.goalBoost = true; this.atkCD = (this.atkCD || 0); if (this.pos.distanceTo(o.pos) < 1.8 + o.hw && this.atkCD <= 0) { this.atkCD = 1; o.hurt(3 + Math.random() * 5, this.pos, 1.6); } } }
    return _u.call(this, dt); }; }
// ---------- beacons ----------
const BEACON_FX = [['speed', 'Speed', 1], ['haste', 'Haste', 1], ['resistance', 'Resistance', 2], ['jump_boost', 'Jump Boost', 2], ['strength', 'Strength', 3], ['regeneration', 'Regeneration', 4]];
const BEACON_BASE = new Set(['iron_block', 'gold_block', 'emerald_block', 'diamond_block', 'netherite_block'].map(k => B[k.toUpperCase()]));
function beaconLevels(x, y, z) { let lv = 0; for (let k = 1; k <= 4; k++) { let ok = true; for (let dx = -k; dx <= k && ok; dx++) for (let dz = -k; dz <= k && ok; dz++) if (!BEACON_BASE.has(world.get(x + dx, y - k, z + dz))) ok = false; if (!ok) break; lv = k; } return lv; }
function openBeacon(x, y, z) {
  const k = x + ',' + y + ',' + z; world.beacons = world.beacons || new Map(); const st = world.beacons.get(k) || { fx: null }; world.beacons.set(k, st); const lv = beaconLevels(x, y, z); const slots = [null];
  S.panel = { title: 'Beacon - ' + (lv ? 'Level ' + lv + ' pyramid' : 'no pyramid'), slots, output: -1, ghosts: [IT.iron_ingot], accept: (i, s) => ['iron_ingot', 'gold_ingot', 'emerald', 'diamond', 'netherite_ingot'].includes(ITEMS[s.id].key), single: true,
    onClose: () => { if (slots[0]) giveOrDrop(slots[0].id, slots[0].count); },
    layout: (body) => { body.style.flexDirection = 'column'; body.style.alignItems = 'flex-start'; const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;max-width:330px'; body.appendChild(row);
      for (const [e, name, need] of BEACON_FX) { const b = document.createElement('button'); b.textContent = name; b.disabled = lv < need; b.style.cssText = 'padding:4px 8px;font:inherit;' + (st.fx === e ? 'outline:3px solid #fff;' : ''); b.onclick = () => { if (!slots[0] && S.mode !== 'creative') { toast('Put an ingot, emerald or diamond in the slot to pay', 2); return; } slots[0] = null; st.fx = e; Sfx.play('levelup', 0.5, 1.6); closeInv(); toast('Beacon: ' + name, 2); }; row.appendChild(b); }
      const p = document.createElement('div'); p.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:6px'; p.append('Payment: '); body.appendChild(p); makeSlot('panel', 0, p); } };
  openUI('panel');
}
{ const _ua = useAction; useAction = function (eye, dir) { if (target && !kd('sneak') && BL[target.id].use === 'beacon') { mouseR = false; openBeacon(target.x, target.y, target.z); return; } return _ua(eye, dir); }; }
let beaconBeams = new Map();
{ const _ub = updateBoats; updateBoats = function (dt) { const r = _ub(dt); if (!world || !world.beacons) return r;
    for (const [k, st] of world.beacons) { const [x, y, z] = k.split(',').map(Number); if (world.get(x, y, z) !== B.BEACON) { world.beacons.delete(k); const bm = beaconBeams.get(k); if (bm) { G.scene.remove(bm); beaconBeams.delete(k); } continue; }
      const lv = beaconLevels(x, y, z); let beam = beaconBeams.get(k); if (lv && !beam) { beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 200, 0.3), new THREE.MeshBasicMaterial({ color: 0xbff8ff, transparent: true, opacity: 0.6 })); beam.position.set(x + 0.5, y + 100.5, z + 0.5); G.scene.add(beam); beaconBeams.set(k, beam); } if (!lv && beam) { G.scene.remove(beam); beaconBeams.delete(k); }
      if (lv && st.fx && player.pos.distanceTo(new V3(x, y, z)) < 10 + 10 * lv && !player.dead) { const fx = BEACON_FX.find(f => f[0] === st.fx); const amp = lv >= 4 && st.fx !== 'regeneration' ? 1 : 0; const cur = player.effects[st.fx]; if (!cur || cur.t < 9) giveEffect(st.fx, 11 + 2 * lv, amp); } }
    return r; }; }
{ const _pw = packWorld; packWorld = function (w) { const r = _pw(w); if (w.beacons && w.beacons.size) r.beacons = Object.fromEntries(w.beacons); return r; }; const _uw = unpackWorld; unpackWorld = function (w, d) { const r = _uw(w, d); if (d && d.beacons) w.beacons = new Map(Object.entries(d.beacons)); return r; }; }
