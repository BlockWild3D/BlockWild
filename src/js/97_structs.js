// ================= DAPPLED FOREST, ABANDONED CAMPS, TRAIL RUINS, OCEAN RUINS, BURIED TREASURE, FOSSILS, BASALT DELTAS =================
// Dappled forest (Wilderness Bound): an autumn forest near cold biomes - poplar trees with red, orange or yellow
// leaves, fallen poplars, shelf mushrooms on the trunks, red shrubs, leaf litter, coarse dirt, brown mushrooms and a
// few spruces. Abandoned camps in many biomes: a tent, a dead campfire, log benches, cushions, a straw bed, a barrel
// and a chest of supplies, and (sometimes) an oxidized copper chest buried under the fire with better loot.
// Trail ruins: buried terracotta and brick ruins in taigas, birch forests and jungles; brush the suspicious gravel.
// Ocean ruins: stone-brick ruins in cold oceans and sandstone ones in warm oceans, with chests (buried treasure maps!),
// suspicious sand and gravel, and drowned. Buried treasure: a chest under a beach holding a heart of the sea.
// Fossils: bone-block skeletons under deserts and swamps; nether fossils on soul sand valley floors.
// Basalt deltas: a Nether biome of basalt and blackstone pillars, magma and lava deltas, full of magma cubes.
// End: the outer islands are named End Highlands, Midlands and Barrens, and Small End Islands in the void.
// Cushions are seats; straw beds skip the night without moving your spawn point (and fall apart after one use).
// ---------- the dappled forest ----------
BV.DAPPLED_FOREST = VAR_NAME.length; VAR_NAME.push('Dappled Forest'); BIO_NAME.push('Dappled Forest');
{ const _col = Gen.prototype.column; Gen.prototype.column = function (x, z) { const c = _col.call(this, x, z); if (c.v3) return c; c.v3 = 1;
    if ((c.b === BIO.FOREST || c.b === BIO.TAIGA) && !c.v) { const temp = this.nT.f2(x / 560, z / 560, 2); if (temp > -0.2 && temp < 0.02 && this.nV2.f2(x / 300 - 40, z / 300 + 70, 2) > 0.12) { c.b = BIO.FOREST; c.v = BV.DAPPLED_FOREST; } }
    return c; }; }
const POPLAR_LEAVES = () => [B.RED_POPLAR_LEAVES, B.ORANGE_POPLAR_LEAVES, B.YELLOW_POPLAR_LEAVES];
TREES.poplar = function (put, x, y, z, r) { const H = 8 + (r() * 5 | 0); const lv = POPLAR_LEAVES()[r() * 3 | 0];
  for (let i = 0; i < H; i++) put(x, y + i, z, B.POPLAR_LOG, true);
  for (let yy = y + 3; yy <= y + H + 1; yy++) { const t = (yy - y - 3) / (H - 1); const R = yy > y + H - 1 ? 0.6 : 1.2 + Math.sin(Math.min(1, t) * Math.PI) * 0.9; const ir = Math.ceil(R);
    for (let dx = -ir; dx <= ir; dx++) for (let dz = -ir; dz <= ir; dz++) { if (dx * dx + dz * dz > R * R + 0.3) continue; if ((dx || dz) && r() < 0.12) continue; if (!dx && !dz && yy < y + H) continue; put(x + dx, yy, z + dz, lv, false); } }
  // shelf mushrooms on the trunk
  const n = r() < 0.5 ? 1 + (r() * 2 | 0) : 0; for (let k = 0; k < n; k++) { const f = r() * 4 | 0; const [ax, az] = [[0, 1], [-1, 0], [0, -1], [1, 0]][f]; put(x + ax, y + 1 + (r() * 3 | 0), z + az, FAMILY.shelf_mushroom.ids[[2, 1, 0, 3][f] + ',' + (r() < 0.3 ? 1 : 0)], false); } };
TREES.fallen_poplar = function (put, x, y, z, r) { const L = 4 + (r() * 4 | 0); const alongX = r() < 0.5; const log = famId('poplar_log', { axis: alongX ? 'x' : 'z' }) || B.POPLAR_LOG;
  put(x, y, z, B.POPLAR_LOG, true); for (let i = 2; i < L + 2; i++) { const px = x + (alongX ? i : 0), pz = z + (alongX ? 0 : i); put(px, y, pz, log, true); if (r() < 0.3) { const side = r() < 0.5 ? 1 : -1; const f = alongX ? (side > 0 ? 0 : 2) : (side > 0 ? 3 : 1); put(px + (alongX ? 0 : side), y, pz + (alongX ? side : 0), FAMILY.shelf_mushroom.ids[f + ',0'], false); } } };
{ const _dec = decorate; decorate = function (world, S, cx, cz) { const r0 = _dec.apply(this, arguments); if (world.dim !== 'overworld') return r0; const g = world.gen, seed = world.seed; const bx = cx * 16, bz = cz * 16;
    let any = false; for (const [a, b] of [[0, 0], [15, 0], [0, 15], [15, 15], [8, 8]]) if (g.column(bx + a, bz + b).v === BV.DAPPLED_FOREST) any = true; if (!any || startNear(world, 'village', cx, cz, 2)) return r0;
    const r = mulberry32(ihash(cx, cz, 2626, seed)); const hard = (x, y, z, id) => { if (y > 0 && y < WH) S.hard.push(x, y, z, id); }, soft = (x, y, z, id) => { if (y > 0 && y < WH) S.soft.push(x, y, z, id); };
    const put = (x, y, z, id, isLog) => (isLog ? hard : soft)(x, y, z, id);
    for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) { const x = bx + lx, z = bz + lz; const col = g.column(x, z); if (col.v !== BV.DAPPLED_FOREST || col.h <= SEA) continue; const p = g.nSp.f2(x / 7, z / 7, 2), q = rnd01(x, 3, z, seed + 77);
      if (p > 0.22) hard(x, col.h - 1, z, B.COARSE_DIRT); else if (q < 0.08) soft(x, col.h, z, B.LEAF_LITTER); else if (q < 0.1) soft(x, col.h, z, B.RED_SHRUB); else if (q < 0.104) soft(x, col.h, z, B.BROWN_MUSHROOM); }
    for (let i = 0; i < 5; i++) { const x = bx + (r() * 16 | 0), z = bz + (r() * 16 | 0); const col = g.column(x, z); if (col.v !== BV.DAPPLED_FOREST || col.h <= SEA || g.cave(x, col.h - 1, z)) continue; const q = r();
      if (q < 0.7) TREES.poplar(put, x, col.h, z, r); else if (q < 0.85) TREES.fallen_poplar(put, x, col.h, z, r); else TREES.spruce(put, x, col.h, z, r); }
    for (let k = 0; k < 2; k++) { if (r() > 0.4) continue; const x0 = bx + (r() * 16 | 0), z0 = bz + (r() * 16 | 0); for (let i = 0; i < 7; i++) { const x = x0 + (r() * 5 | 0) - 2, z = z0 + (r() * 5 | 0) - 2; const col = g.column(x, z); if (col.v === BV.DAPPLED_FOREST && col.h > SEA) soft(x, col.h, z, B.RED_SHRUB); } }
    return r0; }; }
// ---------- structures: placement ----------
Object.assign(PLACE, {
  abandoned_camp: { spacing: 26, sep: 8, salt: 26032026, biomes: [BIO.PLAINS, BIO.FOREST, BIO.TAIGA, BIO.SAVANNA, BIO.JUNGLE, BIO.CHERRY_GROVE, BIO.PALE_GARDEN, BIO.SWAMP, BIO.DARK_FOREST, BIO.MOUNTAINS, BIO.SNOWY], land: true, avoid: ['village', 6] },
  trail_ruins: { spacing: 34, sep: 8, salt: 83469867, biomes: [BIO.TAIGA, BIO.FOREST, BIO.JUNGLE], land: true },
  ocean_ruin: { spacing: 20, sep: 8, salt: 14357621, biomes: [BIO.OCEAN] },
});
Object.assign(STRUCT_NAMES, { abandoned_camp: 'abandoned_camp', camp: 'abandoned_camp', trail_ruins: 'trail_ruins', ocean_ruin: 'ocean_ruin', ocean_ruins: 'ocean_ruin', buried_treasure: 'buried_treasure' });
// loot
addLoot('camp', [L('bread', 1, 4, 0.6), L('apple', 1, 3, 0.5), L('cooked_beef', 1, 3, 0.3), L('baked_potato', 1, 4, 0.4), L('torch', 2, 8, 0.6), L('string', 1, 5, 0.5), L('stick', 2, 6, 0.5), L('leather', 1, 3, 0.4), L('straw_bed', 1, 2, 0.35), L('white_cushion', 1, 1, 0.2), L('brown_cushion', 1, 1, 0.2), L('bundle', 1, 1, 0.15), L('compass', 1, 1, 0.2), L('lantern', 1, 1, 0.25), L('buried_treasure_map', 1, 1, 0.1)]);
addLoot('camp_copper', [L('iron_ingot', 2, 6, 0.75), L('gold_ingot', 1, 4, 0.5), L('copper_ingot', 3, 9, 0.7), L('emerald', 1, 5, 0.6), L('diamond', 1, 2, 0.3), L('lapis_lazuli', 2, 8, 0.4), L('enchanted_book', 1, 1, 0.4), L('golden_apple', 1, 1, 0.2), L('iron_pickaxe', 1, 1, 0.25), L('saddle', 1, 1, 0.2), L('name_tag', 1, 1, 0.2), L('arrow', 4, 12, 0.4), L('cooked_beef', 2, 5, 0.5), L('bread', 2, 5, 0.5), L('copper_horse_armor', 1, 1, 0.1)]);
addLoot('camp_rare', [L('emerald', 2, 6, 0.8), L('diamond', 1, 2, 0.35), L('enchanted_book', 1, 1, 0.5), L('golden_apple', 1, 1, 0.4), L('iron_axe', 1, 1, 0.3), L('copper_ingot', 4, 12, 0.6), L('music_disc_bounce', 1, 1, 0.05), L('name_tag', 1, 1, 0.3)]);
addLoot('ocean_ruin', [L('coal', 1, 4, 0.6), L('wheat', 2, 3, 0.5), L('gold_nugget', 1, 3, 0.5), L('rotten_flesh', 1, 4, 0.4), L('emerald', 1, 1, 0.35), L('fishing_rod', 1, 1, 0.15), L('leather_chestplate', 1, 1, 0.15), L('enchanted_book', 1, 1, 0.2), L('golden_apple', 1, 1, 0.1), L('buried_treasure_map', 1, 1, 0.8), L('iron_nautilus_armor', 1, 1, 0.05)]);
addLoot('buried_treasure', [L('heart_of_the_sea', 1, 1, 1), L('iron_ingot', 1, 4, 0.8), L('gold_ingot', 1, 4, 0.7), L('tnt', 1, 2, 0.4), L('emerald', 4, 8, 0.5), L('diamond', 1, 2, 0.35), L('prismarine_crystals', 1, 5, 0.4), L('cooked_cod', 2, 4, 0.5), L('leather_chestplate', 1, 1, 0.3), L('iron_sword', 1, 1, 0.3), L('golden_nautilus_armor', 1, 1, 0.1), L('diamond_nautilus_armor', 1, 1, 0.04)]);
addLoot('shipwreck', [L('buried_treasure_map', 1, 1, 0.4)]);
const TRAIL_COMMON = ['emerald', 'wheat', 'wooden_hoe', 'clay_ball', 'brick', 'yellow_dye', 'blue_dye', 'light_blue_dye', 'white_dye', 'orange_dye', 'red_candle', 'green_candle', 'purple_stained_glass', 'brown_stained_glass', 'beetroot_seeds', 'dead_bush', 'flower_pot', 'string', 'lead', 'coal'];
const TRAIL_RARE = ['burn_pottery_sherd', 'danger_pottery_sherd', 'friend_pottery_sherd', 'heart_pottery_sherd', 'heartbreak_pottery_sherd', 'howl_pottery_sherd', 'sheaf_pottery_sherd', 'wayfinder_armor_trim_smithing_template', 'raiser_armor_trim_smithing_template', 'shaper_armor_trim_smithing_template', 'host_armor_trim_smithing_template', 'music_disc_relic'];
const OCEAN_BRUSH = { cold: ['blade_pottery_sherd', 'explorer_pottery_sherd', 'mourner_pottery_sherd', 'plenty_pottery_sherd', 'iron_axe', 'emerald', 'wheat', 'wooden_hoe', 'coal', 'gold_nugget'], warm: ['angler_pottery_sherd', 'shelter_pottery_sherd', 'snort_pottery_sherd', 'sniffer_egg', 'iron_axe', 'emerald', 'wheat', 'wooden_hoe', 'coal', 'gold_nugget'] };
{ const _bl = brushLoot; brushLoot = function (kind) { try { if (target && world) { const cx = target.x >> 4, cz = target.z >> 4; const pick = (list) => { const l = list.filter(k => IT[k] !== undefined); return l.length ? IT[l[Math.random() * l.length | 0]] : null; };
      if (kind === 'gravel' && startNear(world, 'trail_ruins', cx, cz, 2)) { const id = pick(Math.random() < 0.12 ? TRAIL_RARE : TRAIL_COMMON); if (id) return id; }
      if (startNear(world, 'ocean_ruin', cx, cz, 1)) { const v = world.gen.column(target.x, target.z).v; const id = pick(OCEAN_BRUSH[v === BV.WARM_OCEAN || v === BV.LUKEWARM_OCEAN ? 'warm' : 'cold']); if (id) return id; } } } catch (e) { } return _bl.apply(this, arguments); }; }
// ---------- building them ----------
function campWood(col) { const v = col.v, b = col.b; if (v === BV.DAPPLED_FOREST) return ['poplar', 'orange']; if (v === BV.BIRCH_FOREST || v === BV.OLD_BIRCH) return ['birch', 'white']; if (b === BIO.TAIGA || b === BIO.SNOWY || b === BIO.MOUNTAINS) return ['spruce', 'brown'];
  if (b === BIO.JUNGLE) return ['jungle', 'green']; if (b === BIO.SAVANNA) return ['acacia', 'yellow']; if (b === BIO.CHERRY_GROVE) return ['cherry', 'pink']; if (b === BIO.PALE_GARDEN) return ['pale_oak', 'light_gray']; if (b === BIO.DARK_FOREST) return ['dark_oak', 'gray']; if (b === BIO.SWAMP) return ['mangrove', 'lime']; return ['oak', 'white']; }
const woolKey = (c) => c === 'white' ? 'wool' : c + '_wool';
function stairsId(key, facing) { return famId(key, { facing, half: 'bottom', wl: 0 }) || B[key.toUpperCase()]; }
function buildCamp(world, S, x0, z0, r) { const g = world.gen; const col = g.column(x0, z0); const y = col.h; const [wood, wc] = campWood(col);
  const hard = (x, yy, z, id) => { if (yy > 0 && yy < WH && id !== undefined) S.hard.push(x, yy, z, id); };
  const logK = wood === 'oak' ? 'log' : wood + '_log'; const strippedK = 'stripped_' + wood + '_log';
  // a flat clearing
  for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) { if (dx * dx + dz * dz > 38) continue; const x = x0 + dx, z = z0 + dz; const h = g.column(x, z).h; for (let yy = y; yy < y + 6; yy++) hard(x, yy, z, 0); for (let yy = Math.min(h, y) - 1; yy < y; yy++) hard(x, yy, z, yy === y - 1 ? (col.b === BIO.SNOWY ? B.SNOWY_GRASS : B.GRASS) : B.DIRT); if (r() < 0.25 && dx * dx + dz * dz > 6) hard(x, y - 1, z, B.COARSE_DIRT); }
  // the dead campfire, with a buried copper chest under it (sometimes)
  hard(x0, y, z0, famId('campfire', { facing: 2, lit: 0 }) || B.CAMPFIRE); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) hard(x0 + dx, y - 1, z0 + dz, B.COARSE_DIRT);
  if (r() < 0.45) { const cid = FAMILY.oxidized_copper_chest ? FAMILY.oxidized_copper_chest.ids[2] : B.CHEST; hard(x0, y - 3, z0, cid); S.kinds.push(['chest:camp_rare', x0, z0, y - 3]); hard(x0, y - 2, z0, B.DIRT); }
  // the tent: an A-frame of wool stairs over a straw bed
  const st = wc + '_wool_stairs'; const tx = x0 + 3;
  for (let dz = -1; dz <= 1; dz++) { hard(tx, y, z0 + dz, stairsId(st, 3)); hard(tx + 2, y, z0 + dz, stairsId(st, 1)); hard(tx + 1, y + 1, z0 + dz, B[woolKey(wc).toUpperCase()]); }
  hard(tx + 1, y, z0 - 2, B[woolKey(wc).toUpperCase()]); hard(tx, y, z0 - 2, B[woolKey(wc).toUpperCase()]); hard(tx + 2, y, z0 - 2, B[woolKey(wc).toUpperCase()]); hard(tx + 1, y + 1, z0 - 2, B[woolKey(wc).toUpperCase()]);
  hard(tx + 1, y, z0, B.STRAW_BED); hard(tx + 1, y - 1, z0 + 1, B.COARSE_DIRT);
  // log benches and cushions around the fire
  const ax = famId(strippedK, { axis: 'z' }) || B[strippedK.toUpperCase()] || B.LOG; for (let dz = -1; dz <= 1; dz++) hard(x0 - 3, y, z0 + dz, ax);
  const ax2 = famId(strippedK, { axis: 'x' }) || ax; for (let dx = -1; dx <= 1; dx++) hard(x0 + dx, y, z0 - 3, ax2);
  hard(x0 - 2, y, z0 + 2, B[[wc, 'red', 'brown'][r() * 3 | 0].toUpperCase() + '_CUSHION'] || B.WHITE_CUSHION);
  // supplies
  hard(x0 + 2, y, z0 + 3, B.BARREL); S.kinds.push(['chest:camp', x0 + 2, z0 + 3, y]); { const ck = ['copper_chest', 'exposed_copper_chest', 'weathered_copper_chest'][(r() * 3) | 0]; hard(x0 - 3, y, z0 + 3, FAMILY[ck] ? FAMILY[ck].ids[(r() * 4) | 0] : B.CHEST); S.kinds.push(['chest:camp_copper', x0 - 3, z0 + 3, y]); } // the camper's copper chest: the good stuff
  hard(x0 + 2, y, z0 - 3, B[logK.toUpperCase()]); hard(x0 + 2, y + 1, z0 - 3, B.LANTERN);
  if (col.v === BV.DAPPLED_FOREST) { TREES.fallen_poplar((x, yy, z, id) => hard(x, yy, z, id), x0 - 5, y, z0 - 1, r); }
  S.kinds.push(['abandoned_camp', x0, z0]); }
const TRAIL_MATS = () => [B.TERRACOTTA, B.BROWN_TERRACOTTA, B.ORANGE_TERRACOTTA, B.YELLOW_TERRACOTTA, B.RED_TERRACOTTA, B.LIGHT_BLUE_TERRACOTTA, B.BRICK, B.MUD_BRICKS, B.COBBLESTONE, B.STONE_BRICKS].filter(v => v !== undefined);
function buildTrailRuins(world, S, x0, z0, r) { const g = world.gen; const surf = g.column(x0, z0).h; const base = surf - 9; const mats = TRAIL_MATS();
  const hard = (x, y, z, id) => { if (y > 1 && y < WH) S.hard.push(x, y, z, id); }; const mat = () => mats[r() * mats.length | 0];
  const rooms = []; for (let i = 0; i < 4 + (r() * 3 | 0); i++) rooms.push({ x: x0 - 12 + (r() * 20 | 0), z: z0 - 12 + (r() * 20 | 0), w: 4 + (r() * 4 | 0), d: 4 + (r() * 4 | 0), h: 2 + (r() * 3 | 0), m: mat() });
  // everything sits in packed gravel and dirt, the roofs a few blocks under the grass
  for (let x = x0 - 14; x <= x0 + 14; x++) for (let z = z0 - 14; z <= z0 + 14; z++) { const top = g.column(x, z).h; for (let y = base; y < top - 2; y++) { const q = rnd01(x, y, z, world.seed + 4041); hard(x, y, z, y === base ? (q < 0.07 ? B.SUSPICIOUS_GRAVEL : B.GRAVEL) : y > top - 5 ? B.DIRT : (q < 0.03 ? B.SUSPICIOUS_GRAVEL : B.GRAVEL)); } }
  // a road of terracotta and packed mud between the rooms
  for (let i = 0; i < rooms.length - 1; i++) { const a = rooms[i], b = rooms[i + 1]; let x = a.x, z = a.z; while (x !== b.x || z !== b.z) { if (x !== b.x && (z === b.z || r() < 0.5)) x += Math.sign(b.x - x); else z += Math.sign(b.z - z); hard(x, base, z, r() < 0.5 ? (B.PACKED_MUD || B.DIRT) : B.TERRACOTTA); } }
  for (const R of rooms) { for (let x = R.x; x < R.x + R.w; x++) for (let z = R.z; z < R.z + R.d; z++) { const wall = x === R.x || z === R.z || x === R.x + R.w - 1 || z === R.z + R.d - 1;
      hard(x, base, z, r() < 0.06 ? B.SUSPICIOUS_GRAVEL : (r() < 0.2 ? mat() : R.m)); if (!wall) continue; const hh = R.h - (r() < 0.35 ? (r() * R.h | 0) : 0); for (let y = base + 1; y <= base + hh; y++) hard(x, y, z, r() < 0.05 ? B.SUSPICIOUS_GRAVEL : (r() < 0.15 ? mat() : R.m)); } }
  // a tower whose top nearly reaches the surface
  const tx = x0 + (r() * 6 | 0) - 3, tz = z0 + (r() * 6 | 0) - 3; const tm = mat(); for (let y = base; y < surf - 2; y++) for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) { const edge = dx !== 1 || dz !== 1; hard(tx + dx, y, tz + dz, edge ? (r() < 0.12 ? mat() : tm) : (r() < 0.1 ? B.SUSPICIOUS_GRAVEL : B.GRAVEL)); }
  S.kinds.push(['trail_ruins', x0, z0]); }
function buildOceanRuin(world, S, x0, z0, r) { const g = world.gen; const col = g.column(x0, z0); const warm = col.v === BV.WARM_OCEAN || col.v === BV.LUKEWARM_OCEAN; const big = r() < 0.3;
  const hard = (x, y, z, id) => { if (y > 1 && y < WH) S.hard.push(x, y, z, id); };
  const M = warm ? [B.SANDSTONE, B.CUT_SANDSTONE || B.SANDSTONE, B.CHISELED_SANDSTONE || B.SANDSTONE, B.SMOOTH_SANDSTONE || B.SANDSTONE] : [B.STONE_BRICKS, B.MOSSY_STONE_BRICKS || B.STONE_BRICKS, B.CRACKED_STONE_BRICKS || B.STONE_BRICKS, B.COBBLESTONE, B.MOSSY_COBBLESTONE];
  const parts = big ? 3 + (r() * 3 | 0) : 1;
  for (let p = 0; p < parts; p++) { const cx = x0 + (p ? (r() * 18 | 0) - 9 : 0), cz = z0 + (p ? (r() * 18 | 0) - 9 : 0); const w = big && !p ? 8 : 5 + (r() * 2 | 0), d = big && !p ? 8 : 5 + (r() * 2 | 0); const fy = g.column(cx, cz).h; const H = big && !p ? 5 : 3;
    for (let x = cx; x < cx + w; x++) for (let z = cz; z < cz + d; z++) { hard(x, fy - 1, z, M[r() * M.length | 0]); const wall = x === cx || z === cz || x === cx + w - 1 || z === cz + d - 1; if (!wall) { if (r() < 0.06) hard(x, fy, z, warm ? B.SUSPICIOUS_SAND : B.SUSPICIOUS_GRAVEL); continue; }
      const hh = r() < 0.4 ? (r() * H | 0) : H; for (let y = fy; y < fy + hh && y < SEA - 1; y++) hard(x, y, z, M[r() * M.length | 0]); }
    if (!p || r() < 0.5) { const qx = cx + 1 + (r() * (w - 2) | 0), qz = cz + 1 + (r() * (d - 2) | 0); hard(qx, fy, qz, B.CHEST); S.kinds.push(['chest:ocean_ruin', qx, qz, fy]); }
    S.mobs.push(['drowned', cx + w / 2, fy + 1, cz + d / 2]); }
  S.kinds.push(['ocean_ruin', x0, z0]); }
function buildFossil(S, x0, y0, z0, r, coal) { const hard = (x, y, z, id) => { if (y > 1 && y < WH) S.hard.push(x, y, z, id); }; const alongX = r() < 0.5; const L = 6 + (r() * 5 | 0); const bone = () => coal && r() < 0.1 ? B.COAL_ORE : B.BONE_BLOCK;
  for (let i = 0; i < L; i++) { const sx = x0 + (alongX ? i : 0), sz = z0 + (alongX ? 0 : i); hard(sx, y0, sz, bone());
    if (i % 2 === 1 && i < L - 2) { const R = 2 + (i < L / 2 ? 1 : 0); for (let a = 0; a <= 8; a++) { const t = a / 8 * Math.PI; const ox = Math.round(Math.cos(t) * R), oy = Math.round(Math.sin(t) * R) - R; hard(sx + (alongX ? 0 : ox), y0 + oy, sz + (alongX ? ox : 0), bone()); } } }
  // the skull
  const hx = x0 + (alongX ? L : 0), hz = z0 + (alongX ? 0 : L); for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) hard(hx + (alongX ? a : b), y0 + c, hz + (alongX ? b : a), bone()); }
{ const _pn = placeNewStructures; placeNewStructures = function (world, S, cx, cz) { const r0 = _pn.apply(this, arguments); const g = world.gen; const bx = cx * 16, bz = cz * 16; const r = mulberry32(ihash(cx, cz, 9797, world.seed));
    if (startNear(world, 'village', cx, cz, 2)) return r0;
    if (startNear(world, 'abandoned_camp', cx, cz, 0)) { const col = g.column(bx + 8, bz + 8); if (col.h > SEA + 1 && !isRiver(col)) buildCamp(world, S, bx + 8, bz + 8, r); }
    else if (startNear(world, 'trail_ruins', cx, cz, 0)) { const c = g.column(bx + 8, bz + 8); if (c.h > SEA + 4) buildTrailRuins(world, S, bx + 8, bz + 8, r); }
    else if (startNear(world, 'ocean_ruin', cx, cz, 0)) { const c = g.column(bx + 8, bz + 8); if (!isRiver(c) && c.h < SEA - 4) buildOceanRuin(world, S, bx + 4, bz + 4, r); }
    // buried treasure: 1 in 100 beach chunks
    const c8 = g.column(bx + 9, bz + 9); if (c8.b === BIO.BEACH && c8.v !== BV.STONY_SHORE && rnd01(cx, cz, 61031, world.seed) < 0.01) { const y = c8.h - 4; S.hard.push(bx + 9, y, bz + 9, B.CHEST); S.kinds.push(['chest:buried_treasure', bx + 9, bz + 9, y], ['buried_treasure', bx + 9, bz + 9]); }
    // fossils under deserts and swamps
    if ((c8.b === BIO.DESERT || c8.b === BIO.SWAMP || c8.b === BIO.MANGROVE_SWAMP) && rnd01(cx, cz, 4471, world.seed) < 1 / 64) { const y = Math.max(YOFF + 5, c8.h - 15 - (r() * 10 | 0)); buildFossil(S, bx + 3, y, bz + 3, r, true); }
    return r0; }; }
// ---------- buried treasure maps ----------
function findTreasure(x, z) { const g = world.gen; const pcx = Math.floor(x) >> 4, pcz = Math.floor(z) >> 4; for (let R = 0; R < 120; R++) for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== R) continue; const cx = pcx + dx, cz = pcz + dz;
    if (rnd01(cx, cz, 61031, world.seed) >= 0.01) continue; const c = g.column(cx * 16 + 9, cz * 16 + 9); if (c.b === BIO.BEACH && c.v !== BV.STONY_SHORE) return [cx * 16 + 9, cz * 16 + 9]; } return null; }
{ const _ua = useAction; useAction = function (eye, dir) { const h = player.held(); const hd = h && ITEMS[h.id];
    if (hd && hd.kind === 'treasure_map' && !(target && BL[target.id].use && !kd('sneak'))) { mouseR = false; if (world.dim !== 'overworld') { toast('This map is of the Overworld', 2); return; }
      if (!h.target) { h.target = findTreasure(player.pos.x, player.pos.z); if (!h.target) { toast('The map is blank', 2); return; } invDirty(); }
      const dx = h.target[0] - player.pos.x, dz = h.target[1] - player.pos.z; const d = Math.round(Math.hypot(dx, dz)); toast(d < 4 ? 'X marks the spot: dig here' : 'X marks the spot ' + d + ' blocks to the ' + dirName(dx, dz) + ' (' + h.target[0] + ', ' + h.target[1] + ')', 3); return; }
    return _ua.apply(this, arguments); }; }
{ const _x = xtra; xtra = function (s) { const r = _x.apply(this, arguments); if (s && s.target && ITEMS[s.id] && ITEMS[s.id].kind === 'treasure_map') return Object.assign(r || {}, { target: s.target }); return r; }; }
// ---------- nether: basalt deltas and nether fossils ----------
NBIO_NAME.push('Basalt Deltas');
{ const _b = NetherGen.prototype.biome; NetherGen.prototype.biome = function (x, z) { const b = _b.call(this, x, z); if (b !== 0) return b; if (!this.nBd) this.nBd = new Perlin(this.seed + 1601); return this.nBd.f2(x / 160, z / 160, 2) > 0.18 ? 4 : 0; }; }
{ const _gn = genNetherChunk; genNetherChunk = function (w, c) { const r0 = _gn.apply(this, arguments); try { const g = w.gen; const bx = c.cx * 16, bz = c.cz * 16, d = c.d, seed = w.seed; const I = (x, y, z) => (y * 16 + z) * 16 + x;
      let anyBd = false; for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) { if (g.biome(bx + x, bz + z) !== 4) continue; anyBd = true; const wx = bx + x, wz = bz + z;
        for (let y = 2; y < NH - 2; y++) { const i = I(x, y, z); if (d[i] !== B.NETHERRACK && d[i] !== B.GRAVEL && d[i] !== B.SOUL_SAND) continue; const open = d[I(x, y + 1, z)] === 0 || d[I(x, y - 1, z)] === 0; if (!open && rnd01(wx, y, wz, seed + 3) > 0.3) continue; const q = rnd01(wx, y, wz, seed + 5);
          d[i] = q < 0.55 ? B.BASALT : q < 0.9 ? B.BLACKSTONE : B.MAGMA_BLOCK;
          // lava deltas: shallow pools ringed with basalt on the floor
          if (d[I(x, y + 1, z)] === 0 && x > 0 && x < 15 && z > 0 && z < 15 && rnd01(wx >> 1, y, wz >> 1, seed + 7) < 0.12 && [I(x + 1, y, z), I(x - 1, y, z), I(x, y, z + 1), I(x, y, z - 1)].every(k => SOLID[d[k]])) d[i] = B.LAVA; } }
      if (anyBd) { const r = mulberry32(ihash(c.cx, c.cz, 3131, seed)); for (let t = 0; t < 10; t++) { const x = 1 + (r() * 14 | 0), z = 1 + (r() * 14 | 0); if (g.biome(bx + x, bz + z) !== 4) continue;
          for (let y = 40; y < 110; y++) { if (SOLID[d[I(x, y - 1, z)]] && d[I(x, y, z)] === 0) { const H = 2 + (r() * 7 | 0); for (let k = 0; k < H && d[I(x, y + k, z)] === 0; k++) d[I(x, y + k, z)] = B.BASALT; break; } } } }
      // nether fossils on soul sand valley floors
      if (g.biome(bx + 8, bz + 8) === 3 && rnd01(c.cx, c.cz, 7731, seed) < 0.12) { for (let y = 34; y < 100; y++) { const i = I(6, y, 6); if ((d[I(6, y - 1, 6)] === B.SOUL_SAND || d[I(6, y - 1, 6)] === B.SOUL_SOIL) && d[i] === 0) { const R = 3 + (rnd01(c.cx, y, c.cz, seed) * 2 | 0);
            for (let a = 0; a <= 10; a++) { const t = a / 10 * Math.PI; const ox = Math.round(Math.cos(t) * R), oy = Math.round(Math.sin(t) * R * 1.3); for (const dz of [0, 2, 4]) { const xx = 6 + ox, zz = 4 + dz; if (xx >= 0 && xx < 16 && y + oy < NH - 2) d[I(xx, y + oy, zz)] = B.BONE_BLOCK; } } break; } } }
    } catch (e) { } return r0; }; }
// ---------- end: names of the outer islands ----------
EndGen.prototype.biomeName = function (x, z) { const dd = Math.hypot(x, z); if (dd < 1000) return 'The End'; const c = this.column(x, z); if (!c.h) return 'Small End Islands'; const th = c.h - (c.bottom || c.h); return th > 12 ? 'End Highlands' : th > 6 ? 'End Midlands' : 'End Barrens'; };
// ---------- shelf mushrooms: on log sides; bone meal grows them; the big ones bounce you ----------
{ const _pb = placeBlock; placeBlock = function (hit, id) { const d = BL[id]; if (!d || !d.shelf || !hit) return _pb.apply(this, arguments); if (hit.ny !== 0) return false; const sup = BL[hit.id]; if (!sup || !/(_log|_wood|_stem)/.test(sup.key || sup.fam || '')) return false;
    const x = hit.x + hit.nx, y = hit.y, z = hit.z + hit.nz; if (!replaceableAt(x, y, z)) return false; const f = hit.nz > 0 ? 2 : hit.nz < 0 ? 0 : hit.nx > 0 ? 3 : 1; const sid = FAMILY.shelf_mushroom.ids[f + ',0']; world.set(x, y, z, sid); mpBlock(x, y, z, sid); Sfx.play('grass', 0.8); return true; }; }
{ const _ua = useAction; useAction = function (eye, dir) { const h = player.held(); if (target && !targetMob && h && h.id === IT.bone_meal) { const d = BL[target.id]; if (d && d.shelf === 1) { const nid = FAMILY.shelf_mushroom.ids[d.st.facing + ',1']; if (nid) { world.set(target.x, target.y, target.z, nid); mpBlock(target.x, target.y, target.z, nid); useHeld(1); SpriteFX.emit('glitter', target.x + 0.5, target.y + 0.5, target.z + 0.5, 8, { size: 0.25, grav: -0.5, spd: 0.8, life: 0.9, spread: 0.9, tint: [[0.4, 0.9, 0.4]] }) || Particles.emit(target.x + 0.5, target.y + 0.5, target.z + 0.5, 8, [[0.4, 0.9, 0.4]], 1, 0.6, -1, 0.5); mouseR = false; S.swing = 1; return; } }
      if (d && d.key === 'red_shrub') { for (let t = 0; t < 8; t++) { const x = target.x + (Math.random() * 5 | 0) - 2, z = target.z + (Math.random() * 5 | 0) - 2; for (let dy = 1; dy >= -1; dy--) { const y = target.y + dy; if (!world.get(x, y, z) && (world.get(x, y - 1, z) === B.GRASS || world.get(x, y - 1, z) === B.COARSE_DIRT) && Math.random() < 0.5) { world.set(x, y, z, B.RED_SHRUB); mpBlock(x, y, z, B.RED_SHRUB); break; } } } useHeld(1); mouseR = false; S.swing = 1; return; } }
    return _ua.apply(this, arguments); }; }
{ const _up = updatePlayer; let vy0 = 0; updatePlayer = function (dt) { const P = player; const r = _up.apply(this, arguments);
    if (P.onGround && vy0 < -4 && !P.flying) { const d = BL[world.get(Math.floor(P.pos.x), Math.floor(P.pos.y - 0.2), Math.floor(P.pos.z))] || BL[world.get(Math.floor(P.pos.x), Math.floor(P.pos.y), Math.floor(P.pos.z))]; if (d && d.shelf === 2 && !kd('sneak')) { P.vel.y = -vy0 * 0.5; P.peak = null; } }
    vy0 = P.vel.y;
    // sitting on a cushion: stay put until you sneak or jump
    if (P.cushion) { const [x, y, z] = P.cushion; if (!BL[world.get(x, y, z)] || !BL[world.get(x, y, z)].cushion || kd('sneak') || kd('jump') || P.dead) { P.cushion = null; P.pos.y = y + 0.45; } else { P.pos.set(x + 0.5, y + 0.2, z + 0.5); P.vel.set(0, 0, 0); P.onGround = true; P.peak = null; } }
    return r; }; }
{ const _ua = useAction; useAction = function (eye, dir) { if (target && !targetMob && BL[target.id] && !kd('sneak')) { const d = BL[target.id];
      if (d.cushion && !player.riding && !player.cushion) { if (!world.get(target.x, target.y + 1, target.z) && !world.get(target.x, target.y + 2, target.z)) { player.cushion = [target.x, target.y, target.z]; Sfx.play('cloth', 0.6); } mouseR = false; return; }
      if (d.strawBed) { mouseR = false; if (world.dim !== 'overworld') { toast('The straw bed falls apart here', 2); world.set(target.x, target.y, target.z, 0); return; }
        const ticks = timeTicks(); const night = (ticks >= 12542 && ticks <= 23459) || S.weather === 'thunder'; if (!night) { toast('You can sleep only at night', 2); return; }
        if (G.mobs.some(m => !m.dead && m.t.kind === 'hostile' && m.pos.distanceTo(player.pos) < 8) && isSurv()) { toast('You may not rest now; there are monsters nearby', 2); return; }
        S.sleeping = { t: 0, head: [target.x, target.y, target.z], straw: true }; player.vel.set(0, 0, 0); player.pos.set(target.x + 0.5, target.y + 0.4, target.z + 0.5); show('sleepfx', true); return; } }
    return _ua.apply(this, arguments); }; }
{ const _us = updateSleep; updateSleep = function (dt) { const sl = S.sleeping; const r = _us.apply(this, arguments); if (sl && sl.straw && !S.sleeping) { const [x, y, z] = sl.head; if (BL[world.get(x, y, z)] && BL[world.get(x, y, z)].strawBed) { world.set(x, y, z, 0); mpBlock(x, y, z, 0); Particles.blockBreak(x, y, z, B.STRAW_BED, 10); toast('Your straw bed fell apart', 2); } if (S.weather === 'thunder') setWeather('clear'); } else if (sl && !sl.straw && !S.sleeping && S.weather !== 'clear') setWeather('clear'); return r; }; }
// sleeping through the night also clears the weather (Minecraft)
if (ITEMS[IT.straw_bed]) ITEMS[IT.straw_bed].stack = 16;
// creative inventory
{ const keys = ['poplar_log', 'poplar_wood', 'stripped_poplar_log', 'stripped_poplar_wood', 'poplar_planks', 'orange_poplar_leaves', 'red_poplar_leaves', 'yellow_poplar_leaves', 'poplar_sapling', 'shelf_mushroom', 'red_shrub', 'straw_bed', ...COLORDATA().map(c => c[0] + '_cushion'), 'buried_treasure_map'];
  const ids = keys.map(k => IT[k]).filter(v => v !== undefined); const set = new Set(ids); const rest = ITEM_IDS.filter(i => !set.has(i)); rest.push(...ids); ITEM_IDS.length = 0; ITEM_IDS.push(...rest); }
