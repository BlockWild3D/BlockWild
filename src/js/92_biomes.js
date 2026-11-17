// ================= THE REST OF MINECRAFT'S OVERWORLD BIOMES =================
// Each column keeps its broad biome (c.b: what trees, spawns and structures key off) and may carry a sub-biome (c.v)
// with its own name, ground, plants and animals, the way Minecraft splits e.g. Forest into Birch / Flower Forest:
//   Ocean      -> Warm / Lukewarm / Cold / Frozen Ocean (deep versions, but no Deep Warm Ocean); River, Frozen River
//   Plains     -> Sunflower Plains, Meadow (high grassy flower meadows with bee nests)
//   Forest     -> Flower Forest, Birch Forest, Old Growth Birch Forest
//   Snowy      -> Snowy Plains, Ice Spikes
//   Taiga      -> Snowy Taiga, Old Growth Pine Taiga, Old Growth Spruce Taiga (2x2 spruces, podzol, mossy boulders)
//   Jungle     -> Bamboo Jungle, Sparse Jungle;  Savanna -> Savanna Plateau, Windswept Savanna
//   Badlands   -> Wooded Badlands, Eroded Badlands (terracotta hoodoos)
//   Mountains  -> Jagged / Frozen / Stony Peaks, Snowy Slopes, Grove, Windswept Hills / Forest / Gravelly Hills
//   Beach      -> Snowy Beach, Stony Shore
// and a new broad biome, Mushroom Fields: rare mycelium islands far out in the ocean with huge mushrooms and
// mooshrooms, where no monsters spawn.
Object.assign(BIO, { MUSHROOM_FIELDS: BIO_NAME.length }); BIO_NAME.push('Mushroom Fields');
BIO_NAME[BIO.SNOWY] = 'Snowy Plains';
const BV = {}; const VAR_NAME = [''];
for (const [k, n] of [['WARM_OCEAN', 'Warm Ocean'], ['LUKEWARM_OCEAN', 'Lukewarm Ocean'], ['COLD_OCEAN', 'Cold Ocean'], ['FROZEN_OCEAN', 'Frozen Ocean'],
  ['RIVER', 'River'], ['FROZEN_RIVER', 'Frozen River'], ['SUNFLOWER_PLAINS', 'Sunflower Plains'], ['MEADOW', 'Meadow'],
  ['FLOWER_FOREST', 'Flower Forest'], ['BIRCH_FOREST', 'Birch Forest'], ['OLD_BIRCH', 'Old Growth Birch Forest'], ['ICE_SPIKES', 'Ice Spikes'],
  ['SNOWY_TAIGA', 'Snowy Taiga'], ['OLD_PINE', 'Old Growth Pine Taiga'], ['OLD_SPRUCE', 'Old Growth Spruce Taiga'],
  ['BAMBOO_JUNGLE', 'Bamboo Jungle'], ['SPARSE_JUNGLE', 'Sparse Jungle'], ['SAVANNA_PLATEAU', 'Savanna Plateau'], ['WINDSWEPT_SAVANNA', 'Windswept Savanna'],
  ['WOODED_BADLANDS', 'Wooded Badlands'], ['ERODED_BADLANDS', 'Eroded Badlands'],
  ['JAGGED_PEAKS', 'Jagged Peaks'], ['FROZEN_PEAKS', 'Frozen Peaks'], ['STONY_PEAKS', 'Stony Peaks'], ['SNOWY_SLOPES', 'Snowy Slopes'], ['GROVE', 'Grove'],
  ['WINDSWEPT_HILLS', 'Windswept Hills'], ['WINDSWEPT_FOREST', 'Windswept Forest'], ['WINDSWEPT_GRAVELLY', 'Windswept Gravelly Hills'],
  ['SNOWY_BEACH', 'Snowy Beach'], ['STONY_SHORE', 'Stony Shore']]) { BV[k] = VAR_NAME.length; VAR_NAME.push(n); }
// the names also go on the biome list (for /locate suggestions); broad biome ids all come before them
const BIO_REAL = BIO_NAME.length; BIO_NAME.push(...VAR_NAME.slice(1));
const isRiver = (c) => c.v === BV.RIVER || c.v === BV.FROZEN_RIVER;
const FROZEN_V = (() => { let s = null; return () => s || (s = new Set([BV.FROZEN_OCEAN, BV.FROZEN_RIVER, BV.ICE_SPIKES, BV.SNOWY_SLOPES, BV.FROZEN_PEAKS, BV.JAGGED_PEAKS, BV.GROVE, BV.SNOWY_BEACH, BV.SNOWY_TAIGA])); })();
Gen.prototype.biome = function (x, z) { return this.column(x, z).b; }; // (the monster swaps in 34 looked for this)
Gen.prototype.biomeName = function (x, z) {
  const c = this.column(x, z); if (c.b === BIO.OCEAN && !isRiver(c)) {
    const deep = c.h < SEA - 28; const v = c.v === BV.WARM_OCEAN && deep ? BV.LUKEWARM_OCEAN : c.v; // there is no deep warm ocean
    return (deep ? 'Deep ' : '') + (v ? VAR_NAME[v] : 'Ocean'); }
  return c.v ? VAR_NAME[c.v] : BIO_NAME[c.b];
};
{ const _col = Gen.prototype.column; Gen.prototype.column = function (x, z) {
    const c = _col.call(this, x, z); if (c.v2) return c; c.v2 = 1; c.v = 0;
    if (!this.nV1) { this.nV1 = new Perlin(this.seed + 1301); this.nV2 = new Perlin(this.seed + 1302); this.nRv = new Perlin(this.seed + 1303); this.nMu = new Perlin(this.seed + 1304); this.nSp = new Perlin(this.seed + 1305); }
    const temp = this.nT.f2(x / 560, z / 560, 2); const vn = this.nV1.f2(x / 340, z / 340, 2), vn2 = this.nV2.f2(x / 220 + 9, z / 220 - 4, 2);
    // ---- oceans: mushroom islands far from land, then water temperature ----
    if (c.b === BIO.OCEAN) {
      const cont = this.nC.f2(x / 420, z / 420, 4); const mu = this.nMu.f2(x / 260, z / 260, 2) - Math.max(0, cont + 0.3) * 3;
      if (mu > 0.34) { const s = smoothstep(0.34, 0.44, mu); c.h = Math.round(c.h + (SEA - 3 - c.h) * s); }
      if (mu > 0.44) { c.h = SEA + 1 + Math.min(7, Math.round((mu - 0.44) * 70)); c.b = BIO.MUSHROOM_FIELDS; return c; }
      c.v = temp > 0.12 ? BV.WARM_OCEAN : temp > 0.04 ? BV.LUKEWARM_OCEAN : temp < -0.2 ? BV.FROZEN_OCEAN : temp < -0.1 ? BV.COLD_OCEAN : 0;
      return c;
    }
    // ---- rivers cut through the lowlands (not mountains) ----
    const W = 0.03 * smoothstep(SEA + 36, SEA + 16, c.h) * (c.b === BIO.MOUNTAINS ? 0 : 1);
    if (W > 0.004) { const rv = Math.abs(this.nRv.f2(x / 420, z / 420, 3));
      if (rv < W) { const t = rv / W;
        if (t < 0.55) { const depth = Math.round((1 - t / 0.55) * 4); c.h = Math.min(c.h, SEA - 1 - depth); c.b = BIO.OCEAN; c.v = temp < -0.2 ? BV.FROZEN_RIVER : BV.RIVER; return c; }
        const k = (t - 0.55) / 0.45; c.h = Math.min(c.h, Math.max(SEA, SEA + Math.round(k * k * (c.h - SEA)))); } }
    // ---- coasts ----
    const m = this.nM.f2(x / 260 + 50, z / 260 + 50, 3) - 0.08;
    if (c.h <= SEA + 2 && m >= 0.04 && c.b !== BIO.BEACH) { c.b = BIO.BEACH; c.v = BV.STONY_SHORE; return c; }
    if (c.b === BIO.SNOWY && c.h <= SEA + 1) { c.b = BIO.BEACH; c.v = BV.SNOWY_BEACH; return c; }
    switch (c.b) {
      case BIO.PLAINS: case BIO.FOREST:
        if (c.h >= SEA + 24) { c.b = BIO.PLAINS; c.v = BV.MEADOW; break; }
        if (c.b === BIO.PLAINS) { if (vn > 0.3) c.v = BV.SUNFLOWER_PLAINS; break; }
        if (vn > 0.32) c.v = BV.FLOWER_FOREST; else if (vn2 > 0.36) c.v = BV.OLD_BIRCH; else if (vn2 > 0.2) c.v = BV.BIRCH_FOREST; break;
      case BIO.SNOWY: if (vn > 0.3) c.v = BV.ICE_SPIKES; break;
      case BIO.TAIGA: if (temp < -0.2) c.v = BV.SNOWY_TAIGA; else if (vn > 0.28) c.v = temp < -0.12 ? BV.OLD_SPRUCE : BV.OLD_PINE; break;
      case BIO.JUNGLE: if (vn > 0.28) c.v = BV.BAMBOO_JUNGLE; else if (vn < -0.3) c.v = BV.SPARSE_JUNGLE; break;
      case BIO.SAVANNA:
        if (vn > 0.24) { c.h += Math.round(smoothstep(0.24, 0.32, vn) * 16); if (vn > 0.28) c.v = BV.SAVANNA_PLATEAU; }
        else if (vn < -0.3) { const s = smoothstep(-0.3, -0.4, vn); c.h += Math.round(Math.abs(this.nSp.f2(x / 26, z / 26, 2)) * 34 * s); if (vn < -0.33) c.v = BV.WINDSWEPT_SAVANNA; }
        break;
      case BIO.BADLANDS:
        if (vn > 0.2) c.v = BV.WOODED_BADLANDS;
        else if (vn < -0.25) { const s = this.nSp.f2(x / 7, z / 7, 1), f = smoothstep(-0.25, -0.33, vn); if (s > 0.3) c.h += Math.min(30, Math.round((s - 0.3) * 130 * f)); if (vn < -0.28) c.v = BV.ERODED_BADLANDS; }
        break;
      case BIO.MOUNTAINS:
        if (c.h >= SEA + 72) c.v = temp < -0.1 ? BV.FROZEN_PEAKS : temp > 0.12 ? BV.STONY_PEAKS : BV.JAGGED_PEAKS;
        else if (c.h >= SEA + 50) c.v = temp < 0 ? BV.SNOWY_SLOPES : vn2 < -0.25 ? BV.WINDSWEPT_GRAVELLY : BV.WINDSWEPT_HILLS;
        else c.v = temp < 0 ? BV.GROVE : vn2 > 0.2 ? BV.WINDSWEPT_FOREST : vn2 < -0.25 ? BV.WINDSWEPT_GRAVELLY : BV.WINDSWEPT_HILLS;
        break;
    }
    return c; }; }
// villages also stand in meadows, savannas and taigas (Minecraft); never on a river
PLACE.village.biomes.push(BIO.SAVANNA, BIO.TAIGA);
{ const _vm = villageMats; villageMats = function (b, vh) {
    if (b === BIO.SAVANNA) return { wall: B.ACACIA_PLANKS, corner: B.ACACIA_LOG, floor: B.ACACIA_PLANKS, roof: B.ACACIA_PLANKS, found: B.COBBLESTONE, post: B.ACACIA_LOG, ground: B.GRASS, road: B.DIRT_PATH, log: B.ACACIA_LOG };
    if (b === BIO.TAIGA) return { wall: B.SPRUCE_PLANKS, corner: B.SPRUCE_LOG, floor: B.SPRUCE_PLANKS, roof: B.SPRUCE_PLANKS, found: B.COBBLESTONE, post: B.SPRUCE_LOG, ground: B.GRASS, road: B.DIRT_PATH, log: B.SPRUCE_LOG };
    return _vm.apply(this, arguments); }; }
{ const _rs = regionStart; regionStart = function (world, kind, rx, rz) {
    const s = _rs.apply(this, arguments); if (s && s.col && isRiver(s.col) && kind !== 'ocean_monument') { world.startCache.set(kind + ':' + rx + ',' + rz, null); return null; }
    return s; }; }
// ---------- ground, plants and features ----------
function vTree(kind, put, x, y, z, r) { if (TREES[kind]) TREES[kind](put, x, y, z, r); }
function iceSpike(hard, x, y, z, r) {
  const big = r() < 0.06; const H = big ? 30 + (r() * 20 | 0) : 7 + (r() * 12 | 0); const R0 = big ? 3.2 : 1.6 + r();
  for (let k = -3; k < H; k++) { const rr = Math.max(0.3, R0 * (1 - Math.max(0, k) / H)); const ir = Math.ceil(rr);
    for (let dx = -ir; dx <= ir; dx++) for (let dz = -ir; dz <= ir; dz++) if (dx * dx + dz * dz <= rr * rr + 0.3) hard(x + dx, y + k, z + dz, B.PACKED_ICE); }
}
function iceberg(hard, soft, x, z, r) {
  const R = 4 + (r() * 5 | 0), H = 4 + (r() * 10 | 0), D = 4 + (r() * 6 | 0); const blue = r() < 0.5;
  for (let y = -D; y <= H; y++) { const f = y >= 0 ? 1 - y / (H + 1) : 1 - (-y) / (D + 1) * 0.6; const rr = R * Math.sqrt(Math.max(0, f)); const ir = Math.ceil(rr);
    for (let dx = -ir; dx <= ir; dx++) for (let dz = -ir; dz <= ir; dz++) { const q = rnd01(x + dx, y, z + dz, 4343); if (dx * dx + dz * dz > rr * rr + q * 2) continue;
      hard(x + dx, SEA + y, z + dz, blue && Math.abs(dx - dz) <= 1 && q < 0.7 ? B.BLUE_ICE : B.PACKED_ICE); } }
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (dx * dx + dz * dz <= 4) soft(x + dx, SEA + H + 1, z + dz, B.SNOW);
}
function bigMushroom(put, x, y, z, red, r) {
  const H = 4 + (r() * 3 | 0) + (r() < 0.08 ? 4 : 0); for (let i = 0; i < H; i++) put(x, y + i, z, B.MUSHROOM_STEM);
  if (red) { for (let yy = y + H - 3; yy <= y + H; yy++) { const top = yy === y + H, rr = top ? 1 : 2; for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (!top && Math.abs(dx) < rr && Math.abs(dz) < rr) continue; if (top || !(Math.abs(dx) === rr && Math.abs(dz) === rr)) put(x + dx, yy, z + dz, B.RED_MUSHROOM_BLOCK); } } }
  else for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) { if (Math.abs(dx) === 3 && Math.abs(dz) === 3) continue; put(x + dx, y + H, z + dz, B.BROWN_MUSHROOM_BLOCK); }
}
function boulder(hard, x, y, z, r) { const R = 1 + r() * 1.3; const ir = Math.ceil(R); for (let dx = -ir; dx <= ir; dx++) for (let dy = -1; dy <= ir; dy++) for (let dz = -ir; dz <= ir; dz++) if (dx * dx + dy * dy + dz * dz <= R * R + 0.4) hard(x + dx, y + dy, z + dz, B.MOSSY_COBBLESTONE); }
const TALLF = (k) => { const id = B[k.toUpperCase()]; return id !== undefined && BL[id].tallOther !== undefined ? [id, BL[id].tallOther] : null; };
{ const _dec = decorate; decorate = function (world, S, cx, cz) {
    const r0 = _dec.apply(this, arguments); if (world.dim !== 'overworld') return r0; const g = world.gen, seed = world.seed; const r = mulberry32(ihash(cx, cz, 5303, seed)); const bx = cx * 16, bz = cz * 16;
    const hard = (x, y, z, id) => { if (y > 0 && y < WH) S.hard.push(x, y, z, id); }, soft = (x, y, z, id) => { if (y > 0 && y < WH) S.soft.push(x, y, z, id); };
    const putH = (x, y, z, id) => hard(x, y, z, id), putT = (x, y, z, id, isLog) => (isLog ? hard : soft)(x, y, z, id);
    const vill = startNear(world, 'village', cx, cz, 2);
    // ground: one pass over the chunk's columns
    const seen = new Set();
    for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) {
      const x = bx + lx, z = bz + lz; const col = g.column(x, z); const v = col.v, h = col.h, top = h - 1; seen.add(col.b * 100 + v);
      if (g.cave(x, top, z)) continue; const q = rnd01(x, 5, z, seed + 909);
      if (col.b === BIO.OCEAN) {
        if (isRiver(col)) { if (q < 0.05) hard(x, top, z, B.CLAY); if (v === BV.FROZEN_RIVER) hard(x, SEA - 1, z, B.ICE); }
        else if (v === BV.WARM_OCEAN || v === BV.LUKEWARM_OCEAN) hard(x, top, z, B.SAND);
        else if (v === BV.COLD_OCEAN || v === BV.FROZEN_OCEAN) { hard(x, top, z, q < 0.7 ? B.GRAVEL : B.SAND); if (v === BV.FROZEN_OCEAN && h < SEA - 1 && g.nSp.f2(x / 40, z / 40, 2) > -0.12) hard(x, SEA - 1, z, B.ICE); }
        continue;
      }
      if (h <= SEA && col.b !== BIO.BEACH) continue;
      // tall badlands (hoodoos, mesas) keep their terracotta bands all the way down, not just the top 14 blocks
      if (col.b === BIO.BADLANDS && h > SEA + 16) { const shift = (ihash(0, 0, 515, seed) >>> 0) % 16, jit = (rnd01(x >> 3, 0, z >> 3, seed) * 2) | 0; for (let y = top - 14; y > Math.max(SEA - 2, top - 50); y--) if (!g.cave(x, y, z)) hard(x, y, z, B[BADLAND_BANDS[(y + shift + jit) % 16].toUpperCase()]); }
      switch (col.b === BIO.MUSHROOM_FIELDS ? -1 : v) {
        case -1: hard(x, top, z, B.MYCELIUM); hard(x, top + 1, z, 0); if (q < 0.012) soft(x, h, z, q < 0.006 ? B.RED_MUSHROOM : B.BROWN_MUSHROOM); break;
        case BV.ICE_SPIKES: hard(x, top, z, B.SNOW_BLOCK); hard(x, top + 1, z, 0); break;
        case BV.SNOWY_BEACH: soft(x, h, z, B.SNOW); break;
        case BV.STONY_SHORE: for (let k = 0; k < 4; k++) hard(x, top - k, z, q < 0.15 && k === 0 ? B.GRAVEL : B.STONE); hard(x, top + 1, z, 0); break;
        case BV.OLD_PINE: case BV.OLD_SPRUCE: { const p = g.nSp.f2(x / 9, z / 9, 2); if (p > 0.12) hard(x, top, z, B.PODZOL); else if (p < -0.25) hard(x, top, z, B.COARSE_DIRT); break; }
        case BV.BAMBOO_JUNGLE: if (g.nSp.f2(x / 8, z / 8, 2) > 0.05) hard(x, top, z, B.PODZOL); break;
        case BV.WOODED_BADLANDS: if (h > SEA + 18) { hard(x, top, z, q < 0.6 ? B.COARSE_DIRT : B.GRASS); hard(x, top - 1, z, B.DIRT); hard(x, top + 1, z, 0); } break;
        case BV.WINDSWEPT_SAVANNA: { const steep = Math.abs(g.column(x + 1, z).h - h) + Math.abs(g.column(x, z + 1).h - h) > 3; if (steep) hard(x, top, z, B.STONE); else if (q < 0.4) hard(x, top, z, B.COARSE_DIRT); break; }
        case BV.STONY_PEAKS: { const band = (top + (q * 3 | 0)) % 9; hard(x, top, z, band < 2 ? B.CALCITE : q < 0.08 ? B.GRAVEL : B.STONE); hard(x, top + 1, z, 0); break; }
        case BV.FROZEN_PEAKS: { const p = g.nSp.f2(x / 14, z / 14, 2); hard(x, top, z, p > 0.15 ? B.PACKED_ICE : p < -0.3 ? B.ICE : B.SNOW_BLOCK); break; }
        case BV.SNOWY_SLOPES: hard(x, top, z, B.SNOW_BLOCK); if (g.nSp.f2(x / 6, z / 6, 1) > 0.42) { hard(x, top, z, B.POWDER_SNOW); hard(x, top - 1, z, B.POWDER_SNOW); } break;
        case BV.GROVE: hard(x, top, z, B.SNOWY_GRASS); hard(x, top - 1, z, B.DIRT); if (q < 0.9) soft(x, h, z, B.SNOW); break;
        case BV.WINDSWEPT_GRAVELLY: if (g.nSp.f2(x / 10, z / 10, 2) > -0.1) { hard(x, top, z, B.GRAVEL); hard(x, top - 1, z, B.GRAVEL); hard(x, top + 1, z, 0); } break;
        case BV.WINDSWEPT_FOREST: case BV.WINDSWEPT_HILLS: if (h >= SEA + 44 && h < SEA + 72 && g.nSp.f2(x / 12, z / 12, 2) > 0.05) { hard(x, top, z, B.GRASS); hard(x, top - 1, z, B.DIRT); } break;
      }
    }
    if (vill) return r0;
    const has = (b, v) => seen.has(b * 100 + v); const at = () => { const x = bx + (r() * 16 | 0), z = bz + (r() * 16 | 0); const col = g.column(x, z); return { x, z, col, y: col.h }; };
    const okLand = (p, v, b) => p.col.h > SEA && (v === undefined || p.col.v === v) && (b === undefined || p.col.b === b) && !g.cave(p.x, p.col.h - 1, p.z) && p.col.h < WH - 40;
    // icebergs and frozen oceans
    if (has(BIO.OCEAN, BV.FROZEN_OCEAN) && r() < 0.06) { const p = at(); if (p.col.v === BV.FROZEN_OCEAN && p.col.h < SEA - 8) iceberg(hard, soft, p.x, p.z, r); }
    // mushroom fields: huge mushrooms
    if (has(BIO.MUSHROOM_FIELDS, 0)) for (let i = 0; i < 2; i++) { const p = at(); if (p.col.b === BIO.MUSHROOM_FIELDS && r() < 0.5) bigMushroom(putH, p.x, p.y, p.z, r() < 0.5, r); }
    // ice spikes and packed-ice patches
    if (has(BIO.SNOWY, BV.ICE_SPIKES)) { for (let i = 0; i < 2; i++) { const p = at(); if (okLand(p, BV.ICE_SPIKES) && r() < 0.6) iceSpike(hard, p.x, p.y, p.z, r); }
      if (r() < 0.3) { const p = at(); if (okLand(p, BV.ICE_SPIKES)) { const R = 2 + (r() * 3 | 0); for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) if (dx * dx + dz * dz <= R * R) hard(p.x + dx, g.column(p.x + dx, p.z + dz).h - 1, p.z + dz, B.PACKED_ICE); } } }
    // flowers: sunflower plains, flower forests and meadows
    const flowerPatch = (v, list, n, tall) => { for (let k = 0; k < n; k++) { const p = at(); if (!okLand(p, v)) continue; for (let i = 0; i < 9; i++) { const x = p.x + ((r() * 5 | 0) - 2), z = p.z + ((r() * 5 | 0) - 2); const c2 = g.column(x, z); if (c2.v !== v || c2.h <= SEA) continue; const t = tall ? TALLF(list[r() * list.length | 0]) : null; if (t) { soft(x, c2.h, z, t[0]); soft(x, c2.h + 1, z, t[1]); } else { const id = B[list[r() * list.length | 0].toUpperCase()]; if (id !== undefined) soft(x, c2.h, z, id); } } } };
    if (has(BIO.PLAINS, BV.SUNFLOWER_PLAINS)) flowerPatch(BV.SUNFLOWER_PLAINS, ['sunflower'], 3, true);
    if (has(BIO.FOREST, BV.FLOWER_FOREST)) { flowerPatch(BV.FLOWER_FOREST, ['dandelion', 'rose', 'allium', 'azure_bluet', 'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip', 'oxeye_daisy', 'cornflower', 'lily_of_the_valley'], 6, false); flowerPatch(BV.FLOWER_FOREST, ['lilac', 'rose_bush', 'peony'], 1, true); }
    if (has(BIO.PLAINS, BV.MEADOW)) { flowerPatch(BV.MEADOW, ['dandelion', 'allium', 'azure_bluet', 'cornflower', 'oxeye_daisy', 'rose'], 3, false); for (let i = 0; i < 24; i++) { const p = at(); if (okLand(p, BV.MEADOW)) { const t = TALLF('double_tall_grass'); if (t && r() < 0.3) { soft(p.x, p.y, p.z, t[0]); soft(p.x, p.y + 1, p.z, t[1]); } else soft(p.x, p.y, p.z, B.TALL_GRASS); } }
      if (r() < 0.12) { const p = at(); if (okLand(p, BV.MEADOW)) { const birch = r() < 0.5; vTree(birch ? 'birch' : 'oak', putT, p.x, p.y, p.z, r); const ny = p.y + 3; hard(p.x + 1, ny, p.z, B.BEE_NEST); S.mobs.push(['bee', p.x + 1.5, ny + 1, p.z + 0.5], ['bee', p.x + 1.5, ny + 1, p.z + 1.5]); } } }
    // trees for the sub-biomes that need them
    const treeTries = (v, n, kinds, b) => { for (let i = 0; i < n; i++) { const p = at(); if (okLand(p, v, b)) vTree(kinds[r() * kinds.length | 0], putT, p.x, p.y, p.z, r); } };
    if (has(BIO.MOUNTAINS, BV.GROVE)) treeTries(BV.GROVE, 6, ['spruce', 'spruce', 'spruce']);
    if (has(BIO.MOUNTAINS, BV.WINDSWEPT_FOREST)) treeTries(BV.WINDSWEPT_FOREST, 5, ['spruce', 'oak', 'oak']);
    if (has(BIO.MOUNTAINS, BV.WINDSWEPT_HILLS) && r() < 0.5) treeTries(BV.WINDSWEPT_HILLS, 1, ['spruce', 'oak']);
    if (has(BIO.SAVANNA, BV.WINDSWEPT_SAVANNA)) treeTries(BV.WINDSWEPT_SAVANNA, 1, ['acacia']);
    if (has(BIO.SAVANNA, BV.SAVANNA_PLATEAU)) treeTries(BV.SAVANNA_PLATEAU, 2, ['acacia', 'oak']);
    if (has(BIO.BADLANDS, BV.WOODED_BADLANDS)) for (let i = 0; i < 4; i++) { const p = at(); if (okLand(p, BV.WOODED_BADLANDS) && p.y > SEA + 18) vTree('oak', putT, p.x, p.y, p.z, r); }
    for (const v of [BV.OLD_PINE, BV.OLD_SPRUCE]) if (has(BIO.TAIGA, v)) { for (let i = 0; i < 3; i++) { const p = at(); if (okLand(p, v)) vTree('mega_spruce', putT, p.x, p.y, p.z, r); }
      if (r() < 0.25) { const p = at(); if (okLand(p, v)) boulder(hard, p.x, p.y, p.z, r); } }
    if (has(BIO.JUNGLE, BV.BAMBOO_JUNGLE)) for (let i = 0; i < 40; i++) { const p = at(); if (!okLand(p, BV.BAMBOO_JUNGLE)) continue; const H = 6 + (r() * 10 | 0); for (let k = 0; k < H; k++) soft(p.x, p.y + k, p.z, B.BAMBOO); }
    return r0; }; }
// ---------- animals by sub-biome (added with the chunk, like Minecraft) ----------
{ const _ocg = onChunkGen; onChunkGen = function (c, hints, cols, w) {
    _ocg(c, hints, cols, w); if (w !== world || !cols || w.dim !== 'overworld' || mcNatOn()) return;
    const lx = 3 + (Math.random() * 10 | 0), lz = 3 + (Math.random() * 10 | 0); const col = w.gen.column(c.cx * 16 + lx, c.cz * 16 + lz); let tab = null, n = 3;
    if (col.b === BIO.MUSHROOM_FIELDS) { if (Math.random() < 0.3) { tab = { mooshroom: 1 }; n = 4 + (Math.random() * 4 | 0); } }
    else if (Math.random() > 0.08) return;
    else switch (col.v) {
      case BV.ICE_SPIKES: tab = { rabbit: 2, polar_bear: 1 }; break;
      case BV.FROZEN_OCEAN: tab = { polar_bear: 1 }; n = 2; break;
      case BV.MEADOW: tab = { rabbit: 2, sheep: 2, donkey: 1 }; break;
      case BV.GROVE: tab = { wolf: 1, fox: 2, rabbit: 2 }; break;
      case BV.SNOWY_SLOPES: case BV.JAGGED_PEAKS: case BV.FROZEN_PEAKS: tab = { goat: 1, rabbit: col.v === BV.SNOWY_SLOPES ? 1 : 0 }; break;
      case BV.SNOWY_TAIGA: tab = { wolf: 1, fox: 2, rabbit: 2 }; break;
      case BV.OLD_PINE: case BV.OLD_SPRUCE: tab = { wolf: 1, rabbit: 2, fox: 2 }; break;
      case BV.BAMBOO_JUNGLE: tab = { panda: 2, parrot: 1, ocelot: 1 }; n = 2; break;
      case BV.WINDSWEPT_HILLS: case BV.WINDSWEPT_GRAVELLY: case BV.WINDSWEPT_FOREST: tab = { llama: 1, sheep: 2, cow: 1 }; break;
      case BV.SAVANNA_PLATEAU: case BV.WINDSWEPT_SAVANNA: tab = { horse: 1, llama: 1, armadillo: 1 }; break;
      case BV.FLOWER_FOREST: case BV.BIRCH_FOREST: case BV.OLD_BIRCH: tab = { rabbit: 1, sheep: 2, pig: 1 }; break;
    }
    if (!tab) return; const type = pickWeighted(tab); if (!MOBS[type]) return;
    for (let i = 0; i < n; i++) { const x = c.cx * 16 + clamp(lx + (Math.random() * 5 | 0) - 2, 0, 15), z = c.cz * 16 + clamp(lz + (Math.random() * 5 | 0) - 2, 0, 15); const y = type === 'polar_bear' && col.v === BV.FROZEN_OCEAN ? SEA : surfaceSpawnY(x, z); if (y >= SEA && freeAt(x, y, z, 2)) spawnMob(type, x + 0.5, y, z + 0.5); }
  }; world && (world.onChunkGen = onChunkGen); }
// ---------- monsters: none in mushroom fields; strays in the frozen sub-biomes ----------
{ const _sm = spawnMob; spawnMob = function (type, x, y, z, opts) {
    if (S.natSpawn && !S.mcNat && world && world.dim === 'overworld' && MOBS[type]) {
      const col = world.gen.column(Math.floor(x), Math.floor(z));
      if (col.b === BIO.MUSHROOM_FIELDS && MOBS[type].kind !== 'passive') return null;
      if (type === 'skeleton' && FROZEN_V().has(col.v) && world.skyAt(Math.floor(x), Math.floor(y + 1), Math.floor(z)) >= 1 && Math.random() < 0.8) type = 'stray';
    }
    return _sm(type, x, y, z, opts); }; }
