// ================= NEW BIOMES AND STRUCTURES (Minecraft) =================
// Biomes: Jungle (tall jungle trees, vines, big 2x2 trees, parrots, ocelots, pandas), Swamp (vine-hung oaks, lily
// pads, slimes at night, witch huts), Taiga (spruce woods, wolves, foxes), Dark Forest (dense 2x2 dark oaks) and
// Savanna (acacias, horses, llamas, armadillos). Structures: mineshafts (rails, supports, cobwebs, cave spider
// spawners, chest minecarts), swamp huts, igloos, jungle temples and shipwrecks. Vines are climbable; cobwebs slow
// you down a lot.
Object.assign(BIO, { JUNGLE: 7, SWAMP: 8, TAIGA: 9, DARK_FOREST: 10, SAVANNA: 11 });
BIO_NAME.push('Jungle', 'Swamp', 'Taiga', 'Dark Forest', 'Savanna');
{ const _col = Gen.prototype.column; Gen.prototype.column = function (x, z) {
    const k = x * 100003 + z; const cached = this.colCache.get(k); if (cached) return cached;
    const c = _col.call(this, x, z); if (c.b !== BIO.FOREST && c.b !== BIO.PLAINS && c.b !== BIO.SNOWY) return c;
    const temp = this.nT.f2(x / 560, z / 560, 2), moist = this.nW.f2(x / 480, z / 480, 2);
    if (c.b === BIO.SNOWY) { if (temp > -0.3 && moist > -0.05) c.b = BIO.TAIGA; return c; }
    if (temp < -0.08) c.b = moist > -0.05 ? BIO.TAIGA : c.b;
    else if (temp > 0.1 && moist > 0.12) c.b = BIO.JUNGLE;
    else if (temp > 0.07 && moist < 0.04) c.b = BIO.SAVANNA;
    else if (moist > 0.15 && c.h <= SEA + 7) c.b = BIO.SWAMP;
    else if (moist > 0.22) c.b = BIO.DARK_FOREST;
    return c;
  }; }
// ---------- trees for the new biomes ----------
function leafBall(soft, x, y, z, r, lv, seed, cut = 0.5) { for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { if (dx * dx + dz * dz > r * r + 1) continue; if ((Math.abs(dx) === r || Math.abs(dz) === r) && rnd01(x + dx, y, z + dz, seed) < cut) continue; soft(x + dx, y, z + dz, lv); } }
function decorate(world, S, cx, cz) {
  const g = world.gen, seed = world.seed; const r = mulberry32(ihash(cx, cz, 4711, seed)); const bx = cx * 16, bz = cz * 16;
  const hard = (x, y, z, id) => { if (y > 0 && y < WH) S.hard.push(x, y, z, id); }, soft = (x, y, z, id) => { if (y > 0 && y < WH) S.soft.push(x, y, z, id); };
  if (startNear(world, 'village', cx, cz, 2)) return;
  const b0 = g.column(bx + 8, bz + 8).b; const tries = { [BIO.JUNGLE]: 14, [BIO.DARK_FOREST]: 10, [BIO.TAIGA]: 7, [BIO.SAVANNA]: 2, [BIO.SWAMP]: 3 }[b0] || 0;
  for (let a = 0; a < tries; a++) {
    const lx = r() * 16 | 0, lz = r() * 16 | 0; const x = bx + lx, z = bz + lz; const col = g.column(x, z); const y0 = col.h; const q = r(), hh = r();
    if (col.h <= SEA || col.h > WH - 34 || g.cave(x, y0 - 1, z)) continue;
    if (col.b === BIO.JUNGLE) {
      if (q < 0.12) { const H = 18 + (hh * 12 | 0); for (let y = 0; y < H; y++) for (const [ox, oz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) hard(x + ox, y0 + y, z + oz, B.JUNGLE_LOG); for (let y = H - 2; y <= H + 1; y++) leafBall(soft, x, y0 + y, z, y > H ? 2 : 4, B.JUNGLE_LEAVES, seed); for (let y = 2; y < H - 3; y++) for (const [ox, oz] of [[-1, 0], [2, 1], [0, -1], [1, 2]]) if (rnd01(x + ox, y0 + y, z + oz, seed) < 0.6) soft(x + ox, y0 + y, z + oz, B.VINE); }
      else if (q < 0.55) { const H = 5 + (hh * 6 | 0); for (let y = 0; y < H; y++) hard(x, y0 + y, z, B.JUNGLE_LOG); for (let y = H - 2; y <= H + 1; y++) leafBall(soft, x, y0 + y, z, y >= H ? 1 : 2, B.JUNGLE_LEAVES, seed); for (let y = H - 4; y < H; y++) for (const [ox, oz] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) if (rnd01(x + ox, y0 + y, z + oz, seed) < 0.5) soft(x + ox, y0 + y, z + oz, B.VINE); }
      else { soft(x, y0, z, B.JUNGLE_LOG); leafBall(soft, x, y0, z, 2, B.JUNGLE_LEAVES, seed, 0.6); leafBall(soft, x, y0 + 1, z, 1, B.JUNGLE_LEAVES, seed); } // bush
    } else if (col.b === BIO.DARK_FOREST) {
      if (q > 0.85) continue; const H = 6 + (hh * 3 | 0); for (let y = 0; y < H; y++) for (const [ox, oz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) hard(x + ox, y0 + y, z + oz, B.DARK_OAK_LOG);
      for (let y = H - 2; y <= H + 1; y++) for (let dx = -3; dx <= 4; dx++) for (let dz = -3; dz <= 4; dz++) { const ex = Math.max(Math.abs(dx - 0.5) - (y > H ? 1.5 : 3), Math.abs(dz - 0.5) - (y > H ? 1.5 : 3)); if (ex > 0.6 || (ex > -0.4 && rnd01(x + dx, y, z + dz, seed) < 0.5)) continue; soft(x + dx, y0 + y, z + dz, B.DARK_OAK_LEAVES); }
    } else if (col.b === BIO.TAIGA) {
      if (q > 0.75) continue; const H = 7 + (hh * 5 | 0); for (let y = 0; y < H; y++) soft(x, y0 + y, z, B.SPRUCE_LOG);
      for (let y = 2; y <= H; y++) { const rr = Math.max(0, Math.floor((H - y) / 2.2)) % 3 + (y < H - 1 ? 1 : 0); for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (Math.abs(dx) + Math.abs(dz) > rr + 1) continue; if (dx || dz) soft(x + dx, y0 + y, z + dz, B.SPRUCE_LEAVES); } } soft(x, y0 + H, z, B.SPRUCE_LEAVES); soft(x, y0 + H + 1, z, B.SPRUCE_LEAVES);
    } else if (col.b === BIO.SAVANNA) {
      if (q > 0.6) continue; const H = 5 + (hh * 3 | 0); const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][r() * 4 | 0]; let tx = x, tz = z;
      for (let y = 0; y < H; y++) { if (y >= H - 3) { tx += dir[0]; tz += dir[1]; } hard(tx, y0 + y, tz, B.ACACIA_LOG); }
      for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) { if (Math.abs(dx) + Math.abs(dz) > 4) continue; soft(tx + dx, y0 + H, tz + dz, B.ACACIA_LEAVES); if (Math.abs(dx) + Math.abs(dz) <= 2) soft(tx + dx, y0 + H + 1, tz + dz, B.ACACIA_LEAVES); }
    } else if (col.b === BIO.SWAMP) {
      const H = 5 + (hh * 2 | 0); for (let y = 0; y < H; y++) hard(x, y0 + y, z, B.LOG); for (let y = H - 2; y <= H; y++) leafBall(soft, x, y0 + y, z, y === H ? 2 : 3, B.LEAVES, seed);
      for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) if ((Math.abs(dx) === 3 || Math.abs(dz) === 3) && rnd01(x + dx, y0, z + dz, seed) < 0.35) for (let k = 1; k <= 3; k++) soft(x + dx, y0 + H - 2 - k, z + dz, B.VINE);
    }
  }
  // lily pads on swamp water
  if (b0 === BIO.SWAMP) for (let a = 0; a < 6; a++) { const x = bx + (r() * 16 | 0), z = bz + (r() * 16 | 0); const col = g.column(x, z); if (col.h <= SEA && col.h >= SEA - 3) soft(x, SEA + 1, z, B.LILY_PAD); }
}
{ const _sf = structuresFor; structuresFor = function (world, cx, cz) {
    const S = _sf(world, cx, cz); if (S.decorated2 || world.dim !== 'overworld') return S; S.decorated2 = true;
    decorate(world, S, cx, cz); placeNewStructures(world, S, cx, cz); return S;
  }; }
// ---------- small structures: swamp huts, igloos, jungle temples, shipwrecks ----------
Object.assign(PLACE, {
  swamp_hut: { spacing: 32, sep: 8, salt: 14358, biomes: [BIO.SWAMP] }, igloo: { spacing: 32, sep: 8, salt: 14359, biomes: [BIO.SNOWY, BIO.TAIGA] },
  jungle_temple: { spacing: 32, sep: 8, salt: 14360, biomes: [BIO.JUNGLE] }, shipwreck: { spacing: 24, sep: 4, salt: 165745296, biomes: [BIO.OCEAN, BIO.BEACH] },
});
Object.assign(STRUCT_NAMES, { swamp_hut: 'swamp_hut', witch_hut: 'swamp_hut', igloo: 'igloo', jungle_temple: 'jungle_temple', jungle_pyramid: 'jungle_temple', shipwreck: 'shipwreck', mineshaft: 'mineshaft' });
Object.assign(LOOT, {
  igloo: [['golden_apple', 1, 1, 1], ['apple', 1, 3, 0.6], ['coal', 1, 4, 0.5], ['gold_nugget', 1, 3, 0.5], ['stone_axe', 1, 1, 0.2], ['rotten_flesh', 1, 2, 0.3], ['wheat', 2, 3, 0.4], ['emerald', 1, 1, 0.2]],
  jungle_temple: [['diamond', 1, 3, 0.25], ['emerald', 1, 3, 0.4], ['gold_ingot', 2, 7, 0.6], ['iron_ingot', 1, 5, 0.6], ['bone', 4, 6, 0.6], ['rotten_flesh', 3, 7, 0.6], ['saddle', 1, 1, 0.2], ['iron_horse_armor', 1, 1, 0.1], ['golden_horse_armor', 1, 1, 0.1], ['diamond_horse_armor', 1, 1, 0.05], ['enchanted_book', 1, 1, 0.2]],
  shipwreck: [['iron_ingot', 1, 5, 0.6], ['gold_ingot', 1, 5, 0.4], ['emerald', 1, 5, 0.4], ['diamond', 1, 1, 0.1], ['paper', 1, 12, 0.5], ['coal', 2, 8, 0.4], ['carrot', 4, 8, 0.4], ['potato', 2, 6, 0.4], ['wheat', 8, 21, 0.4], ['rotten_flesh', 5, 24, 0.3], ['tnt', 1, 2, 0.15], ['enchanted_book', 1, 1, 0.1], ['leather_helmet', 1, 1, 0.15]],
  mineshaft: [['rail', 4, 8, 0.6], ['torch', 1, 16, 0.5], ['bread', 1, 3, 0.6], ['iron_ingot', 1, 5, 0.4], ['gold_ingot', 1, 3, 0.3], ['redstone', 4, 9, 0.3], ['lapis_lazuli', 4, 9, 0.3], ['diamond', 1, 2, 0.15], ['coal', 3, 8, 0.4], ['powered_rail', 1, 4, 0.2], ['detector_rail', 1, 4, 0.15], ['activator_rail', 1, 4, 0.15], ['enchanted_book', 1, 1, 0.1], ['golden_apple', 1, 1, 0.08], ['iron_pickaxe', 1, 1, 0.05]],
});
function placeNewStructures(world, S, cx, cz) {
  const g = world.gen; const bx = cx * 16, bz = cz * 16; const r = mulberry32(ihash(cx, cz, 5151, world.seed));
  const hard = (x, y, z, id) => { if (y > 0 && y < WH) S.hard.push(x, y, z, id); };
  const chest = (x, y, z, loot) => { hard(x, y, z, B.CHEST); S.kinds.push(['chest:' + loot, x, z, y]); };
  if (startNear(world, 'village', cx, cz, 2)) return;
  if (startNear(world, 'swamp_hut', cx, cz, 0)) { // a spruce hut on log stilts with a witch and a black cat
    const x0 = bx + 4, z0 = bz + 4; let fy = SEA + 3; for (let x = x0; x < x0 + 7; x++) for (let z = z0; z < z0 + 9; z++) fy = Math.max(fy, g.column(x, z).h + 2);
    for (const [x, z] of [[x0, z0], [x0 + 6, z0], [x0, z0 + 8], [x0 + 6, z0 + 8]]) for (let y = g.column(x, z).h - 1; y < fy; y++) hard(x, y, z, B.SPRUCE_LOG);
    for (let x = x0; x < x0 + 7; x++) for (let z = z0; z < z0 + 9; z++) { hard(x, fy, z, B.PLANKS); for (let y = fy + 1; y <= fy + 5; y++) { const wall = (x === x0 || x === x0 + 6 || z === z0 + 2 || z === z0 + 8) && z >= z0 + 2; hard(x, y, z, y === fy + 5 ? B.SPRUCE_LOG : wall && y <= fy + 3 ? ((y === fy + 2 && (x === x0 + 3 || z === z0 + 5)) ? 0 : B.PLANKS) : 0); } }
    hard(x0 + 3, fy + 1, z0 + 2, 0); hard(x0 + 3, fy + 2, z0 + 2, 0); hard(x0 + 5, fy + 1, z0 + 7, B.CAULDRON); hard(x0 + 1, fy + 1, z0 + 7, B.CRAFTING_TABLE);
    S.mobs.push(['witch', x0 + 3.5, fy + 1, z0 + 5.5]); S.mobs.push(['cat', x0 + 2.5, fy + 1, z0 + 4.5]); S.kinds.push(['swamp_hut', x0 + 3, z0 + 4]);
  } else if (startNear(world, 'igloo', cx, cz, 0)) { // snow dome with an ice window, bed, table and furnace
    const xc = bx + 8, zc = bz + 8; const fy = g.column(xc, zc).h;
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) { const d = Math.hypot(x, z); if (d > 3.6) continue; for (let y = 0; y <= 4; y++) { const shell = Math.hypot(x, z, y * 1.1) ; const id = shell > 3.0 && shell <= 4.0 ? B.SNOW_BLOCK : shell <= 3.0 ? 0 : -1; if (id >= 0) hard(xc + x, fy + y, zc + z, id); } hard(xc + x, fy - 1, zc + z, B.SNOW_BLOCK); }
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) if (Math.hypot(x, z) < 2.9) hard(xc + x, fy, zc + z, B.WOOL);
    hard(xc + 3, fy + 1, zc, B.ICE); hard(xc - 3, fy + 1, zc, B.ICE); hard(xc, fy + 1, zc + 3, 0); hard(xc, fy + 2, zc + 3, 0); hard(xc, fy + 1, zc + 4, 0); hard(xc, fy + 2, zc + 4, 0);
    hard(xc - 2, fy + 1, zc - 1, B.CRAFTING_TABLE); hard(xc + 2, fy + 1, zc - 1, B.FURNACE); hard(xc, fy + 3, zc - 1, B.TORCH); hard(xc - 1, fy + 1, zc - 2, B.BED_HEAD); hard(xc - 1, fy + 1, zc - 1, B.BED_FOOT);
    chest(xc + 1, fy + 1, zc - 2, 'igloo'); S.kinds.push(['igloo', xc, zc]);
  } else if (startNear(world, 'jungle_temple', cx, cz, 0)) { // mossy stone temple: 3 levels, hidden chests
    const x0 = bx + 2, z0 = bz + 1; let fy = 0; for (let x = x0; x < x0 + 12; x += 3) for (let z = z0; z < z0 + 15; z += 3) fy = Math.max(fy, g.column(x, z).h); fy -= 1;
    const stone = (x, y, z) => rnd01(x, y, z, world.seed) < 0.45 ? B.MOSSY_COBBLESTONE : B.COBBLESTONE;
    for (let x = x0; x < x0 + 12; x++) for (let z = z0; z < z0 + 15; z++) { for (let y = fy - 4; y < fy; y++) hard(x, y, z, stone(x, y, z)); for (let y = fy; y <= fy + 10; y++) { const edge = x === x0 || x === x0 + 11 || z === z0 || z === z0 + 14; const lvl = y - fy; const inset = lvl >= 7 ? 2 : lvl >= 4 ? 1 : 0; const ix = x - x0, iz = z - z0; const inside = ix >= inset && ix <= 11 - inset && iz >= inset && iz <= 14 - inset; if (!inside) { hard(x, y, z, 0); continue; } const shell = ix === inset || ix === 11 - inset || iz === inset || iz === 14 - inset || lvl === 0 || lvl === 3 || lvl === 6 || lvl === 9; hard(x, y, z, shell ? stone(x, y, z) : 0); } }
    for (const lvl of [1, 2]) hard(x0 + 5, fy + lvl, z0, 0), hard(x0 + 6, fy + lvl, z0, 0);
    for (let y = fy - 3; y < fy; y++) for (let x = x0 + 3; x <= x0 + 8; x++) for (let z = z0 + 4; z <= z0 + 10; z++) hard(x, y, z, 0);
    hard(x0 + 5, fy, z0 + 3, 0); hard(x0 + 5, fy - 1, z0 + 3, 0); chest(x0 + 4, fy - 3, z0 + 9, 'jungle_temple'); chest(x0 + 8, fy - 3, z0 + 5, 'jungle_temple');
    for (let y = fy + 1; y <= fy + 8; y += 3) hard(x0 + 2, y, z0 + 2, B.TORCH);
    S.kinds.push(['jungle_temple', x0 + 6, z0 + 7]);
  } else if (startNear(world, 'shipwreck', cx, cz, 0)) { // a sunken ship on the sea floor
    const xc = bx + 8, zc = bz + 8; const floor = g.column(xc, zc).h; if (floor < SEA - 1) {
      const L = 18, along = r() < 0.5; const tilt = r() < 0.3; const at = (i, j) => along ? [xc - 9 + i, zc + j] : [xc + j, zc - 9 + i];
      for (let i = 0; i < L; i++) { const w = i < 3 ? 1 : i > L - 4 ? 2 : 3; for (let j = -w; j <= w; j++) { const [x, z] = at(i, j); const y0 = floor + (tilt ? Math.max(0, j) : 0); hard(x, y0, z, B.PLANKS); if (Math.abs(j) === w) for (let y = 1; y <= 3; y++) if (rnd01(x, y0 + y, z, world.seed) < 0.8) hard(x, y0 + y, z, B.PLANKS); else for (let y = 1; y <= 3; y++) hard(x, y0 + y, z, B.WATER); } }
      for (let y = 1; y <= 9; y++) { const [x, z] = at(8, 0); if (y < 7 || r() < 0.6) hard(x, floor + y, z, B.SPRUCE_LOG); }
      const [cx1, cz1] = at(3, 0), [cx2, cz2] = at(14, 0), [cx3, cz3] = at(9, 1); chest(cx1, floor + 1, cz1, 'shipwreck'); chest(cx2, floor + 1, cz2, 'shipwreck'); if (r() < 0.5) chest(cx3, floor + 1, cz3, 'shipwreck');
      S.kinds.push(['shipwreck', xc, zc]); }
  }
}
// chests in the new structures get loot when first opened (same as other structure chests)
{ const _oc = openChest; openChest = function (x, y, z) {
    const k = x + ',' + y + ',' + z; if (!world.chestInv.has(k)) { const S2 = structuresFor(world, x >> 4, z >> 4); const lists = [S2]; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) lists.push(structuresFor(world, (x >> 4) + dx, (z >> 4) + dz));
      for (const L of lists) for (const kk of (L.kinds || [])) if (String(kk[0]).startsWith('chest:') && kk[1] === x && kk[2] === z && kk[3] === y) { world.chestInv.set(k, rollLoot(kk[0].slice(6), ihash(x, y, z, world.seed))); break; } }
    return _oc.apply(this, arguments);
  }; }
// ---------- mineshafts: a big tunnel network, built chunk by chunk from a layout made once per start ----------
const MINESHAFT_CHANCE = 0.004;
function mineshaftLayout(world, scx, scz) {
  const key = scx + ',' + scz; world.msCache = world.msCache || new Map(); if (world.msCache.has(key)) return world.msCache.get(key);
  const r = mulberry32(ihash(scx, scz, 7777, world.seed)); const parts = [];
  const y0 = YOFF + 10 + (r() * 40 | 0); const ox = scx * 16 + 8, oz = scz * 16 + 8;
  parts.push({ t: 'room', x0: ox - 4, z0: oz - 4, x1: ox + 4, z1: oz + 4, y: y0 });
  const corridor = (x, y, z, dx, dz, depth) => {
    if (depth > 6 || parts.length > 80) return; const n = 2 + (r() * 5 | 0); const len = n * 5;
    const ex = x + dx * len, ez = z + dz * len; parts.push({ t: 'cor', x, z, y, dx, dz, len, rails: r() < 0.7, cobweb: r() < 0.25, spawner: r() < 0.05, cartAt: r() < 0.15 ? 2 + (r() * (len - 4) | 0) : -1 });
    // at the end: turn, branch or cross
    const k = r(); const ny = y + (r() < 0.15 ? (r() < 0.5 ? 4 : -4) : 0);
    if (k < 0.4) { parts.push({ t: 'cross', x: ex, z: ez, y }); corridor(ex + dx * 2, y, ez + dz * 2, dx, dz, depth + 1); corridor(ex + dz * 2, y, ez + dx * 2, dz, dx, depth + 1); corridor(ex - dz * 2, y, ez - dx * 2, -dz, -dx, depth + 1); }
    else if (k < 0.75) { parts.push({ t: 'cross', x: ex, z: ez, y }); corridor(ex + (r() < 0.5 ? dz : -dz) * 2, y, ez + (r() < 0.5 ? dx : -dx) * 2, r() < 0.5 ? dz : -dz, r() < 0.5 ? dx : -dx, depth + 1); }
    else corridor(ex + dx, ny === y ? y : y, ez + dz, dx, dz, depth + 1);
  };
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (r() < 0.85) corridor(ox + dx * 5, y0, oz + dz * 5, dx, dz, 0);
  const L = { parts, y0 }; if (world.msCache.size > 200) world.msCache.clear(); world.msCache.set(key, L); return L;
}
function mineshaftStartsNear(world, cx, cz) { const out = []; for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) { const sx = cx + dx, sz = cz + dz; if (rnd01(sx, sz, 31337, world.seed) < MINESHAFT_CHANCE && world.gen.column(sx * 16 + 8, sz * 16 + 8).b !== BIO.OCEAN) out.push([sx, sz]); } return out; }
function buildMineshaftChunk(world, c) {
  const starts = mineshaftStartsNear(world, c.cx, c.cz); if (!starts.length) return;
  const bx = c.cx * 16, bz = c.cz * 16, d = c.d; const inC = (x, z) => x >= bx && x < bx + 16 && z >= bz && z < bz + 16;
  const set = (x, y, z, id, onlyAir) => { if (!inC(x, z) || y < 1 || y >= WH) return; const j = (y * 16 + (z - bz)) * 16 + (x - bx); if (d[j] === B.BEDROCK) return; if (onlyAir && d[j] && !FKIND[d[j]]) return; d[j] = id; };
  const get = (x, y, z) => inC(x, z) ? d[(y * 16 + (z - bz)) * 16 + (x - bx)] : 1;
  const RAIL_NS = RAIL_ID.rail.ns[0], RAIL_EW = RAIL_ID.rail.ew[0];
  for (const [sx, sz] of starts) { const L = mineshaftLayout(world, sx, sz);
    for (const p of L.parts) {
      if (p.t === 'room') { for (let x = p.x0; x <= p.x1; x++) for (let z = p.z0; z <= p.z1; z++) { set(x, p.y - 1, z, B.DIRT); for (let y = p.y; y < p.y + 5; y++) set(x, y, z, 0); } continue; }
      if (p.t === 'cross') { for (let x = p.x - 1; x <= p.x + 1; x++) for (let z = p.z - 1; z <= p.z + 1; z++) { if (!SOLID[get(x, p.y - 1, z)]) set(x, p.y - 1, z, B.PLANKS); for (let y = p.y; y < p.y + 3; y++) set(x, y, z, 0); } for (const [x, z] of [[p.x - 1, p.z - 1], [p.x + 1, p.z - 1], [p.x - 1, p.z + 1], [p.x + 1, p.z + 1]]) { set(x, p.y, z, B.PLANKS); set(x, p.y + 1, z, B.PLANKS); } continue; }
      const { x, z, y, dx, dz, len } = p; const sx2 = dz, sz2 = dx; // sideways
      for (let i = 0; i < len; i++) { const cxp = x + dx * i, czp = z + dz * i;
        for (let s = -1; s <= 1; s++) { const X = cxp + sx2 * s, Z = czp + sz2 * s; if (!SOLID[get(X, y - 1, Z)] || FKIND[get(X, y - 1, Z)]) set(X, y - 1, Z, B.PLANKS); for (let h = 0; h < 3; h++) set(X, y + h, Z, 0); }
        if (p.rails && rnd01(cxp, y, czp, world.seed) < 0.85) set(cxp, y, czp, dx ? RAIL_EW : RAIL_NS);
        if (i % 5 === 2) { set(cxp - sx2, y, czp - sz2, B.OAK_FENCE); set(cxp - sx2, y + 1, czp - sz2, B.OAK_FENCE); set(cxp + sx2, y, czp + sz2, B.OAK_FENCE); set(cxp + sx2, y + 1, czp + sz2, B.OAK_FENCE); for (let s = -1; s <= 1; s++) set(cxp + sx2 * s, y + 2, czp + sz2 * s, B.PLANKS); if (rnd01(cxp, y + 7, czp, world.seed) < 0.15) set(cxp + sx2, y + 1, czp + sz2, B.TORCH); }
        if (p.cobweb && rnd01(cxp, y + 3, czp, world.seed) < 0.3) set(cxp + sx2 * ((i % 3) - 1), y + 2, czp + sz2 * ((i % 3) - 1), B.COBWEB);
      }
      if (p.spawner) { const mx = x + dx * (len >> 1), mz = z + dz * (len >> 1); if (inC(mx, mz)) { set(mx, y, mz, B.SPAWNER); world.spawners.set(mx + ',' + y + ',' + mz, 'cave_spider'); for (let k = 0; k < 14; k++) set(mx + ((k * 7) % 5) - 2, y + (k % 3), mz + ((k * 3) % 5) - 2, B.COBWEB, true); } }
      if (p.cartAt >= 0) { const mx = x + dx * p.cartAt, mz = z + dz * p.cartAt; if (inC(mx, mz)) { c.msCarts = c.msCarts || []; c.msCarts.push([mx, y, mz]); } }
    } }
}
{ const _go = World.prototype.genOverworld; World.prototype.genOverworld = function (c) { const cols = _go.call(this, c); buildMineshaftChunk(this, c); return cols; }; }
// chest minecarts in mineshafts appear the first time their chunk is made
{ const _og = onChunkGen; onChunkGen = function (c, hints, cols, w) { _og(c, hints, cols, w); if (w !== world || !c.msCarts) return; for (const [x, y, z] of c.msCarts) { if (!railAt(x, y, z)) continue; const cart = makeCart(x + 0.5, y + 0.0625, z + 0.5, true); const loot = rollLoot('mineshaft', ihash(x, y, z, w.seed)); loot.forEach((s, i) => cart.inv[i] = s); } c.msCarts = null; }; }
// /locate mineshaft
{ const _lc = CMDS.locate.run; CMDS.locate.run = function (a, ctx) {
    const name = String(a[1] || '').toLowerCase().replace(/^minecraft:/, '');
    if (a[0] === 'structure' && STRUCT_NAMES[name] && ['swamp_hut', 'igloo', 'jungle_temple', 'shipwreck', 'mineshaft'].includes(STRUCT_NAMES[name])) {
      if (world.dim !== 'overworld') throw new CmdError('That structure is in the Overworld'); const kind = STRUCT_NAMES[name]; const P = player.pos; const pcx = Math.floor(P.x / 16), pcz = Math.floor(P.z / 16); let best = null;
      if (kind === 'mineshaft') { for (let rr = 0; rr < 60 && !best; rr++) for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== rr) continue; const sx = pcx + dx, sz = pcz + dz; if (rnd01(sx, sz, 31337, world.seed) < MINESHAFT_CHANCE && world.gen.column(sx * 16 + 8, sz * 16 + 8).b !== BIO.OCEAN) { const L = mineshaftLayout(world, sx, sz); best = [sx * 16 + 8, L.y0, sz * 16 + 8]; break; } } }
      else { const sp = PLACE[kind].spacing; const prx = Math.floor(pcx / sp), prz = Math.floor(pcz / sp); for (let rr = 0; rr <= 14 && !best; rr++) for (let rx = prx - rr; rx <= prx + rr; rx++) for (let rz = prz - rr; rz <= prz + rr; rz++) { if (Math.max(Math.abs(rx - prx), Math.abs(rz - prz)) !== rr) continue; const st = regionStart(world, kind, rx, rz); if (st && !startNear(world, 'village', st.cx, st.cz, 2)) { const x = st.cx * 16 + 8, z = st.cz * 16 + 8; if (!best || Math.hypot(x - P.x, z - P.z) < Math.hypot(best[0] - P.x, best[2] - P.z)) best = [x, null, z]; } } }
      if (!best) throw new CmdError('Could not find a structure of type "' + name + '" within reasonable distance');
      chatPrint('The nearest ' + name + ' is at [' + best[0] + ', ' + (best[1] != null ? best[1] - world.yOff : '~') + ', ' + best[2] + '] (' + Math.round(Math.hypot(best[0] - P.x, best[2] - P.z)) + ' blocks away)', '#7ef'); return;
    }
    return _lc.call(this, a, ctx);
  }; }
// ---------- vines are climbable; cobwebs slow everything down ----------
{ const _up = updatePlayer; updatePlayer = function (dt) {
    const r = _up.apply(this, arguments); const P = player; if (P.dead || P.riding || P.flying || S.mode === 'spectator') return r;
    const at = (dy) => BL[world.get(Math.floor(P.pos.x), Math.floor(P.pos.y + dy), Math.floor(P.pos.z))];
    const feet = at(0.1), head = at(1.2);
    const climbing = (feet && feet.climb) || (head && head.climb);
    if (climbing) { const up = !S.uiOpen && (kd('jump') || kd('forward')); P.vel.y = up ? 2.35 : kd('sneak') ? 0 : Math.max(P.vel.y, -3); P.peak = null; }
    // at the top of a ladder, keep walking forward to step off onto the block it leans on
    else if (P.wasClimbing && P.hitH && !S.uiOpen && kd('forward') && P.vel.y < 1) { P.vel.y = 5.2; const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); P.vel.x += fx * 1.5; P.vel.z += fz * 1.5; }
    P.wasClimbing = !!climbing;
    if ((feet && feet.web) || (head && head.web)) { P.vel.x *= 0.25; P.vel.z *= 0.25; P.vel.y = Math.max(P.vel.y * 0.05, -0.8); P.peak = null; }
    if (feet === undefined) { }
    const below = BL[world.get(Math.floor(P.pos.x), Math.floor(P.pos.y - 0.2), Math.floor(P.pos.z))]; if (below && below.slippery && P.onGround) { P.slip = true; } else P.slip = false;
    return r;
  }; }
// ice: you slide (keep most of your speed)
{ const _up = updatePlayer; updatePlayer = function (dt) { const P = player; const v0 = P.slip ? P.vel.clone() : null; const r = _up.apply(this, arguments); if (v0 && P.onGround && !P.riding) { P.vel.x = v0.x + (P.vel.x - v0.x) * 0.15; P.vel.z = v0.z + (P.vel.z - v0.z) * 0.15; } return r; }; }
// ---------- biome mobs ----------
{ const _og = onChunkGen; onChunkGen = function (c, hints, cols, w) {
    _og(c, hints, cols, w); if (w !== world || !cols || w.dim !== 'overworld' || Math.random() > 0.1) return;
    const lx = 3 + (Math.random() * 10 | 0), lz = 3 + (Math.random() * 10 | 0); const col = cols[lz * 16 + lx]; const b = world.gen.column(c.cx * 16 + lx, c.cz * 16 + lz).b;
    const tab = b === BIO.JUNGLE ? { parrot: 3, ocelot: 2, panda: 1, chicken: 2, pig: 1 } : b === BIO.TAIGA ? { wolf: 2, fox: 3, rabbit: 2, sheep: 2 } : b === BIO.SAVANNA ? { horse: 2, llama: 1, armadillo: 2, cow: 2, sheep: 2 } : b === BIO.SWAMP ? { frog: 3, cow: 1, sheep: 1 } : b === BIO.DARK_FOREST ? { rabbit: 1, chicken: 1 } : null;
    if (!tab) return; const type = pickWeighted(tab); const n = type === 'panda' ? 1 + (Math.random() * 2 | 0) : 2 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) { const x = c.cx * 16 + clamp(lx + (Math.random() * 5 | 0) - 2, 0, 15), z = c.cz * 16 + clamp(lz + (Math.random() * 5 | 0) - 2, 0, 15); const y = surfaceSpawnY(x, z); if (y > SEA && freeAt(x, y, z, 2)) spawnMob(type, x + 0.5, y + (type === 'parrot' ? 3 : 0), z + 0.5); }
  }; }
// swamps: slimes at night (light 7 or less) besides slime chunks
{ const _se = spawnExtras; spawnExtras = function (dt) { _se(dt); if (!world || world.dim !== 'overworld' || isClientMP() || !isSurv() || S.difficulty === 'peaceful' || G.daylight > 0.5 || Math.random() > 0.3) return; const P = player.pos; const x = Math.floor(P.x + (Math.random() - 0.5) * 60), z = Math.floor(P.z + (Math.random() - 0.5) * 60); if (!world.loaded(x, z) || world.gen.column(x, z).b !== BIO.SWAMP || G.mobs.filter(m => m.type === 'slime').length >= 6) return; const y = surfaceSpawnY(x, z); if (y > 0 && freeAt(x, y, z, 2) && lightLevels(x, y, z).total <= 7) spawnMob('slime', x + 0.5, y, z + 0.5, { size: [1, 2, 4][Math.random() * 3 | 0] }); }; }
