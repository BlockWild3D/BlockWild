// ================= WORLD: generation, structures, chunks, meshing =================
const BIO = { OCEAN: 0, BEACH: 1, PLAINS: 2, FOREST: 3, DESERT: 4, SNOWY: 5, MOUNTAINS: 6 };
const BIO_NAME = ['Ocean', 'Beach', 'Plains', 'Forest', 'Desert', 'Snowy Tundra', 'Mountains'];
const ckey = (cx, cz) => (cx + 32768) * 65536 + (cz + 32768);

class Gen {
  constructor(seed) {
    this.seed = seed;
    this.nC = new Perlin(seed); this.nH = new Perlin(seed + 11); this.nM = new Perlin(seed + 22); this.nT = new Perlin(seed + 33);
    this.nW = new Perlin(seed + 44); this.nA = new Perlin(seed + 55); this.nB = new Perlin(seed + 66); this.nK = new Perlin(seed + 77);
    this.nN = new Perlin(seed + 88); this.nP = new Perlin(seed + 99); this.nQ = new Perlin(seed + 111);
    this.colCache = new Map();
    // strongholds: Minecraft's concentric rings (distance 32, spread 3). Ring 1 holds 3 strongholds 1280-2816 blocks out,
    // ring 2 holds 6, ring 3 holds 10 ... (first 4 rings generated, 34 strongholds)
    const r = mulberry32(seed ^ 0x51e7); this.strongholds = []; let ang = r() * Math.PI * 2, ring = 0, inRing = 0, ringCount = 3; const total = 34;
    for (let i = 0; i < total; i++) {
      const dist = (4 * 32 + 32 * ring * 6) + (r() - 0.5) * 32 * 2.5;
      const cx = Math.round(Math.cos(ang) * dist), cz = Math.round(Math.sin(ang) * dist);
      this.strongholds.push({ cx, cz, x: cx * 16 + 8, z: cz * 16 + 8, y: YOFF + 18 });
      ang += Math.PI * 2 / ringCount; inRing++;
      if (inRing === ringCount) { ring++; inRing = 0; ringCount += Math.floor(2 * ringCount / (ring + 1)); ringCount = Math.min(ringCount, total - i - 1); ang += r() * Math.PI * 2; }
    }
  }
  biomeName(x, z) { const c = this.column(x, z); return c.b === BIO.OCEAN && c.h < SEA - 28 ? 'Deep Ocean' : BIO_NAME[c.b]; }
  column(x, z) {
    const k = x * 100003 + z; const c = this.colCache.get(k); if (c) return c;
    const cont = this.nC.f2(x / 420, z / 420, 4), hills = this.nH.f2(x / 90, z / 90, 4), mnt = this.nM.f2(x / 260 + 50, z / 260 + 50, 3);
    const temp = this.nT.f2(x / 560, z / 560, 2), moist = this.nW.f2(x / 480, z / 480, 2);
    const desertness = smoothstep(0.06, 0.18, temp) * smoothstep(0.12, -0.02, moist);
    // land rises gently from the coast; the sea floor drops faster so oceans are ~15-25 blocks deep and deep oceans 30-45
    // continental shelf: past the coast the floor drops to ~y 45 (ocean), and further out to ~y 25-35 (deep ocean)
    const off = cont < 0 ? cont * 40 - smoothstep(0.02, 0.22, -cont) * 22 - smoothstep(0.22, 0.42, -cont) * 16 : cont * 46;
    let h = SEA + 4 + off + hills * (14 - 8 * desertness);
    const m = Math.max(0, mnt - 0.08); h += m * m * 760;
    h = Math.floor(clamp(h, 12, YOFF + 258));
    let b;
    if (h < SEA) b = BIO.OCEAN;
    else if (h <= SEA + 1 && temp > -0.2 && m < 0.05) b = BIO.BEACH;
    else if (m > 0.12 && h > SEA + 26) b = BIO.MOUNTAINS;
    else if (desertness > 0.5) b = BIO.DESERT;
    else if (temp < -0.2) b = BIO.SNOWY;
    else if (moist > 0.05) b = BIO.FOREST;
    else b = BIO.PLAINS;
    const res = { h, b };
    if (this.colCache.size > 60000) this.colCache.clear();
    this.colCache.set(k, res); return res;
  }
  // Minecraft 1.18-style noise caves:
  //  spaghetti - long winding tunnels where two noise fields both cross zero, wider below y 0
  //  noodle    - thin twisty passages that link the others (only in some regions)
  //  cheese    - big caverns deep underground, broken up by stone pillars where a finer noise dips
  // Like Minecraft, the noise is sampled on a 4-block grid and interpolated between the samples.
  caveSample(x, y, z, o, k) { // raw noise at a grid point (x, y, z multiples of 4) into o[k..k+6]
    o[k] = this.nA.n3(x / 30, y / 18, z / 30); o[k + 1] = this.nB.n3(x / 30, y / 18, z / 30); o[k + 2] = this.nN.n3(x / 90, 7.3, z / 90);
    o[k + 3] = this.nP.n3(x / 20, y / 12, z / 20); o[k + 4] = this.nQ.n3(x / 20, y / 12, z / 20); o[k + 5] = this.nK.n3(x / 60, y / 22, z / 60); o[k + 6] = this.nN.n3(x / 8, y / 24, z / 8);
  }
  caveTest(y, f, k) {
    const Y = y - YOFF; const a = f[k], c = f[k + 1];
    // tunnels only run where a slow regional field allows them, and narrow to nothing at its edge, so each tunnel is a
    // few dozen blocks long and ends in a point instead of winding on forever
    const reg = f[k + 5], tun = clamp((reg + 0.16) / 0.2, 0, 1);
    if (tun > 0 && a * a + c * c < (Y < 0 ? 0.0078 : 0.0055) * tun) return true;
    const nood = clamp((reg - 0.02) / 0.15, 0, 1);
    if (nood > 0 && Y > -60 && Y < 130 && f[k + 2] > 0.05) { const p = f[k + 3], q = f[k + 4]; if (p * p + q * q < 0.0016 * nood) return true; }
    if (Y < 50) { const v = f[k + 5]; const th = 0.34 - (Y < -8 ? 0.07 : 0) + (Y > 30 ? (Y - 30) * 0.035 : 0); if (v > th - 0.12 && v + f[k + 6] * 0.2 > th) return true; }
    return false;
  }
  // grid samples for one chunk: 5 x 5 columns of points (every 4 blocks) up to height ny*4
  caveGrid(bx, bz, ny) {
    const g = new Float32Array(25 * (ny + 1) * 7);
    for (let iy = 0; iy <= ny; iy++) for (let iz = 0; iz < 5; iz++) for (let ix = 0; ix < 5; ix++) this.caveSample(bx + ix * 4, iy * 4, bz + iz * 4, g, ((iy * 5 + iz) * 5 + ix) * 7);
    return g;
  }
  // interpolated fields for one column of a chunk grid, all heights: out[y*7 + f]
  caveColumn(g, lx, lz, ny, out) {
    const ix = lx >> 2, iz = lz >> 2, tx = (lx & 3) / 4, tz = (lz & 3) / 4; const lv = new Float32Array((ny + 1) * 7);
    for (let iy = 0; iy <= ny; iy++) for (let f = 0; f < 7; f++) {
      const b = iy * 25; const v00 = g[((b + iz * 5 + ix)) * 7 + f], v10 = g[((b + iz * 5 + ix + 1)) * 7 + f], v01 = g[((b + (iz + 1) * 5 + ix)) * 7 + f], v11 = g[((b + (iz + 1) * 5 + ix + 1)) * 7 + f];
      const a0 = v00 + (v10 - v00) * tx, a1 = v01 + (v11 - v01) * tx; lv[iy * 7 + f] = a0 + (a1 - a0) * tz;
    }
    for (let y = 0; y < ny * 4; y++) { const iy = y >> 2, t = (y & 3) / 4; for (let f = 0; f < 7; f++) { const a = lv[iy * 7 + f]; out[y * 7 + f] = a + (lv[(iy + 1) * 7 + f] - a) * t; } }
  }
  // single-block query used by structures (dungeons, strongholds); same grid and interpolation as chunk generation
  cave(x, y, z) {
    if (!this.cavePts) this.cavePts = new Map();
    const gx = Math.floor(x / 4) * 4, gy = Math.floor(y / 4) * 4, gz = Math.floor(z / 4) * 4; const f = new Float32Array(7); const c = new Float32Array(8 * 7);
    let i = 0; for (const dy of [0, 4]) for (const dz of [0, 4]) for (const dx of [0, 4]) { const key = (gx + dx) + ',' + (gy + dy) + ',' + (gz + dz); let v = this.cavePts.get(key); if (!v) { v = new Float32Array(7); this.caveSample(gx + dx, gy + dy, gz + dz, v, 0); if (this.cavePts.size > 30000) this.cavePts.clear(); this.cavePts.set(key, v); } c.set(v, i * 7); i++; }
    const tx = (x - gx) / 4, ty = (y - gy) / 4, tz = (z - gz) / 4;
    for (let k = 0; k < 7; k++) { const L = (a, b, t) => a + (b - a) * t; const x00 = L(c[k], c[7 + k], tx), x01 = L(c[14 + k], c[21 + k], tx), x10 = L(c[28 + k], c[35 + k], tx), x11 = L(c[42 + k], c[49 + k], tx); f[k] = L(L(x00, x01, tz), L(x10, x11, tz), ty); }
    return this.caveTest(y, f, 0);
  }
}

// ---- Structure placement (Minecraft "random spread") ----
// The world is cut into square regions of `spacing` chunks. Each region gets ONE attempt, at a random chunk that keeps
// `sep` chunks clear of the next region. The biome is checked at that chunk; if it is wrong, the region has no structure.
// Values are Minecraft Java's. Mineshaft-style per-chunk features (dungeons, desert wells) use per-chunk chances instead.
const PLACE = {
  village:        { spacing: 34, sep: 8,  salt: 10387, biomes: [BIO.PLAINS, BIO.DESERT, BIO.SNOWY] },
  desert_pyramid: { spacing: 32, sep: 8,  salt: 14357, biomes: [BIO.DESERT] },
  outpost:        { spacing: 32, sep: 8,  salt: 16574, biomes: [BIO.PLAINS, BIO.DESERT, BIO.SNOWY, BIO.MOUNTAINS], chance: 0.2, avoid: ['village', 10] },
  ruined_portal:  { spacing: 40, sep: 15, salt: 34222, land: true },
};
function regionStart(world, kind, rx, rz) {
  if (!world.startCache) world.startCache = new Map();
  const key = kind + ':' + rx + ',' + rz; if (world.startCache.has(key)) return world.startCache.get(key);
  const p = PLACE[kind]; const r = mulberry32(ihash(rx, rz, p.salt, world.seed)); const span = p.spacing - p.sep;
  const cx = rx * p.spacing + (r() * span | 0), cz = rz * p.spacing + (r() * span | 0);
  const col = world.gen.column(cx * 16 + 8, cz * 16 + 8);
  let ok = !(p.chance && r() >= p.chance);
  if (ok && p.biomes && !p.biomes.includes(col.b)) ok = false;
  if (ok && p.land && col.h <= SEA + 1) ok = false;
  if (ok && p.avoid && startNear(world, p.avoid[0], cx, cz, p.avoid[1])) ok = false;
  const res = ok ? { cx, cz, col, seed: ihash(cx, cz, p.salt, world.seed) } : null;
  if (world.startCache.size > 4000) world.startCache.clear();
  world.startCache.set(key, res); return res;
}
// a start of `kind` whose chunk is within `reach` chunks (Chebyshev) of (cx, cz), or null
function startNear(world, kind, cx, cz, reach) {
  const sp = PLACE[kind].spacing; let best = null, bd = 1e9;
  for (let rx = Math.floor((cx - reach) / sp); rx <= Math.floor((cx + reach) / sp); rx++) for (let rz = Math.floor((cz - reach) / sp); rz <= Math.floor((cz + reach) / sp); rz++) {
    const st = regionStart(world, kind, rx, rz); if (!st) continue;
    const d = Math.max(Math.abs(st.cx - cx), Math.abs(st.cz - cz)); if (d <= reach && d < bd) { bd = d; best = st; }
  }
  return best;
}
// Minecraft monster rooms: the floor and ceiling must be solid and the walls must touch a cave in 1-5 places
function dungeonFits(g, x0, y0, z0) {
  const W = 7; let open = 0;
  for (let x = x0 - 1; x <= x0 + W; x += 2) for (let z = z0 - 1; z <= z0 + W; z += 2) { if (g.cave(x, y0 - 1, z) || g.cave(x, y0 + 4, z)) return false; }
  for (let t = 0; t < W; t++) for (const [x, z] of [[x0 - 1, z0 + t], [x0 + W, z0 + t], [x0 + t, z0 - 1], [x0 + t, z0 + W]]) if (g.cave(x, y0, z) && g.cave(x, y0 + 1, z)) { open++; if (open > 5) return false; }
  return open >= 1;
}

// ---- Structures (deterministic per chunk; may spill into neighbours) ----
function structuresFor(world, cx, cz) {
  const key = ckey(cx, cz); const cached = world.structCache.get(key); if (cached) return cached;
  if (world.dim !== 'overworld') { const S2 = world.dim === 'nether' ? netherStructures(world, cx, cz) : endStructures(world, cx, cz); if (world.structCache.size > 3000) world.structCache.clear(); world.structCache.set(key, S2); return S2; }
  const g = world.gen, seed = world.seed;
  const S = { soft: [], hard: [], mobs: [], kinds: [] };
  const r = mulberry32(ihash(cx, cz, 99, seed));
  const hard = (x, y, z, id) => { if (y > 0 && y < WH) S.hard.push(x, y, z, id); };
  const soft = (x, y, z, id) => { if (y > 0 && y < WH) S.soft.push(x, y, z, id); };
  const bx = cx * 16, bz = cz * 16;
  const vs = startNear(world, 'village', cx, cz, 2);
  // --- trees ---
  for (let a = 0; a < (vs ? 0 : 9); a++) {
    const lx = r() * 16 | 0, lz = r() * 16 | 0, q = r(), t = r(), hh = r();
    const wx = bx + lx, wz = bz + lz; const col = g.column(wx, wz);
    if (col.h <= SEA || col.h > WH - 14) continue;
    const p = col.b === BIO.FOREST ? 0.85 : col.b === BIO.PLAINS ? 0.006 : col.b === BIO.SNOWY ? 0.012 : (col.b === BIO.MOUNTAINS && col.h < SEA + 26) ? 0.06 : 0;
    if (q >= p) continue;
    if (g.cave(wx, col.h - 1, wz)) continue;
    const y0 = col.h;
    if (col.b === BIO.SNOWY || (col.b === BIO.MOUNTAINS && t < 0.6)) {
      const H = 6 + (hh * 4 | 0);
      for (let y = 0; y < H; y++) soft(wx, y0 + y, wz, B.SPRUCE_LOG);
      let rad = 0;
      for (let y = H; y >= 2; y--) { const rr = rad; for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (Math.abs(dx) + Math.abs(dz) > rr + (rr > 1 ? 1 : 0)) continue; if (dx || dz || y >= H) soft(wx + dx, y0 + y, wz + dz, B.SPRUCE_LEAVES); } rad = rad >= 2 ? 1 : rad + 1; }
      soft(wx, y0 + H, wz, B.SPRUCE_LEAVES); soft(wx, y0 + H + 1, wz, B.SPRUCE_LEAVES);
    } else {
      const birch = col.b === BIO.FOREST && t < 0.3; const log = birch ? B.BIRCH_LOG : B.LOG, lv = birch ? B.BIRCH_LEAVES : B.LEAVES;
      const H = 4 + (hh * 3 | 0) + (birch ? 1 : 0);
      for (let y = H - 3; y <= H; y++) { const rr = y >= H - 1 ? 1 : 2; for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (Math.abs(dx) === rr && Math.abs(dz) === rr && (rr === 1 ? y === H : rnd01(wx + dx, y, wz + dz, seed) < 0.5)) continue; soft(wx + dx, y0 + y, wz + dz, lv); } }
      for (let y = 0; y < H; y++) hard(wx, y0 + y, wz, log);
    }
  }
  // --- village: one start per 34x34-chunk region, plains / desert / snowy only; see 02c_village.js for the layout ---
  let inVillage = false;
  if (vs) { inVillage = true; villageChunk(S, g, cx, cz, vs, hard, r, world); }
  const cc0 = g.column(bx + 8, bz + 8);
  if (!inVillage) {
    // desert pyramid: desert only, one chance per 32x32-chunk region
    const dp = startNear(world, 'desert_pyramid', cx, cz, 0);
    if (dp) { buildPyramid(S, g, bx + 8, bz + 8, hard, r, world); S.kinds.push(['pyramid', bx + 8, bz + 8]); }
    // watchtower: uses pillager-outpost rules (20% of regions, never within 10 chunks of a village)
    else if (startNear(world, 'outpost', cx, cz, 0)) { buildTower(S, g, bx + 6, bz + 6, hard, r, world); S.kinds.push(['tower', bx + 8, bz + 8]); }
    // ruined portal: any land biome, one chance per 40x40-chunk region
    else if (startNear(world, 'ruined_portal', cx, cz, 0)) { buildRuinedPortal(S, g, bx + 6, bz + 7, hard, r, world); S.kinds.push(['ruined_portal', bx + 8, bz + 8]); }
    // desert well: 1 in 1000 desert chunks
    else if (cc0.b === BIO.DESERT && rnd01(cx, cz, 4417, seed) < 0.001) { buildWell(S, g, bx + 6, bz + 6, hard, { wall: B.SANDSTONE, corner: B.SANDSTONE, floor: B.SANDSTONE, roof: B.SANDSTONE, found: B.SANDSTONE }); S.kinds.push(['desert_well', bx + 8, bz + 8]); }
  }
  // --- dungeon (monster room): a few attempts per chunk, kept only where it breaks into a cave ---
  // Minecraft: 10 tries between y 0 and the surface, 4 tries between y -58 and -1
  for (let a = 0; a < 14 && cc0.h > 20; a++) {
    const x0 = bx + 1 + (r() * 8 | 0), z0 = bz + 1 + (r() * 8 | 0), y = a < 10 ? YOFF + (r() * Math.max(1, cc0.h - YOFF - 8) | 0) : YOFF - 58 + (r() * 57 | 0);
    if (dungeonFits(g, x0, y, z0)) { buildDungeon(S, x0, y, z0, hard, r, world); S.kinds.push(['dungeon', x0 + 3, z0 + 3, y]); break; }
  }
  if (world.structCache.size > 3000) world.structCache.clear();
  world.structCache.set(key, S);
  return S;
}
function groundFill(g, x, z, fy, hard, id) { const gh = g.column(x, z).h; for (let y = Math.max(1, gh - 1); y < fy; y++) hard(x, y, z, id); }
function buildHouse(S, g, x0, z0, w, d, hard, M, doorSide, r, world) {
  const fy = g.column(x0 + (w >> 1), z0 + (d >> 1)).h - 1;
  let mn = 999, mx = -999; for (const [x, z] of [[x0, z0], [x0 + w - 1, z0], [x0, z0 + d - 1], [x0 + w - 1, z0 + d - 1]]) { const h = g.column(x, z).h; mn = Math.min(mn, h); mx = Math.max(mx, h); }
  if (mx - mn > 5 || fy < SEA) return;
  for (let x = x0 - 1; x <= x0 + w; x++) for (let z = z0 - 1; z <= z0 + d; z++) {
    const margin = x < x0 || x >= x0 + w || z < z0 || z >= z0 + d;
    if (margin) { groundFill(g, x, z, fy, hard, B.DIRT); hard(x, fy, z, M.wall === B.SANDSTONE ? B.SAND : M.corner === B.SPRUCE_LOG ? B.SNOWY_GRASS : B.GRASS); }
    else { groundFill(g, x, z, fy, hard, M.found); hard(x, fy, z, M.floor); }
    for (let y = fy + 1; y <= fy + 10; y++) hard(x, y, z, 0);
  }
  const doorX = x0 + (w >> 1), doorZ = z0 + (d >> 1);
  for (let y = fy + 1; y <= fy + 4; y++) for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) {
    const ex = x === x0 || x === x0 + w - 1, ez = z === z0 || z === z0 + d - 1; if (!ex && !ez) continue;
    let id = (ex && ez) ? M.corner : M.wall;
    const midX = x === doorX, midZ = z === doorZ;
    if (!(ex && ez) && (y === fy + 2 || y === fy + 3) && ((ez && Math.abs(x - doorX) === 1) || (ex && Math.abs(z - doorZ) === 1)) && y === fy + 2) id = B.GLASS;
    if (!(ex && ez) && y === fy + 2 && ((ez && midX) || (ex && midZ))) id = B.GLASS;
    hard(x, y, z, id);
  }
  // door
  const doors = [[x0 + w - 1, doorZ, 1, 0], [x0, doorZ, -1, 0], [doorX, z0 + d - 1, 0, 1], [doorX, z0, 0, -1]];
  const [dx0, dz0, ox, oz] = doors[doorSide];
  hard(dx0, fy + 1, dz0, 0); hard(dx0, fy + 2, dz0, 0);
  for (let i = 1; i <= 2; i++) { const px = dx0 + ox * i, pz = dz0 + oz * i; const gh = g.column(px, pz).h; if (gh > SEA) { hard(px, gh - 1, pz, M.road || B.DIRT_PATH); hard(px, gh, pz, 0); hard(px, gh + 1, pz, 0); } }
  // roof (stepped pyramid)
  for (let k = 0; ; k++) {
    const ax = x0 - 1 + k, bx2 = x0 + w - k, az = z0 - 1 + k, bz2 = z0 + d - k; if (ax > bx2 || az > bz2) break;
    for (let x = ax; x <= bx2; x++) for (let z = az; z <= bz2; z++) hard(x, fy + 5 + k, z, (k === 0 && (x < x0 || x >= x0 + w || z < z0 || z >= z0 + d)) ? M.roof : (k === 0 ? M.wall : M.roof));
  }
  hard(doorX, fy + 5, doorZ, B.GLOWSTONE);
  // interior
  const ins = [[x0 + 1, z0 + 1], [x0 + w - 2, z0 + 1], [x0 + 1, z0 + d - 2], [x0 + w - 2, z0 + d - 2]].filter(([x, z]) => Math.abs(x - dx0) + Math.abs(z - dz0) > 1);
  if (ins[0]) hard(ins[0][0], fy + 1, ins[0][1], B.CRAFTING_TABLE);
  if (ins[1]) { hard(ins[1][0], fy + 1, ins[1][1], B.CHEST); world.chestLoot.set(ins[1][0] + ',' + (fy + 1) + ',' + ins[1][1], 'house'); }
  if (ins[2] && r() < 0.85) hard(ins[2][0], fy + 1, ins[2][1], [B.FLETCHING_TABLE, B.CARTOGRAPHY_TABLE, B.BARREL, B.SMOKER, B.STONECUTTER, B.CAULDRON, B.LOOM, B.COMPOSTER, B.BOOKSHELF][r() * 9 | 0]); // a job site for whoever lives here
  S.mobs.push(['villager', doorX + 0.5, fy + 1, doorZ + 0.5]);
}
function buildWell(S, g, x0, z0, hard, M) {
  const fy = g.column(x0 + 2, z0 + 2).h - 1; if (fy < SEA) return;
  for (let x = x0 - 2; x <= x0 + 5; x++) for (let z = z0 - 2; z <= z0 + 5; z++) {
    const inner = x >= x0 && x <= x0 + 3 && z >= z0 && z <= z0 + 3;
    groundFill(g, x, z, fy, hard, B.DIRT); hard(x, fy, z, inner ? M.found : (M.road || B.GRAVEL));
    for (let y = fy + 1; y <= fy + 6; y++) hard(x, y, z, 0);
  }
  for (let x = x0; x <= x0 + 3; x++) for (let z = z0; z <= z0 + 3; z++) {
    const edge = x === x0 || x === x0 + 3 || z === z0 || z === z0 + 3;
    if (edge) { hard(x, fy + 1, z, M.found); } else { for (let y = fy - 3; y <= fy; y++) hard(x, y, z, B.WATER); hard(x, fy - 4, z, M.found); }
    if ((x === x0 || x === x0 + 3) && (z === z0 || z === z0 + 3)) { hard(x, fy + 2, z, B.LOG === M.corner ? B.LOG : M.corner); hard(x, fy + 3, z, M.corner); }
    hard(x, fy + 4, z, M.roof);
  }
  hard(x0 + 1, fy + 5, z0 + 1, B.GLOWSTONE);
  // lamp posts
  for (const [x, z] of [[x0 - 2, z0 - 2], [x0 + 5, z0 + 5]]) { hard(x, fy + 1, z, B.COBBLESTONE); hard(x, fy + 2, z, B.LOG); hard(x, fy + 3, z, B.GLOWSTONE); }
  S.mobs.push(['villager', x0 + 5.5, fy + 1, z0 + 1.5]); S.mobs.push(['villager', x0 - 1.5, fy + 1, z0 + 3.5]);
}
function buildPyramid(S, g, cx, cz, hard, r, world) {
  const by = g.column(cx, cz).h; const R = 10;
  for (let dx = -R - 1; dx <= R + 1; dx++) for (let dz = -R - 1; dz <= R + 1; dz++) { groundFill(g, cx + dx, cz + dz, by, hard, B.SANDSTONE); for (let y = by; y < by + 13; y++) hard(cx + dx, y, cz + dz, 0); }
  for (let k = 0; k <= R; k++) {
    const rr = R - k;
    for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) {
      const chamber = k >= 1 && k <= 4 && Math.abs(dx) <= 3 && Math.abs(dz) <= 3;
      const tunnel = (k === 1 || k === 2) && dx === 0 && dz >= 3;
      hard(cx + dx, by + k, cz + dz, chamber || tunnel ? 0 : ((k % 3 === 2 && (Math.abs(dx) === rr || Math.abs(dz) === rr)) ? B.STONE_BRICKS : B.SANDSTONE));
    }
  }
  hard(cx, by + R + 1, cz, B.GLOWSTONE);
  hard(cx, by, cz, B.GLOWSTONE);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) hard(cx + dx, by - 2, cz + dz, B.TNT);
  for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) if (true) { /* Minecraft: always 4 chests */ hard(cx + dx, by + 1, cz + dz, B.CHEST); world.chestLoot.set((cx + dx) + ',' + (by + 1) + ',' + (cz + dz), 'pyramid'); }
  hard(cx - 3, by + 1, cz, B.TORCH); hard(cx + 3, by + 1, cz, B.TORCH);
}
function buildTower(S, g, x0, z0, hard, r, world) {
  const fy = g.column(x0 + 2, z0 + 2).h - 1; const H = 14 + (r() * 6 | 0); if (fy < SEA) return;
  const wallB = () => { const q = r(); return q < 0.45 ? B.STONE_BRICKS : q < 0.75 ? B.COBBLESTONE : B.MOSSY_COBBLESTONE; };
  for (let x = x0 - 1; x <= x0 + 5; x++) for (let z = z0 - 1; z <= z0 + 5; z++) { groundFill(g, x, z, fy, hard, B.COBBLESTONE); hard(x, fy, z, B.COBBLESTONE); for (let y = fy + 1; y <= fy + H + 3; y++) hard(x, y, z, 0); }
  for (let y = fy + 1; y < fy + H; y++) for (let x = x0; x <= x0 + 4; x++) for (let z = z0; z <= z0 + 4; z++) {
    const edge = x === x0 || x === x0 + 4 || z === z0 || z === z0 + 4; if (!edge) continue;
    if (y > fy + H - 5 && r() < 0.18) continue;
    const win = (y - fy) % 5 === 3 && (x === x0 + 2 || z === z0 + 2);
    hard(x, y, z, win ? 0 : wallB());
  }
  hard(x0 + 2, fy + 1, z0 + 4, 0); hard(x0 + 2, fy + 2, z0 + 4, 0);
  const ring = [[1, 1], [2, 1], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [1, 2]];
  const last = H - 2;
  for (let i = 0; i <= last; i++) { const [lx, lz] = ring[i % 8]; hard(x0 + lx, fy + 1 + i, z0 + lz, B.STONE_BRICKS); }
  const fl = fy + 1 + last;
  for (let lx = 1; lx <= 3; lx++) for (let lz = 1; lz <= 3; lz++) {
    const p1 = ring[(last - 1) % 8], p2 = ring[(last - 2) % 8], p3 = ring[(last - 3) % 8];
    if ((lx === p1[0] && lz === p1[1]) || (lx === p2[0] && lz === p2[1]) || (lx === p3[0] && lz === p3[1])) continue;
    hard(x0 + lx, fl, z0 + lz, B.STONE_BRICKS);
  }
  for (let x = x0; x <= x0 + 4; x++) for (let z = z0; z <= z0 + 4; z++) { const edge = x === x0 || x === x0 + 4 || z === z0 || z === z0 + 4; if (edge) { hard(x, fl, z, wallB()); if ((x + z) % 2 === 0) hard(x, fl + 1, z, wallB()); } }
  const top = ring[(last + 4) % 8]; hard(x0 + top[0], fl + 1, z0 + top[1], B.CHEST); world.chestLoot.set((x0 + top[0]) + ',' + (fl + 1) + ',' + (z0 + top[1]), 'tower');
  const tp = ring[(last + 2) % 8]; hard(x0 + tp[0], fl + 1, z0 + tp[1], B.TORCH);
}
function buildDungeon(S, x0, y0, z0, hard, r, world) {
  const W = 7, Hh = 4;
  for (let x = x0 - 1; x <= x0 + W; x++) for (let z = z0 - 1; z <= z0 + W; z++) for (let y = y0 - 1; y <= y0 + Hh; y++) {
    const shell = x === x0 - 1 || x === x0 + W || z === z0 - 1 || z === z0 + W || y === y0 - 1 || y === y0 + Hh;
    if (shell) { if (y === y0 + Hh && r() < 0.1) continue; if (y > y0 - 1 && y < y0 + Hh && world.gen.cave(x, y, z)) continue; hard(x, y, z, r() < 0.45 ? B.MOSSY_COBBLESTONE : B.COBBLESTONE); }
    else hard(x, y, z, 0);
  }
  const sx = x0 + 3, sz = z0 + 3; hard(sx, y0, sz, B.SPAWNER);
  const types = ['zombie', 'skeleton', 'spider']; world.spawners.set(sx + ',' + y0 + ',' + sz, types[r() * 3 | 0]);
  const spots = [[x0, z0 + 3], [x0 + W - 1, z0 + 3], [x0 + 3, z0], [x0 + 3, z0 + W - 1]];
  const n = 1 + (r() * 2 | 0);
  for (let i = 0; i < n; i++) { const [x, z] = spots[(r() * 4 | 0)]; hard(x, y0, z, B.CHEST); world.chestLoot.set(x + ',' + y0 + ',' + z, 'dungeon'); }
}

// ---- Chunk ----
class Chunk {
  constructor(cx, cz) { this.cx = cx; this.cz = cz; this.key = ckey(cx, cz); this.d = new Uint16Array(CS * CS * WH); this.top = new Uint16Array(256); this.lights = []; this.maxY = 0; this.mesh = null; this.wmesh = null; this.dirty = true; this.fresh = true; }
  calcTop(lx, lz) { const d = this.d; for (let y = WH - 1; y >= 0; y--) if (SKYB[d[(y * 16 + lz) * 16 + lx]]) { this.top[lz * 16 + lx] = y + 1; return; } this.top[lz * 16 + lx] = 0; }
  isLava(l) { const lx = l[0] - this.cx * 16, lz = l[2] - this.cz * 16; return FKIND[this.d[(l[1] * 16 + lz) * 16 + lx]] === 2; }
  scanMeta() {
    const d = this.d; this.lights = []; let maxY = 0;
    // light sources. Lava seas would add hundreds of lights per chunk (slow meshing in the Nether), so only exposed lava on a
    // 3-block grid counts; the lava itself still glows at full brightness.
    for (let y = 0; y < WH; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) { const i = (y * 16 + z) * 16 + x; const id = d[i]; if (id) { maxY = y; if (LIGHT[id]) {
      if (FKIND[id] === 2 && (x % 4 || z % 4 || (y < WH - 1 && d[i + 256] && OPAQUE[d[i + 256]]) || (y < WH - 1 && FKIND[d[i + 256]] === 2))) continue;
      this.lights.push([this.cx * 16 + x, y, this.cz * 16 + z, LIGHT[id]]); } } }
    if (this.lights.length > 16) { const L = this.lights, step = L.length / 16; this.lights = []; for (let k = 0; k < 16; k++) { const l = L[Math.floor(k * step)]; this.lights.push([l[0], l[1], l[2], Math.min(1, l[3] * 1.1)]); } }
    this.maxY = maxY;
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) this.calcTop(x, z);
  }
}

// ---- Face tables ----
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], s: 0.74 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], s: 0.74 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], s: 1.0 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], s: 0.52 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], s: 0.88 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], s: 0.88 },
];
for (const F of FACES) {
  const t = [0, 1, 2].filter(a => F.n[a] === 0);
  F.ao = F.c.map(c => {
    const s1 = c[t[0]] ? 1 : -1, s2 = c[t[1]] ? 1 : -1;
    const a = F.n.slice(), b = F.n.slice(), d = F.n.slice(); a[t[0]] += s1; b[t[1]] += s2; d[t[0]] += s1; d[t[1]] += s2;
    return [a, b, d];
  });
}
const UVC = [[0, 0], [1, 0], [1, 1], [0, 1]];
const AO_LV = [0.42, 0.6, 0.8, 1.0];
// ---- Detailed textures: every 16px tile is upscaled 4x (Scale2x twice: smooth diagonals, crisp edges), given relief shading and
// fine grain, and stored with a gutter so mipmaps don't bleed between tiles. "Low" graphics keeps the classic 16px atlas.
const HD = (() => { const touch = !!(window.matchMedia && matchMedia('(pointer:coarse)').matches && 'ontouchstart' in window); try { const s = JSON.parse(localStorage.getItem('blockwild_settings') || '{}'); return (s.gfx || (touch ? 'low' : 'high')) !== 'low' && s.tex !== 'classic'; } catch (e) { return !touch; } })();
const TS = HD ? 64 : 16, PAD = HD ? 4 : 0, CELL = TS + 2 * PAD, AW = ATN * CELL;
const hdCanvas = HD ? document.createElement('canvas') : atlasCanvas; if (HD) { hdCanvas.width = hdCanvas.height = AW; }
const hdCtx = HD ? hdCanvas.getContext('2d') : null;
function scale2x(src, n) { const m = n * 2, out = new Uint32Array(m * m); const at = (x, y) => src[clamp(y, 0, n - 1) * n + clamp(x, 0, n - 1)];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const P = at(x, y), A = at(x, y - 1), Bq = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1); let e0 = P, e1 = P, e2 = P, e3 = P;
    if (C === A && C !== D && A !== Bq) e0 = A; if (A === Bq && A !== C && Bq !== D) e1 = Bq; if (D === C && D !== Bq && C !== A) e2 = C; if (Bq === D && Bq !== A && D !== C) e3 = D;
    out[(y * 2) * m + x * 2] = e0; out[(y * 2) * m + x * 2 + 1] = e1; out[(y * 2 + 1) * m + x * 2] = e2; out[(y * 2 + 1) * m + x * 2 + 1] = e3; }
  return out; }
function quantize(d) { const u = new Uint32Array(256); for (let i = 0; i < 256; i++) { const k = i * 4; u[i] = ((d[k + 3] > 127 ? 255 : 0) << 24 | (d[k + 2] & 0xfc) << 16 | (d[k + 1] & 0xfc) << 8 | (d[k] & 0xfc)) >>> 0; } return u; }
function hdTile(i) {
  if (!HD) return; const sx = (i % ATN) * 16, sy = Math.floor(i / ATN) * 16; const src = actx.getImageData(sx, sy, 16, 16).data;
  // Scale2x needs exact colour matches, so compare on slightly quantised colours but output the original colours
  const q = quantize(src); const orig = new Map(); for (let k = 0; k < 256; k++) if (!orig.has(q[k])) orig.set(q[k], k);
  const up = scale2x(scale2x(q, 16), 32); const img = hdCtx.createImageData(CELL, CELL); const o = img.data; const lum = new Float32Array(TS * TS);
  for (let k = 0; k < TS * TS; k++) { const s = orig.get(up[k]) * 4; lum[k] = (src[s] * 0.3 + src[s + 1] * 0.59 + src[s + 2] * 0.11) / 255; }
  const L = (x, y) => lum[clamp(y, 0, TS - 1) * TS + clamp(x, 0, TS - 1)];
  for (let y = -PAD; y < TS + PAD; y++) for (let x = -PAD; x < TS + PAD; x++) {
    const cx = clamp(x, 0, TS - 1), cy = clamp(y, 0, TS - 1); const s = orig.get(up[cy * TS + cx]) * 4;
    const relief = clamp(1 + (L(cx - 1, cy - 1) - L(cx + 1, cy + 1)) * 0.55, 0.86, 1.14);
    const h = (Math.imul(cx * 73856093 ^ cy * 19349663 ^ i * 83492791, 2654435761) >>> 0) / 4294967296; const grain = 0.965 + h * 0.07;
    const t = ((y + PAD) * CELL + (x + PAD)) * 4; const f = relief * grain;
    o[t] = clamp(src[s] * f, 0, 255); o[t + 1] = clamp(src[s + 1] * f, 0, 255); o[t + 2] = clamp(src[s + 2] * f, 0, 255); o[t + 3] = src[s + 3];
  }
  hdCtx.putImageData(img, (i % ATN) * CELL, Math.floor(i / ATN) * CELL); return img;
}
if (HD) for (let i = 0; i < tileCount; i++) hdTile(i);
function tileUV(t) { const e = HD ? 0.5 / AW : 0.0004; const col = t % ATN, row = Math.floor(t / ATN); const u0 = (col * CELL + PAD) / AW + e, u1 = (col * CELL + PAD + TS) / AW - e; const vTop = 1 - (row * CELL + PAD) / AW - e, vBot = 1 - (row * CELL + PAD + TS) / AW + e; return [u0, vBot, u1, vTop]; }
// u/v of a tile's top-left corner and the size of one source pixel, for sub-tile geometry such as torches
function tileSub(t) { const col = t % ATN, row = Math.floor(t / ATN); return { u0: (col * CELL + PAD) / AW, v0: 1 - (row * CELL + PAD) / AW, px: TS / 16 / AW }; }
const TILE_UV = []; for (let i = 0; i < tileCount; i++) TILE_UV[i] = tileUV(i);

// ---- Materials ----
const atlasTex = new THREE.CanvasTexture(hdCanvas); if (HD) { atlasTex.magFilter = THREE.LinearFilter; atlasTex.minFilter = THREE.LinearMipmapLinearFilter; atlasTex.generateMipmaps = true; } else { atlasTex.magFilter = THREE.NearestFilter; atlasTex.minFilter = THREE.NearestFilter; atlasTex.generateMipmaps = false; }
const dummyDepth = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
const chunkUniforms = { atlas: { value: atlasTex }, daylight: { value: 1 }, fogColor: { value: new THREE.Color(0x87ceeb) }, fogNear: { value: 40 }, fogFar: { value: 80 }, skyTint: { value: new THREE.Color(1, 1, 1) }, time: { value: 0 },
  shadowOn: { value: 0 }, shadowMap: { value: dummyDepth }, shadowMatrix: { value: new THREE.Matrix4() }, shadowTexel: { value: 1 / 2048 }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunK: { value: 0 },
  skyRefl: { value: new THREE.Color(0.6, 0.8, 1) }, mist: { value: 0 }, mistY: { value: 38 }, minLight: { value: 0 }, sunCol: { value: new THREE.Color(1, 0.95, 0.85) } };
const VS = `attribute vec2 light; attribute float shade; attribute float sway; varying vec2 vUv; varying vec2 vLight; varying float vShade; varying float vFog; varying vec3 vWorld; varying float vDist;
uniform float fogNear; uniform float fogFar; uniform float time;
void main(){ vUv=uv; vLight=light; vShade=shade; vec3 p=position;
 if(sway!=0.0){ vec4 wp0=modelMatrix*vec4(position,1.0);
  if(sway>0.0){ float s=sin(time*1.7+wp0.x*0.7+wp0.z*0.5)*0.07+sin(time*2.9+wp0.z*1.1+wp0.x*0.3)*0.03; p.x+=s*sway; p.z+=s*0.7*sway; }
  else { p.y+=((sin(time*1.9+wp0.x*0.9+wp0.z*0.7)+sin(time*1.3-wp0.x*0.6+wp0.z*1.1))*0.035-0.04)*(-sway); } }
 vec4 wp=modelMatrix*vec4(p,1.0); vWorld=wp.xyz; vec4 mv=viewMatrix*wp; vDist=length(mv.xyz); vFog=smoothstep(fogNear,fogFar,vDist); gl_Position=projectionMatrix*mv; }`;
const FS_COMMON = `uniform sampler2D atlas; uniform float daylight; uniform vec3 fogColor; uniform vec3 skyTint; uniform float alphaV; uniform float time;
uniform float shadowOn; uniform sampler2D shadowMap; uniform mat4 shadowMatrix; uniform float shadowTexel; uniform vec3 sunDir; uniform float sunK;
uniform vec3 skyRefl; uniform float mist; uniform float mistY; uniform float minLight; uniform vec3 sunCol;
varying vec2 vUv; varying vec2 vLight; varying float vShade; varying float vFog; varying vec3 vWorld; varying float vDist;
float shadowAt(vec3 wp, vec3 n){
 vec4 sc=shadowMatrix*vec4(wp+n*0.05,1.0); vec3 s=sc.xyz*0.5+0.5;
 if(s.x<0.0||s.x>1.0||s.y<0.0||s.y>1.0||s.z>1.0) return 1.0;
 float b=0.0012; float lit=0.0;
 for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++){ lit+= (texture2D(shadowMap, s.xy+vec2(float(i),float(j))*shadowTexel).r < s.z-b) ? 0.0 : 1.0; }
 return lit/9.0; }
float fogMix(){ float m = mist*clamp((mistY-vWorld.y)/12.0,0.0,1.0)*smoothstep(6.0,48.0,vDist); return max(vFog, m*0.85); }
vec3 lightFor(vec3 n){
 float sky=vLight.x*daylight;
 // sunlight: faces turned to the sun get warm direct light (blocked by shadows on High); the rest get cooler sky light
 float ndl=dot(n,sunDir); float lit= ndl>0.0 ? smoothstep(0.0,0.25,ndl) : 0.0;
 if(shadowOn>0.5 && vLight.x>0.3 && sunK>0.0 && lit>0.0) lit*=shadowAt(vWorld,n);
 float out_=sunK*smoothstep(0.35,0.9,vLight.x);
 vec3 amb=skyTint*sky*mix(vec3(1.0),vec3(0.66,0.71,0.82),out_);
 vec3 sun=sunCol*lit*out_*daylight*(0.32+0.2*max(ndl,0.0));
 float fl=0.92+0.08*sin(time*7.0+vWorld.x*1.3+vWorld.z*0.7)*sin(time*11.3+vWorld.y*2.1);
 vec3 l=max(amb+sun, vec3(1.0,0.82,0.58)*vLight.y*fl); return max(l,vec3(max(0.07,minLight))); }`;
const FS = FS_COMMON + `
void main(){ vec4 t=texture2D(atlas,vUv); if(t.a<0.5) discard;
 float f=fogMix();
 if(vShade>1.01){ gl_FragColor=vec4(mix(t.rgb,fogColor,f),alphaV); return; }
 vec3 n=normalize(cross(dFdx(vWorld),dFdy(vWorld)));
 vec3 c=t.rgb*lightFor(n)*vShade; gl_FragColor=vec4(mix(c,fogColor,f), alphaV); }`;
const WFS = FS_COMMON + `
void main(){ vec4 t=texture2D(atlas,vUv); if(t.a<0.5) discard;
 float f=fogMix();
 if(vShade>1.01){ gl_FragColor=vec4(mix(t.rgb,fogColor,f),0.82); return; }
 vec3 fn=normalize(cross(dFdx(vWorld),dFdy(vWorld)));
 vec3 base=t.rgb*lightFor(fn)*min(vShade,1.0);
 float up=step(0.7,abs(fn.y));
 vec3 n=normalize(vec3(sin(vWorld.x*1.7+time*1.5)*0.06+sin(vWorld.z*2.3-time*1.1)*0.04, 1.0, cos(vWorld.z*1.9+time*1.3)*0.06+cos(vWorld.x*2.1-time*0.9)*0.04));
 vec3 V=normalize(cameraPosition-vWorld); float vd=abs(dot(V,n));
 float fres=up*pow(1.0-vd,4.0);
 vec3 refl=skyRefl*(0.25+0.75*daylight)*mix(0.4,1.0,vLight.x);
 vec3 c=mix(base, refl, fres*0.8);
 vec3 H=normalize(V+sunDir); float spec=pow(max(dot(n,H),0.0),160.0)*sunK*up*vLight.x;
 c+=vec3(1.0,0.95,0.82)*spec*2.0;
 float a=mix(alphaV, 0.96, fres);
 gl_FragColor=vec4(mix(c,fogColor,f), a); }`;
const GFS = `uniform sampler2D atlas; varying vec2 vUv; varying vec2 vLight; varying float vShade; varying float vFog; varying vec3 vWorld; varying float vDist;
void main(){ vec4 t=texture2D(atlas,vUv); if(t.a<0.5) discard; float g=clamp(vShade-1.0,0.0,1.0); vec3 c=t.rgb*g; c=c*c*1.4; gl_FragColor=vec4(c*(1.0-vFog),1.0); }`;
const chunkMat = new THREE.ShaderMaterial({ uniforms: Object.assign({ alphaV: { value: 1 } }, chunkUniforms), vertexShader: VS, fragmentShader: FS });
const waterMat = new THREE.ShaderMaterial({ uniforms: Object.assign({ alphaV: { value: 0.66 } }, chunkUniforms), vertexShader: VS, fragmentShader: WFS, transparent: true, depthWrite: false, side: THREE.DoubleSide });
const glowMat = new THREE.ShaderMaterial({ uniforms: chunkUniforms, vertexShader: VS, fragmentShader: GFS, side: THREE.DoubleSide });
for (const m of [chunkMat, waterMat, glowMat]) m.extensions = { derivatives: true };

// ---- World ----
class World {
  constructor(seed, scene, dim = 'overworld') {
    this.seed = seed; this.dim = dim; this.scene = scene; this.yOff = dim === 'overworld' ? YOFF : 0; this.flatSky = dim !== 'overworld'; this.furnaces = new Map();
    this.gen = dim === 'nether' ? new NetherGen(seed) : dim === 'end' ? new EndGen(seed) : new Gen(seed);
    this.chunks = new Map(); this.edits = new Map(); this.chestInv = new Map(); this.chestLoot = new Map(); this.spawners = new Map();
    this.structCache = new Map(); this.hintsDone = new Set(); this.urgent = new Set(); this.onChunkGen = null;
    this.wanted = []; this.lastCenter = null;
  }
  getChunk(cx, cz) { return this.chunks.get(ckey(cx, cz)); }
  get(x, y, z) { if (y < 0) return B.BEDROCK; if (y >= WH) return 0; const c = this.chunks.get(ckey(x >> 4, z >> 4)); if (!c) return 0; return c.d[(y * 16 + (z & 15)) * 16 + (x & 15)]; }
  loaded(x, z) { return this.chunks.has(ckey(x >> 4, z >> 4)); }
  solid(x, y, z) { if (y < 0) return true; if (y >= WH) return false; const c = this.chunks.get(ckey(x >> 4, z >> 4)); if (!c) return true; return SOLID[c.d[(y * 16 + (z & 15)) * 16 + (x & 15)]] === 1; }
  set(x, y, z, id, record = true) {
    if (y < 0 || y >= WH) return false;
    const cx = x >> 4, cz = z >> 4; const c = this.getChunk(cx, cz); if (!c) return false;
    const lx = x & 15, lz = z & 15, i = (y * 16 + lz) * 16 + lx; const old = c.d[i]; if (old === id) return false;
    c.d[i] = id;
    if (record) { let e = this.edits.get(c.key); if (!e) { e = new Map(); this.edits.set(c.key, e); } e.set(i, id); }
    const ti = lz * 16 + lx;
    if (SKYB[id] && y + 1 > c.top[ti]) c.top[ti] = y + 1; else if (!SKYB[id] && y + 1 === c.top[ti]) c.calcTop(lx, lz);
    if (y > c.maxY) c.maxY = y;
    const lightCh = LIGHT[old] || LIGHT[id];
    if (lightCh) { c.lights = c.lights.filter(L => !(L[0] === x && L[1] === y && L[2] === z)); if (LIGHT[id]) c.lights.push([x, y, z, LIGHT[id]]); }
    const mark = (ax, az) => { const n = this.getChunk(ax, az); if (n) { n.dirty = true; this.urgent.add(n); } };
    mark(cx, cz);
    if (lightCh) { for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (dx || dz) mark(cx + dx, cz + dz); }
    else {
      const ex = lx === 0 ? -1 : lx === 15 ? 1 : 0, ez = lz === 0 ? -1 : lz === 15 ? 1 : 0;
      if (ex) mark(cx + ex, cz); if (ez) mark(cx, cz + ez); if (ex && ez) mark(cx + ex, cz + ez);
    }
    return true;
  }
  skyCol(x, y, z) { const c = this.chunks.get(ckey(x >> 4, z >> 4)); if (!c) return 1; const t = c.top[(z & 15) * 16 + (x & 15)]; return y >= t ? 1 : Math.max(0.05, 1 - (t - y) * 0.17); }
  skyAt(x, y, z) { if (this.flatSky) return 1; let v = this.skyCol(x, y, z); if (v >= 1 || v < 0.05 + 1e-6) return v;
    for (let k = 0; k < 4; k++) { const dx = k === 0 ? 1 : k === 1 ? -1 : 0, dz = k === 2 ? 1 : k === 3 ? -1 : 0; for (let d = 1; d <= 6; d++) { const xx = x + dx * d, zz = z + dz * d; if (OPAQUE[this.get(xx, y, zz)]) break; const w = this.skyCol(xx, y, zz) - 0.09 * d; if (w > v) v = w; } if (v >= 0.9) break; }
    return v; }
  blockLightAt(x, y, z) {
    let best = 0; const cx = Math.floor(x) >> 4, cz = Math.floor(z) >> 4;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const c = this.chunks.get(ckey(cx + dx, cz + dz)); if (!c) continue;
      for (const L of c.lights) { const a = x - L[0] - 0.5, b = y - L[1] - 0.5, e = z - L[2] - 0.5; const d2 = a * a + b * b + e * e; if (d2 < 64) { const v = L[3] * (1 - Math.sqrt(d2) / 8); if (v > best) best = v; } }
    }
    return best;
  }
  lightAt(x, y, z, day) { return Math.max(this.skyAt(Math.floor(x), Math.floor(y), Math.floor(z)) * day, this.blockLightAt(x, y, z)); }
  surfaceY(x, z) { for (let y = WH - 1; y > 0; y--) { const id = this.get(x, y, z); if (SOLID[id] || FKIND[id] === 1) return y + 1; } return WH; }

  generate(cx, cz) {
    const c = new Chunk(cx, cz); const d = c.d; const g = this.gen; const bx = cx * 16, bz = cz * 16;
    let cols = null;
    if (this.dim === 'nether') genNetherChunk(this, c); else if (this.dim === 'end') genEndChunk(this, c); else cols = this.genOverworld(c);
    const lists = [];
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) lists.push(structuresFor(this, cx + dx, cz + dz));
    const x0 = bx, x1 = bx + 15, z0 = bz, z1 = bz + 15;
    for (const S of lists) { const a = S.soft; for (let i = 0; i < a.length; i += 4) { const x = a[i], y = a[i + 1], z = a[i + 2]; if (x < x0 || x > x1 || z < z0 || z > z1) continue; const j = (y * 16 + (z - bz)) * 16 + (x - bx); const cur = d[j]; if (cur === 0 || PLANT[cur]) d[j] = a[i + 3]; } }
    for (const S of lists) { const a = S.hard; for (let i = 0; i < a.length; i += 4) { const x = a[i], y = a[i + 1], z = a[i + 2]; if (x < x0 || x > x1 || z < z0 || z > z1) continue; d[(y * 16 + (z - bz)) * 16 + (x - bx)] = a[i + 3]; } }
    const localHints = [];
    if (this.dim === 'overworld') { const sh = g.strongholds.find(s => s.cx === cx && s.cz === cz); if (sh) buildStronghold(this, c, sh); }
    if (this.dim === 'nether') buildFortressChunk(this, c, localHints);
    if (MODS.hooks.chunkGenerate) { const w = this; const toId = (k) => typeof k === 'number' ? k : k === 'air' ? 0 : B[String(k).toUpperCase()];
      modFire('chunkGenerate', { dimension: this.dim, cx, cz, x: bx, z: bz, random: mulberry32(ihash(cx, cz, 4242, this.seed)),
        get: (lx, y, lz) => { const id = (lx < 0 || lx > 15 || lz < 0 || lz > 15 || y < 0 || y >= WH) ? 0 : d[(y * 16 + lz) * 16 + lx]; return BL[id] ? BL[id].key : 'air'; },
        set: (lx, y, lz, k) => { const id = toId(k); if (id === undefined || lx < 0 || lx > 15 || lz < 0 || lz > 15 || y < 1 || y >= WH) return; d[(y * 16 + lz) * 16 + lx] = id; },
        surfaceY: (lx, lz) => { for (let y = WH - 1; y > 0; y--) { const id = d[(y * 16 + lz) * 16 + lx]; if (SOLID[id] || BL[id].fluid) return y + 1; } return 1; },
        biome: (lx, lz) => this.dim === 'overworld' ? BIO_NAME[g.column(bx + lx, bz + lz).b] : this.dim }); }
    const e = this.edits.get(c.key); if (e) for (const [i, id] of e) d[i] = id;
    c.scanMeta();
    this.chunks.set(c.key, c);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (dx || dz) { const n = this.getChunk(cx + dx, cz + dz); if (n) n.dirty = true; }
    if (!this.hintsDone.has(c.key)) { this.hintsDone.add(c.key); const own = structuresFor(this, cx, cz); if (this.onChunkGen) this.onChunkGen(c, own.mobs.concat(localHints), cols, this); }
    return c;
  }
  genOverworld(c) {
    const cx = c.cx, cz = c.cz; const d = c.d; const g = this.gen; const seed = this.seed; const bx = cx * 16, bz = cz * 16;
    const cols = new Array(256); let maxH = 0;
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) { const col = g.column(bx + x, bz + z); cols[z * 16 + x] = col; if (col.h > maxH) maxH = col.h; }
    const ny = Math.ceil((maxH + 1) / 4) + 1; const cgrid = g.caveGrid(bx, bz, ny); const cf = new Float32Array(ny * 4 * 7);
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const wx = bx + x, wz = bz + z; const col = cols[z * 16 + x]; const h = col.h, b = col.b; g.caveColumn(cgrid, x, z, ny, cf);
      const top = Math.max(h, SEA);
      for (let y = 0; y < top; y++) {
        let id = 0;
        if (y < 5 && (y === 0 || rnd01(wx, y, wz, seed) < (5 - y) / 5)) id = B.BEDROCK; // bedrock floor, y -64 to -60
        else if (y < h) {
          const depth = h - 1 - y;
          // stone turns to deepslate below y 0, blending over y 0-8 like Minecraft
          const STONE = y < YOFF || (y < YOFF + 8 && rnd01(wx, y + 700, wz, seed) < (YOFF + 8 - y) / 8) ? B.DEEPSLATE : B.STONE;
          {
            switch (b) {
              case BIO.OCEAN: id = depth < 3 ? (h < SEA - 12 ? B.GRAVEL : B.SAND) : STONE; break;
              case BIO.BEACH: id = depth < 3 ? B.SAND : depth < 5 ? B.SANDSTONE : STONE; break;
              case BIO.DESERT: id = depth < 4 ? B.SAND : depth < 8 ? B.SANDSTONE : STONE; break;
              case BIO.SNOWY: id = depth === 0 ? B.SNOWY_GRASS : depth < 4 ? B.DIRT : STONE; break;
              case BIO.MOUNTAINS: id = h >= SEA + 72 ? (depth === 0 ? B.SNOW_BLOCK : STONE) : h >= SEA + 44 ? STONE : (depth === 0 ? B.GRASS : depth < 3 ? B.DIRT : STONE); break;
              default: id = depth === 0 ? B.GRASS : depth < 4 ? B.DIRT : STONE;
            }
            const carveOk = y > 5 && (b === BIO.OCEAN || b === BIO.BEACH ? y < h - 5 : (y < h - 1 || h > SEA + 3));
            if (carveOk && g.caveTest(y, cf, y * 7)) id = y < YOFF - 54 ? B.LAVA : 0; // caves below y -54 fill with lava
          }
        } else if (y < SEA) id = B.WATER;
        if (id) d[(y * 16 + z) * 16 + x] = id;
      }
    }
    carveRavines(this, c, cols);
    placeLavaLakes(this, c, cols);
    placeOres(this, c, cols);
    const r = mulberry32(ihash(cx, cz, 1, seed));
    // ores added by mods
    for (const [key, cnt, sz, mnY, mxY, shape, rep, biomes] of MODS.ores) {
      const id = B[String(key).toUpperCase()], repId = B[String(rep).toUpperCase()]; if (!id || !repId) continue;
      if (biomes && !biomes.some(n => BIO_NAME[cols[136].b].toLowerCase().includes(String(n).toLowerCase()))) continue;
      for (let i = 0; i < cnt; i++) {
        const q = shape === 'tri' ? (r() + r()) / 2 : shape === 'low' ? Math.min(r(), r()) : r();
        let x = r() * 16 | 0, y = mnY + (q * (mxY - mnY) | 0), z = r() * 16 | 0;
        for (let k = 0; k < sz; k++) { if (x >= 0 && x < 16 && z >= 0 && z < 16 && y > 0 && y < WH - 1) { const j = (y * 16 + z) * 16 + x; if (d[j] === repId) d[j] = id; } const q2 = r() * 6 | 0; if (q2 === 0) x++; else if (q2 === 1) x--; else if (q2 === 2) y++; else if (q2 === 3) y--; else if (q2 === 4) z++; else z--; }
      }
    }
    // small decorations
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const col = cols[z * 16 + x]; const y = col.h; if (y >= WH - 4) continue;
      const below = d[((y - 1) * 16 + z) * 16 + x], here = d[(y * 16 + z) * 16 + x]; if (here) continue;
      const wx = bx + x, wz = bz + z; const q = rnd01(wx, 7, wz, seed);
      // sugar cane: on grass, dirt or sand right next to water (Minecraft rule)
      if ((below === B.GRASS || below === B.SAND || below === B.DIRT) && x > 0 && x < 15 && z > 0 && z < 15 && q > 0.82 && q < 0.9) {
        const j = (y - 1) * 256 + z * 16 + x; if (d[j - 1] === B.WATER || d[j + 1] === B.WATER || d[j - 16] === B.WATER || d[j + 16] === B.WATER) {
          const H = 1 + (rnd01(wx, 9, wz, seed) * 3 | 0); for (let k = 0; k < H && y + k < WH - 1; k++) d[((y + k) * 16 + z) * 16 + x] = B.SUGAR_CANE; continue; } }
      if (below === B.GRASS) {
        if (col.b === BIO.PLAINS) { if (q < 0.14) d[(y * 16 + z) * 16 + x] = B.TALL_GRASS; else if (q < 0.165) d[(y * 16 + z) * 16 + x] = q < 0.152 ? B.ROSE : B.DANDELION; }
        else if (col.b === BIO.FOREST) { if (q < 0.1) d[(y * 16 + z) * 16 + x] = B.TALL_GRASS; else if (q < 0.11) d[(y * 16 + z) * 16 + x] = B.ROSE; }
        else if (q < 0.05) d[(y * 16 + z) * 16 + x] = B.TALL_GRASS;
      } else if (below === B.SAND && col.b === BIO.DESERT) {
        if (q < 0.006 && x > 0 && x < 15 && z > 0 && z < 15) { const H = 1 + (rnd01(wx, 8, wz, seed) * 3 | 0); for (let k = 0; k < H; k++) d[((y + k) * 16 + z) * 16 + x] = B.CACTUS; }
        else if (q < 0.014) d[(y * 16 + z) * 16 + x] = B.DEAD_BUSH;
      } else if (below === B.SNOWY_GRASS && q < 0.02) d[(y * 16 + z) * 16 + x] = B.TALL_GRASS;
    }
    return cols;
  }
  neighborsReady(cx, cz) { for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (!this.chunks.has(ckey(cx + dx, cz + dz))) return false; return true; }

  buildMesh(c) {
    const NB = [], NT = [];
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const n = this.getChunk(c.cx + dx, c.cz + dz); NB.push(n ? n.d : null); NT.push(n ? n.top : null); }
    const get = (x, y, z) => {
      if (y < 0) return B.BEDROCK; if (y >= WH) return 0;
      let i = 4; if (x < 0) { i -= 1; x += 16; } else if (x > 15) { i += 1; x -= 16; } if (z < 0) { i -= 3; z += 16; } else if (z > 15) { i += 3; z -= 16; }
      const a = NB[i]; return a ? a[(y * 16 + z) * 16 + x] : 0;
    };
    const topAt = (x, z) => { let i = 4; if (x < 0) { i -= 1; x += 16; } else if (x > 15) { i += 1; x -= 16; } if (z < 0) { i -= 3; z += 16; } else if (z > 15) { i += 3; z -= 16; } const t = NT[i]; return t ? t[z * 16 + x] : 0; };
    const flat = this.flatSky; const skyCol = (x, y, z) => { const t = topAt(x, z); return y >= t ? 1 : Math.max(0.05, 1 - (t - y) * 0.17); };
    // sky light also spreads sideways under overhangs (roofs, decks, trees): up to 4 blocks through open air,
    // losing a little per block, like Minecraft's light propagation
    const sky = (x, y, z) => { if (flat) return 1; let v = skyCol(x, y, z); if (v >= 1 || topAt(x, z) - y > 20) return v;
      for (let k = 0; k < 4; k++) { const dx = k === 0 ? 1 : k === 1 ? -1 : 0, dz = k === 2 ? 1 : k === 3 ? -1 : 0; for (let d = 1; d <= 6; d++) { const xx = x + dx * d, zz = z + dz * d; if (OPAQUE[get(xx, y, zz)]) break; const w = skyCol(xx, y, zz) - 0.09 * d; if (w > v) v = w; } if (v >= 0.9) break; }
      return v; };
    const bx = c.cx * 16, bz = c.cz * 16;
    const lights = [];
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const n = this.getChunk(c.cx + dx, c.cz + dz); if (!n) continue; for (const L of n.lights) { const lx = L[0] - bx, lz = L[2] - bz; if (lx > -9 && lx < 25 && lz > -9 && lz < 25) lights.push([lx + 0.5, L[1] + 0.5, lz + 0.5, L[3]]); } }
    const nL = lights.length;
    const blk = (x, y, z) => { let best = 0; for (let k = 0; k < nL; k++) { const L = lights[k]; const a = x - L[0], b = y - L[1], e = z - L[2]; const d2 = a * a + b * b + e * e; if (d2 < 64) { const v = L[3] * (1 - Math.sqrt(d2) / 8); if (v > best) best = v; } } return best; };
    const O = { p: [], u: [], l: [], s: [], w: [], i: [], n: 0 }, W = { p: [], u: [], l: [], s: [], w: [], i: [], n: 0 }, CV = { p: [], u: [], l: [], s: [], w: [], i: [], n: 0 }; const SW_TOP = [0, 0, 1, 1]; const wsw = [0, 0, 0, 0];
    const quad = (G, verts, uvs, skyL, blks, shades, flip, sway) => {
      const b = G.n;
      for (let k = 0; k < 4; k++) { G.p.push(verts[k * 3], verts[k * 3 + 1], verts[k * 3 + 2]); G.u.push(uvs[k * 2], uvs[k * 2 + 1]); G.l.push(skyL, blks[k]); G.s.push(shades[k]); G.w.push(sway ? (typeof sway === 'number' ? sway : sway[k]) : 0); }
      if (flip) G.i.push(b + 1, b + 2, b + 3, b + 1, b + 3, b); else G.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
      G.n += 4;
    };
    const vtmp = new Array(12), uvtmp = new Array(8), bl = [0, 0, 0, 0], sh = [0, 0, 0, 0], aov = [0, 0, 0, 0];
    const d = c.d; const maxY = Math.min(WH - 1, c.maxY + 1);
    for (let y = 0; y <= maxY; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const ii = (y * 16 + z) * 16 + x; const id = d[ii]; if (!id) continue; const def = BL[id];
      // block light only matters near a light source: check once per block whether any light is within reach
      let litHere = false; if (nL) { const cx0 = x + 0.5, cy0 = y + 0.5, cz0 = z + 0.5; for (let k = 0; k < nL; k++) { const L = lights[k]; const a = cx0 - L[0], b2 = cy0 - L[1], e = cz0 - L[2]; if (a * a + b2 * b2 + e * e < 90) { litHere = true; break; } } }
      // fast path: a full block buried on all six sides has nothing to draw (most of the underground)
      if (OPAQUE[id] && !def.h && y > 0 && x > 0 && x < 15 && z > 0 && z < 15 && OPAQUE[d[ii - 1]] && OPAQUE[d[ii + 1]] && OPAQUE[d[ii - 16]] && OPAQUE[d[ii + 16]] && OPAQUE[d[ii - 256]] && OPAQUE[d[ii + 256]]) continue;
      if (def.render === 'cross') {
        const uv = TILE_UV[def.texIds[0]]; const s = sky(x, y, z); const b0 = nL ? blk(x + 0.5, y + 0.5, z + 0.5) : 0;
        const P = [[0.15, 0.15, 0.85, 0.85], [0.15, 0.85, 0.85, 0.15]];
        for (const [ax, az, cx2, cz2] of P) {
          const v = [x + ax, y, z + az, x + cx2, y, z + cz2, x + cx2, y + 0.95, z + cz2, x + ax, y + 0.95, z + az];
          const u = [uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]];
          quad(O, v, u, s, [b0, b0, b0, b0], [0.95, 0.95, 0.95, 0.95], false, SW_TOP);
          const v2 = [v[3], v[4], v[5], v[0], v[1], v[2], v[9], v[10], v[11], v[6], v[7], v[8]];
          const u2 = [uv[2], uv[1], uv[0], uv[1], uv[0], uv[3], uv[2], uv[3]];
          quad(O, v2, u2, s, [b0, b0, b0, b0], [0.95, 0.95, 0.95, 0.95], false, SW_TOP);
        }
        continue;
      }
      if (def.render === 'torch') {
        const t = def.texIds[0]; const { u0, v0, px } = tileSub(t);
        const s = sky(x, y, z); const mn = [x + 7 / 16, y, z + 7 / 16], mx = [x + 9 / 16, y + 10 / 16, z + 9 / 16];
        // a torch with nothing under it hangs on a wall: its foot against the wall, leaning out (Minecraft's wall torch)
        let wx = 0, wz = 0; if ((id === B.TORCH || id === B.REDSTONE_TORCH) && !SOLID[get(x, y - 1, z)]) { for (const [a, b] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if (SOLID[get(x + a, y, z + b)]) { wx = a; wz = b; break; } }
        for (let f = 0; f < 6; f++) {
          const F = FACES[f]; for (let k = 0; k < 4; k++) { const cc = F.c[k]; vtmp[k * 3] = cc[0] ? mx[0] : mn[0]; vtmp[k * 3 + 1] = cc[1] ? mx[1] : mn[1]; vtmp[k * 3 + 2] = cc[2] ? mx[2] : mn[2]; }
          if (wx || wz) for (let k = 0; k < 4; k++) { const ly = (vtmp[k * 3 + 1] - y) / (10 / 16); vtmp[k * 3] += wx * (0.38 - ly * 0.24); vtmp[k * 3 + 2] += wz * (0.38 - ly * 0.24); vtmp[k * 3 + 1] += 0.22; }
          let ua, ub, va, vb; if (f === 2 || f === 3) { ua = u0 + 7 * px; ub = u0 + 9 * px; va = v0 - 8 * px; vb = v0 - 6 * px; } else { ua = u0 + 7 * px; ub = u0 + 9 * px; va = v0 - 16 * px; vb = v0 - 6 * px; }
          const uu = [ua, va, ub, va, ub, vb, ua, vb]; quad(O, vtmp.slice(), uu, s, [1, 1, 1, 1], [1.95, 1.95, 1.95, 1.95], false);
        }
        continue;
      }
      if (def.render === 'rail' || def.render === 'flat') { // flat (or sloped) rail quads, textured along the track; lily pads
        const sh0 = def.rail ? def.rail.shape : 'ns'; const uv = TILE_UV[def.texIds[2]]; const s = sky(x, y, z); const b0 = litHere ? blk(x + 0.5, y + 0.5, z + 0.5) : 0; const e = 1 / 16;
        const C = [[0, 1], [1, 1], [1, 0], [0, 0]];
        const map = sh0 === 'ew' || sh0 === 'asc_e' || sh0 === 'asc_w' ? (lx, lz) => [lz, lx] : sh0 === 'sw' ? (lx, lz) => [1 - lx, 1 - lz] : sh0 === 'ne' ? (lx, lz) => [lx, lz] : sh0 === 'nw' ? (lx, lz) => [1 - lx, lz] : (lx, lz) => [lx, 1 - lz];
        const hgt = (lx, lz) => e + (sh0 === 'asc_e' ? lx : sh0 === 'asc_w' ? 1 - lx : sh0 === 'asc_n' ? 1 - lz : sh0 === 'asc_s' ? lz : 0);
        for (let k = 0; k < 4; k++) { const [lx, lz] = C[k]; vtmp[k * 3] = x + lx; vtmp[k * 3 + 1] = y + hgt(lx, lz); vtmp[k * 3 + 2] = z + lz; const [uf, vf] = map(lx, lz); uvtmp[k * 2] = uv[0] + (uv[2] - uv[0]) * uf; uvtmp[k * 2 + 1] = uv[1] + (uv[3] - uv[1]) * vf; sh[k] = 1; bl[k] = b0; }
        quad(O, vtmp.slice(), uvtmp.slice(), s, bl.slice(), sh.slice(), false, 0);
        continue;
      }
      if (def.render === 'boxes') { // small models made of boxes (anvils, stairs, fences...), textured like Minecraft's block models
        const s = Math.max(sky(x, y, z), sky(x, y + 1, z)); const b0 = litHere ? blk(x + 0.5, y + 0.5, z + 0.5) : 0; const sw = def.swapXZ;
        const boxes = SHAPED[id] ? shapeBoxes(id, x, y, z, get, 'r') : def.boxes;
        for (const bx of boxes) {
          const a0 = (sw ? bx[2] : bx[0]) / 16, y0 = bx[1] / 16, c0 = (sw ? bx[0] : bx[2]) / 16, a1 = (sw ? bx[5] : bx[3]) / 16, y1 = bx[4] / 16, c1 = (sw ? bx[3] : bx[5]) / 16;
          for (let f = 0; f < 6; f++) {
            const F = FACES[f]; const edge = (F.n[0] > 0 && a1 === 1) || (F.n[0] < 0 && a0 === 0) || (F.n[1] > 0 && y1 === 1) || (F.n[1] < 0 && y0 === 0) || (F.n[2] > 0 && c1 === 1) || (F.n[2] < 0 && c0 === 0);
            if (edge && OPAQUE[get(x + F.n[0], y + F.n[1], z + F.n[2])]) continue;
            const uv = TILE_UV[bx[6] != null ? bx[6] : def.texIds[f]];
            for (let k = 0; k < 4; k++) { const cc = F.c[k]; const lx = cc[0] ? a1 : a0, ly = cc[1] ? y1 : y0, lz = cc[2] ? c1 : c0; vtmp[k * 3] = x + lx; vtmp[k * 3 + 1] = y + ly; vtmp[k * 3 + 2] = z + lz;
              let uf, vf; if (f === 0) { uf = 1 - lz; vf = ly; } else if (f === 1) { uf = lz; vf = ly; } else if (f === 2) { uf = lx; vf = 1 - lz; } else if (f === 3) { uf = lx; vf = lz; } else if (f === 4) { uf = lx; vf = ly; } else { uf = 1 - lx; vf = ly; }
              if (sw && f >= 2 && f <= 3) { const t = uf; uf = vf; vf = t; }
              uvtmp[k * 2] = uv[0] + (uv[2] - uv[0]) * uf; uvtmp[k * 2 + 1] = uv[1] + (uv[3] - uv[1]) * vf; sh[k] = F.s; bl[k] = b0; }
            quad(O, vtmp.slice(), uvtmp.slice(), edge ? sky(x + F.n[0], y + F.n[1], z + F.n[2]) : s, bl.slice(), sh.slice(), false, 0);
          }
        }
        if (FKIND[id] === 1) { // waterlogged: the block's cell is also full of still water
          const uvw = TILE_UV[TILE.water]; const topW = FKIND[get(x, y + 1, z)] === 1; const hh = topW ? 1 : FH[id];
          for (let f = 0; f < 6; f++) { const F = FACES[f]; const nb = get(x + F.n[0], y + F.n[1], z + F.n[2]); if (OPAQUE[nb] || FKIND[nb] === 1) continue;
            const ss = sky(x + F.n[0], y + F.n[1], z + F.n[2]);
            for (let k = 0; k < 4; k++) { const cc = F.c[k]; vtmp[k * 3] = x + cc[0]; vtmp[k * 3 + 1] = y + (cc[1] ? hh : 0); vtmp[k * 3 + 2] = z + cc[2]; uvtmp[k * 2] = UVC[k][0] ? uvw[2] : uvw[0]; uvtmp[k * 2 + 1] = UVC[k][1] ? uvw[3] : uvw[1]; sh[k] = F.s; bl[k] = b0; wsw[k] = !topW && cc[1] ? -1 : 0; }
            quad(W, vtmp.slice(), uvtmp.slice(), ss, bl.slice(), sh.slice(), false, wsw.slice()); }
        }
        continue;
      }
      if (def.render === 'portal') {
        const uv = TILE_UV[def.texIds[0]]; const v = def.axis === 'x' ? [x, y, z + 0.5, x + 1, y, z + 0.5, x + 1, y + 1, z + 0.5, x, y + 1, z + 0.5] : [x + 0.5, y, z + 1, x + 0.5, y, z, x + 0.5, y + 1, z, x + 0.5, y + 1, z + 1];
        const u = [uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]]; const PS = [1.6, 1.6, 1.6, 1.6]; quad(W, v, u, 1, [1, 1, 1, 1], PS, false);
        quad(W, [v[3], v[4], v[5], v[0], v[1], v[2], v[9], v[10], v[11], v[6], v[7], v[8]], u, 1, [1, 1, 1, 1], PS, false); continue;
      }
      if (def.render === 'endportal') {
        if (OPAQUE[get(x, y + 1, z)]) continue; const uv = TILE_UV[def.texIds[2]]; const yy = y + 0.75;
        quad(O, [x, yy, z + 1, x + 1, yy, z + 1, x + 1, yy, z, x, yy, z], [uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]], 1, [1, 1, 1, 1], [1.8, 1.8, 1.8, 1.8], false); continue;
      }
      const isW = def.render === 'water' || def.render === 'lava'; const isLava = def.render === 'lava';
      const fk = FKIND[id]; const waterTop = isW && FKIND[get(x, y + 1, z)] !== fk; const hereH = waterTop ? FH[id] : 1; const leafy = def.cullSame && def.render === 'cutout' && id !== B.GLASS;
      for (let f = 0; f < 6; f++) {
        const F = FACES[f]; const nx = x + F.n[0], ny = y + F.n[1], nz = z + F.n[2]; const nb = get(nx, ny, nz);
        let sideBase = 0;
        if (isW) { if (OPAQUE[nb]) continue; if (FKIND[nb] === fk) { if (F.n[1] !== 0) continue; const nbH = FKIND[get(nx, ny + 1, nz)] === fk ? 1 : FH[nb]; if (nbH >= hereH - 0.001) continue; sideBase = nbH; } }
        else { if (OPAQUE[nb] && !(def.h && f === 2)) continue; if (nb === id && def.cullSame) continue; if (def.h && f !== 2 && f !== 3 && BL[nb] && BL[nb].h) continue; }
        const s = sky(nx, ny, nz); const uv = TILE_UV[def.texIds[f]];
        for (let k = 0; k < 4; k++) {
          const cc = F.c[k]; vtmp[k * 3] = x + cc[0]; vtmp[k * 3 + 1] = y + (isW ? (cc[1] ? hereH : sideBase) : (def.h && cc[1] ? def.h : cc[1])); vtmp[k * 3 + 2] = z + cc[2];
          const kk = def.uvRot && def.uvRot[f] ? (k + 1) & 3 : k; // logs lying sideways turn their bark texture
          uvtmp[k * 2] = UVC[kk][0] ? uv[2] : uv[0]; uvtmp[k * 2 + 1] = UVC[kk][1] ? (def.h && f !== 2 && f !== 3 ? uv[1] + (uv[3] - uv[1]) * def.h : uv[3]) : uv[1];
          wsw[k] = waterTop && cc[1] ? (isLava ? -0.5 : -1) : leafy ? 0.3 : 0;
          if (!isW) { const A = F.ao[k]; const s1 = OPAQUE[get(x + A[0][0], y + A[0][1], z + A[0][2])], s2 = OPAQUE[get(x + A[1][0], y + A[1][1], z + A[1][2])], s3 = OPAQUE[get(x + A[2][0], y + A[2][1], z + A[2][2])]; aov[k] = (s1 && s2) ? 0 : 3 - (s1 + s2 + s3); }
          else aov[k] = 3;
          sh[k] = F.s * AO_LV[aov[k]];
          bl[k] = litHere ? blk(x + cc[0] + F.n[0] * 0.5, y + cc[1] + F.n[1] * 0.5, z + cc[2] + F.n[2] * 0.5) : 0;
        }
        if (LIGHT[id]) { bl[0] = bl[1] = bl[2] = bl[3] = 1; sh[0] = sh[1] = sh[2] = sh[3] = 1 + LIGHT[id]; }
        // faces looking into deep covered space (cave air under 6+ blocks, below sea level) go to the cave mesh, which is only drawn near the player or when they are underground
        const caveFace = !this.flatSky && ny < SEA && ny < topAt(nx, nz) - 6;
        quad(isW && !isLava ? W : caveFace ? CV : O, vtmp.slice(), uvtmp.slice(), s, bl.slice(), sh.slice(), aov[0] + aov[2] < aov[1] + aov[3], wsw.slice());
      }
    }
    const mk = (G, mat) => {
      if (!G.n) return null;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(G.p, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(G.u, 2));
      geo.setAttribute('light', new THREE.Float32BufferAttribute(G.l, 2)); geo.setAttribute('shade', new THREE.Float32BufferAttribute(G.s, 1)); geo.setAttribute('sway', new THREE.Float32BufferAttribute(G.w, 1));
      geo.setIndex(G.n > 65535 ? new THREE.Uint32BufferAttribute(G.i, 1) : new THREE.Uint16BufferAttribute(G.i, 1));
      geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, mat); m.position.set(bx, 0, bz); m.matrixAutoUpdate = false; m.updateMatrix(); m.layers.enable(2); if (mat === chunkMat) m.layers.enable(1); return m;
    };
    if (c.mesh) { this.scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh = null; }
    if (c.wmesh) { this.scene.remove(c.wmesh); c.wmesh.geometry.dispose(); c.wmesh = null; }
    if (c.cmesh) { this.scene.remove(c.cmesh); c.cmesh.geometry.dispose(); c.cmesh = null; }
    c.mesh = mk(O, chunkMat); c.wmesh = mk(W, waterMat); c.cmesh = mk(CV, chunkMat);
    if (c.mesh) this.scene.add(c.mesh); if (c.wmesh) this.scene.add(c.wmesh); if (c.cmesh) { c.cmesh.visible = this.caveView !== false; this.scene.add(c.cmesh); }
    c.dirty = false;
  }
  unload(c) {
    if (c.mesh) { this.scene.remove(c.mesh); c.mesh.geometry.dispose(); }
    if (c.wmesh) { this.scene.remove(c.wmesh); c.wmesh.geometry.dispose(); }
    if (c.cmesh) { this.scene.remove(c.cmesh); c.cmesh.geometry.dispose(); }
    this.chunks.delete(c.key); this.urgent.delete(c);
  }
  update(px, pz, R, budgetMs) {
    const t0 = performance.now();
    const pcx = Math.floor(px / 16), pcz = Math.floor(pz / 16);
    const ck = pcx + ',' + pcz + ',' + R;
    if (ck !== this.lastCenter) {
      this.lastCenter = ck; const list = [];
      for (let dx = -R - 2; dx <= R + 2; dx++) for (let dz = -R - 2; dz <= R + 2; dz++) { const d2 = dx * dx + dz * dz; if (d2 <= (R + 2) * (R + 2)) list.push([pcx + dx, pcz + dz, d2]); } /* every neighbour of every chunk that gets meshed, so none at the edge is left unmeshed */
      list.sort((a, b) => a[2] - b[2]); this.wanted = list;
      for (const c of [...this.chunks.values()]) { const dx = c.cx - pcx, dz = c.cz - pcz; if (dx * dx + dz * dz > (R + 3.5) * (R + 3.5)) this.unload(c); }
    }
    // urgent remeshes (player edits)
    for (const c of this.urgent) { if (c.dirty && this.chunks.has(c.key) && this.neighborsReady(c.cx, c.cz) && (c.mesh || c.wmesh || true)) this.buildMesh(c); }
    this.urgent.clear();
    let pending = 0;
    for (const [cx, cz, d2] of this.wanted) {
      if (performance.now() - t0 > budgetMs) { pending++; continue; }
      if (!this.chunks.has(ckey(cx, cz))) { try { this.generate(cx, cz); } catch (e) { worldError(e, 'generating chunk ' + cx + ',' + cz); if (!this.chunks.has(ckey(cx, cz))) { const c = new Chunk(cx, cz); if (this.dim !== 'end') for (let i = 0; i < 256 * 4; i++) c.d[i] = B.BEDROCK; this.chunks.set(ckey(cx, cz), c); } } continue; }
      if (d2 > (R + 0.5) * (R + 0.5)) continue;
      const c = this.getChunk(cx, cz);
      if (c.dirty && this.neighborsReady(cx, cz)) { try { this.buildMesh(c); } catch (e) { worldError(e, 'building chunk ' + cx + ',' + cz); c.dirty = false; } } // one broken chunk must never stall loading
    }
    return pending;
  }
  meshedAround(px, pz, r) { const pcx = Math.floor(px / 16), pcz = Math.floor(pz / 16); let ok = 0, tot = 0; for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { if (dx * dx + dz * dz > (r + 0.5) * (r + 0.5)) continue; tot++; /* the same round area update() meshes */ const c = this.getChunk(pcx + dx, pcz + dz); if (c && !c.dirty) ok++; } return ok / tot; }
}


// an error while making a chunk is logged (once per message) instead of stopping the world from loading
const worldErrSeen = new Set();
function worldError(e, what) { const k = (e && e.message) + ''; if (worldErrSeen.has(k)) return; worldErrSeen.add(k); console.error('World ' + what + ':', e); if (typeof toast === 'function' && worldErrSeen.size <= 2) toast('A world generation error was skipped: ' + k, 4); }

// ---- ravines (Minecraft canyon carver) ----
// A ravine can start in about 1 chunk in 80 and run up to ~110 blocks, so every chunk checks the starts within 7 chunks
// around it and carves only the part that crosses it. Tall and narrow (vertical radius 3x the width, like Minecraft), jagged walls,
// and lava at the bottom below y -54 (the same lava level as caves).
function ravinePath(seed, sx, sz) {
  const r = mulberry32(ihash(sx, sz, 5051, seed)); if (r() > 0.0125) return null;
  let x = sx * 16 + r() * 16, z = sz * 16 + r() * 16, y = YOFF + 10 + r() * 57; let yaw = r() * Math.PI * 2, pitch = (r() - 0.5) * 0.25;
  const len = 70 + (r() * 40 | 0), maxW = 1.8 + r() * 2.2; const pts = []; let dyaw = 0, dpitch = 0;
  const layer = []; for (let i = 0; i < WH; i++) layer.push(i === 0 || r() < 0.33 ? 1 + r() * r() : layer[i - 1]);
  for (let i = 0; i < len; i++) {
    const w = 1.2 + Math.sin(i / len * Math.PI) * maxW; pts.push([x, y, z, w, w * 3]);
    x += Math.cos(yaw) * Math.cos(pitch); z += Math.sin(yaw) * Math.cos(pitch); y += Math.sin(pitch);
    pitch *= 0.7; pitch += dpitch * 0.05; yaw += dyaw * 0.05; dpitch = dpitch * 0.8 + (r() - r()) * r() * 2; dyaw = dyaw * 0.5 + (r() - r()) * r() * 4;
  }
  return { pts, layer };
}
function carveRavines(world, c, cols) {
  const d = c.d, bx = c.cx * 16, bz = c.cz * 16, seed = world.seed;
  if (!world.ravineCache) world.ravineCache = new Map();
  for (let sx = c.cx - 7; sx <= c.cx + 7; sx++) for (let sz = c.cz - 7; sz <= c.cz + 7; sz++) {
    const k = sx * 100003 + sz; let rv = world.ravineCache.get(k); if (rv === undefined) { rv = ravinePath(seed, sx, sz); if (world.ravineCache.size > 4000) world.ravineCache.clear(); world.ravineCache.set(k, rv); }
    if (!rv) continue;
    for (const [px, py, pz, rw, rh] of rv.pts) {
      if (px + rw < bx - 1 || px - rw > bx + 16 || pz + rw < bz - 1 || pz - rw > bz + 16) continue;
      const x0 = Math.max(0, Math.floor(px - rw - bx)), x1 = Math.min(15, Math.floor(px + rw - bx)), z0 = Math.max(0, Math.floor(pz - rw - bz)), z1 = Math.min(15, Math.floor(pz + rw - bz));
      const y0 = Math.max(6, Math.floor(py - rh)), y1 = Math.min(WH - 2, Math.floor(py + rh));
      for (let lz = z0; lz <= z1; lz++) for (let lx = x0; lx <= x1; lx++) {
        const col = cols[lz * 16 + lx]; const wet = col.h <= SEA + 1; const dx = (bx + lx + 0.5 - px) / rw, dz = (bz + lz + 0.5 - pz) / rw; const h2 = dx * dx + dz * dz; if (h2 >= 1) continue;
        for (let y = y0; y <= y1; y++) {
          const dy = (y + 0.5 - py) / rh; if (h2 * rv.layer[y] + dy * dy / 6 >= 1) continue;
          if (wet && y >= col.h - 3) continue; // never break into the sea floor
          const i = (y * 16 + lz) * 16 + lx; const cur = d[i]; if (!cur || cur === B.BEDROCK || FKIND[cur] === 1) continue;
          if (y + 1 < WH && FKIND[d[i + 256]] === 1) continue;
          d[i] = y < YOFF - 54 ? B.LAVA : 0;
          if (cur === B.GRASS || cur === B.SNOWY_GRASS) continue;
          if (y > 0 && d[i - 256] === B.DIRT && y - 1 >= col.h - 2) d[i - 256] = col.b === BIO.SNOWY ? B.SNOWY_GRASS : B.GRASS;
        }
      }
    }
  }
}
// ---- lava lakes (Minecraft lake feature) ----
// Underground lava lakes in about 1 chunk in 9, rare ones on the surface (1 in 200). A lake is a blob of 4-7 overlapping
// ellipsoids in a 16x8x16 box: the bottom 4 layers are lava, the top 4 are air. It is only placed if the lava is sealed
// by solid blocks; stone lines its edges like Minecraft's lava lakes.
function placeLavaLakes(world, c, cols) {
  const d = c.d, seed = world.seed; const r = mulberry32(ihash(c.cx, c.cz, 7331, seed));
  let minH = WH; for (const col of cols) minH = Math.min(minH, col.h);
  const surface = r() < 1 / 200, under = r() < 1 / 9; let y0;
  if (surface) { const cc = cols[136]; if (cc.h <= SEA + 1 || cc.b === BIO.OCEAN || cc.b === BIO.BEACH) return; y0 = cc.h - 4; }
  else if (under) { if (minH < 40) return; y0 = 8 + (r() * Math.max(1, minH - 30) | 0); }
  else return;
  if (y0 < 5 || y0 + 8 >= WH) return;
  const mask = new Uint8Array(16 * 8 * 16); const M = (x, y, z) => (y * 16 + z) * 16 + x;
  const n = 4 + (r() * 4 | 0);
  for (let k = 0; k < n; k++) {
    const sx = r() * 6 + 3, sy = r() * 4 + 2, sz = r() * 6 + 3; const cx = r() * (16 - sx - 2) + 1 + sx / 2, cy = r() * (8 - sy - 4) + 2 + sy / 2, cz = r() * (16 - sz - 2) + 1 + sz / 2;
    for (let x = 1; x < 15; x++) for (let z = 1; z < 15; z++) for (let y = 1; y < 7; y++) { const a = (x - cx) / (sx / 2), b = (y - cy) / (sy / 2), e = (z - cz) / (sz / 2); if (a * a + b * b + e * e < 1) mask[M(x, y, z)] = 1; }
  }
  const at = (x, y, z) => d[((y0 + y) * 16 + z) * 16 + x];
  for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y < 8; y++) {
    if (mask[M(x, y, z)]) continue;
    const edge = (x < 15 && mask[M(x + 1, y, z)]) || (x > 0 && mask[M(x - 1, y, z)]) || (z < 15 && mask[M(x, y, z + 1)]) || (z > 0 && mask[M(x, y, z - 1)]) || (y < 7 && mask[M(x, y + 1, z)]) || (y > 0 && mask[M(x, y - 1, z)]);
    if (!edge) continue; const id = at(x, y, z);
    if (y >= 4 && FKIND[id]) return; if (y < 4 && !SOLID[id] && !isLavaId(id)) return;
  }
  for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y < 8; y++) if (mask[M(x, y, z)]) d[((y0 + y) * 16 + z) * 16 + x] = y < 4 ? B.LAVA : 0;
  for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y < 8; y++) {
    if (mask[M(x, y, z)]) continue;
    const edge = (x < 15 && mask[M(x + 1, y, z)]) || (x > 0 && mask[M(x - 1, y, z)]) || (z < 15 && mask[M(x, y, z + 1)]) || (z > 0 && mask[M(x, y, z - 1)]) || (y < 7 && mask[M(x, y + 1, z)]) || (y > 0 && mask[M(x, y - 1, z)]);
    const i = ((y0 + y) * 16 + z) * 16 + x;
    if (edge && y < 4 && SOLID[d[i]] && r() < 0.6) d[i] = B.STONE;
    if (surface && y >= 3 && y < 7 && mask[M(x, y + 1, z)] && d[i] === B.DIRT) d[i] = B.GRASS; // grass grows back on the exposed banks
  }
}

// ---- ores: Minecraft 1.18+ ore features ----
// [name, block, deepslate variant, tries per chunk, vein size, height shape, min y, max y, chance to skip a block touching air]
// Heights are the y values the player sees; 'tri' is Minecraft's trapezoid (a triangle peaking mid-range), 'uni' uniform.
// A fractional try count is a chance (e.g. large diamond veins in 1 chunk out of 9). Features run in Minecraft's order:
// dirt, gravel and stone blobs first, then ores, so ores also appear inside granite, diorite, andesite and tuff.
const ORE_FEATURES = [
  ['dirt', 'dirt', null, 7, 33, 'uni', 0, 160, 0],
  ['gravel', 'gravel', null, 14, 33, 'uni', -64, 320, 0],
  ['granite_upper', 'granite', null, 1 / 6, 64, 'uni', 64, 128, 0], ['granite_lower', 'granite', null, 2, 64, 'uni', 0, 60, 0],
  ['diorite_upper', 'diorite', null, 1 / 6, 64, 'uni', 64, 128, 0], ['diorite_lower', 'diorite', null, 2, 64, 'uni', 0, 60, 0],
  ['andesite_upper', 'andesite', null, 1 / 6, 64, 'uni', 64, 128, 0], ['andesite_lower', 'andesite', null, 2, 64, 'uni', 0, 60, 0],
  ['tuff', 'tuff', null, 2, 64, 'uni', -64, 0, 0],
  ['coal_upper', 'coal_ore', 'deepslate_coal_ore', 30, 17, 'uni', 136, 320, 0],
  ['coal_lower', 'coal_ore', 'deepslate_coal_ore', 20, 17, 'tri', 0, 192, 0.5],
  ['iron_upper', 'iron_ore', 'deepslate_iron_ore', 90, 9, 'tri', 80, 384, 0],
  ['iron_middle', 'iron_ore', 'deepslate_iron_ore', 10, 9, 'tri', -24, 56, 0],
  ['iron_small', 'iron_ore', 'deepslate_iron_ore', 10, 4, 'uni', -64, 72, 0],
  ['gold', 'gold_ore', 'deepslate_gold_ore', 4, 9, 'tri', -64, 32, 0.5],
  ['gold_lower', 'gold_ore', 'deepslate_gold_ore', 0.5, 9, 'uni', -64, -48, 0.5],
  ['redstone', 'redstone_ore', 'deepslate_redstone_ore', 4, 8, 'uni', -64, 15, 0],
  ['redstone_lower', 'redstone_ore', 'deepslate_redstone_ore', 8, 8, 'tri', -96, -32, 0],
  ['diamond', 'diamond_ore', 'deepslate_diamond_ore', 7, 4, 'tri', -144, 16, 0.5],
  ['diamond_medium', 'diamond_ore', 'deepslate_diamond_ore', 2, 8, 'uni', -64, -4, 0.5],
  ['diamond_large', 'diamond_ore', 'deepslate_diamond_ore', 1 / 9, 12, 'tri', -144, 16, 0.7],
  ['diamond_buried', 'diamond_ore', 'deepslate_diamond_ore', 4, 8, 'tri', -144, 16, 1],
  ['lapis', 'lapis_ore', 'deepslate_lapis_ore', 2, 7, 'tri', -32, 32, 0],
  ['lapis_buried', 'lapis_ore', 'deepslate_lapis_ore', 4, 7, 'uni', -64, 64, 1],
  ['copper', 'copper_ore', 'deepslate_copper_ore', 16, 10, 'tri', -16, 112, 0],
  ['emerald', 'emerald_ore', 'deepslate_emerald_ore', 100, 3, 'tri', -16, 480, 0, 'mountains'],
];
let ORE_IDS = null;
function oreIds() {
  if (ORE_IDS) return ORE_IDS;
  ORE_IDS = ORE_FEATURES.map(([name, ore, deep, n, size, shape, lo, hi, air, biome], k) => ({ name, o: B[ore.toUpperCase()], dp: deep ? B[deep.toUpperCase()] : 0, ore: !!deep, n, size, shape, lo: lo + YOFF, hi: hi + YOFF, air, biome, salt: 7919 * (k + 1) + 13 }));
  return ORE_IDS;
}
// Minecraft's OreFeature: a line of overlapping spheres between two points size/8 from the origin, thickest in the middle.
// Only spheres that reach the box [bx0, bx0+15] x [bz0, bz0+15] are filled (the rest of the vein belongs to other chunks).
function oreVein(rnd, ox, oy, oz, size, bx0, bz0, put) {
  const f = rnd() * Math.PI, g = size / 8; const x0 = ox + Math.sin(f) * g, x1 = ox - Math.sin(f) * g, z0 = oz + Math.cos(f) * g, z1 = oz - Math.cos(f) * g;
  const y0 = oy + (rnd() * 3 | 0) - 2, y1 = oy + (rnd() * 3 | 0) - 2;
  for (let j = 0; j < size; j++) {
    const t = j / size; const cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t, cz = z0 + (z1 - z0) * t; const rad = rnd() * size / 16; const h = ((Math.sin(Math.PI * t) + 1) * rad + 1) / 2;
    const xa = Math.max(bx0, Math.floor(cx - h)), xb = Math.min(bx0 + 15, Math.floor(cx + h)), za = Math.max(bz0, Math.floor(cz - h)), zb = Math.min(bz0 + 15, Math.floor(cz + h)); if (xa > xb || za > zb) continue;
    const ya = Math.max(1, Math.floor(cy - h)), yb = Math.min(WH - 2, Math.floor(cy + h)); const ih = 1 / h;
    for (let x = xa; x <= xb; x++) { const a = (x + 0.5 - cx) * ih, a2 = a * a; if (a2 >= 1) continue;
      for (let z = za; z <= zb; z++) { const c = (z + 0.5 - cz) * ih, ac = a2 + c * c; if (ac >= 1) continue;
        for (let y = ya; y <= yb; y++) { const bb = (y + 0.5 - cy) * ih; if (ac + bb * bb < 1) put(x, y, z); } } }
  }
}
// Every chunk rolls its own veins from its corner (like Minecraft), and also replays the neighbouring chunks' veins,
// keeping only the blocks that land inside itself, so veins crossing a chunk edge come out whole.
function placeOres(world, c, cols) {
  const d = c.d, seed = world.seed, bx = c.cx * 16, bz = c.cz * 16;
  const exposed = (lx, y, lz) => { const i = (y * 16 + lz) * 16 + lx; return d[i + 256] === 0 || d[i - 256] === 0 || (lx > 0 && d[i - 1] === 0) || (lx < 15 && d[i + 1] === 0) || (lz > 0 && d[i - 16] === 0) || (lz < 15 && d[i + 16] === 0); };
  const base = (id) => id === B.STONE || id === B.GRANITE || id === B.DIORITE || id === B.ANDESITE || id === B.TUFF || id === B.DEEPSLATE;
  for (const F of oreIds()) for (let ncx = c.cx - 1; ncx <= c.cx + 1; ncx++) for (let ncz = c.cz - 1; ncz <= c.cz + 1; ncz++) {
    const nbx = ncx * 16, nbz = ncz * 16; const rnd = mulberry32(ihash(ncx, ncz, F.salt, seed));
    let tries = Math.floor(F.n); if (rnd() < F.n - tries) tries++;
    if (!tries || (F.biome === 'mountains' && world.gen.column(nbx + 8, nbz + 8).b !== BIO.MOUNTAINS)) continue;
    const reach = F.size / 8 + F.size / 16 + 1.5;
    for (let t = 0; t < tries; t++) {
      const ox = nbx + (rnd() * 16 | 0), oz = nbz + (rnd() * 16 | 0); const q = F.shape === 'tri' ? (rnd() + rnd()) / 2 : rnd(); const oy = Math.floor(F.lo + q * (F.hi - F.lo));
      if (oy < 1 || oy >= WH - 1 || ox + reach < bx || ox - reach > bx + 15 || oz + reach < bz || oz - reach > bz + 15) continue;
      const vr = mulberry32(ihash(ox, oy, oz, F.salt ^ seed));
      oreVein(vr, ox, oy, oz, F.size, bx, bz, (x, y, z) => {
        const lx = x - bx, lz = z - bz, i = (y * 16 + lz) * 16 + lx; const cur = d[i]; let to = 0;
        if (F.ore) { if (cur === B.STONE || cur === B.GRANITE || cur === B.DIORITE || cur === B.ANDESITE) to = F.o; else if (cur === B.DEEPSLATE || cur === B.TUFF) to = F.dp; }
        else if (base(cur)) to = F.o;
        if (!to) return;
        if (F.air > 0 && exposed(lx, y, lz) && vr() < F.air) return;
        d[i] = to;
      });
    }
  }
}

// cave culling: deep cave faces are drawn only within 3 chunks of the camera, or everywhere once the camera is underground
// (below sea level with blocks overhead), like a much simpler version of Minecraft's cave culling
function updateCaveCulling(w, cam) {
  if (!w || w.flatSky) return; const cx = Math.floor(cam.x / 16), cz = Math.floor(cam.z / 16);
  const c0 = w.getChunk(cx, cz); const under = cam.y < SEA && c0 && cam.y < c0.top[(Math.floor(cam.z) & 15) * 16 + (Math.floor(cam.x) & 15)] - 2;
  w.caveView = under;
  for (const c of w.chunks.values()) if (c.cmesh) c.cmesh.visible = under || (Math.abs(c.cx - cx) <= 2 && Math.abs(c.cz - cz) <= 2);
}
