// ================= OUTER END, END CITIES, SHULKERS, ELYTRA (Minecraft) =================
// After the dragon falls an End Gateway appears near the island's edge; jump in to reach the outer islands 1000
// blocks out. End cities there are purpur towers with loot chests and shulkers, and some have an End Ship with an
// Elytra. Shulkers hide in their shells and shoot homing bullets that make you float (Levitation). Elytra: wear
// one as a chestplate and press jump while falling to glide; look down to gain speed, up to climb; fireworks
// boost you. Flying into a wall too fast hurts.
// ---------- ladders: placed on the side of a block, facing out from it; they need that wall to stay ----------
function ladderFor(nx, nz) { return nx > 0 ? B.LADDER_W : nx < 0 ? B.LADDER_E : nz > 0 ? B.LADDER : B.LADDER_S; }
function ladderWall(id) { return id === B.LADDER ? [0, -1] : id === B.LADDER_S ? [0, 1] : id === B.LADDER_W ? [-1, 0] : [1, 0]; }
{ const _pb = placeBlock; placeBlock = function (t, id) {
    if (BL[id] && BL[id].ladder) { if (t.ny !== 0 && !BL[t.id].ladder) return false; id = BL[t.id].ladder && t.ny !== 0 ? t.id : ladderFor(t.nx, t.nz); const [wx, wz] = ladderWall(id); if (!SOLID[world.get(t.x + t.nx + wx, t.y + t.ny, t.z + t.nz + wz)]) return false; }
    return _pb.call(this, t, id);
  }; }
// ---------- outer islands ----------
{ const _col = EndGen.prototype.column; EndGen.prototype.column = function (x, z) {
    const dd = Math.hypot(x, z); if (dd < 800) return _col.call(this, x, z);
    const n = this.n.n2(x / 70, z / 70) + this.n2.n2(x / 23, z / 23) * 0.25; if (n < 0.28) return { h: 0, b: 0, bottom: 0 };
    const top = 54 + Math.round(this.n2.n2(x / 40, z / 40) * 6); const th = Math.round((n - 0.28) * 40); return { h: top, b: 0, bottom: top - Math.max(2, th) };
  }; }
PLACE.end_city = { spacing: 20, sep: 11, salt: 10387313 };
Object.assign(STRUCT_NAMES, { end_city: 'end_city' });
LOOT.end_city = [['diamond', 2, 7, 0.3], ['iron_ingot', 4, 8, 0.5], ['gold_ingot', 2, 7, 0.5], ['emerald', 2, 6, 0.3], ['diamond_sword', 1, 1, 0.1], ['diamond_chestplate', 1, 1, 0.08], ['diamond_pickaxe', 1, 1, 0.08], ['iron_sword', 1, 1, 0.1], ['saddle', 1, 1, 0.15], ['diamond_horse_armor', 1, 1, 0.08], ['enchanted_book', 1, 1, 0.25]];
LOOT.end_ship = [['elytra', 1, 1, 1], ['diamond', 2, 5, 0.4], ['emerald', 2, 6, 0.3], ['enchanted_book', 1, 1, 0.3], ['iron_ingot', 2, 6, 0.4]];
{ const _es = endStructures; endStructures = function (world, cx, cz) {
    const S = _es(world, cx, cz); if (S.endCity || Math.hypot(cx * 16, cz * 16) < 900) return S; S.endCity = true;
    const st = startNear(world, 'end_city', cx, cz, 0); if (!st) return S; const g = world.gen; const xc = cx * 16 + 8, zc = cz * 16 + 8; const base = g.column(xc, zc); if (!base.h) return S;
    const hard = (x, y, z, id) => { if (y > 0 && y < WH) S.hard.push(x, y, z, id); }; const r = mulberry32(st.seed); let y = base.h;
    const floors = 3 + (r() * 3 | 0);
    for (let f = 0; f < floors; f++) { const half = f === 0 ? 4 : 3; const H = 5;
      for (let x = -half; x <= half; x++) for (let z = -half; z <= half; z++) for (let h = 0; h <= H; h++) { if (x === 0 && z === 0 && !(f === 0 && h === 0)) continue; const edge = Math.abs(x) === half || Math.abs(z) === half; const corner = Math.abs(x) === half && Math.abs(z) === half; hard(xc + x, y + h, zc + z, h === 0 || h === H ? (f === 0 && h === 0 ? B.END_STONE_BRICKS : B.PURPUR_BLOCK) : corner ? B.PURPUR_PILLAR : edge ? ((h === 2 || h === 3) && (x === 0 || z === 0) ? 0 : B.PURPUR_BLOCK) : 0); }
      hard(xc + half - 1, y + 3, zc + half - 1, B.END_ROD); hard(xc - half + 1, y + 3, zc - half + 1, B.END_ROD);
      if (f > 0 && r() < 0.6) { hard(xc + 1, y + 1, zc + 1, B.CHEST); S.kinds.push(['chest:end_city', xc + 1, zc + 1, y + 1]); }
      if (r() < 0.8) S.mobs.push(['shulker', xc - half + 1.5, y + 1, zc + 0.5]);
      for (let h = 1; h <= H; h++) { hard(xc, y + h, zc, 0); hard(xc, y + h, zc - 1, B.PURPUR_PILLAR); hard(xc, y + h, zc, B.LADDER); } if (f === 0) hard(xc, y, zc, B.END_STONE_BRICKS); y += H;
    }
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) { if (x === 0 && z === 0) continue; hard(xc + x, y, zc + z, B.PURPUR_BLOCK); if (Math.abs(x) === 3 || Math.abs(z) === 3) hard(xc + x, y + 1, zc + z, (x + z) % 2 ? B.PURPUR_PILLAR : 0); } for (let h = 1; h <= 3; h++) hard(xc + 2, y + h, zc + 2, B.PURPUR_PILLAR); hard(xc + 2, y + 4, zc + 2, B.END_ROD);
    // a bridge from the second floor to a side house with loot and shulkers
    { const dirs = [[-1, 0], [0, 1], [0, -1]]; const [dx, dz] = dirs[r() * 3 | 0]; const px = -dz, pz = dx; const yf = base.h + 5; const at = (a, b) => [xc + dx * a + px * b, zc + dz * a + pz * b];
      for (let h = 1; h <= 3; h++) { const [x, z] = at(3, 0); hard(x, yf + h, z, 0); }
      for (let a = 4; a <= 9; a++) for (let b = -2; b <= 2; b++) { const [x, z] = at(a, b); hard(x, yf, z, Math.abs(b) === 2 ? B.PURPUR_BLOCK : B.END_STONE_BRICKS); if (Math.abs(b) === 2) hard(x, yf + 1, z, a % 2 ? B.PURPUR_PILLAR : 0); for (let h = 1; h <= 3; h++) if (Math.abs(b) < 2) hard(x, yf + h, z, 0); }
      const R = 4, c0 = 14, Hh = 6;
      for (let a = c0 - R; a <= c0 + R; a++) for (let b = -R; b <= R; b++) for (let h = 0; h <= Hh; h++) { const [x, z] = at(a, b); const ea = Math.abs(a - c0) === R, eb = Math.abs(b) === R; const corner = ea && eb;
        let id = h === 0 ? B.END_STONE_BRICKS : h === Hh ? B.PURPUR_BLOCK : corner ? B.PURPUR_PILLAR : (ea || eb) ? B.PURPUR_BLOCK : 0;
        if ((ea || eb) && !corner && h >= 2 && h <= 4 && (Math.abs(a - c0) === 2 || Math.abs(b) === 2) && h !== 4) id = 0; // windows
        if (a === c0 - R && Math.abs(b) <= 1 && h >= 1 && h <= 3) id = 0; // doorway
        hard(x, yf + h, z, id); }
      // a peaked roof and a little turret
      for (let k = 1; k <= 2; k++) for (let a = c0 - R + k; a <= c0 + R - k; a++) for (let b = -R + k; b <= R - k; b++) { const [x, z] = at(a, b); hard(x, yf + Hh + k, z, k === 2 && Math.abs(a - c0) < 1 && Math.abs(b) < 1 ? B.PURPUR_PILLAR : B.PURPUR_BLOCK); }
      { const [x, z] = at(c0, 0); hard(x, yf + Hh + 3, z, B.END_ROD); }
      for (const [a, b] of [[c0 - R + 1, -R + 1], [c0 + R - 1, R - 1], [c0 + R - 1, -R + 1], [c0 - R + 1, R - 1]]) { const [x, z] = at(a, b); hard(x, yf + 4, z, B.END_ROD); }
      { const [x, z] = at(c0 + R - 1, 0); hard(x, yf + 1, z, B.CHEST); S.kinds.push(['chest:end_city', x, z, yf + 1]); }
      if (r() < 0.6) { const [x, z] = at(c0 + R - 1, 2); hard(x, yf + 1, z, B.CHEST); S.kinds.push(['chest:end_city', x, z, yf + 1]); }
      for (const b of [-2, 2]) { const [x, z] = at(c0 + 1, b); S.mobs.push(['shulker', x + 0.5, yf + 1, z + 0.5]); }
      { const [x, z] = at(c0, 0); S.mobs.push(['shulker', x + 0.5, yf + 1, z + 0.5]); }
    }
    // an End Ship floating beside some cities, reached by a gangway from the third floor, with an elytra inside
    if (r() < 0.5) { const sx = xc + 14, sy = base.h + 10, sz = zc; for (let h = 1; h <= 3; h++) hard(xc + 3, sy + h, zc, 0); for (let j = -1; j <= 1; j++) hard(xc + 4, sy, zc + j, B.END_STONE_BRICKS); for (let i = -9; i <= 9; i++) { const w = Math.max(0, 3 - Math.floor(Math.abs(i) / 3)); for (let j = -w; j <= w; j++) { hard(sx + i, sy, sz + j, B.PURPUR_BLOCK); if (Math.abs(j) === w && i > -8) for (let h = 1; h <= 2; h++) hard(sx + i, sy + h, sz + j, B.PURPUR_BLOCK); } }
      for (let h = 1; h <= 9; h++) hard(sx, sy + h, sz, B.PURPUR_PILLAR); hard(sx + 3, sy + 1, sz, B.CHEST); S.kinds.push(['chest:end_ship', sx + 3, sz, sy + 1]); hard(sx - 4, sy + 1, sz, B.CHEST); S.kinds.push(['chest:end_city', sx - 4, sz, sy + 1]); S.mobs.push(['shulker', sx + 6.5, sy + 1, sz + 0.5]); }
    S.kinds.push(['end_city', xc, zc]); return S;
  }; }
// chorus trees on the outer islands: a trunk that branches out and up, tipped with flowers
function chorusTree(hard, r, x, y, z) {
  const grow = (x, y, z, len, depth) => { for (let i = 0; i < len; i++) hard(x, y + i, z, B.CHORUS_PLANT); const ty = y + len;
    if (depth >= 3 || r() < 0.15) { hard(x, ty, z, B.CHORUS_FLOWER); return; }
    hard(x, ty, z, B.CHORUS_PLANT); const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => r() - 0.5); const n = 1 + (r() * 3 | 0);
    for (let k = 0; k < n; k++) { const [dx, dz] = dirs[k]; const L = 1 + (r() * 2 | 0); for (let j = 1; j <= L; j++) hard(x + dx * j, ty, z + dz * j, B.CHORUS_PLANT); grow(x + dx * L, ty + 1, z + dz * L, 1 + (r() * 3 | 0), depth + 1); } };
  grow(x, y, z, 2 + (r() * 3 | 0), 0);
}
{ const _es = endStructures; endStructures = function (world, cx, cz) {
    const S = _es(world, cx, cz); if (S.chorusDone) return S; S.chorusDone = true;
    if (Math.hypot(cx * 16, cz * 16) < 800) return S; const r = mulberry32(ihash(cx, cz, 4417, world.seed)); const g = world.gen;
    const hard = (x, y, z, id) => { if (y > 0 && y < WH) S.hard.push(x, y, z, id); };
    const n = r() < 0.45 ? 1 + (r() * 3 | 0) : 0;
    for (let i = 0; i < n; i++) { const x = cx * 16 + 3 + (r() * 10 | 0), z = cz * 16 + 3 + (r() * 10 | 0); const col = g.column(x, z); if (!col.h) continue; if (S.kinds.some(k => k[0] === 'end_city' && Math.abs(k[1] - x) < 12 && Math.abs(k[2] - z) < 12)) continue; chorusTree(hard, r, x, col.h, z); }
    return S;
  }; }
// chorus fruit: eating it teleports you up to 8 blocks away, onto solid ground
function onEatItem(id) {
  if (id !== IT.chorus_fruit) return; const P = player;
  for (let t = 0; t < 16; t++) { const x = Math.floor(P.pos.x + (Math.random() - 0.5) * 16), z = Math.floor(P.pos.z + (Math.random() - 0.5) * 16); const y0 = Math.floor(P.pos.y + (Math.random() - 0.5) * 16);
    for (let y = clamp(y0 + 8, 2, WH - 3); y > Math.max(1, y0 - 8); y--) if (world.solid(x, y - 1, z) && !world.solid(x, y, z) && !world.solid(x, y + 1, z) && !BL[world.get(x, y, z)].fluid) {
      Particles.emit(P.pos.x, P.pos.y + 1, P.pos.z, 16, [[0.6, 0.2, 0.9]], 2, 0.8, -1, 1); P.pos.set(x + 0.5, y + 0.01, z + 0.5); P.vel.set(0, 0, 0); P.peak = null; P.gliding = false; if (P.riding && typeof dismount === 'function') dismount(); Sfx.play('vwoop', 0.9); Particles.emit(P.pos.x, P.pos.y + 1, P.pos.z, 16, [[0.6, 0.2, 0.9]], 2, 0.8, -1, 1); return; }
  }
}
// chests in End structures get loot
{ const _oc = openChest; openChest = function (x, y, z) {
    const k = x + ',' + y + ',' + z; if (world.dim === 'end' && !world.chestInv.has(k)) for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const S2 = structuresFor(world, (x >> 4) + dx, (z >> 4) + dz); for (const kk of (S2.kinds || [])) if (String(kk[0]).startsWith('chest:') && kk[1] === x && kk[2] === z && kk[3] === y) { world.chestInv.set(k, rollLoot(kk[0].slice(6), ihash(x, y, z, world.seed))); break; } }
    return _oc.apply(this, arguments);
  }; }
// ---------- end gateway: appears when the dragon is dead ----------
const GATEWAY = [0, 75, 96];
function updateGateway(dt) {
  if (!world || world.dim !== 'end' || !S.dragonDead) return; const [gx, gy, gz] = GATEWAY; if (!world.loaded(gx, gz)) return;
  if (!isClientMP() && world.get(gx, gy, gz) !== B.END_GATEWAY) { for (let dx = -1; dx <= 1; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -1; dz <= 1; dz++) { const id = (dx === 0 && dy === 0 && dz === 0) ? B.END_GATEWAY : (Math.abs(dy) === 1 && dx === 0 && dz === 0) ? B.BEDROCK : (Math.abs(dy) === 1 && Math.abs(dx) + Math.abs(dz) === 1) ? B.BEDROCK : 0; if (Math.abs(dy) === 2 && !(dx === 0 && dz === 0)) continue; world.set(gx + dx, gy + dy, gz + dz, id); mpBlock(gx + dx, gy + dy, gz + dz, id); } Sfx.play('boom', 0.3, 0.6); }
  const P = player; if (P.dead) return;
  const near = (x, y, z) => P.pos.distanceTo(new V3(x + 0.5, y + 0.5, z + 0.5)) < 30; if (Math.random() < dt * 12 && near(gx, gy, gz)) Particles.emit(gx + 0.5, gy + 0.5, gz + 0.5, 1, [[0.6, 0.3, 0.9], [0.3, 0.9, 0.8]], 1, 0.8, -1, 0.6);
  // touch a gateway block: near the main island it sends you 1000 blocks out, out there it brings you back
  const id = world.get(Math.floor(P.pos.x), Math.floor(P.pos.y + 0.5), Math.floor(P.pos.z)), id2 = world.get(Math.floor(P.pos.x), Math.floor(P.pos.y + 1.5), Math.floor(P.pos.z));
  if ((id === B.END_GATEWAY || id2 === B.END_GATEWAY) && !(S.gwCD > 0)) { S.gwCD = 2;
    const out = Math.hypot(P.pos.x, P.pos.z) < 500; const tx = out ? 1000 : 0, tz = out ? 96 : 92;
    if (P.riding) dismount && dismount(); P.gliding = false; P.pos.set(tx + 0.5, 120, tz + 0.5); P.vel.set(0, 0, 0); P.peak = null; S.tpGround = { x: tx, z: tz, t: 30, end: true, out }; Sfx.play('vwoop', 1, 0.6); world.lastCenter = null; }
  if (S.gwCD > 0) S.gwCD -= dt;
}
{ const _ub = updateBoats; updateBoats = function (dt) { const r = _ub(dt); updateGateway(dt); return r; }; }
// arriving through a gateway: land on the nearest ground, building a small platform (and a gateway home) if the
// outer islands have none there
{ const _st = settleTeleport; settleTeleport = function (dt) {
    const T2 = S.tpGround; if (!T2 || !T2.end || !world || world.dim !== 'end') return _st(dt);
    const x = Math.floor(T2.x), z = Math.floor(T2.z); if (!world.loaded(x, z)) { player.vel.set(0, 0, 0); T2.t -= dt; if (T2.t <= 0) S.tpGround = null; return; }
    let y = -1; for (let yy = 110; yy > 20; yy--) if (world.solid(x, yy, z)) { y = yy + 1; break; }
    if (y < 0) { y = 61; for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { world.set(x + dx, 60, z + dz, B.END_STONE); mpBlock(x + dx, 60, z + dz, B.END_STONE); } }
    if (T2.out && !isClientMP()) { const gx = x + 3; let has = false; for (let dy = -3; dy <= 6; dy++) if (world.get(gx, y + dy, z) === B.END_GATEWAY) has = true;
      if (!has) { const set = (a, b, c, id) => { world.set(a, b, c, id); mpBlock(a, b, c, id); }; set(gx, y + 1, z, B.END_GATEWAY); set(gx, y, z, B.BEDROCK); set(gx, y + 2, z, B.BEDROCK); } }
    player.pos.set(x + 0.5, y + 0.01, z + 0.5); player.vel.set(0, 0, 0); player.peak = null; S.tpGround = null; S.gwCD = 2;
  }; }
// /locate end_city
{ const _lc = CMDS.locate.run; CMDS.locate.run = function (a, ctx) {
    if (a[0] === 'structure' && STRUCT_NAMES[String(a[1] || '').toLowerCase()] === 'end_city') { if (world.dim !== 'end') throw new CmdError('End cities are in the End'); const P = player.pos; const sp = PLACE.end_city.spacing; const prx = Math.floor(P.x / 16 / sp), prz = Math.floor(P.z / 16 / sp); let best = null;
      for (let rr = 0; rr <= 40 && !best; rr++) for (let rx = prx - rr; rx <= prx + rr; rx++) for (let rz = prz - rr; rz <= prz + rr; rz++) { if (Math.max(Math.abs(rx - prx), Math.abs(rz - prz)) !== rr) continue; const st = regionStart(world, 'end_city', rx, rz); if (!st || Math.hypot(st.cx * 16, st.cz * 16) < 900 || !world.gen.column(st.cx * 16 + 8, st.cz * 16 + 8).h) continue; const x = st.cx * 16 + 8, z = st.cz * 16 + 8; if (!best || Math.hypot(x - P.x, z - P.z) < Math.hypot(best[0] - P.x, best[1] - P.z)) best = [x, z]; }
      if (!best) throw new CmdError('Could not find an end city within reasonable distance'); chatPrint('The nearest end_city is at [' + best[0] + ', ~, ' + best[1] + '] (' + Math.round(Math.hypot(best[0] - P.x, best[1] - P.z)) + ' blocks away)', '#7ef'); return; }
    return _lc.call(this, a, ctx);
  }; }
// ---------- shulkers ----------
MOBS.shulker = { name: 'Shulker', hp: 30, w: 1, h: 1, speed: 0, kind: 'hostile', snd: 'squish', persist: true, egg: [[148, 100, 148], [77, 54, 82]], drops: [['shulker_shell', 0, 1, 0.5]],
  build(m, r) { const PU = [160, 104, 160]; sbox(m, r, 1, 0.5, 1, 0, 0.25, 0, 'shk_base', fur(PU, 5, { extra: (f, set, fw, fh) => { for (let x = 0; x < fw; x++) set(x, 0, [120, 74, 120]); } })); m.lid = pivot(r, 0, 0.5, 0); sbox(m, m.lid, 1, 0.5, 1, 0, 0.25, 0, 'shk_lid', fur(PU, 5, { extra: (f, set, fw, fh) => { for (let x = 0; x < fw; x++) set(x, fh - 1, [120, 74, 120]); } }));
    const h = pivot(r, 0, 0.45, 0); m.head = h; sbox(m, h, 0.4, 0.4, 0.4, 0, 0, 0, 'shk_head', fur([230, 220, 150], 4, { extra: (f, set, fw) => { if (f === 'front') { set(1, 1, [30, 30, 30]); set(fw - 2, 1, [30, 30, 30]); } } })); } };
MOB_XP.shulker = [5, 5];
PROJ.shulker = { grav: 0, size: 0.3, color: 0xf0f0e0, trail: [[0.9, 0.9, 0.8]] };
MOBS.shulker.tick = function (m, dt) {
  m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.light = 1; m.lightT = 9; m.vel.set(0, 0, 0); const P = hostileTarget(m, 16);
  m.open = clamp((m.open || 0) + (P ? dt * 2 : -dt * 2), 0, 1); if (m.lid) m.lid.position.y = 0.5 + m.open * 0.35; if (m.head) m.head.visible = m.open > 0.2;
  m.shootT = (m.shootT == null ? 2 : m.shootT) - dt;
  if (P && m.shootT <= 0 && m.open > 0.8) { m.shootT = 1 + Math.random() * 5; const p = spawnProj('shulker', m.pos.clone().add(new V3(0, 0.8, 0)), new V3(0, 3, 0), 'mob', 4, m); p.homing = true; p.life = 10; p.cause = 'a Shulker'; p.effect = ['levitation', 10, 0]; Sfx.at('vwoop', m.pos, 0.4, 1.6); }
  m.root.position.copy(m.pos); m.colorize(); return true;
};
// shulker bullets home in on you; a hit gives Levitation
{ const _up = updateProjectiles; updateProjectiles = function (dt) {
    for (const a of G.projectiles) if (a.homing && !a.done) { const to = player.eye().add(new V3(0, -0.6, 0)).sub(a.pos); const L = to.length(); if (L > 0.01) a.vel.lerp(to.multiplyScalar(6 / L), Math.min(1, dt * 2.5)); }
    return _up.apply(this, arguments);
  }; }
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, na) { if (this.type === 'shulker') { kb = 0; if ((this.open || 0) < 0.5) dmg *= 0.2; } return _h.call(this, dmg, src, kb, na); }; }
// ---------- elytra ----------
function elytraOK() { const s = player.inv[38]; return !!(s && s.id === IT.elytra && (maxDur(s.id) - (s.dmg || 0)) > 1); }
// start gliding: press jump while falling with an elytra on
{ const _up = updatePlayer; updatePlayer = function (dt) {
    const P = player; const r = _up.apply(this, arguments);
    const jumpNow = !S.uiOpen && kd('jump');
    if (!P.gliding && jumpNow && !S.prevJump && !P.onGround && !P.flying && !P.riding && !P.dead && P.vel.y < 0 && elytraOK() && !inWater(P, 0.4) && S.mode !== 'spectator') { P.gliding = true; P.glideT = 0; Sfx.play('vwoop', 0.25, 0.7); }
    S.prevJump = jumpNow; return r;
  }; }
// Minecraft's elytra flight, worked in 20 Hz steps (velocities in blocks per tick). Called from updatePlayer.
function glideUpdate(P, dt) {
  if (P.onGround || inWater(P, 0.4) || inLava(P, 0.3) || P.flying || P.riding || !elytraOK() || S.mode === 'spectator') { P.gliding = false; P.boostT = 0; return false; }
  if (keys.KeyJ) look(-300 * dt, 0); if (keys.KeyL) look(300 * dt, 0); if (keys.KeyI) look(0, -300 * dt); if (keys.KeyK) look(0, 300 * dt);
  const ld = lookDir(); const f = -P.pitch; // Minecraft's pitch is positive looking down
  const v = new V3(P.vel.x / 20, P.vel.y / 20, P.vel.z / 20); const before = Math.hypot(v.x, v.z);
  P.glideAcc = (P.glideAcc || 0) + dt; let n = 0;
  while (P.glideAcc >= 0.05 && n < 4) { P.glideAcc -= 0.05; n++;
    const d1 = Math.hypot(ld.x, ld.z), d3 = Math.hypot(v.x, v.z); let c = Math.cos(f); c = c * c * Math.min(1, ld.length() / 0.4);
    v.y += 0.08 * (-1 + c * 0.75);
    if (v.y < 0 && d1 > 0) { const d5 = v.y * -0.1 * c; v.x += ld.x * d5 / d1; v.y += d5; v.z += ld.z * d5 / d1; }
    if (f < 0 && d1 > 0) { const d9 = d3 * -Math.sin(f) * 0.04; v.x -= ld.x * d9 / d1; v.y += d9 * 3.2; v.z -= ld.z * d9 / d1; }
    if (d1 > 0) { v.x += (ld.x / d1 * d3 - v.x) * 0.1; v.z += (ld.z / d1 * d3 - v.z) * 0.1; }
    if (P.boostT > 0) { v.x += ld.x * 0.1 + (ld.x * 1.5 - v.x) * 0.5; v.y += ld.y * 0.1 + (ld.y * 1.5 - v.y) * 0.5; v.z += ld.z * 0.1 + (ld.z * 1.5 - v.z) * 0.5; P.boostT -= 0.05; if (Math.random() < 0.5) Particles.emit(P.pos.x, P.pos.y + 0.6, P.pos.z, 2, [[1, 0.85, 0.5], [1, 1, 1]], 0.5, 0.5, 0, 0.4); }
    v.x *= 0.99; v.y *= 0.98; v.z *= 0.99;
  }
  P.vel.set(v.x * 20, v.y * 20, v.z * 20); moveEntity(P, dt);
  // flying into a wall hurts: Minecraft takes (speed lost * 10 - 3)
  if (P.hitH && isSurv()) { const after = Math.hypot(P.vel.x, P.vel.z) / 20; const dmg = Math.floor((before - after) * 10 - 3); if (dmg > 0) { P.hurtCD = 0; P.hurt(dmg, null, 'flying into a wall', 0); } }
  // a hard landing at speed also hurts; otherwise gliding resets the fall
  if (P.onGround) { const dmg = Math.floor(-v.y * 20 / 4 - 3); if (dmg > 0 && isSurv() && S.rules.fallDamage) P.hurt(dmg, null, 'fall damage'); P.gliding = false; P.boostT = 0; }
  P.peak = null; P.sprinting = false; P.sneaking = false;
  P.glideT = (P.glideT || 0) + dt; if (P.glideT >= 1) { P.glideT -= 1; damageSlot(38, 1); if (!elytraOK()) { toast('Your elytra is broken', 2); } }
  if (P.pos.y < -64 && isSurv()) { P.health = 0; P.die('the void'); }
  return true;
}
// a firework rocket: boost while gliding, otherwise a burst of colour where you aim
{ const _ua = useAction; useAction = function (eye, dir) { const h = player.held(); const hd = h && ITEMS[h.id];
    if (hd && hd.kind === 'firework') { mouseR = false;
      if (player.gliding) { player.boostT = 1.1 + Math.random() * 0.4; if (S.mode !== 'creative') useHeld(1); Sfx.play('vwoop', 0.5, 0.5); S.swing = 1; return; }
      if (target) { if (S.mode !== 'creative') useHeld(1); S.swing = 1; const x = target.x + 0.5, z = target.z + 0.5, y = target.y + 1; G.fireworks = G.fireworks || []; G.fireworks.push({ x, y, z, t: 0, hue: Math.random() }); Sfx.play('vwoop', 0.4, 0.6); }
      return; }
    return _ua(eye, dir); }; }
function updateFireworks(dt) { if (!G.fireworks || !G.fireworks.length) return;
  for (const fw of G.fireworks) { fw.t += dt; if (fw.t < 1.2) { if (Math.random() < 0.7) Particles.emit(fw.x, fw.y + fw.t * 12, fw.z, 1, [[1, 0.9, 0.6]], 0.3, 0.3, 0, 0.3); }
    else if (!fw.done) { fw.done = true; const c = new THREE.Color().setHSL(fw.hue, 1, 0.6), c2 = new THREE.Color().setHSL((fw.hue + 0.15) % 1, 1, 0.7); Particles.emit(fw.x, fw.y + 14, fw.z, 70, [[c.r, c.g, c.b], [c2.r, c2.g, c2.b]], 9, 1.4, 3, 1.6); Sfx.play('boom', 0.25, 1.8); } }
  G.fireworks = G.fireworks.filter(f => !f.done); }
{ const _ub = updateBoats; updateBoats = function (dt) { const r = _ub(dt); updateFireworks(dt); return r; }; }
