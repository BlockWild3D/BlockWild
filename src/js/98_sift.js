// ================= THE SIFT: the fourth dimension =================
// What Mojang has shown (Minecraft Live, September 2026): a bright, soul-rich dimension with pink grass and white Sift
// trees, home to spirit creatures such as the Blub, reached through the great portal frame at the heart of an ancient
// city. Everything else is BlockWild's own interpretation until the real thing ships in 2027:
//  - Wake an ancient city's portal by using an Echo Shard on its reinforced deepslate frame. The frame fills with a
//    rift; stand in it to cross over. You arrive beside a small return rift.
//  - Singer's Meadow: rolling pink grassland, groves of white Sift trees, songblooms, wisp lilies, glowing pools.
//  - The Carapace: great ridges of shell plates arching over hollows, soul crystals growing on top.
//  - Drifting Isles float above the meadow. Rare rift gates stand in the meadow and lead back to the same spot in
//    the Overworld.
//  - The Blub: a little floating soul. It follows anyone holding a songbloom; feed it one and it sings, and now and
//    then leaves a soul shard behind.
// Blocks and items: 01aq_sift.js. The World picks SiftGen for dimension 'sift' (02_world.js).
const SIFT_SEA = 58;
class SiftGen {
  constructor(seed) { this.seed = seed; this.n = new Perlin(seed + 401); this.n2 = new Perlin(seed + 402); this.nb = new Perlin(seed + 403); this.nr = new Perlin(seed + 404); this.ni = new Perlin(seed + 405); this.nh = new Perlin(seed + 406); }
  column(x, z) {
    const car = smoothstep(0.08, 0.32, this.nb.n2(x / 260 + 11.3, z / 260 - 7.1));
    const base = 66 + this.n.n2(x / 110, z / 110) * 10 + this.n2.n2(x / 34, z / 34) * 3.2 + this.n2.n2(x / 9 + 40, z / 9) * 0.7;
    const ridge = 1 - Math.abs(this.nr.n2(x / 52, z / 52)); const plate = car * (Math.pow(ridge, 5) * 30 + ridge * 4);
    const isle = car < 0.3 ? this.ni.n2(x / 38, z / 38) - 0.52 : -1;
    return { h: Math.round(base + plate), base: Math.round(base), plate, car, b: car > 0.5 ? 1 : 0, v: 0, isle };
  }
  hollow(x, y, z) { return this.nh.n3(x / 14, y / 9, z / 14) > 0.22; }
  biome(x, z) { return this.column(x, z).b; }
  biomeName(x, z, y) { const c = this.column(Math.floor(x), Math.floor(z)); if (y != null && c.isle > 0 && y > 100) return 'Drifting Isles'; return c.b ? 'The Carapace' : "Singer's Meadow"; }
}
function genSiftChunk(world, c) {
  const g = world.gen, d = c.d, bx = c.cx * 16, bz = c.cz * 16, seed = world.seed; const I = (x, y, z) => (y * 16 + z) * 16 + x;
  const flowers = (X, Z) => g.n2.n2(X / 22 + 100, Z / 22) > 0.25;
  for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
    const X = bx + x, Z = bz + z; const col = g.column(X, Z); const h = col.h; const shell = col.plate > 3;
    d[I(x, 0, z)] = B.BEDROCK;
    for (let y = 1; y < h; y++) {
      let id = y === h - 1 ? (shell ? B.CARAPACE : h - 1 < SIFT_SEA ? B.SIFT_SOIL : B.SIFT_GRASS_BLOCK) : y >= h - 4 ? (shell ? B.CARAPACE : B.SIFT_SOIL) : B.SIFTSTONE;
      if (col.plate > 9 && y > col.base + 1 && y < h - 3 && g.hollow(X, y, Z)) id = 0; // arches under the shell ridges
      d[I(x, y, z)] = id;
    }
    for (let y = h; y < SIFT_SEA; y++) d[I(x, y, z)] = B.WATER;
    const q = rnd01(X, 7, Z, seed);
    if (h < SIFT_SEA) { if (q < 0.1) d[I(x, h - 1, z)] = B.SOUL_CRYSTAL_BLOCK; }
    else if (shell) { if (q < 0.012 && h < WH - 2) d[I(x, h, z)] = B.SOUL_CRYSTAL; }
    else if (h < WH - 2) { const fl = flowers(X, Z); if (fl && q < 0.09) d[I(x, h, z)] = q < 0.06 ? B.SONGBLOOM : B.WISP_LILY; else if (q < 0.25) d[I(x, h, z)] = B.SIFT_SPROUTS; else if (q < 0.253) d[I(x, h, z)] = B.SONGBLOOM; }
    // drifting isles: lens-shaped islands of siftstone with a grassy top
    if (col.isle > 0) { const top = 112 + Math.round(g.n.n2(X / 20, Z / 20) * 3); const th = Math.min(16, Math.round(col.isle * 60)); if (th > 0) {
      for (let y = top - th; y <= top; y++) d[I(x, y, z)] = y === top ? B.SIFT_GRASS_BLOCK : y >= top - 2 ? B.SIFT_SOIL : B.SIFTSTONE;
      const q2 = rnd01(X, 9, Z, seed); if (q2 < 0.2) d[I(x, top + 1, z)] = q2 < 0.03 ? B.SONGBLOOM : B.SIFT_SPROUTS; else if (th > 3 && q2 > 0.985) d[I(x, top - th, z)] = B.SOUL_CRYSTAL_BLOCK; } }
  }
  // soul crystal pockets in the siftstone
  const r = mulberry32(ihash(c.cx, c.cz, 8807, seed));
  for (let t = 0; t < 5; t++) { const x = 1 + (r() * 14 | 0), z = 1 + (r() * 14 | 0), y = 6 + (r() * 50 | 0); if (d[I(x, y, z)] !== B.SIFTSTONE) continue;
    for (let k = 0; k < 6; k++) { const a = x + (r() * 3 | 0) - 1, b = y + (r() * 3 | 0) - 1, e = z + (r() * 3 | 0) - 1; if (d[I(a, b, e)] === B.SIFTSTONE) d[I(a, b, e)] = B.SOUL_CRYSTAL_BLOCK; } }
}
// white Sift trees: a slim trunk that kinks once, a wide soft canopy and strands hanging from its rim
TREES.sift = function (put, x, y, z, r) {
  const H = 5 + (r() * 4 | 0); const log = B.SIFT_LOG, lv = B.SIFT_LEAVES; let tx = x, tz = z; const lean = r() < 0.5 ? [r() < 0.5 ? 1 : -1, 0] : [0, r() < 0.5 ? 1 : -1];
  for (let i = 0; i < H; i++) { if (i === H - 3 && r() < 0.6) { tx += lean[0]; tz += lean[1]; } put(tx, y + i, tz, log, true); }
  const top = y + H, R = 3 + (r() < 0.4 ? 1 : 0);
  for (let dy = -2; dy <= 1; dy++) { const rad = dy === 1 ? R - 2 : dy === 0 ? R - 1 : dy === -1 ? R : R - 1; for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) { const dd = dx * dx + dz * dz; if (dd > rad * rad + 1) continue; if (dd >= rad * rad - 1 && r() < 0.4) continue; put(tx + dx, top + dy, tz + dz, lv); } }
  for (let k = 0; k < 6; k++) { const a = r() * Math.PI * 2; const hx = tx + Math.round(Math.cos(a) * R), hz = tz + Math.round(Math.sin(a) * R); const L = 1 + (r() * 3 | 0); for (let i = 1; i <= L; i++) put(hx, top - 2 - i, hz, lv); }
};
function siftStructures(world, cx, cz) {
  const g = world.gen, seed = world.seed; const S = { soft: [], hard: [], mobs: [], kinds: [] }; const r = mulberry32(ihash(cx, cz, 7711, seed));
  const bx = cx * 16, bz = cz * 16; const hard = (x, y, z, id) => S.hard.push(x, y, z, id); const soft = (x, y, z, id) => S.soft.push(x, y, z, id);
  // a rift gate back to the Overworld, rarely
  let gate = null;
  if (ihash(cx, cz, 9917, seed) % 1000 < 7) { const X = bx + 8, Z = bz + 8; const col = g.column(X, Z); if (!col.b && col.h > SIFT_SEA + 1) { gate = [X, col.h, Z]; riftShape(hard, X, col.h, Z, true); S.kinds.push(['rift', X, Z, col.h]); } }
  // trees: groves here and there, open meadow between
  const grove = g.n2.n2(bx / 70 + 3, bz / 70 - 5); const n = grove > 0.15 ? 3 + (r() * 3 | 0) : r() < 0.35 ? 1 : 0;
  for (let i = 0; i < n; i++) { const X = bx + (r() * 16 | 0), Z = bz + (r() * 16 | 0); const col = g.column(X, Z); if (col.plate > 3 || col.h <= SIFT_SEA || (gate && Math.abs(X - gate[0]) < 5 && Math.abs(Z - gate[2]) < 5)) continue;
    TREES.sift((x, y, z, id, isLog) => (isLog ? hard : soft)(x, y, z, id), X, col.h, Z, r); }
  if (r() < 0.06) { const X = bx + 4 + (r() * 8 | 0), Z = bz + 4 + (r() * 8 | 0); const col = g.column(X, Z); if (col.h >= SIFT_SEA) for (let k = 0; k < 1 + (r() * 3 | 0); k++) S.mobs.push(['blub', X + 0.5 + k * 0.7, col.h + 1.2, Z + 0.5]); }
  return S;
}
// a rift: a 4x5 frame of siftstone bricks (carapace corners) around a 2x3 rift, facing along z, with a pad in front
function riftShape(set, x, y, z, pad) {
  if (pad) for (let dx = -2; dx <= 3; dx++) for (let dz = -2; dz <= 3; dz++) { set(x + dx, y - 1, z + dz, B.SIFTSTONE_BRICKS); if (dz) for (let dy = 0; dy <= 3; dy++) set(x + dx, y + dy, z + dz, 0); }
  for (let dx = -1; dx <= 2; dx++) for (let dy = -1; dy <= 3; dy++) { const fx = dx === -1 || dx === 2, fy = dy === -1 || dy === 3; set(x + dx, y + dy, z, fx && fy ? B.CARAPACE : fx || fy ? B.SIFTSTONE_BRICKS : B.SIFT_PORTAL); }
}
const isSPortal = (id) => id === B.SIFT_PORTAL || id === B.SIFT_PORTAL_Z;
// ---- waking an ancient city's portal ----
function cityAt(x, z, wide) { const sts = bigStartsNear(world, 'ancient_city', x >> 4, z >> 4, 5); let best = null, bd = 1e18;
  for (const st of sts) { const L = acLayout(world, st); const dd = (L.ox - x) ** 2 + (L.oz - z) ** 2; if ((wide || (Math.abs(x - L.ox) <= 11 && Math.abs(z - L.oz) <= 2)) && dd < bd) { bd = dd; best = L; } } return best; }
function wakeCityPortal(x, y, z) {
  const L = cityAt(x, z, false); if (!L || y < L.y0 || y > L.y0 + 19) return false; let n = 0, open = 0;
  for (let dx = -8; dx <= 8; dx++) for (let h = 1; h <= 10; h++) { const X = L.ox + dx, Y = L.y0 + 2 + h, Z = L.oz; const id = world.get(X, Y, Z); if (isSPortal(id)) open++; else if (id === 0 || PLANT[id] || (BL[id] && BL[id].fluid)) { world.set(X, Y, Z, B.SIFT_PORTAL); n++; } }
  if (!n) { if (open) toast('The rift is already open', 2); return open > 0; }
  for (let i = 0; i < 4; i++) Particles.emit(L.ox + 0.5 + (i - 1.5) * 4, L.y0 + 8, L.oz + 0.5, 30, [[0.3, 0.9, 1], [1, 0.6, 0.9], [0.8, 1, 1]], 3, 1.6, -1, 3);
  Sfx.play('portal', 1); Sfx.play('levelup', 0.6, 0.6); toast('The ancient portal wakes. A rift to the Sift is open.', 5); return true;
}
{ const _ua = useAction; useAction = function (eye, dir) {
    const h = player.held(); const hd = h && ITEMS[h.id];
    if (hd && hd.key === 'echo_shard' && target && !targetMob && !isSpec() && world.dim === 'overworld' && target.id === B.REINFORCED_DEEPSLATE && wakeCityPortal(target.x, target.y, target.z)) { useHeld(1); S.swing = 1; mouseR = false; return; }
    return _ua.apply(this, arguments); }; }
// ---- crossing ----
{ const _cp = checkPortals; checkPortals = function (dt) {
    const P = player; const fx = Math.floor(P.pos.x), fz = Math.floor(P.pos.z);
    const inSP = isSPortal(world.get(fx, Math.floor(P.pos.y + 0.1), fz)) || isSPortal(world.get(fx, Math.floor(P.pos.y + 1.2), fz));
    if (!inSP) return _cp.apply(this, arguments);
    if (S.portalLock) return;
    const need = S.mode === 'creative' ? 0.8 : 2.5;
    if (S.portalT === 0) Sfx.play('portal', 0.6, 1.3);
    S.portalT += dt; $('portalfx').style.opacity = Math.min(1, S.portalT / need) * 0.9;
    if (Math.random() < dt * 30) Particles.emit(P.pos.x, P.pos.y + 1, P.pos.z, 1, [[0.3, 0.9, 1], [1, 0.65, 0.9]], 1, 1, -1, 0.8);
    if (S.portalT >= need) travelTo(world.dim === 'sift' ? 'overworld' : 'sift', { type: 'rift', x: fx, z: fz });
  }; }
function findRiftNear(x, z, R) { let best = null, bd = 1e9;
  for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) { if (!world.loaded(x + dx, z + dz)) continue; for (let y = 30; y < 160; y++) { if (isSPortal(world.get(x + dx, y, z + dz)) && !isSPortal(world.get(x + dx, y - 1, z + dz))) { const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = [x + dx, y, z + dz]; } } } }
  if (best) { while (isSPortal(world.get(best[0] - 1, best[1], best[2]))) best[0]--; } return best; }
{ const _ha = handleArrival; handleArrival = function () {
    const a = S.arrival; if (!a || a.type !== 'rift') return _ha.apply(this, arguments); S.arrival = null; const P = player;
    if (world.dim === 'sift') {
      let p = findRiftNear(a.x, a.z, 24);
      if (!p) { let y = world.surfaceY(a.x, a.z); if (y <= SIFT_SEA) y = SIFT_SEA + 1; riftShape((x, yy, z, id) => world.set(x, yy, z, id), a.x, y, a.z, true); p = [a.x, y, a.z]; }
      P.pos.set(p[0] + 1, p[1] + 0.01, p[2] + 2.5); P.yaw = 0; P.pitch = 0.05;
      if (!S.siftSeen) { S.siftSeen = true; toast('The Sift', 4); }
    } else {
      const L = cityAt(a.x, a.z, true);
      if (L && Math.abs(L.ox - a.x) < 40 && Math.abs(L.oz - a.z) < 40) { P.pos.set(L.ox + 0.5, L.y0 + 2.01, L.oz + 4.5); P.yaw = 0; }
      else { const y = world.surfaceY(a.x, a.z); P.pos.set(a.x + 0.5, y + 0.01, a.z + 0.5); }
    }
    P.vel.set(0, 0, 0); P.peak = null; S.portalLock = true; return true; }; }
// ---- the sky: a pink-violet dome, soft rose fog, pale clouds and a scatter of soul-lights ----
{ const _us = updateSky; updateSky = function (eyeFluid) { const r = _us.apply(this, arguments); if (!world || world.dim !== 'sift') return r;
    G.daylight = 0.86; chunkUniforms.daylight.value = G.daylight; chunkUniforms.skyTint.value.setRGB(1.0, 0.94, 0.98);
    skyUniforms.zenith.value.setRGB(0.42, 0.3, 0.68); skyUniforms.horizon.value.setRGB(0.88, 0.66, 0.82); skyUniforms.sunsetK.value = 0; skyUniforms.haloK.value = 0;
    if (!eyeFluid) { scene.fog.color.copy(skyUniforms.horizon.value); chunkUniforms.fogColor.value.copy(skyUniforms.horizon.value); }
    starMat.opacity = 0.4; stars.visible = !eyeFluid; clouds.visible = !eyeFluid; cloudMat.uniforms.color.value.setRGB(1, 0.88, 0.95);
    itemBlockMat.color.setScalar(1); return r; }; }
// ---- planting on Sift soil ----
{ const _pb = placeBlock; placeBlock = function (hit, id) {
    const d = BL[id]; if (d && d.plant && d.crop === undefined && hit) { let x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz; if (PLANT[hit.id]) { x = hit.x; y = hit.y; z = hit.z; } const bd = BL[world.get(x, y - 1, z)];
      if (bd && bd.siftSoil && replaceableAt(x, y, z)) { world.set(x, y, z, id); Sfx.play('grass', 1, 0.8); return true; } }
    return _pb.apply(this, arguments); }; }
// bone meal on Sift grass grows sprouts and flowers around it
{ const _ua = useAction; useAction = function (eye, dir) {
    const h = player.held(); const hd = h && ITEMS[h.id];
    if (hd && hd.key === 'bone_meal' && target && !targetMob && target.id === B.SIFT_GRASS_BLOCK && !world.get(target.x, target.y + 1, target.z)) {
      for (let k = 0; k < 24; k++) { const x = target.x + Math.round((Math.random() - 0.5) * 6), z = target.z + Math.round((Math.random() - 0.5) * 6); for (let dy = 2; dy >= -2; dy--) { const y = target.y + dy; if (world.get(x, y, z) === B.SIFT_GRASS_BLOCK && !world.get(x, y + 1, z)) { const q = Math.random(); world.set(x, y + 1, z, q < 0.1 ? B.SONGBLOOM : q < 0.16 ? B.WISP_LILY : B.SIFT_SPROUTS); break; } } }
      Particles.emit(target.x + 0.5, target.y + 1.2, target.z + 0.5, 14, [[0.5, 0.9, 0.5], [1, 0.7, 0.9]], 1, 0.8, -1, 2); useHeld(1); S.swing = 1; mouseR = false; Sfx.play('grass', 0.8, 1.2); return; }
    return _ua.apply(this, arguments); }; }
// ---- the Blub ----
const BLUB_C = [150, 214, 250];
MOBS.blub = { name: 'Blub', hp: 8, w: 0.5, h: 0.5, speed: 2, kind: 'passive', snd: 'chirp', egg: [[150, 214, 250], [246, 170, 218]], drops: [],
  build(m, r) {
    const b = pivot(r, 0, 0.32, 0); m.head = b; m.bodyP = b;
    sbox(m, b, 0.5, 0.44, 0.5, 0, 0, 0, 'blub_body', fur(BLUB_C, 4, { bottom: [206, 236, 255], extra: (f, set, fw, fh) => { if (f !== 'front') return;
      set(1, 3, [24, 34, 80]); set(1, 2, [24, 34, 80]); set(fw - 2, 3, [24, 34, 80]); set(fw - 2, 2, [24, 34, 80]); set(1, 2, [240, 250, 255]); set(fw - 2, 2, [240, 250, 255]);
      set(0, 4, [250, 160, 210]); set(fw - 1, 4, [250, 160, 210]); set(fw >> 1, 5, [60, 80, 140]); set((fw >> 1) - 1, 5, [60, 80, 140]); } }));
    sbox(m, b, 0.14, 0.16, 0.14, 0.06, 0.28, -0.04, 'blub_tuft', fur([214, 240, 255], 3));
    sbox(m, b, 0.16, 0.12, 0.2, 0, -0.06, -0.3, 'blub_tail', fur([180, 226, 252], 3));
    m.wings = []; for (const s of [-1, 1]) { const p = pivot(b, s * 0.25, 0, 0); sbox(m, p, 0.16, 0.04, 0.2, s * 0.08, 0, 0, 'blub_fin', fur([206, 236, 255], 3)); m.wings.push(p); }
    for (const mt of m.mats) { mt[0].transparent = true; mt[0].opacity = 0.84; } } };
const blubTempted = (m) => { const h = player.held(); return !!(h && h.id === IT.songbloom && !player.dead && m.pos.distanceTo(player.pos) < 10); };
MOBS.blub.tick = (m, dt) => {
  const r = flyTick(m, dt, { range: 8, up: 1.5, speed: m.hurtT > 0 ? 4 : 2.2, flap: 5, follow: () => blubTempted(m) ? player.pos : null });
  if (m.bodyP) { const s = Math.sin(m.age * 3.2); m.bodyP.scale.set(1 + s * 0.05, 1 - s * 0.07, 1 + s * 0.05); m.bodyP.position.y = 0.32 + Math.sin(m.age * 1.7) * 0.06; }
  if (Math.random() < dt * 0.9) Particles.emit(m.pos.x, m.pos.y + 0.25, m.pos.z, 1, [[0.62, 0.9, 1], [1, 0.76, 0.92]], 0.3, 1.2, -1, 0.25);
  if (m.giftT > 0) m.giftT -= dt; return r; };
{ const _mi = mobInteract; mobInteract = function (m, sneaking) {
    if (m.type === 'blub') { const h = player.held(); if (h && h.id === IT.songbloom) { useHeld(1); hearts(m, 4); Sfx.mob(m, null, 0.8); S.swing = 1;
        if (!(m.giftT > 0) && !isClientMP()) { m.giftT = 300; setTimeout(() => { if (!m.dead) { dropItem(IT.soul_shard, 1, m.pos.x, m.pos.y + 0.2, m.pos.z); Particles.emit(m.pos.x, m.pos.y + 0.3, m.pos.z, 10, [[0.5, 0.9, 1]], 1.2, 0.8, -1, 0.4); } }, 1200); } return true; } }
    return _mi(m, sneaking); }; }
MOB_VOICE.blub = [(d, p) => { V.bubble(d, p * 1.5); V.chime(d, p * 0.8, [660, 880, 990]); }, (d, p) => V.squeak(d, p * 0.7, 0, 0.12), (d, p) => V.chime(d, p * 0.7, [990, 880, 660, 440])];
// ---- life in the Sift: blubs drift in, soul-lights rise around you ----
const SIFT = { spawnT: 1 };
function siftTick(dt) {
  const P = player.pos;
  if (Math.random() < dt * 12) { const a = Math.random() * 6.28, d = 2 + Math.random() * 14; Particles.emit(P.x + Math.cos(a) * d, P.y - 1 + Math.random() * 5, P.z + Math.sin(a) * d, 1, [[0.62, 0.9, 1], [1, 0.72, 0.9], [1, 1, 1]], 0.15, 3, -0.4, 0.1); }
  if (isClientMP() || !S.rules.doMobSpawning) return; SIFT.spawnT -= dt; if (SIFT.spawnT > 0) return; SIFT.spawnT = 2;
  if (G.mobs.filter(m => m.type === 'blub').length >= 10) return;
  for (let t = 0; t < 4; t++) { const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 20; const x = Math.floor(P.x + Math.cos(a) * d), z = Math.floor(P.z + Math.sin(a) * d); if (!world.loaded(x, z)) continue;
    const y = world.surfaceY(x, z); if (world.get(x, y - 1, z) !== B.SIFT_GRASS_BLOCK) continue; const k = 1 + (Math.random() * 3 | 0); for (let i = 0; i < k; i++) spawnMob('blub', x + 0.5 + i * 0.6, y + 1, z + 0.5); break; }
}
{ const _us = updateSpawning; updateSpawning = function (dt) { const r = _us.apply(this, arguments); if (world && world.dim === 'sift' && !S.loading && !S.paused) siftTick(dt); return r; }; }
// ---- spawn eggs for every mob added after 90_spawneggs.js (sulfur cube, creaking, copper golem, happy ghast, blub...) ----
{ let added = 0; for (const k of Object.keys(MOBS)) { const key = k + '_spawn_egg'; if (IT[key] !== undefined || MOBS[k].noEgg) continue;
    const id = nid++; const nm = (MOBS[k].name || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) + ' Spawn Egg';
    defItem(id, key, nm, { kind: 'spawn_egg', mob: k, stack: 64 }); ITEM_IDS.push(id); SPAWN_EGG_IDS.push(id);
    const [b, sp] = eggColors(k); const c = iconCanvas(eggPainter(b, sp)); ICON_CANVAS[id] = c; ICON[id] = c.toDataURL(); added++; }
  if (added) CREATIVE_LIST = null; }
