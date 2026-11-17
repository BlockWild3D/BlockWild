// ================= MINECRAFT NATURAL MOB SPAWNING (NaturalSpawner + SpawnPlacements, driven by 26.3's data) =================
// Every overworld, Nether and End mob that appears on its own comes from here, the way Minecraft does it:
// - spawn lists per biome and category from the biome's natural_mob_spawns attribute (02h_mcspawn_data.js), with the
//   structure overrides (fortress, swamp hut, monument, outpost; ancient cities and trial chambers spawn nothing);
// - categories and caps: monster 70, creature 10, ambient 15, axolotls 5, underground water creature 5, water creature 5,
//   water ambient 20, each scaled by spawnable chunks / 289; a chunk can spawn when its centre is within 128 blocks of
//   you and inside the simulation distance;
// - every game tick each spawnable chunk gets one try per category under its cap (creatures only every 400 ticks):
//   a random column, a random height up to the top block + 1, then 3 groups of up to 4 steps of -5..+5 blocks,
//   at least 24 blocks from you and from the world spawn, the mob from the biome (or structure) list there;
// - Minecraft's per-mob placement (on ground / in water / in lava) and spawn rules (light, blocks underneath, depth,
//   slime chunks and swamps, sky access for husks and strays, ...), spawn costs in soul sand valleys and warped forests;
// - despawning: monsters, bats, fish, squid, axolotls at once beyond 128 blocks (fish 64) and at random beyond 32;
//   animals never; named, tamed, leashed and structure mobs never;
// - animals placed with new chunks (creature list, 10% per chunk, less in snowy/badlands biomes, retried while it rolls).
const MCSPAWN = { on: true, dims: new Set(['overworld', 'nether', 'end']) };
function mcNatOn() { return MCSPAWN.on && typeof world !== 'undefined' && !!world && MCSPAWN.dims.has(world.dim); }
const MCS = (() => {
  const D = MCS_DATA;
  const CATS = { monster: [70, 128], creature: [10, 128], ambient: [15, 128], axolotls: [5, 128], underground_water_creature: [5, 128], water_creature: [5, 128], water_ambient: [20, 64] };
  const PERSISTENT_CAT = new Set(['creature']);
  // the category each mob counts toward (its own EntityType category; the list it spawns from can differ: ocelots)
  const CAT = {};
  for (const b of Object.values(D.biomes)) for (const c in b) for (const e of b[c]) if (!CAT[e[0]]) CAT[e[0]] = c;
  for (const s of Object.values(D.structs)) for (const c in s) for (const e of s[c][1]) if (!CAT[e[0]]) CAT[e[0]] = c;
  Object.assign(CAT, { ocelot: 'creature', cat: 'creature' });
  // block tags as game block ids (BlockWild names some blocks differently: grass_block is GRASS, plus its snowy form)
  const AL = { grass_block: ['GRASS', 'SNOWY_GRASS'] }; const TAG = {};
  for (const t in D.btags) { const s = new Set(); for (const n of D.btags[t]) for (const k of AL[n] || [n.toUpperCase()]) if (B[k] !== undefined) s.add(B[k]); TAG[t] = s; }
  const BTAG = {}; for (const t in D.biotags) BTAG[t] = new Set(D.biotags[t]);
  const inTag = (t, id) => !!(TAG[t] && TAG[t].has(id));
  const IN_WATER = new Set(['axolotl', 'cod', 'dolphin', 'drowned', 'glow_squid', 'guardian', 'pufferfish', 'salmon', 'squid', 'tropical_fish', 'nautilus']);
  const IN_LAVA = new Set(['strider']);
  const FIRE_IMMUNE = new Set(['blaze', 'ghast', 'magma_cube', 'strider', 'zombified_piglin', 'wither_skeleton']);
  const CLUSTER = { wolf: 8, ghast: 1, cod: 8, salmon: 5, tropical_fish: 9, horse: 6, donkey: 6, llama: 6, camel: 6 };
  const dimInfo = () => { const d = D.dims[world.dim] || D.dims.overworld; return { blockLimit: d[0], lvlMin: d[1], lvlMax: d[2] }; };
  const seaLevel = () => world.dim === 'nether' ? (typeof NSEA !== 'undefined' ? NSEA + 1 : 32) : SEA;
  const rnd = (n) => (Math.random() * n) | 0;
  const snake = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  // ---- light (0-15) ----
  const blockLight = (x, y, z) => Math.round(world.blockLightAt(x + 0.5, y + 0.5, z + 0.5) * 15);
  const skyRaw = (x, y, z) => world.flatSky && world.dim !== 'end' ? 0 : Math.round(world.skyAt(x, y, z) * 15);
  const skyDarken = () => { if (world.dim !== 'overworld') return 0; if (S.weather === 'thunder') return 10; const day = clamp(((G.daylight || 1) - 0.2) / 0.8, 0, 1); return Math.round((1 - day) * 11); };
  const rawBright = (x, y, z) => Math.max(blockLight(x, y, z), skyRaw(x, y, z) - skyDarken());
  function darkEnough(x, y, z) { // Monster.isDarkEnoughToSpawn with the dimension's monster light rules
    if (skyRaw(x, y, z) > rnd(32)) return false; const L = dimInfo(); const bl = blockLight(x, y, z); if (bl > L.blockLimit) return false;
    return Math.max(bl, skyRaw(x, y, z) - skyDarken()) <= L.lvlMin + rnd(L.lvlMax - L.lvlMin + 1); }
  const brightEnough = (x, y, z) => Math.max(blockLight(x, y, z), skyRaw(x, y, z)) > 8; // Animal: raw brightness > 8
  const seesSky = (x, y, z) => skyRaw(x, y, z) >= 15;
  const peaceful = () => S.difficulty === 'peaceful';
  const moon = () => [1, 0.75, 0.5, 0.25, 0, 0.25, 0.5, 0.75][((Math.floor(S.time || 0) % 8) + 8) % 8];

  // ---- biomes ----
  const qcache = new Map(); let qworld = null;
  function biomeAt(x, y, z) {
    if (qworld !== world) { qcache.clear(); qworld = world; }
    const k = ((x >> 2) * 73856093) ^ ((y >> 2) * 19349663) ^ ((z >> 2) * 83492791); const kk = (x >> 2) + ',' + (y >> 2) + ',' + (z >> 2); let e = qcache.get(k);
    if (e && e[0] === kk) return e[1];
    const id = biomeAtRaw(x, y, z); if (qcache.size > 30000) qcache.clear(); qcache.set(k, [kk, id]); return id;
  }
  function known(id) { return D.biomes[id] ? id : null; }
  function biomeAtRaw(x, y, z) {
    const g = world.gen;
    if (world.dim === 'nether') return known(snake(typeof NBIO_NAME !== 'undefined' && g.biome ? NBIO_NAME[g.biome(x, z)] : '')) || 'nether_wastes';
    if (world.dim === 'end') return known(snake(g.biomeName ? g.biomeName(x, z) : '')) || 'the_end';
    const m = g.mc;
    if (m && m.sum && m.sum.has(ckey(x >> 4, z >> 4))) { try { const n = MCT_DATA_BIOMES()[m.gen().biomeAt(x, y - YOFF, z)]; if (known(n)) return n; } catch (e) { /* fall through */ } return known(m.column(x, z).mc) || 'plains'; }
    let id = snake(g.biomeName(x, z, y)); if (id === 'mountains') id = 'windswept_hills'; if (known(id)) return id;
    id = snake(g.biomeName(x, z)); if (id === 'mountains') id = 'windswept_hills';
    if (id === 'ocean') { const c = g.column(x, z); if (c && c.h < SEA - 30) id = 'deep_ocean'; }
    return known(id) || 'plains';
  }

  // ---- structures with spawn overrides, per chunk: [name, box, pieces | null] ----
  const scache = new Map(); let sworld = null;
  const bbOf = (pieces) => { const b = { x0: 1e9, y0: 1e9, z0: 1e9, x1: -1e9, y1: -1e9, z1: -1e9 }; for (const p of pieces) { const q = p.box; b.x0 = Math.min(b.x0, q.x0); b.y0 = Math.min(b.y0, q.y0); b.z0 = Math.min(b.z0, q.z0); b.x1 = Math.max(b.x1, q.x1); b.y1 = Math.max(b.y1, q.y1); b.z1 = Math.max(b.z1, q.z1); } return b; };
  const touches = (b, cx, cz) => !(b.x1 < cx * 16 || b.x0 > cx * 16 + 15 || b.z1 < cz * 16 || b.z0 > cz * 16 + 15);
  function structsIn(cx, cz) {
    if (sworld !== world) { scache.clear(); sworld = world; }
    const k = ckey(cx, cz); let L = scache.get(k); if (L) return L; L = [];
    try {
      if (world.dim === 'overworld') {
        if (typeof MCJ_KINDS !== 'undefined' && typeof MCST_ON === 'function' && MCST_ON()) for (const [kind, name] of [['outpost', 'pillager_outpost'], ['trial_chambers', 'trial_chambers'], ['ancient_city', 'ancient_city']]) {
          if (!MCJ_KINDS[kind]) continue; for (const st of mcjStarts(world, kind, cx, cz)) { const lay = mcjLayout(world, kind, st); if (!lay || !lay.pieces || !lay.pieces.length) continue; const bb = lay._bb || (lay._bb = bbOf(lay.pieces)); if (touches(bb, cx, cz)) L.push([name, bb, lay.pieces]); } }
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const S2 = world.structCache && world.structCache.get(ckey(cx + dx, cz + dz)); if (!S2 || !S2.kinds) continue;
          for (const q of S2.kinds) if (q[0] === 'swamp_hut') { const h = world.gen.column(q[1], q[2]).h; const b = { x0: q[1] - 4, x1: q[1] + 4, z0: q[2] - 5, z1: q[2] + 5, y0: h - 3, y1: h + 12 }; if (touches(b, cx, cz)) L.push(['swamp_hut', b, [{ box: b }]]); } }
        for (const [x, y, z] of world.monuments || []) { const b = { x0: x - 29, x1: x + 29, z0: z - 29, z1: z + 29, y0: y - 1, y1: y + 23 }; if (touches(b, cx, cz)) L.push(['monument', b, null]); }
        if (!L.some(s => s[0] === 'pillager_outpost')) for (const [x, y, z] of world.outposts || []) { const b = { x0: x - 30, x1: x + 30, z0: z - 30, z1: z + 30, y0: y - 12, y1: y + 30 }; if (touches(b, cx, cz)) L.push(['pillager_outpost', b, null]); }
        const c = world.getChunk(cx, cz); if (c && c.trials && c.trials.length && !L.some(s => s[0] === 'trial_chambers')) { let y0 = 1e9, y1 = -1e9; for (const t of c.trials) { y0 = Math.min(y0, t[1] - 12); y1 = Math.max(y1, t[1] + 12); } L.push(['trial_chambers', { x0: cx * 16, x1: cx * 16 + 15, z0: cz * 16, z1: cz * 16 + 15, y0, y1 }, null]); }
      } else if (world.dim === 'nether' && typeof NF !== 'undefined' && world.gen.fortress) {
        const R = 8; for (let rx = Math.floor((cx - R) / 27); rx <= Math.floor((cx + R) / 27); rx++) for (let rz = Math.floor((cz - R) / 27); rz <= Math.floor((cz + R) / 27); rz++) {
          const f = world.gen.fortress(rx, rz); if (!f || Math.abs(f.ccx - cx) > R || Math.abs(f.ccz - cz) > R) continue; f.seed = f.seed || ihash(rx, rz, 909, world.seed);
          const lay = NF.layout(world, f); if (!lay || !lay.pieces) continue; const ps = lay.pieces.filter(p => touches(p.box, cx, cz)); if (ps.length) L.push(['fortress', bbOf(ps), ps]); }
      }
    } catch (e) { /* a structure system that isn't there in this world */ }
    if (scache.size > 4000) scache.clear(); scache.set(k, L); return L;
  }
  const inBox = (b, x, y, z) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && z >= b.z0 && z <= b.z1;
  // the spawn list for a category at a spot: a structure's override when inside it, else the biome's
  function mobsAt(cat, x, y, z) {
    for (const [name, bb, pieces] of structsIn(x >> 4, z >> 4)) { const o = D.structs[name] && D.structs[name][cat]; if (!o) continue;
      const inside = o[0] === 'full' || !pieces ? inBox(bb, x, y, z) : pieces.some(p => inBox(p.box, x, y, z)); if (inside) return o[1]; }
    const b = D.biomes[biomeAt(x, y, z)]; return (b && b[cat]) || [];
  }
  function pick(list) { let t = 0; for (const e of list) t += e[1]; let q = Math.random() * t; for (const e of list) { q -= e[1]; if (q < 0) return e; } return list[list.length - 1]; }

  // ---- blocks ----
  const lightOf = (id) => { const v = LIGHT[id] || 0; return v <= 1 ? v * 15 : v; };
  function validSpawnOn(id, type) { // BlockState.isValidSpawn
    if (!id || !SOLID[id] || id === B.BEDROCK || (BL[id] && BL[id].noSpawnOn) || (FKIND[id] && !SHAPED[id])) return false; const k = (BL[id] && BL[id].key) || '';
    if (/leaves$/.test(k)) return type === 'ocelot' || type === 'parrot'; if (/^(ice|packed_ice|blue_ice|frosted_ice)$/.test(k)) return type === 'polar_bear';
    if (k === 'magma_block') return FIRE_IMMUNE.has(type); if (/glass|barrier|^light$/.test(k)) return false; return lightOf(id) < 14; }
  function emptyFor(id, type) { // NaturalSpawner.isValidEmptySpawnBlock
    if (!id) return true; if (SOLID[id] && !SHAPED[id]) return false; if (FKIND[id]) return false; const k = (BL[id] && BL[id].key) || '';
    if (/rail$/.test(k) || /^(fire|soul_fire|cactus|sweet_berry_bush|wither_rose|powder_snow|lava|campfire|soul_campfire)$/.test(k)) return false;
    return !(SOLID[id] && SHAPED[id] && !(BL[id].noSpawnOn)); }
  function placementOk(type, x, y, z) {
    const at = world.get(x, y, z);
    if (IN_WATER.has(type)) return FKIND[at] === 1 && !(SOLID[world.get(x, y + 1, z)] && !SHAPED[world.get(x, y + 1, z)]);
    if (IN_LAVA.has(type)) return FKIND[at] === 2;
    return validSpawnOn(world.get(x, y - 1, z), type) && emptyFor(at, type) && emptyFor(world.get(x, y + 1, z), type);
  }
  function fits(type, x, y, z) { // room for the body; land mobs also need it dry (checkSpawnObstruction)
    const t = MOBS[type]; if (!t) return false; const hw = (t.w || 0.6) / 2, h = t.h || 1.8; const water = IN_WATER.has(type), lava = IN_LAVA.has(type);
    for (let bx = Math.floor(x + 0.5 - hw); bx <= Math.floor(x + 0.5 + hw - 1e-3); bx++) for (let bz = Math.floor(z + 0.5 - hw); bz <= Math.floor(z + 0.5 + hw - 1e-3); bz++) for (let by = y; by < y + Math.ceil(h - 1e-3); by++) {
      const id = world.get(bx, by, bz); if (SOLID[id] && !SHAPED[id]) return false; if (!water && !lava && FKIND[id]) return false; }
    return true; }
  // ---- per-mob spawn rules (SpawnPlacements) ----
  const mc = (y) => world.dim === 'overworld' ? y - YOFF : y;
  const monster = (x, y, z) => !peaceful() && darkEnough(x, y, z);
  const anyLight = () => !peaceful();
  const animal = (tag) => (x, y, z) => inTag(tag, world.get(x, y - 1, z)) && brightEnough(x, y, z);
  const surfaceWater = (x, y, z) => { const s = seaLevel(); return y >= s - 13 && y <= s && FKIND[world.get(x, y - 1, z)] === 1 && FKIND[world.get(x, y + 1, z)] === 1; };
  const notWart = (x, y, z) => (BL[world.get(x, y - 1, z)] || {}).key !== 'nether_wart_block';
  const RULES = {
    husk: (x, y, z) => monster(x, y, z) && seesSky(x, y, z), stray: (x, y, z) => monster(x, y, z) && seesSky(x, y, z), parched: (x, y, z) => monster(x, y, z) && seesSky(x, y, z),
    zombie_horse: (x, y, z) => monster(x, y, z) && seesSky(x, y, z),
    slime: (x, y, z, b) => { if (peaceful()) return false; if (BTAG.allows_surface_slime_spawns.has(b) && mc(y) > 50 && mc(y) < 70 && Math.random() < 0.5 && Math.random() < moon() && rawBright(x, y, z) <= rnd(8)) return true;
      return typeof isSlimeChunk === 'function' && isSlimeChunk(x >> 4, z >> 4) && mc(y) < 40 && rnd(10) === 0; },
    magma_cube: anyLight, blaze: anyLight, ghast: () => !peaceful() && rnd(20) === 0,
    zombified_piglin: (x, y, z) => !peaceful() && notWart(x, y, z), piglin: notWart, hoglin: notWart,
    pillager: (x, y, z) => !peaceful() && blockLight(x, y, z) <= 8, cat: () => true,
    guardian: (x, y, z) => !peaceful() && (rnd(20) === 0 || !seesSkyFromWater(x, y, z)) && FKIND[world.get(x, y, z)] === 1 && FKIND[world.get(x, y - 1, z)] === 1,
    drowned: (x, y, z, b) => { if (peaceful() || !darkEnough(x, y, z) || FKIND[world.get(x, y, z)] !== 1) return false; return BTAG.more_frequent_drowned_spawns.has(b) ? rnd(15) === 0 : rnd(40) === 0 && y < seaLevel() - 5; },
    bat: (x, y, z) => y < seaLevel() && rawBright(x, y, z) <= rnd(4) && inTag('bats_spawnable_on', world.get(x, y - 1, z)),
    axolotl: (x, y, z) => inTag('axolotls_spawnable_on', world.get(x, y - 1, z)),
    glow_squid: (x, y, z) => y <= seaLevel() - 33 && rawBright(x, y, z) === 0 && FKIND[world.get(x, y, z)] === 1,
    squid: surfaceWater, cod: surfaceWater, salmon: surfaceWater, pufferfish: surfaceWater, dolphin: surfaceWater, nautilus: surfaceWater,
    tropical_fish: (x, y, z, b) => FKIND[world.get(x, y - 1, z)] === 1 && FKIND[world.get(x, y + 1, z)] === 1 && (BTAG.allows_tropical_fish_spawns_at_any_height.has(b) || surfaceWater(x, y, z)),
    strider: (x, y, z) => { let yy = y; while (FKIND[world.get(x, yy, z)] === 2 && yy < y + 64) yy++; return !world.get(x, yy, z); },
    rabbit: animal('rabbits_spawnable_on'), fox: animal('foxes_spawnable_on'), wolf: animal('wolves_spawnable_on'), goat: animal('goats_spawnable_on'),
    mooshroom: animal('mooshrooms_spawnable_on'), armadillo: animal('armadillo_spawnable_on'), frog: animal('frogs_spawnable_on'), camel: animal('camels_spawnable_on'),
    parrot: animal('parrots_spawnable_on'),
    polar_bear: (x, y, z, b) => brightEnough(x, y, z) && (inTag('animals_spawnable_on', world.get(x, y - 1, z)) || (BTAG.polar_bears_spawn_on_alternate_blocks.has(b) && inTag('polar_bears_spawnable_on_alternate', world.get(x, y - 1, z)))),
    turtle: (x, y, z) => y < SEA + 4 && inTag('sand', world.get(x, y - 1, z)) && brightEnough(x, y, z),
    ocelot: (x, y, z) => rnd(3) !== 0 && (inTag('animals_spawnable_on', world.get(x, y - 1, z)) || inTag('leaves', world.get(x, y - 1, z))),
  };
  function seesSkyFromWater(x, y, z) { let yy = y; while (yy < WH - 1 && FKIND[world.get(x, yy, z)] === 1) yy++; return skyRaw(x, yy, z) >= 15; }
  function rulesOk(type, x, y, z, b) { const f = RULES[type]; if (f) return f(x, y, z, b); if (CAT[type] === 'creature') return animal('animals_spawnable_on')(x, y, z); return monster(x, y, z); }

  // ---- counting, caps, spawn costs ----
  const keepForever = (m) => !!(m.customName || m.tamed || m.isBoss || (m.t && m.t.persist) || m.persist || m.structMob || m.holdsLoot || m.leashTo || m.leashed || m.fromBucket || m.playerMade || m.caged || m.jockey || m.riding || m.mountedBy);
  const counts = {}; const ST = { chunks: [], acc: 0, tick: 0, potential: [], spawned: {} };
  function census() {
    for (const c in CATS) counts[c] = 0; ST.potential = [];
    for (const m of G.mobs) { if (m.dead || m.gone || m.remote || !m.t) continue; const c = CAT[m.type]; if (!c || keepForever(m)) continue; counts[c]++;
      const bx = Math.floor(m.pos.x), by = Math.floor(m.pos.y), bz = Math.floor(m.pos.z); const cost = D.costs[biomeAt(bx, by, bz)]; const q = cost && cost[m.type]; if (q) ST.potential.push([m.pos.x, m.pos.y, m.pos.z, q[1]]); }
  }
  function costOk(type, x, y, z, b) { const cost = D.costs[b]; const q = cost && cost[type]; if (!q) return true; let e = 0;
    for (const [px, py, pz, ch] of ST.potential) { const d = Math.hypot(px - x, py - y, pz - z); e += d < 1 ? ch * q[1] : ch * q[1] / d; } return e <= q[0]; }
  const capOf = (c) => CATS[c][0] * ST.chunks.length / 289;

  // ---- despawning (Mob.checkDespawn), once a second ----
  function despawn(P) {
    for (const m of G.mobs) { if (m.dead || m.gone || m.remote || !m.t) continue; const c = CAT[m.type]; if (!c || PERSISTENT_CAT.has(c) || keepForever(m)) continue;
      if (peaceful() && c === 'monster' && m.t.kind === 'hostile') { m.gone = true; continue; }
      const d = m.pos.distanceTo(P.pos); if (d > CATS[c][1] || (d > 32 && Math.random() < 0.0247)) m.gone = true; }
  }
  // ---- one category's try in one chunk (spawnCategoryForChunk + spawnCategoryForPosition) ----
  function tryChunk(cat, c, P, spawnPos) {
    const tops = chunkTops(c); if (!tops) return; const lx = rnd(16), lz = rnd(16); const top = tops[lz * 16 + lx] + 1; const minY = 1; if (top <= minY) return;
    const x0 = c.cx * 16 + lx, z0 = c.cz * 16 + lz, y = minY + rnd(top - minY + 1); const at = c.d[y * 256 + lz * 16 + lx]; if (SOLID[at] && !SHAPED[at]) return;
    let total = 0;
    for (let g = 0; g < 3; g++) { let x = x0, z = z0, entry = null, inGroup = 0, n = Math.ceil(Math.random() * 4) || 1;
      for (let k = 0; k < n; k++) { x += rnd(6) - rnd(6); z += rnd(6) - rnd(6);
        const dx = x + 0.5 - P.pos.x, dy = y - P.pos.y, dz = z + 0.5 - P.pos.z, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 <= 576 || (spawnPos && (x + 0.5 - spawnPos.x) ** 2 + (y - spawnPos.y) ** 2 + (z + 0.5 - spawnPos.z) ** 2 < 576) || !world.loaded(x, z)) continue;
        const b = biomeAt(x, y, z);
        if (!entry) { const list = mobsAt(cat, x, y, z); if (!list.length) break; if (cat === 'water_ambient' && BTAG.reduce_water_ambient_spawns.has(b) && Math.random() < 0.98) break; entry = pick(list); n = entry[2] + rnd(entry[3] - entry[2] + 1); }
        const type = entry[0]; if (!MOBS[type]) break; const dd = CATS[CAT[type] || cat]; if (d2 > dd[1] * dd[1] && !PERSISTENT_CAT.has(CAT[type])) continue;
        if (!mobsAt(cat, x, y, z).some(e => e[0] === type)) continue;
        if (!placementOk(type, x, y, z) || !rulesOk(type, x, y, z, b) || !fits(type, x, y, z) || !costOk(type, x, y, z, b)) continue;
        const m = spawnOne(type, x + 0.5, y, z + 0.5); if (!m) continue; counts[CAT[type] || cat] = (counts[CAT[type] || cat] || 0) + 1; total++; inGroup++;
        const q = D.costs[b] && D.costs[b][type]; if (q) ST.potential.push([x + 0.5, y, z + 0.5, q[1]]);
        if (total >= (CLUSTER[type] || 4)) return; }
    }
  }
  function spawnOne(type, x, y, z) {
    const opts = type === 'slime' || type === 'magma_cube' ? { size: [1, 2, 4][rnd(3)] } : undefined;
    S.natSpawn = true; S.mcNat = true; let m = null;
    try { m = spawnMob(type, x, y, z, opts); } catch (e) { m = null; } finally { S.natSpawn = false; S.mcNat = false; }
    if (m) { m.natural = true; m.yaw = Math.random() * Math.PI * 2; ST.spawned[type] = (ST.spawned[type] || 0) + 1; } return m;
  }
  // ---- the per-tick driver ----
  function chunksNear(P) {
    const pcx = Math.floor(P.pos.x) >> 4, pcz = Math.floor(P.pos.z) >> 4, r = Math.min(8, Math.max(2, S.simDist || 5)); const out = [];
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { const cx = pcx + dx, cz = pcz + dz; const ex = cx * 16 + 8 - P.pos.x, ez = cz * 16 + 8 - P.pos.z; if (ex * ex + ez * ez >= 16384) continue; const c = world.getChunk(cx, cz); if (c) out.push(c); }
    return out; }
  let secT = 0;
  function update(dt) {
    if (!mcNatOn() || isClientMP() || (typeof MP !== 'undefined' && MP.proxyMode) || S.loading || !G.player) return;
    const P = player; if (P.dead) return;
    secT -= dt; if (secT <= 0) { secT = 1; ST.chunks = isSpec() ? [] : chunksNear(P); census(); despawn(P); }
    if (!S.rules.doMobSpawning || !ST.chunks.length) return;
    ST.acc = Math.min(2, ST.acc + dt * 20); const ticks = Math.floor(ST.acc); ST.acc -= ticks; if (typeof MON !== 'undefined') MON.budget = 6;
    const spawnPos = world.dim === 'overworld' && P.spawn ? P.spawn : null;
    for (let t = 0; t < ticks; t++) { ST.tick++;
      const cats = Object.keys(CATS).filter(c => (c !== 'monster' || !peaceful()) && (c !== 'creature' || ST.tick % 400 === 0));
      for (const c of ST.chunks) { if (!world.chunks.has(ckey(c.cx, c.cz))) continue;
        for (const cat of cats) if ((counts[cat] || 0) < capOf(cat)) tryChunk(cat, c, P, spawnPos); }
    }
  }
  // ---- animals placed with a new chunk (spawnMobsForChunkGeneration) ----
  function chunkGen(c, w) {
    if (w !== world || world.dim !== 'overworld' || !S.rules.doMobSpawning) return; const bx = c.cx * 16, bz = c.cz * 16, d = c.d;
    const get = (x, y, z) => (x >= bx && x < bx + 16 && z >= bz && z < bz + 16) ? (y >= 0 && y < WH ? d[(y * 16 + (z - bz)) * 16 + (x - bx)] : 0) : world.get(x, y, z);
    const topY = (x, z, leaves) => { for (let y = Math.min(WH - 2, (c.maxY || WH - 2) + 1); y > 0; y--) { const id = get(x, y, z); if (!id) continue; if (!leaves && /leaves$/.test((BL[id] || {}).key || '')) continue; if (SOLID[id] || FKIND[id]) return y + 1; } return 1; };
    const b0 = (() => { const h = topY(bx + 8, bz + 8, false); return biomeAt(bx + 8, h, bz + 8); })();
    const list = (D.biomes[b0] && D.biomes[b0].creature) || []; if (!list.length) return; const p = D.prob[b0] ?? 0.1;
    while (Math.random() < p) { const e = pick(list); const type = e[0]; if (!MOBS[type]) continue; const n = e[2] + rnd(e[3] - e[2] + 1);
      let x = bx + rnd(16), z = bz + rnd(16); const x0 = x, z0 = z;
      for (let k = 0; k < n; k++) { let ok = false;
        for (let l = 0; !ok && l < 4; l++) { const y = topY(x, z, type === 'parrot');
          const below = get(x, y - 1, z), at = get(x, y, z), up = get(x, y + 1, z);
          const placeOk = IN_WATER.has(type) ? FKIND[at] === 1 : validSpawnOn(below, type) && emptyFor(at, type) && emptyFor(up, type);
          if (placeOk && genRule(type, below, y, b0)) { if (spawnOne(type, x + 0.5, y, z + 0.5)) ok = true; }
          x += rnd(5) - rnd(5); z += rnd(5) - rnd(5); while (x < bx || x >= bx + 16 || z < bz || z >= bz + 16) { x = x0 + rnd(5) - rnd(5); z = z0 + rnd(5) - rnd(5); } } } }
  }
  function genRule(type, below, y, b) { // the block part of the creature spawn rules (light is daylight-bright at the surface)
    const t = (tag) => inTag(tag, below);
    switch (type) {
      case 'rabbit': return t('rabbits_spawnable_on'); case 'fox': return t('foxes_spawnable_on'); case 'wolf': return t('wolves_spawnable_on'); case 'goat': return t('goats_spawnable_on');
      case 'mooshroom': return t('mooshrooms_spawnable_on'); case 'armadillo': return t('armadillo_spawnable_on'); case 'frog': return t('frogs_spawnable_on'); case 'camel': return t('camels_spawnable_on');
      case 'parrot': return t('parrots_spawnable_on'); case 'turtle': return y < SEA + 4 && t('sand'); case 'strider': return false;
      case 'polar_bear': return t('animals_spawnable_on') || (BTAG.polar_bears_spawn_on_alternate_blocks.has(b) && t('polar_bears_spawnable_on_alternate'));
      default: return t('animals_spawnable_on'); }
  }
  return { update, chunkGen, biomeAt, mobsAt, counts, ST, CAT, capOf, structsIn };
})();
{ const _us = updateSpawning; updateSpawning = function (dt) { const r = _us.apply(this, arguments); MCS.update(dt); return r; }; }
{ const _og = onChunkGen; onChunkGen = function (c, hints, cols, w) { _og(c, hints, cols, w); if (mcNatOn() && cols) MCS.chunkGen(c, w); }; if (typeof world !== 'undefined' && world) world.onChunkGen = onChunkGen; }
