// ================= THE SIFT: the fourth dimension =================
// What Mojang has shown (Minecraft Live, September 2026; it first appeared in Minecraft Dungeons II): a vibrant,
// soul-filled dimension with pink grass, pink and salmon sculk, pale white trees, the Meadows and the Carapace, the
// Blub, sculk creatures, and shifting tides that affect movement. It comes to Java and Bedrock in 2027, and how you get
// there has not been announced. Everything else is BlockWild's own interpretation:
//  - Wake an ancient city's portal by using an Echo Shard on its reinforced deepslate frame. The frame fills with a
//    rift; stand in it to cross over. You arrive beside a small return rift.
//  - Meadows: pink grass with patches of pink and salmon sculk, white Sift trees, glowing flowers and pools.
//  - The Carapace: a dry desert of salmon-pink sand and long dunes, with the giant bones of something huge.
//  - Drifting Isles float above the meadow. Rare rift gates stand in the meadow and lead back to the same spot in
//    the Overworld.
//  - The Blub: a little glowing rabbit-like soul. It follows songblooms, breeds on them and sometimes gives a soul shard.
//  - Threats: the Sculk Slasher (long claws, dashes back leaving an afterimage) and the Sculk Mage (soul bolts that
//    track you and then fly straight, blinks away when you close in).
//  - Shifting tides follow the clock: Lull (calm), Surge (you move and jump faster) and Undertow (you are dragged
//    slower and the sculk creatures come out in force).
//  - Siftite: rare ore deep in the siftstone; it upgrades netherite gear into something stronger.
// Blocks and items: 01aq_sift.js. The World picks SiftGen for dimension 'sift' (02_world.js).
const SIFT_SEA = 58;
class SiftGen {
  constructor(seed) { this.seed = seed; this.n = new Perlin(seed + 401); this.n2 = new Perlin(seed + 402); this.nb = new Perlin(seed + 403); this.nr = new Perlin(seed + 404); this.ni = new Perlin(seed + 405); this.nh = new Perlin(seed + 406); }
  column(x, z) {
    const car = smoothstep(0.08, 0.32, this.nb.n2(x / 260 + 11.3, z / 260 - 7.1));
    const hills = 66 + this.n.n2(x / 110, z / 110) * 10 + this.n2.n2(x / 34, z / 34) * 3.2 + this.n2.n2(x / 9 + 40, z / 9) * 0.7;
    // the Carapace: a dry, raised desert of long dunes (ridged noise stretched one way)
    const dune = (1 - Math.abs(this.nr.n2(x / 70, z / 26))) * 7 + this.n2.n2(x / 18, z / 18) * 1.5;
    const base = hills * (1 - car) + (70 + this.n.n2(x / 140, z / 140) * 4 + dune) * car;
    const isle = car < 0.3 ? this.ni.n2(x / 38, z / 38) - 0.52 : -1;
    return { h: Math.round(base), base: Math.round(base), plate: 0, car, b: car > 0.5 ? 1 : 0, v: 0, isle };
  }
  sculk(x, z) { return this.nh.n2(x / 26 + 300, z / 26); } // patches of pink and salmon sculk
  biome(x, z) { return this.column(x, z).b; }
  biomeName(x, z, y) { const c = this.column(Math.floor(x), Math.floor(z)); if (y != null && c.isle > 0 && y > 100) return 'Drifting Isles'; return c.b ? 'The Carapace' : 'Meadows'; }
}
function genSiftChunk(world, c) {
  const g = world.gen, d = c.d, bx = c.cx * 16, bz = c.cz * 16, seed = world.seed; const I = (x, y, z) => (y * 16 + z) * 16 + x;
  const flowers = (X, Z) => g.n2.n2(X / 22 + 100, Z / 22) > 0.25;
  for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
    const X = bx + x, Z = bz + z; const col = g.column(X, Z); const h = col.h; const desert = col.car > 0.5; const sk = g.sculk(X, Z);
    const top = desert ? (sk > 0.42 ? B.SALMON_SCULK : B.SIFT_SAND) : h - 1 < SIFT_SEA ? B.SIFT_SOIL : sk > 0.5 ? B.PINK_SCULK : sk < -0.55 ? B.SALMON_SCULK : B.SIFT_GRASS_BLOCK;
    d[I(x, 0, z)] = B.BEDROCK;
    for (let y = 1; y < h; y++) d[I(x, y, z)] = y === h - 1 ? top : y >= h - 4 ? (desert ? B.SIFT_SAND : B.SIFT_SOIL) : B.SIFTSTONE;
    for (let y = h; y < SIFT_SEA; y++) d[I(x, y, z)] = B.WATER;
    const q = rnd01(X, 7, Z, seed);
    if (h < SIFT_SEA) { if (q < 0.1) d[I(x, h - 1, z)] = B.SOUL_CRYSTAL_BLOCK; }
    else if (desert) { if (h < WH - 2) { if (q < 0.008) d[I(x, h, z)] = B.SOUL_CRYSTAL; else if (q < 0.012) d[I(x, h, z)] = B.BONE_BLOCK; } }
    else if (h < WH - 2 && top === B.SIFT_GRASS_BLOCK) { const fl = flowers(X, Z); if (fl && q < 0.09) d[I(x, h, z)] = q < 0.06 ? B.SONGBLOOM : B.WISP_LILY; else if (q < 0.25) d[I(x, h, z)] = B.SIFT_SPROUTS; else if (q < 0.253) d[I(x, h, z)] = B.SONGBLOOM; }
    // drifting isles: lens-shaped islands of siftstone with a grassy top
    if (col.isle > 0) { const tp = 112 + Math.round(g.n.n2(X / 20, Z / 20) * 3); const th = Math.min(16, Math.round(col.isle * 60)); if (th > 0) {
      for (let y = tp - th; y <= tp; y++) d[I(x, y, z)] = y === tp ? B.SIFT_GRASS_BLOCK : y >= tp - 2 ? B.SIFT_SOIL : B.SIFTSTONE;
      const q2 = rnd01(X, 9, Z, seed); if (q2 < 0.2) d[I(x, tp + 1, z)] = q2 < 0.03 ? B.SONGBLOOM : B.SIFT_SPROUTS; else if (th > 3 && q2 > 0.985) d[I(x, tp - th, z)] = B.SOUL_CRYSTAL_BLOCK; } }
  }
  const r = mulberry32(ihash(c.cx, c.cz, 8807, seed));
  // soul crystal pockets in the siftstone
  for (let t = 0; t < 5; t++) { const x = 1 + (r() * 14 | 0), z = 1 + (r() * 14 | 0), y = 6 + (r() * 50 | 0); if (d[I(x, y, z)] !== B.SIFTSTONE) continue;
    for (let k = 0; k < 6; k++) { const a = x + (r() * 3 | 0) - 1, b = y + (r() * 3 | 0) - 1, e = z + (r() * 3 | 0) - 1; if (d[I(a, b, e)] === B.SIFTSTONE) d[I(a, b, e)] = B.SOUL_CRYSTAL_BLOCK; } }
  // siftite: rare, deep and buried (like ancient debris), one or two small clusters a chunk
  for (let t = 0; t < 2; t++) { if (r() > 0.6) continue; const x = 1 + (r() * 14 | 0), z = 1 + (r() * 14 | 0), y = 8 + (r() * 28 | 0); const n = 1 + (r() * 2 | 0);
    for (let k = 0; k < n; k++) { const a = x + (k ? (r() * 3 | 0) - 1 : 0), e = z + (k ? (r() * 3 | 0) - 1 : 0); if (d[I(a, y, e)] === B.SIFTSTONE) d[I(a, y, e)] = B.SIFTITE_ORE; } }
}
TREES.sift = function (put, x, y, z, r) {
  const H = 5 + (r() * 4 | 0); const log = B.SIFT_LOG, lv = B.SIFT_LEAVES; let tx = x, tz = z; const lean = r() < 0.5 ? [r() < 0.5 ? 1 : -1, 0] : [0, r() < 0.5 ? 1 : -1];
  for (let i = 0; i < H; i++) { if (i === H - 3 && r() < 0.6) { tx += lean[0]; tz += lean[1]; } put(tx, y + i, tz, log, true); }
  const top = y + H, R = 3 + (r() < 0.4 ? 1 : 0);
  for (let dy = -2; dy <= 1; dy++) { const rad = dy === 1 ? R - 2 : dy === 0 ? R - 1 : dy === -1 ? R : R - 1; for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) { const dd = dx * dx + dz * dz; if (dd > rad * rad + 1) continue; if (dd >= rad * rad - 1 && r() < 0.4) continue; put(tx + dx, top + dy, tz + dz, lv); } }
  for (let k = 0; k < 6; k++) { const a = r() * Math.PI * 2; const hx = tx + Math.round(Math.cos(a) * R), hz = tz + Math.round(Math.sin(a) * R); const L = 1 + (r() * 3 | 0); for (let i = 1; i <= L; i++) put(hx, top - 2 - i, hz, lv); }
};
// the Carapace's great bones: a spine with arched ribs, sometimes a skull, half sunk in the sand. Skeletons belong to a
// 5x5-chunk region; each chunk builds only the bones that fall inside it.
function siftSkeleton(world, rx, rz) {
  const g = world.gen, seed = world.seed; const r = mulberry32(ihash(rx, rz, 6611, seed)); if (r() > 0.75) return null;
  const x0 = rx * 80 + 16 + (r() * 48 | 0), z0 = rz * 80 + 16 + (r() * 48 | 0); const col = g.column(x0, z0); if (col.car < 0.6) return null;
  const ax = r() < 0.5; const L = 22 + (r() * 18 | 0), R = 7 + (r() * 5 | 0), sink = 2 + (r() * 3 | 0), tilt = (r() - 0.5) * 0.3; const out = [];
  const at = (i, side, up) => ax ? [x0 + i, z0 + side] : [x0 + side, z0 + i];
  const y0 = col.h - sink;
  for (let i = 0; i < L; i++) { const yy = y0 + Math.round(R * 0.95 + Math.sin(i / L * Math.PI) * 2 + i * tilt); const [x, z] = at(i, 0); out.push([x, yy, z]); if (i % 3 === 0) out.push([x, yy + 1, z]); // spine with knobs
    if (i % 4 === 2 && i > 2 && i < L - 3 && r() > 0.12) { const rr = R * (1 - Math.abs(i / L - 0.5) * 0.7); const broken = r() < 0.25 ? 0.5 + r() * 0.4 : 1;
      for (const sd of [-1, 1]) { if (sd === 1 && broken < 1 && r() < 0.5) continue; for (let a = 0; a <= Math.PI * 0.5 * (sd === 1 ? broken : 1); a += 0.09) { const [px, pz] = at(i, Math.round(Math.sin(a) * rr * sd)); out.push([px, yy - Math.round(rr - Math.cos(a) * rr) + Math.round(rr * 0.15), pz]); } } } }
  if (r() < 0.7) { const [sx, sz] = at(-3, 0); const sy = y0 + Math.round(R * 0.95) - 1; for (let a = -2; a <= 2; a++) for (let b = -1; b <= 2; b++) for (let c = -2; c <= 2; c++) { if (Math.abs(a) === 2 && Math.abs(c) === 2) continue; const eye = b === 1 && Math.abs(c) === 1 && (ax ? a === -2 : a === -2); if (!eye) out.push(ax ? [sx + a, sy + b, sz + c] : [sx + c, sy + b, sz + a]); } }
  return out; }
function siftStructures(world, cx, cz) {
  const g = world.gen, seed = world.seed; const S = { soft: [], hard: [], mobs: [], kinds: [] }; const r = mulberry32(ihash(cx, cz, 7711, seed));
  const bx = cx * 16, bz = cz * 16; const hard = (x, y, z, id) => S.hard.push(x, y, z, id); const soft = (x, y, z, id) => S.soft.push(x, y, z, id);
  // bones: from any skeleton whose region is near, keep the blocks inside this chunk
  const rx0 = Math.floor(bx / 80), rz0 = Math.floor(bz / 80);
  for (let rx = rx0 - 1; rx <= rx0 + 1; rx++) for (let rz = rz0 - 1; rz <= rz0 + 1; rz++) { const bones = siftSkeleton(world, rx, rz); if (!bones) continue;
    for (const [x, y, z] of bones) if (x >= bx && x < bx + 16 && z >= bz && z < bz + 16 && y > 0 && y < WH) hard(x, y, z, B.BONE_BLOCK); }
  // a rift gate back to the Overworld, rarely, with a chest left by whoever came through before
  let gate = null;
  if (ihash(cx, cz, 9917, seed) % 1000 < 7) { const X = bx + 8, Z = bz + 8; const col = g.column(X, Z); if (col.h > SIFT_SEA + 1) { gate = [X, col.h, Z]; riftShape(hard, X, col.h, Z, true);
      S.kinds.push(['rift', X, Z, col.h]); hard(X + 3, col.h, Z - 2, FAMILY.chest ? FAMILY.chest.ids[2] : B.CHEST); S.kinds.push(['chest:sift_rift', X + 3, Z - 2, col.h]); } }
  // trees: groves on the meadows, open ground between; none in the Carapace
  const grove = g.n2.n2(bx / 70 + 3, bz / 70 - 5); const n = grove > 0.15 ? 3 + (r() * 3 | 0) : r() < 0.35 ? 1 : 0;
  for (let i = 0; i < n; i++) { const X = bx + (r() * 16 | 0), Z = bz + (r() * 16 | 0); const col = g.column(X, Z); if (col.car > 0.4 || col.h <= SIFT_SEA || (gate && Math.abs(X - gate[0]) < 5 && Math.abs(Z - gate[2]) < 5)) continue;
    TREES.sift((x, y, z, id, isLog) => (isLog ? hard : soft)(x, y, z, id), X, col.h, Z, r); }
  if (r() < 0.07) { const X = bx + 4 + (r() * 8 | 0), Z = bz + 4 + (r() * 8 | 0); const col = g.column(X, Z); if (col.h >= SIFT_SEA && col.car < 0.5) for (let k = 0; k < 1 + (r() * 3 | 0); k++) S.mobs.push(['blub', X + 0.5 + k * 0.7, col.h + 0.2, Z + 0.5]); }
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
// the tide shows under the biome name
{ const _bn = SiftGen.prototype.biomeName; SiftGen.prototype.biomeName = function (x, z, y) { const n = _bn.call(this, x, z, y); return y != null ? n + ' - ' + siftTide()[1] + ' tide' : n; }; }
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
// ---- the Blub: a small glowing, rabbit-like soul that hops about the meadows ----
MOBS.blub = { name: 'Blub', hp: 8, w: 0.45, h: 0.55, speed: 2.4, kind: 'passive', snd: 'chirp', glowAll: true, egg: [[120, 196, 250], [246, 170, 218]], drops: [],
  build(m, r) { const C = [120, 196, 250];
    const spots = (f, set, fw, fh) => { for (let k = 0; k < 4; k++) set((k * 5 + 2) % fw, (k * 3 + 1) % fh, [210, 246, 255]); };
    QB(m, r, 'blub', { body: [0.34, 0.3, 0.44, 0.28, -0.02], bodyP: fur(C, 5, { extra: spots, bottom: [190, 232, 255] }), head: [0.3, 0.28, 0.28, 0.46, 0.22, 0.02, 0.1],
      headP: fur(C, 5, { extra: (f, set, fw, fh) => { if (f !== 'front') return; set(1, 2, [20, 30, 70]); set(fw - 2, 2, [20, 30, 70]); set(1, 1, [240, 250, 255]); set(fw - 2, 1, [240, 250, 255]); set(0, 4, [250, 160, 210]); set(fw - 1, 4, [250, 160, 210]); } }),
      ears: [0.08, 0.3, 0.04, 0.07, 0.15, 0], earP: fur([170, 224, 255], 4, { extra: (f, set, fw, fh) => { for (let y = 1; y < fh - 1; y++) set(fw >> 1, y, [250, 180, 220]); } }),
      legs: [0.09, 0.14, 0.09, 0.15], tail: [0.14, 0.12, 0.12, 0.34, -0.25, 0], tailP: fur([214, 244, 255], 3) });
    for (const mt of m.mats) { mt[0].transparent = true; mt[0].opacity = 0.9; } } };
MOBS.blub.tick = (m, dt) => { if (m.onGround && Math.hypot(m.vel.x, m.vel.z) > 0.3 && Math.random() < dt * 4) m.vel.y = 5.2;
  if (Math.random() < dt * 0.9) Particles.emit(m.pos.x, m.pos.y + 0.4, m.pos.z, 1, [[0.62, 0.9, 1], [1, 0.76, 0.92]], 0.3, 1.2, -1, 0.25);
  if (m.giftT > 0) m.giftT -= dt; return false; };
BREED_FOOD.blub = ['songbloom']; TEMPT_FOOD.blub = ['songbloom'];
// feed a Blub a songbloom: it falls in love like any animal, sings, and now and then leaves a soul shard (once per 5 minutes)
{ const _mi = mobInteract; mobInteract = function (m, sneaking) {
    const h = player.held(); const bloom = m.type === 'blub' && h && h.id === IT.songbloom; const r = _mi(m, sneaking);
    if (bloom && !m.dead && !isClientMP()) { Sfx.mob(m, null, 0.8); if (!(m.giftT > 0)) { m.giftT = 300; setTimeout(() => { if (!m.dead) { dropItem(IT.soul_shard, 1, m.pos.x, m.pos.y + 0.2, m.pos.z); Particles.emit(m.pos.x, m.pos.y + 0.3, m.pos.z, 10, [[0.5, 0.9, 1]], 1.2, 0.8, -1, 0.4); } }, 1200); } }
    return r; }; }

// ---- shifting tides: they follow the clock (the Sift has no sun) ----
const TIDES = [['lull', 'Lull'], ['surge', 'Surge'], ['lull', 'Lull'], ['undertow', 'Undertow']];
function siftTide() { return TIDES[Math.floor(((S.time % 1) + 1) % 1 * 4)]; }
function tideEffects(dt) {
  const [t, name] = siftTide(); if (SIFT.tide !== t) { if (SIFT.tide) toast('The tide turns: ' + name, 3); SIFT.tide = t; }
  SIFT.effT = (SIFT.effT || 0) - dt; if (SIFT.effT > 0 || player.dead) return; SIFT.effT = 1;
  if (t === 'surge') { giveEffect('speed', 3, 0); giveEffect('jump_boost', 3, 0); } else if (t === 'undertow') giveEffect('slowness', 3, 0);
}
{ const _us = updateSky; updateSky = function (eyeFluid) { const r = _us.apply(this, arguments); if (!world || world.dim !== 'sift' || eyeFluid) return r; const t = siftTide()[0];
    if (t === 'undertow') { skyUniforms.zenith.value.setRGB(0.3, 0.14, 0.34); skyUniforms.horizon.value.setRGB(0.7, 0.36, 0.5); G.daylight = 0.66; chunkUniforms.daylight.value = G.daylight; }
    else if (t === 'surge') { skyUniforms.zenith.value.setRGB(0.36, 0.42, 0.8); skyUniforms.horizon.value.setRGB(0.8, 0.82, 0.96); }
    scene.fog.color.copy(skyUniforms.horizon.value); chunkUniforms.fogColor.value.copy(skyUniforms.horizon.value); return r; }; }
// ---- Sculk Slasher: long claws; after it lands a hit it springs back, leaving a ghostly afterimage ----
const SCULK = [24, 44, 56], SCULK_GLOW = [70, 220, 230];
const sculkPaint = (glowRows) => fur(SCULK, 5, { extra: (f, set, fw, fh) => { for (let k = 0; k < 3; k++) set((k * 5 + 1) % fw, (k * 7 + 2) % fh, SCULK_GLOW); if (glowRows && f === 'front') { set(1, 1, [120, 250, 255]); set(fw - 2, 1, [120, 250, 255]); } } });
MOBS.sculk_slasher = { name: 'Sculk Slasher', hp: 30, w: 0.7, h: 2.1, speed: 1.35, kind: 'hostile', dmg: 7, snd: 'sculkm', egg: [[24, 44, 56], [70, 220, 230]], drops: [['soul_shard', 0, 2, 1], ['echo_shard', 1, 1, 0.08]],
  build(m, r) { m.legs = []; for (const x of [-0.14, 0.14]) { const p = pivot(r, x, 0.8, 0); sbox(m, p, 0.18, 0.8, 0.2, 0, -0.4, 0, 'ss_leg', sculkPaint()); m.legs.push(p); }
    const bodyP = pivot(r, 0, 0.8, 0); m.body = bodyP; bodyP.rotation.x = 0.25; sbox(m, bodyP, 0.5, 0.7, 0.32, 0, 0.35, 0, 'ss_body', sculkPaint());
    const h = pivot(bodyP, 0, 0.72, 0.06); m.head = h; sbox(m, h, 0.4, 0.34, 0.36, 0, 0.17, 0.04, 'ss_head', sculkPaint(true)); for (const sx of [-1, 1]) { const horn = pivot(h, sx * 0.16, 0.34, -0.05); horn.rotation.z = -sx * 0.5; sbox(m, horn, 0.06, 0.24, 0.06, 0, 0.12, 0, 'ss_horn', fur([200, 250, 255], 3)); }
    m.arms = []; for (const sx of [-1, 1]) { const a = pivot(bodyP, sx * 0.32, 0.62, 0); sbox(m, a, 0.14, 0.7, 0.14, 0, -0.35, 0, 'ss_arm', sculkPaint()); for (const cz of [-0.05, 0.05]) sbox(m, a, 0.04, 0.42, 0.04, cz * 1.2, -0.88, cz, 'ss_claw', fur([180, 246, 255], 3)); m.arms.push(a); } } };
MOB_XP.sculk_slasher = [10, 10];
const AFTERS = [];
function afterimage(m) { if (!m.root) return; const c = m.root.clone(true); c.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.45; if (o.material.color) o.material.color.setRGB(0.5, 0.95, 1); o.material.depthWrite = false; } }); scene.add(c); AFTERS.push({ obj: c, t: 0 }); }
function updateAfters(dt) { for (let i = AFTERS.length - 1; i >= 0; i--) { const a = AFTERS[i]; a.t += dt; const k = 1 - a.t / 0.7; a.obj.traverse(o => { if (o.isMesh) o.material.opacity = Math.max(0, 0.45 * k); }); if (k <= 0) { scene.remove(a.obj); AFTERS.splice(i, 1); } } }
MOBS.sculk_slasher.tick = (m, dt) => {
  if (m.arms) m.arms.forEach((a, i) => { a.rotation.x = m.chasing ? -0.9 + Math.sin(m.age * 9 + i * 3) * 0.5 : -0.2 + Math.sin(m.age * 2 + i) * 0.1; });
  if (m.lastCD != null && m.atkCD > m.lastCD + 0.2 && !m.dashT) { const P = player.pos; const d = new V3(m.pos.x - P.x, 0, m.pos.z - P.z).normalize(); afterimage(m); m.vel.x = d.x * 11; m.vel.z = d.z * 11; m.vel.y = 3; m.dashT = 0.3; Sfx.at('whoosh', m.pos, 0.6, 0.8); }
  m.lastCD = m.atkCD; if (m.dashT) { m.dashT -= dt; if (m.dashT <= 0) m.dashT = 0; return true; } return false; };
// ---- Sculk Mage: keeps its distance and casts soul bolts that track you for a moment, then fly straight ----
PROJ.soul_bolt = { grav: 0, size: 0.26, color: 0x60e8f0, trail: [[0.4, 0.95, 1], [1, 0.6, 0.9]] };
MOBS.sculk_mage = { name: 'Sculk Mage', hp: 24, w: 0.6, h: 2.0, speed: 1.0, kind: 'hostile', dmg: 3, snd: 'sculkm', ranged: false, egg: [[30, 40, 60], [240, 150, 210]], drops: [['soul_shard', 1, 3, 1], ['siftite_scrap', 1, 1, 0.04]],
  build(m, r) { const robe = fur([36, 46, 70], 5, { extra: (f, set, fw, fh) => { for (let x = 0; x < fw; x++) set(x, fh - 1, [240, 150, 210]); for (let k = 0; k < 3; k++) set((k * 3 + 1) % fw, (k * 5 + 2) % fh, SCULK_GLOW); } });
    sbox(m, r, 0.56, 1.2, 0.4, 0, 0.6, 0, 'sm_robe', robe); const h = pivot(r, 0, 1.2, 0); m.head = h; sbox(m, h, 0.44, 0.44, 0.44, 0, 0.22, 0, 'sm_head', sculkPaint(true));
    sbox(m, h, 0.52, 0.22, 0.52, 0, 0.5, 0, 'sm_hood', fur([30, 38, 60], 4)); sbox(m, h, 0.3, 0.2, 0.3, 0, 0.7, -0.04, 'sm_hood2', fur([30, 38, 60], 4));
    m.arms = []; for (const sx of [-1, 1]) { const a = pivot(r, sx * 0.36, 1.1, 0); sbox(m, a, 0.14, 0.6, 0.14, 0, -0.3, 0, 'sm_arm', robe); m.arms.push(a); }
    m.orb = sbox(m, m.arms[1], 0.16, 0.16, 0.16, 0, -0.66, 0.06, 'sm_orb', fur([140, 250, 255], 2)); } };
MOB_XP.sculk_mage = [10, 10];
MOBS.sculk_mage.tick = (m, dt) => {
  const P = player; const tgt = hostileTarget(m, 20); m.castT = (m.castT == null ? 2 : m.castT) - dt; m.blinkT = (m.blinkT || 0) - dt;
  for (const b of m.bolts || []) if (b.homing && (b.age = (b.age || 0) + dt) > 1.2) b.homing = false;
  if (m.arms) m.arms.forEach((a, i) => { a.rotation.x = m.castT < 0.6 && tgt ? -1.6 : -0.1 + Math.sin(m.age * 2 + i) * 0.08; });
  if (!tgt) return false; const d = m.pos.distanceTo(P.pos); m.yaw = Math.atan2(P.pos.x - m.pos.x, P.pos.z - m.pos.z);
  if (d < 4 && m.blinkT <= 0) { for (let t = 0; t < 12; t++) { const a = Math.random() * Math.PI * 2, rr = 7 + Math.random() * 4; const x = Math.floor(m.pos.x + Math.cos(a) * rr), z = Math.floor(m.pos.z + Math.sin(a) * rr);
      for (let y = Math.floor(m.pos.y) + 4; y > m.pos.y - 5; y--) if (world.solid(x, y - 1, z) && !world.solid(x, y, z) && !world.solid(x, y + 1, z)) { Particles.emit(m.pos.x, m.pos.y + 1, m.pos.z, 16, [[0.4, 0.95, 1]], 2, 0.6, -1, 0.5); m.pos.set(x + 0.5, y, z + 0.5); m.blinkT = 4; Sfx.at('vwoop', m.pos, 0.6, 1.2); t = 99; break; } } }
  if (m.castT <= 0 && d < 18) { m.castT = 2.6 + Math.random(); const from = m.pos.clone().add(new V3(0, 1.4, 0)); const dir = P.pos.clone().add(new V3(0, 1, 0)).sub(from).normalize();
    const b = spawnProj('soul_bolt', from, dir.multiplyScalar(9), 'mob', 5, m); b.homing = true; b.life = 5; b.cause = 'a Sculk Mage'; (m.bolts || (m.bolts = [])).push(b); if (m.bolts.length > 6) m.bolts.shift(); Sfx.at('vwoop', m.pos, 0.5, 1.6); }
  // keep a middle distance: back off when close, close in when far
  if (d < 7) { steerTo(m, new V3(m.pos.x * 2 - P.pos.x, m.pos.y, m.pos.z * 2 - P.pos.z), 0); m.wT = 0.3; m.wYaw = Math.atan2(m.pos.x - P.pos.x, m.pos.z - P.pos.z); }
  else if (d > 13) { steerTo(m, P.pos, 10); m.wT = 0.3; } else m.wMove = 0;
  return false; };
MOB_VOICE.sculkm = [(d, p) => V.chime(d, p * 0.5, [220, 180, 260]), (d, p) => V.squeak(d, p * 0.4, 0, 0.1), (d, p) => V.chime(d, p * 0.45, [330, 220, 110])];
// ---- smithing: netherite gear + Siftite Upgrade template + siftite ingot = siftite gear (keeps enchantments and names) ----
{ const _sr = smithResult; smithResult = function (sl) { const [t, b, a] = sl;
    if (t && b && a && t.id === IT.siftite_upgrade_smithing_template && a.id === IT.siftite_ingot) { const k = ITEMS[b.id] && ITEMS[b.id].key; if (!k || !k.startsWith('netherite_')) return null; const out = IT['siftite_' + k.slice(10)]; if (out == null) return null; return Object.assign({}, xtra(b) || {}, { id: out, count: 1 }); }
    return _sr.apply(this, arguments); }; }
SMELT[IT.siftite_ore] = IT.siftite_scrap;
addLoot('sift_rift', [L('soul_shard', 2, 7, 0.9), L('siftite_scrap', 1, 2, 0.35), L('siftite_upgrade_smithing_template', 1, 1, 0.4), L('songbloom', 1, 4, 0.5), L('diamond', 1, 3, 0.4), L('emerald', 2, 6, 0.5), L('echo_shard', 1, 2, 0.3), L('sift_sapling', 1, 3, 0.4)]);
addLoot('ancient_city', [L('siftite_upgrade_smithing_template', 1, 1, 0.08)]);
// ---- icons for siftite gear, drawn with the same tool and armor art as the other materials ----
{ MAT.siftite = { c: [90, 196, 216], l: [170, 240, 250], d: [36, 100, 130] };
  const put = (k, f) => { if (IT[k] == null) return; try { const c = IC.canvas(f, { seed: IT[k] }); ICON_CANVAS[IT[k]] = c; ICON[IT[k]] = c.toDataURL(); } catch (e) { console.warn('icon', k, e); } };
  for (const tool of ['pickaxe', 'axe', 'shovel', 'hoe', 'sword']) put('siftite_' + tool, (g) => TOOL[tool](g, MAT.siftite));
  for (const p of ['helmet', 'chestplate', 'leggings', 'boots']) put('siftite_' + p, icArmor(MAT.siftite, p));
  put('siftite_ingot', (g) => icIngot(g, MAT.siftite)); }
// ---- life in the Sift: blubs drift in, soul-lights rise around you ----
const SIFT = { spawnT: 1 };
function siftTick(dt) {
  const P = player.pos; tideEffects(dt);
  if (Math.random() < dt * 12) { const a = Math.random() * 6.28, d = 2 + Math.random() * 14; Particles.emit(P.x + Math.cos(a) * d, P.y - 1 + Math.random() * 5, P.z + Math.sin(a) * d, 1, [[0.62, 0.9, 1], [1, 0.72, 0.9], [1, 1, 1]], 0.15, 3, -0.4, 0.1); }
  if (isClientMP() || !S.rules.doMobSpawning) return; SIFT.spawnT -= dt; if (SIFT.spawnT > 0) return; SIFT.spawnT = 2;
  const spot = (ok) => { for (let t = 0; t < 4; t++) { const a = Math.random() * Math.PI * 2, d = 22 + Math.random() * 20; const x = Math.floor(P.x + Math.cos(a) * d), z = Math.floor(P.z + Math.sin(a) * d); if (!world.loaded(x, z)) continue;
      const y = world.surfaceY(x, z); if (ok(world.get(x, y - 1, z)) && !world.solid(x, y, z) && !world.solid(x, y + 1, z)) return [x, y, z]; } return null; };
  if (G.mobs.filter(m => m.type === 'blub').length < 10) { const p = spot(id => id === B.SIFT_GRASS_BLOCK); if (p) { const k = 1 + (Math.random() * 3 | 0); for (let i = 0; i < k; i++) spawnMob('blub', p[0] + 0.5 + i * 0.6, p[1], p[2] + 0.5); } }
  // sculk creatures: a few in a Lull, more in a Surge, many in the Undertow
  if (S.difficulty === 'peaceful') return; const tide = siftTide()[0]; const cap = tide === 'undertow' ? 9 : tide === 'surge' ? 4 : 2;
  if (G.mobs.filter(m => (m.type === 'sculk_slasher' || m.type === 'sculk_mage') && !m.dead).length >= cap) return;
  if (Math.random() < (tide === 'undertow' ? 0.8 : 0.3)) { const p = spot(id => !!SOLID[id] && id !== B.BONE_BLOCK); if (p) { const m = spawnMob(Math.random() < 0.6 ? 'sculk_slasher' : 'sculk_mage', p[0] + 0.5, p[1], p[2] + 0.5); if (m && tide === 'undertow') { m.hp *= 1.5; m.maxHp = m.hp; } } }
}
{ const _us = updateSpawning; updateSpawning = function (dt) { const r = _us.apply(this, arguments); if (world && world.dim === 'sift' && !S.loading && !S.paused) siftTick(dt); if (AFTERS.length) updateAfters(dt); return r; }; }
// ---- spawn eggs for every mob added after 90_spawneggs.js (sulfur cube, creaking, copper golem, happy ghast, blub...) ----
{ let added = 0; for (const k of Object.keys(MOBS)) { const key = k + '_spawn_egg'; if (IT[key] !== undefined || MOBS[k].noEgg) continue;
    const id = nid++; const nm = (MOBS[k].name || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) + ' Spawn Egg';
    defItem(id, key, nm, { kind: 'spawn_egg', mob: k, stack: 64 }); ITEM_IDS.push(id); SPAWN_EGG_IDS.push(id);
    const [b, sp] = eggColors(k); const c = iconCanvas(eggPainter(b, sp)); ICON_CANVAS[id] = c; ICON[id] = c.toDataURL(); added++; }
  if (added) CREATIVE_LIST = null; }
// siftite armor outlasts netherite (14_durability sets armor durability by material before this file loads)
ARMOR_MULT.siftite = 45; for (const p of ['helmet', 'chestplate', 'leggings', 'boots']) { const it = ITEMS[IT['siftite_' + p]]; if (it) it.dur = ARMOR_BASE[it.slot] * 45; }
